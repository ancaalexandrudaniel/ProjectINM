import type { Express, Request, Response } from "express";
import { getLegislativeApiClient, parseActNumber } from "./legislative-api";

/**
 * Test routes for Legislative API Client
 * These endpoints allow testing the SOAP integration before full implementation
 */

export function registerLegislativeTestRoutes(app: Express): void {

    // Test authentication status
    app.get("/api/test/legislative/auth-status", async (req: Request, res: Response) => {
        try {
            const client = getLegislativeApiClient();
            const status = client.getAuthStatus();

            res.json({
                success: true,
                authenticated: status.authenticated,
                tokenExpiry: status.tokenExpiry,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Test search by act number (e.g., /api/test/legislative/search/287/2009)
    app.get("/api/test/legislative/search/:number/:year", async (req: Request, res: Response) => {
        try {
            const { number, year } = req.params;
            const yearNum = parseInt(year, 10);

            if (isNaN(yearNum)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid year format',
                });
            }

            const client = getLegislativeApiClient();
            await client.initialize();

            const result = await client.getLegalActByNumber(yearNum, number);

            res.json({
                success: true,
                result,
                query: { number, year: yearNum },
            });
        } catch (error) {
            console.error('[Test Route] Search failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Test search by title
    app.get("/api/test/legislative/search-by-title", async (req: Request, res: Response) => {
        try {
            const { title } = req.query;

            if (!title || typeof title !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'Title parameter required',
                });
            }

            const client = getLegislativeApiClient();
            await client.initialize();

            const results = await client.searchLegislation({
                title,
                resultsPerPage: 5,
            });

            res.json({
                success: true,
                count: results.length,
                results,
            });
        } catch (error) {
            console.error('[Test Route] Title search failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Test parsing act number format
    app.get("/api/test/legislative/parse/:actNumber", async (req: Request, res: Response) => {
        try {
            const { actNumber } = req.params;
            const parsed = parseActNumber(actNumber);

            if (!parsed) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid act number format. Expected format: XXX/YYYY (e.g., 287/2009)',
                });
            }

            res.json({
                success: true,
                input: actNumber,
                parsed,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    console.log('[LegislativeAPI] Test routes registered');
}
