import soap from 'soap';
import { z } from 'zod';

/**
 * Legislative API Client for legislatie.just.ro
 * 
 * This client implements the SOAP protocol to interact with the official
 * Romanian Ministry of Justice legislative database API.
 * 
 * API Documentation: http://legislatie.just.ro/serviciulweblegislatie.htm
 */

// ============================================================================
// Type Definitions & Validation Schemas
// ============================================================================

// SOAP API Response Schemas
const TokenResponseSchema = z.object({
    GetTokenResult: z.string(),
});

const LegalActSchema = z.object({
    Id: z.number().optional(),
    Titlu: z.string(),
    Text: z.string().optional(),
    DataVigoare: z.string().optional(),
    Emitent: z.string().optional(),
    Publicatie: z.string().optional(),
    TipAct: z.string().optional(),
    NumarAct: z.string().optional(),
    AnAct: z.number().optional(),
});

const SearchResponseSchema = z.object({
    SearchResult: z.object({
        Legi: z.array(LegalActSchema).optional(),
    }).optional(),
});

export type LegalAct = z.infer<typeof LegalActSchema>;

export interface SearchParams {
    year?: number;
    number?: string;
    title?: string;
    pageNumber?: number;
    resultsPerPage?: number;
}

export interface AuthConfig {
    tokenRefreshThreshold: number; // minutes before expiry to refresh token
    maxRetries: number;
    retryDelayMs: number;
}

// ============================================================================
// Legislative API Client Class
// ============================================================================

export class LegislativeApiClient {
    private static readonly WSDL_URL = 'http://legislatie.just.ro/apiws/FreeWebService.svc?wsdl';
    private static readonly BASE_URL = 'http://legislatie.just.ro/apiws/FreeWebService.svc';
    private static readonly NAMESPACE = 'http://tempuri.org/';

    // SOAPAction headers required for each method (from API research)
    private static readonly SOAP_ACTIONS = {
        GetToken: 'http://tempuri.org/IFreeWebService/GetToken',
        Search: 'http://tempuri.org/IFreeWebService/Search',
    };

    private static readonly DEFAULT_CONFIG: AuthConfig = {
        tokenRefreshThreshold: 3, // refresh 3 minutes before expiry (token lasts 20 min)
        maxRetries: 3,
        retryDelayMs: 2000,
    };

    private client: soap.Client | null = null;
    private token: string | null = null;
    private tokenExpiry: Date | null = null;
    private config: AuthConfig;

    constructor(config: Partial<AuthConfig> = {}) {
        this.config = { ...LegislativeApiClient.DEFAULT_CONFIG, ...config };
    }

    // ==========================================================================
    // Public Methods
    // ==========================================================================

    /**
     * Initialize SOAP client and authenticate
     */
    async initialize(): Promise<void> {
        try {
            console.log('[LegislativeAPI] Initializing SOAP client...');

            // Create SOAP client with custom options for correct headers
            this.client = await soap.createClientAsync(LegislativeApiClient.WSDL_URL, {
                wsdl_headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) INMAiMentor/1.0',
                },
            });

