import type { Express, Request, Response } from "express";
import {
    getPortalJustApiClient,
    extractDecisionNumber,
    isRILCase,
    isHPCase,
    formatDateForApi,
} from "./portal-just-api";

/**
 * Test routes for Portal Just API Client
 * These endpoints allow testing the REST integration before full implementation
 */

export function registerPortalJustTestRoutes(app: Express): void {

    // Test search cases by case number
    app.get("/api/test/portal-just/case/:caseNumber", async (req: Request, res: Response) => {
        try {
            const { caseNumber } = req.params;

            const client = getPortalJustApiClient();
            const result = await client.searchCases({
                numarDosar: caseNumber,
            });

            res.json({
                success: result.success,
                caseNumber,
                count: result.data?.length || 0,
                cases: result.data || [],
                error: result.error,
            });
        } catch (error) {
            console.error('[Test Route] Case search failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Test search ÎCCJ (Supreme Court) decisions
    app.get("/api/test/portal-just/iccj", async (req: Request, res: Response) => {
        try {
            const { type, year } = req.query;

            const client = getPortalJustApiClient();
            const result = await client.searchICCJDecisions({
                decisionType: (type as 'RIL' | 'HP' | 'ALL') || 'ALL',
                year: year ? parseInt(year as string) : undefined,
            });

            res.json({
                success: result.success,
                filters: { type, year },
                count: result.data?.length || 0,
                decisions: result.data || [],
                error: result.error,
            });
        } catch (error) {
            console.error('[Test Route] ÎCCJ search failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Test search CCR (Constitutional Court) decisions
    app.get("/api/test/portal-just/ccr", async (req: Request, res: Response) => {
        try {
            const { year } = req.query;

            const client = getPortalJustApiClient();
            const result = await client.searchCCRDecisions({
                year: year ? parseInt(year as string) : undefined,
            });

            res.json({
                success: result.success,
                filters: { year },
                count: result.data?.length || 0,
                decisions: result.data || [],
                error: result.error,
            });
        } catch (error) {
            console.error('[Test Route] CCR search failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Test search sessions
    app.get("/api/test/portal-just/sessions", async (req: Request, res: Response) => {
        try {
            const { numarDosar, institutie, startDate, endDate } = req.query;

            const client = getPortalJustApiClient();
            const result = await client.searchSessions({
                numarDosar: numarDosar as string,
                institutie: institutie as string,
                dataSedintaStart: startDate as string,
                dataSedintaEnd: endDate as string,
            });

            res.json({
                success: result.success,
                filters: { numarDosar, institutie, startDate, endDate },
                count: result.data?.length || 0,
                sessions: result.data || [],
                error: result.error,
            });
        } catch (error) {
            console.error('[Test Route] Sessions search failed:', error);
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Test helper functions
    app.get("/api/test/portal-just/helpers", async (req: Request, res: Response) => {
        try {
            const testCaseNumber = "Dosar RIL nr. 1234/2024";

            res.json({
                success: true,
                tests: {
                    extractDecisionNumber: {
                        input: testCaseNumber,
                        output: extractDecisionNumber(testCaseNumber),
                    },
                    isRILCase: {
                        input: testCaseNumber,
                        output: isRILCase(testCaseNumber),
                    },
                    isHPCase: {
                        input: testCaseNumber,
                        output: isHPCase(testCaseNumber),
                    },
                    formatDateForApi: {
                        input: "2024-01-15",
                        output: formatDateForApi(new Date("2024-01-15")),
                    },
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    // Get client statistics
    app.get("/api/test/portal-just/stats", async (req: Request, res: Response) => {
        try {
            const client = getPortalJustApiClient();
            const stats = client.getStats();

            res.json({
                success: true,
                stats,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    });

    console.log('[PortalJust] Test routes registered');
}
