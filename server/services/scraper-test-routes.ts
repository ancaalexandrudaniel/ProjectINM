import type { Express, Request, Response } from "express";
import { getLegislativeScraper, KNOWN_ACTS } from "./legislative-scraper";

/**
 * Test routes for Legislative Scraper
 * Allows testing the web scraping fallback for legislatie.just.ro
 */

export function registerScraperTestRoutes(app: Express): void {

    /**
     * Get scraper status and stats
     */
    app.get("/api/test/scraper/status", async (req: Request, res: Response) => {
        try {
            const scraper = getLegislativeScraper();
            const stats = scraper.getStats();

            res.json({
                success: true,
                stats,
                knownActs: Object.keys(KNOWN_ACTS),
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * Scrape a single act by its legislatie.just.ro ID
     * Example: /api/test/scraper/act/109884 (Codul Civil)
     */
    app.get("/api/test/scraper/act/:id", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const actId = parseInt(id);

            if (isNaN(actId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid act ID',
                });
            }

            console.log(`[Scraper Test] Scraping act ID: ${actId}`);

            const scraper = getLegislativeScraper();
            const result = await scraper.scrapeActById(actId);

            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    error: result.error,
                });
            }

            // Return limited data for response size
            const limitedData = result.data ? {
                ...result.data,
                fullText: result.data.fullText.substring(0, 2000) + '...',
                htmlText: result.data.htmlText ? result.data.htmlText.substring(0, 500) + '...' : null,
            } : null;

            res.json({
                success: true,
                data: limitedData,
                stats: scraper.getStats(),
            });
        } catch (error: any) {
            console.error('[Scraper Test] Error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * Scrape a known act by name
     * Example: /api/test/scraper/known/Codul%20Civil
     */
    app.get("/api/test/scraper/known/:name", async (req: Request, res: Response) => {
        try {
            const { name } = req.params;
            const actInfo = KNOWN_ACTS[name as keyof typeof KNOWN_ACTS];

            if (!actInfo) {
                return res.status(404).json({
                    success: false,
                    error: `Unknown act: ${name}`,
                    available: Object.keys(KNOWN_ACTS),
                });
            }

            console.log(`[Scraper Test] Scraping known act: ${name} (ID: ${actInfo.id})`);

            const scraper = getLegislativeScraper();
            const result = await scraper.scrapeActById(actInfo.id);

            if (!result.success) {
                return res.status(500).json({
                    success: false,
                    error: result.error,
                });
            }

            // Return limited data
            const limitedData = result.data ? {
                ...result.data,
                title: name,
                fullText: result.data.fullText.substring(0, 2000) + '...',
                htmlText: null, // Don't include HTML for brevity
            } : null;

            res.json({
                success: true,
                data: limitedData,
                stats: scraper.getStats(),
            });
        } catch (error: any) {
            console.error('[Scraper Test] Error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * Scrape and save a single act to database
     */
    app.post("/api/test/scraper/save/:id", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const actId = parseInt(id);

            if (isNaN(actId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid act ID',
                });
            }

            console.log(`[Scraper Test] Scraping and saving act ID: ${actId}`);

            const scraper = getLegislativeScraper();
            const result = await scraper.scrapeActById(actId);

            if (!result.success || !result.data) {
                return res.status(500).json({
                    success: false,
                    error: result.error || 'Failed to scrape act',
                });
            }

            // Save to database
            const dbId = await scraper.saveToDatabase(result.data);

            res.json({
                success: true,
                message: 'Act saved to database',
                databaseId: dbId,
                actTitle: result.data.title,
                textLength: result.data.fullText.length,
            });
        } catch (error: any) {
            console.error('[Scraper Test] Save error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * Close the scraper browser (cleanup)
     */
    app.post("/api/test/scraper/close", async (req: Request, res: Response) => {
        try {
            const scraper = getLegislativeScraper();
            await scraper.close();

            res.json({
                success: true,
                message: 'Browser closed',
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });

    /**
     * List all known acts
     */
    app.get("/api/test/scraper/known-acts", async (req: Request, res: Response) => {
        res.json({
            success: true,
            acts: Object.entries(KNOWN_ACTS).map(([name, info]) => ({
                name,
                id: info.id,
                number: info.number,
                year: info.year,
                url: `https://legislatie.just.ro/Public/DetaliiDocumentAfis/${info.id}`,
            })),
        });
    });

    /**
     * Batch scrape ALL known acts and save to database
     * This endpoint will take 2-3 minutes as it scrapes 6 acts in sequence
     */
    app.post("/api/test/scraper/batch-save-all", async (req: Request, res: Response) => {
        try {
            console.log('[Scraper Test] Starting batch scrape of all known acts...');

            const scraper = getLegislativeScraper();
            const results: { name: string; success: boolean; databaseId?: number; error?: string; textLength?: number }[] = [];

            for (const [name, info] of Object.entries(KNOWN_ACTS)) {
                console.log(`[Scraper Batch] Processing: ${name} (${Object.keys(KNOWN_ACTS).indexOf(name) + 1}/${Object.keys(KNOWN_ACTS).length})`);

                try {
                    // Scrape the act
                    const scrapeResult = await scraper.scrapeActById(info.id);

                    if (!scrapeResult.success || !scrapeResult.data) {
                        results.push({
                            name,
                            success: false,
                            error: scrapeResult.error || 'Failed to scrape',
                        });
                        continue;
                    }

                    // Override title with known name
                    scrapeResult.data.title = name;
                    scrapeResult.data.actNumber = info.number;
                    scrapeResult.data.actYear = info.year;

                    // Save to database
                    const dbId = await scraper.saveToDatabase(scrapeResult.data);

                    results.push({
                        name,
                        success: true,
                        databaseId: dbId,
                        textLength: scrapeResult.data.fullText.length,
                    });

                    console.log(`[Scraper Batch] ✓ Saved: ${name} (${scrapeResult.data.fullText.length} chars)`);

                } catch (err: any) {
                    console.error(`[Scraper Batch] ✗ Error for ${name}:`, err.message);
                    results.push({
                        name,
                        success: false,
                        error: err.message,
                    });
                }

                // Small delay between acts
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            console.log(`[Scraper Batch] Complete: ${successCount} success, ${failCount} failed`);

            res.json({
                success: true,
                message: `Batch scrape complete: ${successCount} saved, ${failCount} failed`,
                results,
                stats: scraper.getStats(),
            });

        } catch (error: any) {
            console.error('[Scraper Test] Batch error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    });

    console.log('[Scraper] Test routes registered');
}