            // Add default HTTP headers for all requests
            this.client.addHttpHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) INMAiMentor/1.0');

            console.log('[LegislativeAPI] SOAP client created successfully');
            console.log('[LegislativeAPI] Available methods:', Object.keys(this.client.describe()));

            await this.authenticate();
            console.log('[LegislativeAPI] Authentication successful');
        } catch (error) {
            console.error('[LegislativeAPI] Initialization failed:', error);
            throw new Error(`Failed to initialize Legislative API client: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Search for legal acts by various parameters
     */
    async searchLegislation(params: SearchParams): Promise<LegalAct[]> {
        await this.ensureAuthenticated();

        const searchParams = {
            tokenKey: this.token,
            NumarPagina: params.pageNumber || 1,
            RezultatePagina: params.resultsPerPage || 10,
            SearchAn: params.year || 0,
            SearchNumar: params.number || '',
            SearchTitlu: params.title || '',
        };

        console.log(`[LegislativeAPI] Searching with params:`, {
            year: params.year,
            number: params.number,
            title: params.title,
        });

        try {
            const result = await this.executeWithRetry(async () => {
                if (!this.client) throw new Error('SOAP client not initialized');

                // Set explicit SOAPAction header for Search method (critical!)
                this.client.addHttpHeader('SOAPAction', LegislativeApiClient.SOAP_ACTIONS.Search);

                return await this.client.SearchAsync(searchParams);
            });

            const validated = SearchResponseSchema.parse(result[0]);
            const acts = validated.SearchResult?.Legi || [];

            console.log(`[LegislativeAPI] Found ${acts.length} legal acts`);
            return acts;
        } catch (error) {
            console.error('[LegislativeAPI] Search failed:', error);
            throw new Error(`Failed to search legislation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get a specific legal act by year and number (e.g., 287/2009)
     */
    async getLegalActByNumber(year: number, number: string): Promise<LegalAct | null> {
        const results = await this.searchLegislation({ year, number });

        // Filter to exact match (API might return partial matches)
        const exactMatch = results.find(act =>
            act.AnAct === year && act.NumarAct === number
        );

        if (!exactMatch) {
            console.warn(`[LegislativeAPI] No exact match found for ${number}/${year}`);
            return null;
        }

        return exactMatch;
    }

    /**
     * Get full text of a legal act
     * Note: Some acts may require separate API call for full text
     */
    async getFullText(actId: number): Promise<string> {
        await this.ensureAuthenticated();

        // Implementation depends on API capabilities
        // For now, relying on Text field from Search results
        throw new Error('Full text retrieval not yet implemented - use Search results');
    }

    // ==========================================================================
    // Private Authentication Methods
    // ==========================================================================

    /**
     * Authenticate and obtain access token
     * Critical: Must set SOAPAction header explicitly per API research
     */
    private async authenticate(): Promise<void> {
        if (!this.client) {
            throw new Error('SOAP client not initialized. Call initialize() first.');
        }

        try {
            console.log('[LegislativeAPI] Requesting authentication token...');

            // Set explicit SOAPAction header (critical for this API!)
            this.client.addHttpHeader('SOAPAction', LegislativeApiClient.SOAP_ACTIONS.GetToken);

            const result = await this.client.GetTokenAsync({});
            console.log('[LegislativeAPI] GetToken raw response:', JSON.stringify(result, null, 2));

            const validated = TokenResponseSchema.parse(result[0]);

            this.token = validated.GetTokenResult;
            // Token expires after 20 minutes of inactivity (per API research document)
            this.tokenExpiry = new Date(Date.now() + 20 * 60 * 1000);

            console.log(`[LegislativeAPI] Token obtained: ${this.token?.substring(0, 10)}...`);
            console.log(`[LegislativeAPI] Token expires at: ${this.tokenExpiry.toISOString()}`);
        } catch (error) {
            console.error('[LegislativeAPI] Authentication failed:', error);
            throw new Error(`Failed to authenticate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Ensure we have a valid token, refreshing if necessary
     */
    private async ensureAuthenticated(): Promise<void> {
        if (!this.client) {
            await this.initialize();
        }

        const needsRefresh = !this.token ||
            !this.tokenExpiry ||
            this.isTokenExpiringSoon();

        if (needsRefresh) {
            console.log('[LegislativeAPI] Token expired or expiring soon, refreshing...');
            await this.authenticate();
        }
    }

    /**
     * Check if token is expiring soon based on threshold
     */
    private isTokenExpiringSoon(): boolean {
        if (!this.tokenExpiry) return true;

        const thresholdMs = this.config.tokenRefreshThreshold * 60 * 1000;
        const timeUntilExpiry = this.tokenExpiry.getTime() - Date.now();

        return timeUntilExpiry < thresholdMs;
    }

    // ==========================================================================
    // Retry Logic & Error Handling
    // ==========================================================================

    /**
     * Execute a function with retry logic
     */
    private async executeWithRetry<T>(
        fn: () => Promise<T>,
        attempt: number = 1
    ): Promise<T> {
        try {
            return await fn();
        } catch (error) {
            if (attempt >= this.config.maxRetries) {
                console.error(`[LegislativeAPI] Max retries (${this.config.maxRetries}) exceeded`);
                throw error;
            }

            const isAuthError = error instanceof Error &&
                (error.message.includes('token') ||
                    error.message.includes('auth'));

            if (isAuthError) {
                console.warn(`[LegislativeAPI] Auth error on attempt ${attempt}, re-authenticating...`);
                await this.authenticate();
            } else {
                console.warn(`[LegislativeAPI] Request failed on attempt ${attempt}, retrying...`);
            }

            // Exponential backoff
            const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));

            return this.executeWithRetry(fn, attempt + 1);
        }
    }

    // ==========================================================================
    // Utility Methods
    // ==========================================================================

    /**
     * Get current authentication status
     */
    getAuthStatus(): { authenticated: boolean; tokenExpiry: Date | null } {
        return {
            authenticated: !!this.token && !this.isTokenExpiringSoon(),
            tokenExpiry: this.tokenExpiry,
        };
    }

    /**
     * Manually invalidate token (for testing or forced refresh)
     */
    invalidateToken(): void {
        this.token = null;
        this.tokenExpiry = null;
        console.log('[LegislativeAPI] Token manually invalidated');
    }
}

// ============================================================================
// Singleton Instance Export
// ============================================================================

let clientInstance: LegislativeApiClient | null = null;

/**
 * Get or create singleton instance of Legislative API Client
 */
export function getLegislativeApiClient(): LegislativeApiClient {
    if (!clientInstance) {
        clientInstance = new LegislativeApiClient();
    }
    return clientInstance;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse act number format (e.g., "287/2009" → { number: "287", year: 2009 })
 */
export function parseActNumber(actNumber: string): { number: string; year: number } | null {
    const match = actNumber.match(/^(\d+)\/(\d{4})$/);
    if (!match) return null;

    return {
        number: match[1],
        year: parseInt(match[2], 10),
    };
}

/**
 * Format legal act for display
 */
export function formatLegalAct(act: LegalAct): string {
    return `${act.TipAct || 'Act'} ${act.NumarAct}/${act.AnAct} - ${act.Titlu}`;
}
