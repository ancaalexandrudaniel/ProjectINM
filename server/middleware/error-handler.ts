import type { Request, Response, NextFunction } from "express";

/**
 * Custom error class with HTTP status code.
 * Use throughout route handlers and services:
 *   throw new AppError(404, "Question not found");
 *   throw new AppError(403, "Admin access required");
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Global error handling middleware.
 * Must be registered LAST (after all routes) in Express.
 *
 * Handles:
 * - AppError instances → returns statusCode + message
 * - Zod validation errors → returns 400 + details
 * - Multer errors → returns 400 + file upload message
 * - Unknown errors → returns 500 + generic message (logs full error)
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Already sent response — nothing we can do
  if (res.headersSent) {
    return;
  }

  // Known application error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Zod validation error
  if (err.name === "ZodError" && "issues" in err) {
    res.status(400).json({
      error: "Validation failed",
      details: (err as any).issues,
    });
    return;
  }

  // Multer file upload error
  if (err.name === "MulterError") {
    res.status(400).json({ error: `File upload error: ${err.message}` });
    return;
  }

  // Unknown error — log full details, return generic message
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);
  res.status(500).json({ error: "Internal server error" });
}
