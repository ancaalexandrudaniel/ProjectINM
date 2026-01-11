import axios from 'axios';
import { z } from 'zod';

/**
 * Raw HTTP SOAP Client for legislatie.just.ro
 * 
 * This implementation bypasses the 'soap' npm library issues by making
 * direct HTTP POST requests with properly formatted SOAP XML bodies.
 * 
 * Key fixes from API research:
 * - Uses POST method (not GET)
 * - Correct SOAPAction headers
 * - Proper XML namespace structure
 * - Direct endpoint URL (no /SOAP suffix)
 */

// ============================================================================
// Constants & Configuration
// ============================================================================

const API_CONFIG = {
    endpoint: 'http://legislatie.just.ro/apiws/FreeWebService.svc',
    namespace: 'http://tempuri.org/',
    soapActions: {
        GetToken: 'http://tempuri.org/IFreeWebService/GetToken',
        Search: 'http://tempuri.org/IFreeWebService/Search',
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) INMAiMentor/1.0',
    tokenExpiryMinutes: 20,
};

// ============================================================================
// SOAP XML Templates (from API research document)
// ============================================================================

function buildGetTokenXml(): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <Action s:mustUnderstand="1" xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">${API_CONFIG.soapActions.GetToken}</Action>
  </s:Header>
  <s:Body>
    <GetToken xmlns="${API_CONFIG.namespace}" />
  </s:Body>
</s:Envelope>`;
}

function buildSearchXml(token: string, params: SearchParams): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <Action s:mustUnderstand="1" xmlns="http://schemas.microsoft.com/ws/2005/05/addressing/none">${API_CONFIG.soapActions.Search}</Action>
  </s:Header>
  <s:Body>
    <Search xmlns="${API_CONFIG.namespace}">
      <tokenKey>${token}</tokenKey>
      <searchModel xmlns:d4p1="http://schemas.datacontract.org/2004/07/LegislatieFW.Models" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
        <d4p1:NumarPagina>${params.pageNumber || 1}</d4p1:NumarPagina>
        <d4p1:RezultatePagina>${params.resultsPerPage || 10}</d4p1:RezultatePagina>
        <d4p1:SearchAn>${params.year || 0}</d4p1:SearchAn>
        <d4p1:SearchNumar>${params.number || ''}</d4p1:SearchNumar>
        <d4p1:SearchTitlu>${params.title || ''}</d4p1:SearchTitlu>
      </searchModel>
    </Search>
  </s:Body>
</s:Envelope>`;
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface SearchParams {
    year?: number;
    number?: string;
    title?: string;
    pageNumber?: number;
    resultsPerPage?: number;
}

export interface LegalAct {
    Id?: number;
    Titlu: string;
    Text?: string;
    DataVigoare?: string;
    Emitent?: string;
    Publicatie?: string;
    TipAct?: string;
    NumarAct?: string;
    AnAct?: number;
    LinkHtml?: string;
}

interface RawSoapClientState {
    token: string | null;
    tokenExpiry: Date | null;
    requestCount: number;
}

// ============================================================================
// Raw HTTP SOAP Client Class
// ============================================================================

class RawLegislativeApiClient {
    private state: RawSoapClientState = {
        token: null,
        tokenExpiry: null,
        requestCount: 0,
    };

    /**
     * Make a raw SOAP request with proper headers and POST method
     * Uses SOAP 1.2 format for WCF compatibility
     */
    private async soapRequest(xml: string, soapAction: string): Promise<string> {
        this.state.requestCount++;
        console.log(`[RawSOAP] Request #${this.state.requestCount} to ${API_CONFIG.endpoint}`);
        console.log(`[RawSOAP] SOAPAction: ${soapAction}`);
        console.log(`[RawSOAP] XML Body (first 500 chars): ${xml.substring(0, 500)}...`);

        try {
            // Try SOAP 1.2 format (application/soap+xml includes action in Content-Type)
            const response = await axios.post(API_CONFIG.endpoint, xml, {
                headers: {
                    // SOAP 1.2 format - action included in Content-Type
                    'Content-Type': `application/soap+xml; charset=utf-8; action="${soapAction}"`,
                    // Also include SOAPAction header for SOAP 1.1 fallback
                    'SOAPAction': `"${soapAction}"`,
                    'Accept': 'application/soap+xml, text/xml, application/xml, */*',
                    'User-Agent': API_CONFIG.userAgent,
                },
                timeout: 30000,
                // Prevent axios from following redirects which might return HTML
                maxRedirects: 0,
            });

            console.log(`[RawSOAP] Response status: ${response.status}`);
            console.log(`[RawSOAP] Response Content-Type: ${response.headers['content-type']}`);
            console.log(`[RawSOAP] Response (first 500 chars): ${String(response.data).substring(0, 500)}...`);

            return response.data;
        } catch (error: any) {
            console.error(`[RawSOAP] Request failed:`, error.message);
            if (error.response) {
                console.error(`[RawSOAP] Response status: ${error.response.status}`);
                console.error(`[RawSOAP] Response headers: ${JSON.stringify(error.response.headers)}`);
                console.error(`[RawSOAP] Response data (first 1000): ${String(error.response.data).substring(0, 1000)}`);
            }
            throw error;
        }
    }

