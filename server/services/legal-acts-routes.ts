import { Express, Request, Response } from 'express';
import { db } from '../db';
import { legislativeActs } from '@shared/schema';
import { eq, ilike, or, desc, asc } from 'drizzle-orm';

/**
 * Legal Acts API Routes
 * Provides endpoints for browsing and searching legislative acts stored in the database.
 */
export function registerLegalActsRoutes(app: Express): void {

    /**
     * GET /api/legal-acts
     * List all legislative acts with optional search and filters
     */
    app.get("/api/legal-acts", async (req: Request, res: Response) => {
        try {
            const { search, actType, sortBy = 'title', sortOrder = 'asc' } = req.query;

            let query = db.select({
                id: legislativeActs.id,
                actType: legislativeActs.actType,
                actNumber: legislativeActs.actNumber,
                actTitle: legislativeActs.actTitle,
                publishedInMO: legislativeActs.publishedInMO,
                effectiveDate: legislativeActs.effectiveDate,
                sourceUrl: legislativeActs.sourceUrl,
                fetchedAt: legislativeActs.fetchedAt,
                isCurrentVersion: legislativeActs.isCurrentVersion,
                // Get text length instead of full text for list view
            }).from(legislativeActs);

            // Execute query
            const acts = await query;

            // Filter by search term (in memory for now, can optimize with SQL later)
            let filteredActs = acts;

            if (search && typeof search === 'string') {
                const searchLower = search.toLowerCase();
                filteredActs = acts.filter(act =>
                    act.actTitle?.toLowerCase().includes(searchLower) ||
                    act.actNumber?.toLowerCase().includes(searchLower) ||
                    act.actType?.toLowerCase().includes(searchLower)
                );
            }

            if (actType && typeof actType === 'string') {
                filteredActs = filteredActs.filter(act =>
                    act.actType?.toLowerCase() === actType.toLowerCase()
                );
            }

            // Sort
            filteredActs.sort((a, b) => {
                const aVal = (a as any)[sortBy as string] || '';
                const bVal = (b as any)[sortBy as string] || '';
                const cmp = String(aVal).localeCompare(String(bVal));
                return sortOrder === 'desc' ? -cmp : cmp;
            });

            res.json({
                success: true,
                count: filteredActs.length,
                acts: filteredActs
            });

        } catch (error: any) {
            console.error('[LegalActs API] Error listing acts:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/legal-acts/:id
     * Get a single legislative act by ID with full text
     */
    app.get("/api/legal-acts/:id", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const act = await db.query.legislativeActs.findFirst({
                where: eq(legislativeActs.id, id)
            });

            if (!act) {
                return res.status(404).json({
                    success: false,
                    error: 'Legislative act not found'
                });
            }

            res.json({
                success: true,
                act
            });

        } catch (error: any) {
            console.error('[LegalActs API] Error fetching act:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    /**
     * GET /api/legal-acts/stats
     * Get statistics about the legislative acts collection
     */
    app.get("/api/legal-acts-stats", async (req: Request, res: Response) => {
        try {
            const acts = await db.select({
                actType: legislativeActs.actType,
                actTitle: legislativeActs.actTitle
            }).from(legislativeActs);

            // Count by type
            const typeCount: Record<string, number> = {};
            acts.forEach(act => {
                const type = act.actType || 'unknown';
                typeCount[type] = (typeCount[type] || 0) + 1;
            });

            res.json({
                success: true,
                totalActs: acts.length,
                byType: typeCount
            });

        } catch (error: any) {
            console.error('[LegalActs API] Error fetching stats:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    console.log('[LegalActs] API routes registered');
}
