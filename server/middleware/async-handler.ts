import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async route handler so that any thrown error is automatically
 * forwarded to Express error middleware via next(error).
 *
 * Eliminates the need for try/catch in every route handler:
 *
 * BEFORE:
 *   router.get("/api/foo", async (req, res) => {
 *     try {
 *       const data = await service.getData();
 *       res.json(data);
 *     } catch (error) {
 *       console.error(error);
 *       res.status(500).json({ error: "Failed" });
 *     }
 *   });
 *
 * AFTER:
 *   router.get("/api/foo", asyncHandler(async (req, res) => {
 *     const data = await service.getData();
 *     res.json(data);
 *   }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
