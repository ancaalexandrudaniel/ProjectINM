import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';
import { XMLParser } from 'fast-xml-parser';

/**
 * Portal Just API Client for portal.just.ro
 * 
 * This client provides access to the Romanian court system's portal,
 * specifically for querying legal cases and court decisions.
 * 
 * API Documentation: http://portalquery.just.ro/Query.asmx
 */

// ============================================================================
// Type Definitions & Validation Schemas
// ============================================================================

// Court case search result schema
const CaseSchema = z.object({
    NumarDosar: z.string(),
    InstantaNumeDenumire: z.string(),
    DataInregistrare: z.string().optional(),
    ObiectelePeScurt: z.string().optional(),
    Stadiu: z.string().optional(),
    Complet: z.string().optional(),
    DataUltimeiModificari: z.string().optional(),
});

// Court session schema
const SessionSchema = z.object({
    NumarDosar: z.string(),
    DataSedinta: z.string(),
    OraSedinta: z.string().optional(),
    TipSedinta: z.string().optional(),
    Sala: z.string().optional(),
    InstantaNumeDenumire: z.string(),
    ObservatiilePeScurt: z.string().optional(),
});

export type CourtCase = z.infer<typeof CaseSchema>;
export type CourtSession = z.infer<typeof SessionSchema>;

export interface CaseSearchParams {
    numarDosar?: string;
    institutie?: string;
    dataInregistrareStart?: string; // Format: DD.MM.YYYY
    dataInregistrareEnd?: string;   // Format: DD.MM.YYYY
    parteNumePrenume?: string;
}

export interface SessionSearchParams {
    numarDosar?: string;
    institutie?: string;
    dataSedintaStart?: string; // Format: DD.MM.YYYY
    dataSedintaEnd?: string;   // Format: DD.MM.YYYY
}

// Response wrapper types
interface QueryApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

// ============================================================================
// Portal Just API Client Class
// ============================================================================

export class PortalJustApiClient {
    private static readonly BASE_URL = 'http://portalquery.just.ro';
    private static readonly QUERY_ENDPOINT = '/Query.asmx';

    private axiosInstance: AxiosInstance;
    private requestCount: number = 0;
    private lastRequestTime: number = 0;
    private minDelayMs: number = 2000; // 2 seconds between requests (rate limiting)

