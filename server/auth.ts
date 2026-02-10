/**
 * Authentication Module - INM Mentor SaaS
 * Handles secure login with device fingerprint and anti-sharing (kick-old)
 */

import { db } from "./db";
import { users, activeSessions } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

// ============================================================================
// Password Hashing (bcrypt)
// ============================================================================

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against bcrypt hash (or legacy plaintext)
 */
export async function verifyPassword(inputPassword: string, storedHash: string): Promise<boolean> {
    if (!inputPassword || !storedHash) {
        console.warn("[AUTH] verifyPassword called with null/empty input");
        return false;
    }
    try {
        // Handle legacy plain-text passwords (for migration)
        if (!storedHash.startsWith("$2")) {
            console.warn("[AUTH] Legacy plaintext password detected — consider re-hashing");
            return inputPassword === storedHash;
        }
        return await bcrypt.compare(inputPassword, storedHash);
    } catch (err) {
        console.error("[AUTH] verifyPassword error:", err);
        return false;
    }
}

// ============================================================================
// Device Fingerprint Generation
// ============================================================================

/**
 * Generate a simple device fingerprint from User-Agent and IP
 */
export function generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
    const data = `${userAgent}|${ipAddress}`;
    return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
    return crypto.randomBytes(32).toString("hex");
}

// ============================================================================
// Session Management
// ============================================================================

interface CreateSessionParams {
    userId: string;
    userAgent: string;
    ipAddress: string;
    subscriptionTier: string;
}

/**
 * Create a new session and apply anti-sharing logic (kick-old)
 * 
 * Rules:
 * - free: max 1 active session
 * - pro: max 2 active sessions
 * - premium: unlimited sessions
 */
export async function createSession(params: CreateSessionParams): Promise<string> {
    const { userId, userAgent, ipAddress, subscriptionTier } = params;

    const deviceFingerprint = generateDeviceFingerprint(userAgent, ipAddress);
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Get max allowed sessions based on tier
    const maxSessions = subscriptionTier === "premium" ? 999 : subscriptionTier === "pro" ? 2 : 1;

    // Get current active sessions for this user
    const currentSessions = await db
        .select()
        .from(activeSessions)
        .where(and(
            eq(activeSessions.userId, userId),
            eq(activeSessions.isActive, true)
        ))
        .orderBy(activeSessions.createdAt);

    // Kick-Old Logic: If at max sessions, invalidate oldest
    if (currentSessions.length >= maxSessions) {
        const sessionsToKick = currentSessions.slice(0, currentSessions.length - maxSessions + 1);
        for (const session of sessionsToKick) {
            await db
                .delete(activeSessions)
                .where(eq(activeSessions.id, session.id));
        }
        console.log(`[AUTH] Kicked ${sessionsToKick.length} old session(s) for user ${userId}`);
    }

    // Create new session
    await db.insert(activeSessions).values({
        userId,
        deviceFingerprint,
        userAgent,
        ipAddress,
        sessionToken,
        isActive: true,
        expiresAt,
    });

    console.log(`[AUTH] Created session for user ${userId} (tier: ${subscriptionTier})`);

    return sessionToken;
}

// ============================================================================
// Session Validation
// ============================================================================

export interface AuthenticatedUser {
    id: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
    subscriptionTier: string;
    isVerified: boolean;
}

/**
 * Validate a session token and return the user
 */
export async function validateSession(sessionToken: string): Promise<AuthenticatedUser | null> {
    if (!sessionToken) return null;

    // Find active session
    const [session] = await db
        .select()
        .from(activeSessions)
        .where(and(
            eq(activeSessions.sessionToken, sessionToken),
            eq(activeSessions.isActive, true)
        ))
        .limit(1);

    if (!session) return null;

    // Check if expired
    if (new Date(session.expiresAt) < new Date()) {
        await db.delete(activeSessions).where(eq(activeSessions.id, session.id));
        return null;
    }

    // Update last activity
    await db
        .update(activeSessions)
        .set({ lastActivityAt: new Date() })
        .where(eq(activeSessions.id, session.id));

    // Get user
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

    if (!user) return null;

    return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role || "student",
        subscriptionTier: user.subscriptionTier || "free",
        isVerified: user.isVerified || false,
    };
}

/**
 * Invalidate a session (logout)
 */
export async function invalidateSession(sessionToken: string): Promise<void> {
    await db
        .delete(activeSessions)
        .where(eq(activeSessions.sessionToken, sessionToken));
}
