import soap from 'soap';
import { z } from 'zod';

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
// Note: SOAP response fields match WSDL definition
const CaseSchema = z.object({
    numar: z.string().optional(),
    numarVechi: z.string().optional(),
    data: z.date().optional(), // Date object from SOAP
    institutie: z.string().optional(), // Enum value
    departament: z.string().optional(),
    categorieCaz: z.string().optional(),
    stadiuProcesual: z.string().optional(),
    obiect: z.string().optional(),
    // Handle XML array conversion quirks (object vs array)
    parti: z.any().optional()
}).transform(data => ({
    NumarDosar: data.numar || '',
    InstantaNumeDenumire: data.institutie || '',
    DataInregistrare: data.data ? data.data.toISOString() : '',
    ObiectelePeScurt: data.obiect || '',
    Stadiu: data.stadiuProcesual || '',
    Complet: '', // Not always available in simple view
    DataUltimeiModificari: ''
}));

// Court session schema
const SessionSchema = z.object({
    departament: z.string().optional(),
    complet: z.string().optional(),
    data: z.date().optional(),
    ora: z.string().optional(),
    dosare: z.any().optional() // ArrayOfSedintaDosar
}).transform(data => ({
    NumarDosar: '', // Aggregated
    DataSedinta: data.data ? data.data.toISOString() : '',
    OraSedinta: data.ora || '',
    TipSedinta: '',
    Sala: '',
    InstantaNumeDenumire: '',
    ObservatiilePeScurt: ''
}));

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
    private static readonly WSDL_URL = 'http://portalquery.just.ro/Query.asmx?wsdl';
    private static readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    private client: soap.Client | null = null;
    private requestCount: number = 0;
    private lastRequestTime: number = 0;
    private minDelayMs: number = 2000; // 2 seconds between requests

    // Helper to map user-friendly names to SOAP Enum values
    // Example: "Curtea de Apel Bucuresti" -> "CurteadeApelBUCURESTI"
    private mapInstitution(name: string): string {
        if (!name) return 'CurteadeApelBUCURESTI'; // Default

        // Hardcoded common mappings for testing/demo
        const commonMappings: Record<string, string> = {
            'Curtea de Apel Bucureşti': 'CurteadeApelBUCURESTI',
            'Curtea de Apel Bucuresti': 'CurteadeApelBUCURESTI',
            'Tribunalul Bucureşti': 'TribunalulBUCURESTI',
            'Tribunalul Bucuresti': 'TribunalulBUCURESTI',
            'Curtea de Apel Cluj': 'CurteadeApelCLUJ',
            'Curtea de Apel Alba Iulia': 'CurteadeApelALBAIULIA'
        };

        if (commonMappings[name]) {
            return commonMappings[name];
        }

        // Remove spaces and special chars, try to match pattern
        // Simple heuristic: remove spaces, remove ' de ', uppercase city
        let normalized = name.replace(/\s/g, '');
        // Replace diacritics
        normalized = normalized.replace(/[ăâ]/g, 'a').replace(/[î]/g, 'i').replace(/[șş]/g, 's').replace(/[țţ]/g, 't');

        // Try to uppercase the city part (heuristic: assumes InstitutionType + City)
        // This is fragile but better than nothing for unknown inputs
        return normalized;
    }

    // ==========================================================================
    // Public Methods
    // ==========================================================================

    /**
     * Initialize SOAP Client
     */
    async initialize(): Promise<void> {
        if (this.client) return;

        try {
            console.log('[PortalJust] Initializing SOAP client...');
            this.client = await soap.createClientAsync(PortalJustApiClient.WSDL_URL, {
                wsdl_headers: { 'User-Agent': PortalJustApiClient.USER_AGENT },
                headers: { 'User-Agent': PortalJustApiClient.USER_AGENT }
            });
            console.log('[PortalJust] Client initialized.');
        } catch (error) {
            console.error('[PortalJust] Init failed:', error);
            throw error;
        }
    }

    /**
     * Search for court cases
     */
    async searchCases(params: CaseSearchParams): Promise<QueryApiResponse<CourtCase[]>> {
        await this.enforceRateLimit();
        if (!this.client) await this.initialize();

        try {
            console.log('[PortalJust] Searching cases with params:', params);

            const soapParams = {
                numarDosar: params.numarDosar || '',
                obiectDosar: '',
                numeParte: params.parteNumePrenume || '',
                institutie: this.mapInstitution(params.institutie || ''),
                dataStart: params.dataInregistrareStart ? new Date(params.dataInregistrareStart) : null,
                dataStop: params.dataInregistrareEnd ? new Date(params.dataInregistrareEnd) : null,
                dataUltimaModificareStart: null,
                dataUltimaModificareStop: null
            };

            const result = await this.client!.CautareDosareAsync(soapParams);
            const rawData = result[0];

            // Check for CautareDosareResult which contains ArrayOfDosar
            const dosare = rawData?.CautareDosareResult?.Dosar || [];

            const cases = Array.isArray(dosare) ? dosare.map((d: any) => CaseSchema.parse(d)) :
                          (dosare ? [CaseSchema.parse(dosare)] : []);

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
        if (!this.client) await this.initialize();

        try {
            const soapParams = {
                dataSedinta: params.dataSedintaStart ? new Date(params.dataSedintaStart) : new Date(),
                institutie: this.mapInstitution(params.institutie || '')
            };

            const result = await this.client!.CautareSedinteAsync(soapParams);
            const rawData = result[0];

            const sedinte = rawData?.CautareSedinteResult?.Sedinta || [];
            const sessions = Array.isArray(sedinte) ? sedinte.map((s: any) => SessionSchema.parse(s)) :
                             (sedinte ? [SessionSchema.parse(sedinte)] : []);

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
            filteredCases = filteredCases.filter(c =>
                c.NumarDosar.includes(params.decisionType)
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
        // TODO: Implement XML parsing if API returns XML
        // For now, assuming JSON response or need to parse XML

        // If data is already an array, validate each item
        if (Array.isArray(data)) {
            return data.map(item => schema.parse(item));
        }

        // If data is a string (XML), parse it
        if (typeof data === 'string') {
            // Basic XML parsing - in production, use a proper XML parser like 'fast-xml-parser'
            console.warn('[PortalJust] XML parsing not fully implemented, returning empty array');
            return [];
        }

        // If response has a specific structure, extract the array
        if (data && typeof data === 'object') {
            // Try to find array in common response structures
            const possibleArrayKeys = ['results', 'data', 'items', 'dosare', 'sedinte'];

            for (const key of possibleArrayKeys) {
                if (Array.isArray(data[key])) {
                    return data[key].map((item: any) => schema.parse(item));
                }
            }
        }

        // Fallback: return empty array
        console.warn('[PortalJust] Could not parse response, returning empty array');
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
