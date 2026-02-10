import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../middleware/error-handler";
import { getDueCards, getSrsStats, processReview, createSrsCard, getDueCardCount } from "../srs";
import { srsReviewSchema, srsCardSchema } from "../validation";

const router = Router();


// GET /srs/due - Get cards due for review
router.get("/srs/due", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
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
  const userId = req.user!.id;

  const stats = await getSrsStats(userId);

  res.json(stats);
}));

// POST /srs/review - Process a card review
router.post("/srs/review", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { cardId, grade } = srsReviewSchema.parse(req.body);

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
  const userId = req.user!.id;

  const count = await getDueCardCount(userId);

  res.json({ dueCount: count });
}));

// POST /srs/card - Create an SRS card for a question
router.post("/srs/card", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { questionId } = srsCardSchema.parse(req.body);

  await createSrsCard(userId, questionId);

  res.json({ success: true });
}));

export default router;
