import { Router } from "express";
import { db } from "../db";
import { users } from "../../shared/schema";
import { eq } from "drizzle-orm";
import {
  createSession,
  validateSession,
  invalidateSession,
  verifyPassword,
  hashPassword,
} from "../auth";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../middleware/error-handler";
import { loginSchema, registerSchema } from "../validation";

const router = Router();

// POST /api/login - Authenticate user and create session
router.post("/login", asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    throw new AppError(401, "Invalid credentials");
  }

  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    throw new AppError(401, "Invalid credentials");
  }

  const userAgent = req.headers["user-agent"] || "unknown";
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

  const sessionToken = await createSession({
    userId: user.id,
    userAgent,
    ipAddress,
    subscriptionTier: user.subscriptionTier || "free",
  });

  console.log(`[AUTH] User ${user.email} logged in successfully`);

  res.json({
    success: true,
    sessionToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role || "student",
      subscriptionTier: user.subscriptionTier || "free",
    },
  });
}));

// POST /api/register - Create new user account
router.post("/register", asyncHandler(async (req, res) => {
  const { email, password, fullName, username } = registerSchema.parse(req.body);

  // Check if email already exists
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    throw new AppError(409, "Email already registered");
  }

  const hashedPassword = await hashPassword(password);

  const [newUser] = await db
    .insert(users)
    .values({
      email,
      password: hashedPassword,
      fullName,
      username: username || email.split("@")[0],
    })
    .returning();

  const userAgent = req.headers["user-agent"] || "unknown";
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

  const sessionToken = await createSession({
    userId: newUser.id,
    userAgent,
    ipAddress,
    subscriptionTier: "free",
  });

  console.log(`[AUTH] New user registered: ${newUser.email}`);

  res.status(201).json({
    success: true,
    sessionToken,
    user: {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      role: "student",
      subscriptionTier: "free",
    },
  });
}));

// POST /api/logout - Invalidate session
router.post("/logout", asyncHandler(async (req, res) => {
  const sessionToken = req.headers.authorization?.replace("Bearer ", "");

  if (sessionToken) {
    await invalidateSession(sessionToken);
    console.log("[AUTH] Session invalidated");
  }

  res.json({ success: true });
}));

// GET /api/me - Get current authenticated user
router.get("/me", asyncHandler(async (req, res) => {
  const sessionToken = req.headers.authorization?.replace("Bearer ", "");

  if (!sessionToken) {
    throw new AppError(401, "Not authenticated");
  }

  const user = await validateSession(sessionToken);

  if (!user) {
    throw new AppError(401, "Invalid or expired session");
  }

  res.json({ user });
}));

export default router;
