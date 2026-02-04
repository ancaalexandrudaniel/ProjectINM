import { Request, Response, NextFunction } from "express";
import { validateSession, type AuthenticatedUser } from "./auth";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}

// ============================================================================
// Authentication Middleware
// ============================================================================
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.headers.authorization?.replace("Bearer ", "") ||
    req.cookies?.session_token;

  if (!sessionToken) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = await validateSession(sessionToken);
  if (!user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.user = user;
  req.sessionToken = sessionToken;
  next();
}
