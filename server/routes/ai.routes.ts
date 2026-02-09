import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../middleware/error-handler";
import {
  explainWrongAnswerById,
  explainAnswerDirect,
  gradeEssay,
  askLegalAssistant,
  generateStudyPlanForUser,
  getLatestStudyPlan,
} from "../services/ai.service";

const router = Router();

// POST /ai/explain-wrong-answer
router.post("/ai/explain-wrong-answer", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { questionId, userAnswerId } = req.body;
  try {
    const explanation = await explainWrongAnswerById(userId, questionId, userAnswerId);
    res.json({ explanation });
  } catch (err: any) {
    if (err.message === "Question not found" || err.message === "Answer not found")
      throw new AppError(404, err.message);
    throw err;
  }
}));

// POST /ai/explain-answer-direct
router.post("/ai/explain-answer-direct", asyncHandler(async (req, res) => {
  const { questionId, selectedAnswer } = req.body;
  try {
    const explanation = await explainAnswerDirect(questionId, selectedAnswer);
    res.json({ explanation });
  } catch (err: any) {
    if (err.message === "Question not found") throw new AppError(404, err.message);
    throw err;
  }
}));

// POST /ai/grade-essay
router.post("/ai/grade-essay", asyncHandler(async (req, res) => {
  const schema = z.object({
    year: z.number(),
    discipline: z.string(),
    answers: z.record(z.string()),
    timeSpent: z.number().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, "Invalid data");

  try {
    const result = await gradeEssay(parsed.data);
    res.json(result);
  } catch (err: any) {
    if (err.message === "No exam data found for grading") throw new AppError(404, err.message);
    throw err;
  }
}));

// POST /legal-assistant/ask
router.post("/legal-assistant/ask", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { question, topK = 5 } = req.body;
  if (!question || question.trim().length === 0) throw new AppError(400, "Question is required");

  try {
    const result = await askLegalAssistant(userId, question, topK);
    res.json(result);
  } catch (err: any) {
    if (err.message.includes("goala sau neindexata")) throw new AppError(404, err.message);
    if (err.message === "Failed to generate content") throw new AppError(500, err.message);
    throw err;
  }
}));

// POST /study-plan/generate
router.post("/study-plan/generate", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { daysUntilExam, hoursPerDay } = req.body;
  if (!daysUntilExam || !hoursPerDay) throw new AppError(400, "Missing daysUntilExam or hoursPerDay");

  const result = await generateStudyPlanForUser(userId, parseInt(daysUntilExam), parseInt(hoursPerDay));
  res.json(result);
}));

// GET /study-plan/latest
router.get("/study-plan/latest", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  try {
    const plan = await getLatestStudyPlan(userId);
    res.json(plan);
  } catch (err: any) {
    if (err.message === "No study plan found") throw new AppError(404, err.message);
    throw err;
  }
}));

export default router;
