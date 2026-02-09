import { Request, Response, NextFunction } from "express";
import { validateSession, type AuthenticatedUser } from "../auth";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}

/**
 * Authentication middleware - validates session token from Authorization header.
 * Attaches user to req.user if valid session found.
 * Returns 401 if no valid session.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const sessionToken = req.headers.authorization?.replace("Bearer ", "") ||
    (req as any).cookies?.session_token;

  if (!sessionToken) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  validateSession(sessionToken)
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: "Invalid or expired session" });
        return;
      }
      req.user = user;
      req.sessionToken = sessionToken;
      next();
    })
    .catch((err) => {
      console.error("[AUTH] Middleware error:", err);
      res.status(500).json({ error: "Authentication check failed" });
    });
}

/**
 * Optional auth middleware - attaches user if valid session, but doesn't block.
 * Useful for routes that work for both authenticated and anonymous users.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const sessionToken = req.headers.authorization?.replace("Bearer ", "") ||
    (req as any).cookies?.session_token;

  if (!sessionToken) {
    next();
    return;
  }

  validateSession(sessionToken)
    .then((user) => {
      if (user) {
        req.user = user;
        req.sessionToken = sessionToken;
      }
      next();
    })
    .catch(() => {
      next();
    });
}

/**
 * Admin-only middleware - must be used AFTER authMiddleware.
 * Returns 403 if user is not an admin.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  next();
}
