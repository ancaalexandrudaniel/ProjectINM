import { Router } from "express";
import { db } from "../db";
import { users } from "../../shared/schema";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../middleware/error-handler";
import { getDueCards, getSrsStats, processReview, createSrsCard, getDueCardCount } from "../srs";

const router = Router();

// Helper to get first user ID (will be replaced in auth phase)
let cachedDefaultUserId: string | null = null;

async function getDefaultUserId(): Promise<string> {
  if (cachedDefaultUserId) return cachedDefaultUserId;

  const allUsers = await db.select().from(users).limit(1);
  if (allUsers.length === 0) {
    throw new AppError(500, "No users found in database");
  }
  cachedDefaultUserId = allUsers[0].id;
  return cachedDefaultUserId;
}

// GET /srs/due - Get cards due for review
router.get("/srs/due", asyncHandler(async (req, res) => {
  const userId = await getDefaultUserId();
  const limit = parseInt(req.query.limit as string) || 20;

  const dueCards = await getDueCards(userId, limit);

  res.json({
    cards: dueCards.map(({ card, question }) => ({
      id: card.id,
      questionId: card.questionId,
      interval: card.interval,
      easeFactor: card.easeFactor,
      repetitionCount: card.repetitionCount,
      consecutiveCorrect: card.consecutiveCorrect,
      nextReviewAt: card.nextReviewAt,
      question: {
        id: question.id,
        subject: question.subject,
        chapter: question.chapter,
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        legalReferences: question.legalReferences,
      },
    })),
    count: dueCards.length,
  });
}));

// GET /srs/stats - Get SRS statistics
router.get("/srs/stats", asyncHandler(async (req, res) => {
  const userId = await getDefaultUserId();

  const stats = await getSrsStats(userId);

  res.json(stats);
}));

// POST /srs/review - Process a card review
router.post("/srs/review", asyncHandler(async (req, res) => {
  const userId = await getDefaultUserId();

  const { cardId, grade } = req.body;

  if (!cardId || grade === undefined) {
    throw new AppError(400, "cardId and grade are required");
  }

  if (grade < 0 || grade > 5) {
    throw new AppError(400, "Grade must be between 0 and 5");
  }

  const result = await processReview(userId, cardId, grade as 0 | 1 | 2 | 3 | 4 | 5);

  res.json({
    success: true,
    nextReviewAt: result.nextReviewAt,
    interval: result.interval,
    easeFactor: result.easeFactor,
  });
}));

// GET /srs/count - Get count of cards due today (for dashboard)
router.get("/srs/count", asyncHandler(async (req, res) => {
  const userId = await getDefaultUserId();

  const count = await getDueCardCount(userId);

  res.json({ dueCount: count });
}));

// POST /srs/card - Create an SRS card for a question
router.post("/srs/card", asyncHandler(async (req, res) => {
  const userId = await getDefaultUserId();

  const { questionId } = req.body;

  if (!questionId) {
    throw new AppError(400, "questionId is required");
  }

  await createSrsCard(userId, questionId);

  res.json({ success: true });
}));

export default router;
