/**
 * Bulletin Board Routes
 * 
 * API endpoints for the Legislative Changes Bulletin Board feature.
 * Allows users to view recent legislative changes and mark them as reviewed.
 */

import type { Express, Request, Response } from "express";
import { getLegislativeMonitor, type BulletinBoardItem } from "./legislative-monitor";
import { db } from "../db";
import { legislativeChangeLog, legislativeActs } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export function registerBulletinBoardRoutes(app: Express): void {
    console.log("[ROUTES] Registering Bulletin Board routes...");

    // =========================================================================
    // GET /api/bulletin-board/changes - Get recent legislative changes
    // =========================================================================
    app.get("/api/bulletin-board/changes", async (req: Request, res: Response) => {
        try {
            const limit = parseInt(req.query.limit as string) || 20;
            const onlyUnreviewed = req.query.unreviewed === "true";

            // Build query
            let whereClause = undefined;
            if (onlyUnreviewed) {
                whereClause = eq(legislativeChangeLog.verifiedByUser, false);
            }

            const changes = await db
                .select({
                    id: legislativeChangeLog.id,
                    actId: legislativeChangeLog.actId,
                    changeType: legislativeChangeLog.changeType,
                    changeDescription: legislativeChangeLog.changeDescription,
                    diffSummary: legislativeChangeLog.diffSummary,
                    affectedArticles: legislativeChangeLog.affectedArticles,
                    detectedAt: legislativeChangeLog.detectedAt,
                    verifiedByUser: legislativeChangeLog.verifiedByUser,
                    verifiedAt: legislativeChangeLog.verifiedAt,
                    // Join with legislative acts
                    actTitle: legislativeActs.actTitle,
                    actNumber: legislativeActs.actNumber,
                    actType: legislativeActs.actType,
                })
                .from(legislativeChangeLog)
                .leftJoin(legislativeActs, eq(legislativeChangeLog.actId, legislativeActs.id))
                .where(whereClause)
                .orderBy(desc(legislativeChangeLog.detectedAt))
                .limit(limit);

            const items: BulletinBoardItem[] = changes.map(c => ({
                id: c.id,
                actName: c.actTitle || "Act necunoscut",
                actNumber: c.actNumber || "",
                changeType: c.changeType,
                changeDescription: c.changeDescription,
                diffSummary: c.diffSummary,
                affectedArticles: c.affectedArticles as string[] | null,
                detectedAt: c.detectedAt || new Date(),
                isReviewed: c.verifiedByUser || false,
            }));

            res.json({
                changes: items,
                count: items.length,
            });
        } catch (error) {
            console.error("[BULLETIN] Get changes error:", error);
            res.status(500).json({ error: "Failed to get legislative changes" });
        }
    });

    // =========================================================================
    // GET /api/bulletin-board/unreviewed-count - Get count of unreviewed changes
    // =========================================================================
    app.get("/api/bulletin-board/unreviewed-count", async (req: Request, res: Response) => {
        try {
            const monitor = getLegislativeMonitor();
            const count = await monitor.getUnreviewedCount();

            res.json({ count });
        } catch (error) {
            console.error("[BULLETIN] Get unreviewed count error:", error);
            res.status(500).json({ error: "Failed to get unreviewed count" });
        }
    });

    // =========================================================================
    // POST /api/bulletin-board/changes/:id/review - Mark change as reviewed
    // =========================================================================
    app.post("/api/bulletin-board/changes/:id/review", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { notes } = req.body;

            // For now, use a default user ID
            const userId = "admin"; // TODO: Get from auth

            const monitor = getLegislativeMonitor();
            await monitor.markAsReviewed(id, userId, notes);

            res.json({ success: true });
        } catch (error) {
            console.error("[BULLETIN] Mark as reviewed error:", error);
            res.status(500).json({ error: "Failed to mark change as reviewed" });
        }
    });

    // =========================================================================
    // POST /api/bulletin-board/sync - Trigger manual legislative sync
    // =========================================================================
    app.post("/api/bulletin-board/sync", async (req: Request, res: Response) => {
        try {
            console.log("[BULLETIN] Manual sync triggered");

            const monitor = getLegislativeMonitor();
            const result = await monitor.checkForUpdates();

            res.json({
                success: result.success,
                actsChecked: result.actsChecked,
                changesDetected: result.changesDetected.length,
                changes: result.changesDetected.map(c => ({
                    actName: c.actName,
                    actNumber: c.actNumber,
                    affectedArticles: c.affectedArticles,
                })),
                errors: result.errors,
                syncedAt: result.syncedAt,
            });
        } catch (error) {
            console.error("[BULLETIN] Sync error:", error);
            res.status(500).json({ error: "Failed to sync legislative changes" });
        }
    });

    // =========================================================================
    // GET /api/bulletin-board/change/:id - Get single change details
    // =========================================================================
    app.get("/api/bulletin-board/change/:id", async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const [change] = await db
                .select({
                    id: legislativeChangeLog.id,
                    actId: legislativeChangeLog.actId,
                    changeType: legislativeChangeLog.changeType,
                    changeDescription: legislativeChangeLog.changeDescription,
                    oldContentHash: legislativeChangeLog.oldContentHash,
                    newContentHash: legislativeChangeLog.newContentHash,
                    diffSummary: legislativeChangeLog.diffSummary,
                    affectedArticles: legislativeChangeLog.affectedArticles,
                    detectedAt: legislativeChangeLog.detectedAt,
                    verifiedByUser: legislativeChangeLog.verifiedByUser,
                    verifiedAt: legislativeChangeLog.verifiedAt,
                    verificationNotes: legislativeChangeLog.verificationNotes,
                    // Join with legislative acts
                    actTitle: legislativeActs.actTitle,
                    actNumber: legislativeActs.actNumber,
                    actType: legislativeActs.actType,
                    sourceUrl: legislativeActs.sourceUrl,
                })
                .from(legislativeChangeLog)
                .leftJoin(legislativeActs, eq(legislativeChangeLog.actId, legislativeActs.id))
                .where(eq(legislativeChangeLog.id, id))
                .limit(1);

            if (!change) {
                return res.status(404).json({ error: "Change not found" });
            }

            res.json({
                ...change,
                affectedArticles: change.affectedArticles as string[] | null,
            });
        } catch (error) {
            console.error("[BULLETIN] Get change error:", error);
            res.status(500).json({ error: "Failed to get change details" });
        }
    });

    console.log("[ROUTES] Bulletin Board routes registered at /api/bulletin-board/*");
}
