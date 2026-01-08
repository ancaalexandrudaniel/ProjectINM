/**
 * SRS Module - Spaced Repetition System for INM Mentor
 * Implements SuperMemo-2 algorithm for optimal learning
 */

import { db } from "./db";
import { userSrsCards, questions, userAnswers } from "@shared/schema";
import { eq, and, lte, desc, sql } from "drizzle-orm";

// ============================================================================
// SuperMemo-2 Algorithm Constants
// ============================================================================

const MIN_EASE_FACTOR = 130; // 1.3 (stored as *100)
const DEFAULT_EASE_FACTOR = 250; // 2.5

// Grade mappings (0-5 scale)
export type SrsGrade = 0 | 1 | 2 | 3 | 4 | 5;
// 0 = Complete blackout, forgot everything
// 1 = Incorrect, but recognized the answer
// 2 = Incorrect, but easy to recall
// 3 = Correct with serious difficulty
// 4 = Correct with some hesitation
// 5 = Perfect, instant recall

// ============================================================================
// SuperMemo-2 Algorithm Implementation
// ============================================================================

interface SrsUpdateResult {
    interval: number;       // days until next review
    easeFactor: number;     // stored as *100 (e.g., 250 = 2.5)
    repetitionCount: number;
    nextReviewAt: Date;
}

/**
 * Calculate next review parameters using SuperMemo-2
 * 
 * Algorithm:
 * - If grade < 3: Reset to beginning (interval = 1)
 * - If grade >= 3: Calculate new interval based on ease factor
 * - Adjust ease factor based on performance
 */
export function calculateSrs(
    grade: SrsGrade,
    currentInterval: number,
    currentEaseFactor: number,
    currentRepetitionCount: number
): SrsUpdateResult {
    let newInterval: number;
    let newEaseFactor = currentEaseFactor;
    let newRepetitionCount = currentRepetitionCount;

    if (grade < 3) {
        // Failed - reset to beginning
        newInterval = 1;
        newRepetitionCount = 0;
    } else {
        // Success - calculate new interval
        if (currentRepetitionCount === 0) {
            newInterval = 1;
        } else if (currentRepetitionCount === 1) {
            newInterval = 6;
        } else {
            // SM-2 formula: I(n) = I(n-1) * EF
            newInterval = Math.round(currentInterval * (currentEaseFactor / 100));
        }
        newRepetitionCount = currentRepetitionCount + 1;
    }

    // Update ease factor: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
    const efModifier = 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02);
    newEaseFactor = Math.round((currentEaseFactor / 100 + efModifier) * 100);

    // Ensure ease factor doesn't go below minimum
    if (newEaseFactor < MIN_EASE_FACTOR) {
        newEaseFactor = MIN_EASE_FACTOR;
    }

    // Cap interval at 365 days
    if (newInterval > 365) {
        newInterval = 365;
    }

    // Calculate next review date
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

    return {
        interval: newInterval,
        easeFactor: newEaseFactor,
        repetitionCount: newRepetitionCount,
        nextReviewAt,
    };
}

// ============================================================================
// SRS Card Management
// ============================================================================

/**
 * Create an SRS card for a question the user got wrong
 */
export async function createSrsCard(userId: string, questionId: string): Promise<void> {
    // Check if card already exists
    const [existing] = await db
        .select()
        .from(userSrsCards)
        .where(and(
            eq(userSrsCards.userId, userId),
            eq(userSrsCards.questionId, questionId)
        ))
        .limit(1);

    if (existing) {
        // Card exists - reset it for immediate review
        await db
            .update(userSrsCards)
            .set({
                interval: 1,
                easeFactor: DEFAULT_EASE_FACTOR,
                repetitionCount: 0,
                nextReviewAt: new Date(),
                consecutiveCorrect: 0,
            })
            .where(eq(userSrsCards.id, existing.id));
        return;
    }

    // Create new card
    await db.insert(userSrsCards).values({
        userId,
        questionId,
        interval: 1,
        easeFactor: DEFAULT_EASE_FACTOR,
        repetitionCount: 0,
        nextReviewAt: new Date(),
        consecutiveCorrect: 0,
        totalReviews: 0,
    });
}

