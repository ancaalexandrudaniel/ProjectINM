import type { Express } from "express";
import { createServer, type Server } from "http";
import { authMiddleware } from "../middleware/auth";
import { pool } from "../db";

// Import route modules
import authRouter from "./auth.routes";
import roadmapRouter from "./roadmap.routes";
import srsRouter from "./srs.routes";
import quizRouter from "./quiz.routes";
import documentsRouter from "./documents.routes";
import aiRouter from "./ai.routes";
import importRouter from "./import.routes";
import contentRouter from "./content.routes";
import adminRouter, { registerExternalRoutes } from "./admin.routes";

/**
 * Register all API routes on the Express app.
 * Each sub-router handles its own prefix-free endpoints;
 * the "/api" prefix is applied here once.
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Health check (no auth needed) — checks DB connectivity
  app.get("/api/health", async (_req, res) => {
    const checks: Record<string, string> = {};
    let healthy = true;

    // Check database
    try {
      const result = await pool.query("SELECT 1");
      checks.database = result.rows.length > 0 ? "ok" : "no_response";
    } catch (err: any) {
      checks.database = "error";
      healthy = false;
    }

    // Check Gemini API key is configured
    checks.gemini = process.env.GEMINI_API_KEY ? "configured" : "missing";
    if (!process.env.GEMINI_API_KEY) healthy = false;

    res.status(healthy ? 200 : 503).json({
      status: healthy ? "ok" : "degraded",
      checks,
      uptime: Math.floor(process.uptime()),
    });
  });

  // Auth routes (login, register, logout, me) — no global auth middleware
  app.use("/api", authRouter);

  // Apply authMiddleware globally for all protected routes
  app.use("/api", authMiddleware);

  // Mount all protected sub-routers under /api
  app.use("/api", roadmapRouter);
  app.use("/api", srsRouter);
  app.use("/api", quizRouter);
  app.use("/api", documentsRouter);
  app.use("/api", aiRouter);
  app.use("/api", importRouter);
  app.use("/api", contentRouter);
  app.use("/api", adminRouter);

  // Register external route modules (legacy pattern)
  registerExternalRoutes(app);

  console.log("[ROUTES] All route modules registered successfully.");

  const httpServer = createServer(app);
  return httpServer;
}