    /**
     * Parse token from SOAP response XML
     */
    private parseTokenFromXml(xml: string): string | null {
        // Match: <GetTokenResult>TOKEN_VALUE</GetTokenResult>
        const match = xml.match(/<GetTokenResult>([^<]+)<\/GetTokenResult>/);
        if (match && match[1]) {
            return match[1];
        }

        // Alternative namespace patterns
        const altMatch = xml.match(/<a:GetTokenResult>([^<]+)<\/a:GetTokenResult>/);
        if (altMatch && altMatch[1]) {
            return altMatch[1];
        }

        console.warn('[RawSOAP] Could not parse token from response');
        return null;
    }

    /**
     * Parse search results from SOAP response XML
     */
    private parseSearchResultsFromXml(xml: string): LegalAct[] {
        const results: LegalAct[] = [];

        // Simple regex-based XML parsing (for robustness, consider using fast-xml-parser)
        const actMatches = Array.from(xml.matchAll(/<a:Lege>([\s\S]*?)<\/a:Lege>/g));

        for (const match of actMatches) {
            const actXml = match[1];

            const act: LegalAct = {
                Titlu: this.extractXmlValue(actXml, 'Titlu') || 'Unknown',
                Id: parseInt(this.extractXmlValue(actXml, 'Id') || '0'),
                Text: this.extractXmlValue(actXml, 'Text'),
                TipAct: this.extractXmlValue(actXml, 'TipAct'),
                NumarAct: this.extractXmlValue(actXml, 'NumarAct'),
                AnAct: parseInt(this.extractXmlValue(actXml, 'AnAct') || '0'),
                Emitent: this.extractXmlValue(actXml, 'Emitent'),
                Publicatie: this.extractXmlValue(actXml, 'Publicatie'),
                DataVigoare: this.extractXmlValue(actXml, 'DataVigoare'),
                LinkHtml: this.extractXmlValue(actXml, 'LinkHtml'),
            };

            results.push(act);
        }

        return results;
    }

    private extractXmlValue(xml: string, tag: string): string | undefined {
        // Try with namespace prefix
        const prefixedMatch = xml.match(new RegExp(`<a:${tag}>([^<]*)<\/a:${tag}>`));
        if (prefixedMatch && prefixedMatch[1]) {
            return prefixedMatch[1];
        }

        // Try without prefix
        const simpleMatch = xml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
        if (simpleMatch && simpleMatch[1]) {
            return simpleMatch[1];
        }

        return undefined;
    }

    // ==========================================================================
    // Public API Methods
    // ==========================================================================

    /**
     * Get authentication token from API
     */
    async getToken(): Promise<string> {
        console.log('[RawSOAP] Requesting new token...');

        const xml = buildGetTokenXml();
        const response = await this.soapRequest(xml, API_CONFIG.soapActions.GetToken);

        const token = this.parseTokenFromXml(response);
        if (!token) {
            throw new Error('Failed to parse token from API response');
        }

        this.state.token = token;
        this.state.tokenExpiry = new Date(Date.now() + API_CONFIG.tokenExpiryMinutes * 60 * 1000);

        console.log(`[RawSOAP] Token obtained: ${token.substring(0, 10)}...`);
        console.log(`[RawSOAP] Token expires at: ${this.state.tokenExpiry.toISOString()}`);

        return token;
    }

