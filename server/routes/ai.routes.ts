import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../middleware/error-handler";
import {
  explainWrongAnswerSchema,
  explainAnswerDirectSchema,
  gradeEssaySchema,
  legalAssistantSchema,
  studyPlanSchema,
} from "../validation";
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
  const { questionId, userAnswerId } = explainWrongAnswerSchema.parse(req.body);
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
  const { questionId, selectedAnswer } = explainAnswerDirectSchema.parse(req.body);
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
  const parsed = gradeEssaySchema.parse(req.body);

  try {
    const result = await gradeEssay(parsed);
    res.json(result);
  } catch (err: any) {
    if (err.message === "No exam data found for grading") throw new AppError(404, err.message);
    throw err;
  }
}));

// POST /legal-assistant/ask
router.post("/legal-assistant/ask", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { question, topK } = legalAssistantSchema.parse(req.body);

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
  const { daysUntilExam, hoursPerDay } = studyPlanSchema.parse(req.body);

  const result = await generateStudyPlanForUser(userId, daysUntilExam, hoursPerDay);
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
