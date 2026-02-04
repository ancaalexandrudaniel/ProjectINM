import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite";
import { db } from "./db";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { RoadmapService } from "./services/roadmap-service";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure NODE_ENV is set for deployment
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '50mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  let server;
  try {
    // Run migrations on startup
    console.log("[SERVER] Starting database migration...");
    try {
      await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "migrations") });
      console.log("[SERVER] Database migration complete.");
    } catch (e) {
      console.error("[SERVER] Migration failed:", e);
      // Don't crash here if migration fails, might be just a lock issue or already done
    }

    // Initialize roadmap data
    console.log("[SERVER] Checking roadmap initialization...");
    try {
      await RoadmapService.initialize();
    } catch (e) {
      console.error("[SERVER] Roadmap initialization failed:", e);
    }

    console.log("[DEBUG] About to register routes...");
    server = await registerRoutes(app);
    console.log("[DEBUG] Routes registered successfully.");
  } catch (err) {
    console.log('[FATAL] Failed to register routes:', err);
    process.exit(1);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  console.log(`[SERVER] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[SERVER] Mode: ${process.env.NODE_ENV !== "production" ? "DEVELOPMENT (Vite)" : "PRODUCTION (Static)"}`);

  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    // Serve static files manually to fix MIME type issues
    const distPath = path.resolve(__dirname, "..", "dist", "public");
    console.log(`[SERVER] Serving static from: ${distPath}`);

    // Serve static assets first (before catch-all route)
    app.use(express.static(distPath));

    // Fall through to index.html for client-side routing
    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);

    // Initialize cron jobs (production only)
    import('./cron-jobs').then(({ initializeCronJobs }) => {
      initializeCronJobs();
    }).catch(err => {
      console.error('[CRON] Failed to initialize cron jobs:', err);
    });
  });
})();
