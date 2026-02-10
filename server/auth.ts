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
        // Handle legacy plain-text passwords — auto-migrate to bcrypt
        if (!storedHash.startsWith("$2")) {
            const isMatch = inputPassword === storedHash;
            if (isMatch) {
                console.warn("[AUTH] Legacy plaintext password matched — auto-rehashing to bcrypt");
                // Auto-rehash in background (caller should pass userId for DB update)
                const newHash = await hashPassword(inputPassword);
                try {
                    await db.update(users).set({ password: newHash }).where(eq(users.password, storedHash));
                    console.log("[AUTH] Password successfully rehashed to bcrypt");
                } catch (rehashErr) {
                    console.error("[AUTH] Failed to rehash password:", rehashErr);
                }
            }
            return isMatch;
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
// Debounce lastActivityAt updates — only write once per 60 seconds per session
const lastActivityCache = new Map<string, number>();
const ACTIVITY_UPDATE_INTERVAL_MS = 60_000;

export async function validateSession(sessionToken: string): Promise<AuthenticatedUser | null> {
    if (!sessionToken) return null;

    // Single JOIN query: session + user in one round-trip
    const results = await db
        .select({
            sessionId: activeSessions.id,
            expiresAt: activeSessions.expiresAt,
            userId: users.id,
            username: users.username,
            email: users.email,
            fullName: users.fullName,
            role: users.role,
            subscriptionTier: users.subscriptionTier,
            isVerified: users.isVerified,
        })
        .from(activeSessions)
        .innerJoin(users, eq(activeSessions.userId, users.id))
        .where(and(
            eq(activeSessions.sessionToken, sessionToken),
            eq(activeSessions.isActive, true)
        ))
        .limit(1);

    const row = results[0];
    if (!row) return null;

    // Check if expired
    if (new Date(row.expiresAt) < new Date()) {
        await db.delete(activeSessions).where(eq(activeSessions.id, row.sessionId));
        lastActivityCache.delete(row.sessionId);
        return null;
    }

    // Debounced lastActivityAt update — skip if updated less than 60s ago
    const now = Date.now();
    const lastUpdate = lastActivityCache.get(row.sessionId) || 0;
    if (now - lastUpdate > ACTIVITY_UPDATE_INTERVAL_MS) {
        lastActivityCache.set(row.sessionId, now);
        // Fire-and-forget — don't await
        db.update(activeSessions)
            .set({ lastActivityAt: new Date() })
            .where(eq(activeSessions.id, row.sessionId))
            .catch(() => {});
    }

    return {
        id: row.userId,
        username: row.username,
        email: row.email,
        fullName: row.fullName,
        role: row.role || "student",
        subscriptionTier: row.subscriptionTier || "free",
        isVerified: row.isVerified || false,
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