/**
 * Get all SRS cards due for review
 */
export async function getDueCards(userId: string, limit: number = 20) {
    const now = new Date();

    const dueCards = await db
        .select({
            card: userSrsCards,
            question: questions,
        })
        .from(userSrsCards)
        .innerJoin(questions, eq(userSrsCards.questionId, questions.id))
        .where(and(
            eq(userSrsCards.userId, userId),
            lte(userSrsCards.nextReviewAt, now)
        ))
        .orderBy(userSrsCards.nextReviewAt)
        .limit(limit);

    return dueCards;
}

/**
 * Get count of cards due today
 */
export async function getDueCardCount(userId: string): Promise<number> {
    const now = new Date();

    const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userSrsCards)
        .where(and(
            eq(userSrsCards.userId, userId),
            lte(userSrsCards.nextReviewAt, now)
        ));

    return result?.count || 0;
}

/**
 * Process a review and update the SRS card
 */
export async function processReview(
    userId: string,
    cardId: string,
    grade: SrsGrade
): Promise<SrsUpdateResult> {
    // Get current card state
    const [card] = await db
        .select()
        .from(userSrsCards)
        .where(and(
            eq(userSrsCards.id, cardId),
            eq(userSrsCards.userId, userId)
        ))
        .limit(1);

    if (!card) {
        throw new Error("Card not found");
    }

    // Calculate new SRS parameters
    const result = calculateSrs(
        grade,
        card.interval || 1,
        card.easeFactor || DEFAULT_EASE_FACTOR,
        card.repetitionCount || 0
    );

    // Update card in database
    await db
        .update(userSrsCards)
        .set({
            interval: result.interval,
            easeFactor: result.easeFactor,
            repetitionCount: result.repetitionCount,
            nextReviewAt: result.nextReviewAt,
            lastReviewedAt: new Date(),
            consecutiveCorrect: grade >= 3 ? (card.consecutiveCorrect || 0) + 1 : 0,
            totalReviews: (card.totalReviews || 0) + 1,
        })
        .where(eq(userSrsCards.id, cardId));

    console.log(`[SRS] Card ${cardId} reviewed with grade ${grade}. Next review in ${result.interval} days.`);

    return result;
}

/**
 * Get SRS statistics for a user
 */
export async function getSrsStats(userId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total cards
    const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userSrsCards)
        .where(eq(userSrsCards.userId, userId));

    // Due today
    const [dueResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userSrsCards)
        .where(and(
            eq(userSrsCards.userId, userId),
            lte(userSrsCards.nextReviewAt, now)
        ));

    // Reviewed today
    const [reviewedResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(userSrsCards)
        .where(and(
            eq(userSrsCards.userId, userId),
            sql`${userSrsCards.lastReviewedAt} >= ${today}`,
            sql`${userSrsCards.lastReviewedAt} < ${tomorrow}`
        ));

    // Average ease factor (retention indicator)
    const [avgEaseResult] = await db
        .select({ avg: sql<number>`avg(${userSrsCards.easeFactor})` })
        .from(userSrsCards)
        .where(eq(userSrsCards.userId, userId));

    // Calculate retention rate from recent reviews
    const recentCards = await db
        .select()
        .from(userSrsCards)
        .where(eq(userSrsCards.userId, userId))
        .orderBy(desc(userSrsCards.lastReviewedAt))
        .limit(50);

    const successfulReviews = recentCards.filter(c => (c.consecutiveCorrect || 0) > 0).length;
    const retentionRate = recentCards.length > 0
        ? Math.round((successfulReviews / recentCards.length) * 100)
        : 0;

    return {
        totalCards: totalResult?.count || 0,
        dueToday: dueResult?.count || 0,
        reviewedToday: reviewedResult?.count || 0,
        averageEaseFactor: avgEaseResult?.avg ? Math.round(avgEaseResult.avg) : DEFAULT_EASE_FACTOR,
        retentionRate,
    };
}