    constructor() {
        this.axiosInstance = axios.create({
            baseURL: PortalJustApiClient.BASE_URL,
            timeout: 30000, // 30 seconds timeout
            headers: {
                'User-Agent': 'INMAiMentor-Bot/1.0 (legal education platform)',
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        // Add request interceptor for logging
        this.axiosInstance.interceptors.request.use(
            (config) => {
                console.log(`[PortalJust] ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => {
                console.error('[PortalJust] Request error:', error);
                return Promise.reject(error);
            }
        );

        // Add response interceptor for logging
        this.axiosInstance.interceptors.response.use(
            (response) => {
                console.log(`[PortalJust] Response status: ${response.status}`);
                return response;
            },
            (error) => {
                console.error('[PortalJust] Response error:', error.message);
                return Promise.reject(error);
            }
        );
    }

    // ==========================================================================
    // Public Methods
    // ==========================================================================

    /**
     * Search for court cases
     */
    async searchCases(params: CaseSearchParams): Promise<QueryApiResponse<CourtCase[]>> {
        await this.enforceRateLimit();

        try {
            console.log('[PortalJust] Searching cases with params:', params);

            // Build SOAP/REST query parameters
            const queryParams = new URLSearchParams();

            if (params.numarDosar) {
                queryParams.append('numarDosar', params.numarDosar);
            }
            if (params.institutie) {
                queryParams.append('institutie', params.institutie);
            }
            if (params.dataInregistrareStart) {
                queryParams.append('dataInregistrareStart', params.dataInregistrareStart);
            }
            if (params.dataInregistrareEnd) {
                queryParams.append('dataInregistrareEnd', params.dataInregistrareEnd);
            }
            if (params.parteNumePrenume) {
                queryParams.append('parteNumePrenume', params.parteNumePrenume);
            }

            // Call the CautareDosare method
            const response = await this.axiosInstance.post(
                `${PortalJustApiClient.QUERY_ENDPOINT}/CautareDosare`,
                queryParams.toString()
            );

            // Parse response (API might return XML/JSON)
            const cases = this.parseQueryResponse(response.data, CaseSchema);

            console.log(`[PortalJust] Found ${cases.length} cases`);

            return {
                success: true,
                data: cases,
            };
        } catch (error) {
            console.error('[PortalJust] Case search failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Search for court sessions
     */
    async searchSessions(params: SessionSearchParams): Promise<QueryApiResponse<CourtSession[]>> {
        await this.enforceRateLimit();

        try {
            console.log('[PortalJust] Searching sessions with params:', params);

            const queryParams = new URLSearchParams();

            if (params.numarDosar) {
                queryParams.append('numarDosar', params.numarDosar);
            }
            if (params.institutie) {
                queryParams.append('institutie', params.institutie);
            }
            if (params.dataSedintaStart) {
                queryParams.append('dataSedintaStart', params.dataSedintaStart);
            }
            if (params.dataSedintaEnd) {
                queryParams.append('dataSedintaEnd', params.dataSedintaEnd);
            }

            // Call the CautareSedinte method
            const response = await this.axiosInstance.post(
                `${PortalJustApiClient.QUERY_ENDPOINT}/CautareSedinte`,
                queryParams.toString()
            );

            const sessions = this.parseQueryResponse(response.data, SessionSchema);

            console.log(`[PortalJust] Found ${sessions.length} sessions`);

            return {
                success: true,
                data: sessions,
            };
        } catch (error) {
            console.error('[PortalJust] Session search failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Search for ÎCCJ (Supreme Court) decisions by type
     * Useful for RIL (Recurs în interesul legii) and HP (Hotărâre prealabilă)
     */
    async searchICCJDecisions(params: {
        decisionType?: 'RIL' | 'HP' | 'ALL';
        year?: number;
        numarDosar?: string;
    }): Promise<QueryApiResponse<CourtCase[]>> {
        // ÎCCJ is the Supreme Court (Înalta Curte de Casație și Justiție)
        const icccjCases = await this.searchCases({
            institutie: 'Înalta Curte de Casație și Justiție',
            numarDosar: params.numarDosar,
        });

        if (!icccjCases.success || !icccjCases.data) {
            return icccjCases;
        }

        // Filter by decision type if specified
        let filteredCases = icccjCases.data;

        if (params.decisionType && params.decisionType !== 'ALL') {
            const type = params.decisionType;
            filteredCases = filteredCases.filter(c =>
                c.NumarDosar.includes(type)
            );
        }

        // Filter by year if specified
        if (params.year) {
            filteredCases = filteredCases.filter(c => {
                const yearMatch = c.DataInregistrare?.match(/\d{4}$/);
                return yearMatch && parseInt(yearMatch[0]) === params.year;
            });
        }

        console.log(`[PortalJust] Filtered to ${filteredCases.length} ÎCCJ decisions`);

        return {
            success: true,
            data: filteredCases,
        };
    }

    /**
     * Search for Constitutional Court (CCR) decisions
     */
    async searchCCRDecisions(params: {
        year?: number;
        numarDosar?: string;
    }): Promise<QueryApiResponse<CourtCase[]>> {
        const ccrCases = await this.searchCases({
            institutie: 'Curtea Constituțională',
            numarDosar: params.numarDosar,
        });

        if (!ccrCases.success || !ccrCases.data) {
            return ccrCases;
        }

        let filteredCases = ccrCases.data;

        // Filter by year if specified
        if (params.year) {
            filteredCases = filteredCases.filter(c => {
                const yearMatch = c.DataInregistrare?.match(/\d{4}$/);
                return yearMatch && parseInt(yearMatch[0]) === params.year;
            });
        }

        console.log(`[PortalJust] Filtered to ${filteredCases.length} CCR decisions`);

        return {
            success: true,
            data: filteredCases,
        };
    }

    // ==========================================================================
    // Private Helper Methods
    // ==========================================================================

    /**
     * Enforce rate limiting (2 seconds between requests)
     */
    private async enforceRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.minDelayMs) {
            const delay = this.minDelayMs - timeSinceLastRequest;
            console.log(`[PortalJust] Rate limiting: waiting ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        this.lastRequestTime = Date.now();
        this.requestCount++;
        console.log(`[PortalJust] Request #${this.requestCount}`);
    }

    /**
     * Parse API response (handles both XML and JSON responses)
     */
    private parseQueryResponse<T>(data: any, schema: z.ZodSchema<T>): T[] {
        let parsedData = data;

        // If data is a string (XML), parse it
        if (typeof data === 'string') {
            try {
                // Configure parser to keep values as strings to match Zod schema
                const parser = new XMLParser({
                    ignoreAttributes: true,
                    parseTagValue: false,
                    trimValues: true,
                });
                parsedData = parser.parse(data);
            } catch (error) {
                console.error('[PortalJust] XML parsing failed:', error);
                return [];
            }
        }

        // Search strategy: find all objects in the tree that satisfy the schema
        const results: T[] = [];
        const visited = new Set();

        // Helper function to recursively traverse the object tree
        const traverse = (node: any) => {
            if (!node || typeof node !== 'object') return;
            if (visited.has(node)) return;
            visited.add(node);

            // 1. Check if current node is an array, if so traverse items
            if (Array.isArray(node)) {
                for (const item of node) {
                    traverse(item);
                }
                return;
            }

            // 2. Check if current object matches the schema
            const validationResult = schema.safeParse(node);
            if (validationResult.success) {
                results.push(validationResult.data);
                // If it matches, we assume it's a leaf item we want.
                return;
            }

            // 3. If not a match, traverse children properties
            for (const key in node) {
                if (Object.prototype.hasOwnProperty.call(node, key)) {
                    traverse(node[key]);
                }
            }
        };

        traverse(parsedData);

        if (results.length > 0) {
            return results;
        }

        console.warn('[PortalJust] No valid items found in response matching schema');
        return [];
    }

    /**
     * Get request statistics
     */
    getStats(): { requestCount: number; lastRequestTime: Date | null } {
        return {
            requestCount: this.requestCount,
            lastRequestTime: this.lastRequestTime > 0 ? new Date(this.lastRequestTime) : null,
        };
    }
}

// ============================================================================
// Singleton Instance Export
// ============================================================================

let clientInstance: PortalJustApiClient | null = null;

/**
 * Get or create singleton instance of Portal Just API Client
 */
export function getPortalJustApiClient(): PortalJustApiClient {
    if (!clientInstance) {
        clientInstance = new PortalJustApiClient();
    }
    return clientInstance;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract decision number from case number
 * Example: "Dosar nr. 1234/2024" → "1234/2024"
 */
export function extractDecisionNumber(caseNumber: string): string | null {
    const match = caseNumber.match(/(\d+\/\d{4})/);
    return match ? match[1] : null;
}

/**
 * Check if case is a RIL (Recurs în interesul legii)
 */
export function isRILCase(caseNumber: string): boolean {
    return caseNumber.toUpperCase().includes('RIL');
}

/**
 * Check if case is a HP (Hotărâre prealabilă)
 */
export function isHPCase(caseNumber: string): boolean {
    return caseNumber.toUpperCase().includes('HP');
}

/**
 * Format date for API (DD.MM.YYYY)
 */
export function formatDateForApi(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}
