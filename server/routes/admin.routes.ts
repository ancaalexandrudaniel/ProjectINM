import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { db } from "../db";
import { questions } from "../../shared/schema";

const router = Router();

// POST /admin/purge-questions - Delete all questions (admin only)
router.post("/admin/purge-questions", asyncHandler(async (req, res) => {
  console.log("[ADMIN] Purging all questions from database...");
  await db.delete(questions);
  console.log("[ADMIN] Questions purged successfully.");
  res.json({ success: true, message: "All questions deleted successfully." });
}));

// ============================================================================
// External Route Registrators (legacy pattern using app directly)
// ============================================================================
import type { Express } from "express";
import { registerLegislativeTestRoutes } from "../services/legislative-test-routes";
import { registerPortalJustTestRoutes } from "../services/portal-just-test-routes";
import { registerRawLegislativeTestRoutes } from "../services/raw-legislative-api";
import { registerScraperTestRoutes } from "../services/scraper-test-routes";
import { registerLegalActsRoutes } from "../services/legal-acts-routes";
import { registerBulletinBoardRoutes } from "../services/bulletin-board-routes";
import { cleanRoomRoutes } from "../services/clean-room/routes";

/**
 * Register external route modules that use the legacy `registerXRoutes(app)` pattern.
 * Called from the orchestrator with the Express app instance.
 */
export function registerExternalRoutes(app: Express): void {
  registerLegislativeTestRoutes(app);
  registerPortalJustTestRoutes(app);
  registerRawLegislativeTestRoutes(app);
  registerScraperTestRoutes(app);
  registerLegalActsRoutes(app);
  registerBulletinBoardRoutes(app);
  app.use("/api/clean-room", cleanRoomRoutes);
  console.log("[ROUTES] External routes registered (legislative, portal-just, scraper, legal-acts, bulletin-board, clean-room)");
}

export default router;