    /**
     * Ensure we have a valid token
     */
    async ensureToken(): Promise<string> {
        const now = new Date();

        if (this.state.token && this.state.tokenExpiry && this.state.tokenExpiry > now) {
            console.log('[RawSOAP] Using cached token');
            return this.state.token;
        }

        console.log('[RawSOAP] Token expired or missing, refreshing...');
        return await this.getToken();
    }

    /**
     * Search for legal acts
     */
    async search(params: SearchParams): Promise<LegalAct[]> {
        const token = await this.ensureToken();

        console.log('[RawSOAP] Searching with params:', params);

        const xml = buildSearchXml(token, params);
        const response = await this.soapRequest(xml, API_CONFIG.soapActions.Search);

        const results = this.parseSearchResultsFromXml(response);
        console.log(`[RawSOAP] Found ${results.length} legal acts`);

        return results;
    }

    /**
     * Get a specific legal act by number and year
     */
    async getActByNumber(number: string, year: number): Promise<LegalAct | null> {
        const results = await this.search({ number, year, resultsPerPage: 5 });

        // Find exact match
        const exactMatch = results.find(act =>
            act.NumarAct === number && act.AnAct === year
        );

        if (!exactMatch) {
            console.warn(`[RawSOAP] No exact match for ${number}/${year}`);
        }

        return exactMatch || results[0] || null;
    }

    /**
     * Get authentication status
     */
    getAuthStatus(): { authenticated: boolean; tokenExpiry: Date | null; requestCount: number } {
        const now = new Date();
        return {
            authenticated: !!(this.state.token && this.state.tokenExpiry && this.state.tokenExpiry > now),
            tokenExpiry: this.state.tokenExpiry,
            requestCount: this.state.requestCount,
        };
    }

    /**
     * Invalidate token (for testing)
     */
    invalidateToken(): void {
        this.state.token = null;
        this.state.tokenExpiry = null;
        console.log('[RawSOAP] Token invalidated');
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientInstance: RawLegislativeApiClient | null = null;

export function getRawLegislativeApiClient(): RawLegislativeApiClient {
    if (!clientInstance) {
        clientInstance = new RawLegislativeApiClient();
    }
    return clientInstance;
}

// ============================================================================
// Test Routes for Raw Client
// ============================================================================

import type { Express, Request, Response } from "express";

export function registerRawLegislativeTestRoutes(app: Express): void {

    // Test GetToken
    app.get("/api/test/raw-legislative/token", async (req: Request, res: Response) => {
        try {
            const client = getRawLegislativeApiClient();
            const token = await client.getToken();

            res.json({
                success: true,
                token: token.substring(0, 20) + '...',
                status: client.getAuthStatus(),
            });
        } catch (error: any) {
            console.error('[Raw Test] GetToken failed:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                details: error.response?.data || null,
            });
        }
    });

    // Test Search by number/year
    app.get("/api/test/raw-legislative/search/:number/:year", async (req: Request, res: Response) => {
        try {
            const { number, year } = req.params;
            const client = getRawLegislativeApiClient();

            const result = await client.getActByNumber(number, parseInt(year));

            res.json({
                success: true,
                query: { number, year: parseInt(year) },
                result,
            });
        } catch (error: any) {
            console.error('[Raw Test] Search failed:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                details: error.response?.data || null,
            });
        }
    });

    // Test Search by title
    app.get("/api/test/raw-legislative/search-by-title", async (req: Request, res: Response) => {
        try {
            const { title } = req.query;

            if (!title || typeof title !== 'string') {
                return res.status(400).json({ success: false, error: 'Title parameter required' });
            }

            const client = getRawLegislativeApiClient();
            const results = await client.search({ title, resultsPerPage: 10 });

            res.json({
                success: true,
                query: { title },
                count: results.length,
                results,
            });
        } catch (error: any) {
            console.error('[Raw Test] Title search failed:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                details: error.response?.data || null,
            });
        }
    });

    // Get auth status
    app.get("/api/test/raw-legislative/status", async (req: Request, res: Response) => {
        try {
            const client = getRawLegislativeApiClient();
            res.json({
                success: true,
                status: client.getAuthStatus(),
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });

    console.log('[RawLegislative] Test routes registered');
}
