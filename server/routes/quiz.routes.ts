import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../middleware/error-handler";
import { insertQuizSessionSchema } from "../../shared/schema";
import { storage } from "../storage";
import { submitAnswer, getWrongAnswersWithDetails } from "../services/quiz.service";
import { submitAnswerSchema, completeSessionSchema } from "../validation";

const router = Router();

// Get all questions (paginated — default 200, max 500)
router.get("/questions", asyncHandler(async (req, res) => {
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 200));
  const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
  const allQuestions = await storage.getAllQuestions(limit, offset);
  res.json(allQuestions);
}));

// Get questions by subject
router.get("/questions/:subject", asyncHandler(async (req, res) => {
  const { subject } = req.params;
  const subjectQuestions = await storage.getQuestionsBySubject(subject);
  res.json(subjectQuestions);
}));

// Get random questions for quiz
router.get("/quiz/random", asyncHandler(async (req, res) => {
  const subject = req.query.subject as string;
  const count = parseInt(req.query.count as string) || 20;
  const setType = req.query.setType as string | undefined;
  const randomQuestions = await storage.getRandomQuestions(subject, count, setType);
  res.json(randomQuestions);
}));

// Create quiz session
router.post("/quiz/session", asyncHandler(async (req, res) => {
  const sessionData = insertQuizSessionSchema.parse({
    ...req.body,
    userId: req.user!.id,
  });
  const session = await storage.createQuizSession(sessionData);
  res.json(session);
}));

// Submit answer (with SRS + syllabus progress integration)
router.post("/quiz/answer", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const body = submitAnswerSchema.parse(req.body);
  const answer = await submitAnswer(userId, body);
  res.json(answer);
}));

// Complete quiz session
router.patch("/quiz/session/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = completeSessionSchema.parse(req.body);
  const session = await storage.updateQuizSession(id, {
    ...body,
    completedAt: new Date(),
  });
  if (!session) {
    throw new AppError(404, "Session not found");
  }
  res.json(session);
}));

// Get user progress
router.get("/progress", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const progress = await storage.getUserProgress(userId);
  res.json(progress);
}));

// Get user quiz sessions
router.get("/sessions", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const sessions = await storage.getUserQuizSessions(userId);
  res.json(sessions);
}));

// Get user answers for analysis
router.get("/answers", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const answers = await storage.getUserAnswers(userId);
  res.json(answers);
}));

// Get wrong answers with question details
router.get("/wrong-answers", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const subject = req.query.subject as string | undefined;
  const chapter = req.query.chapter as string | undefined;
  const result = await getWrongAnswersWithDetails(userId, { subject, chapter });
  res.json(result);
}));

export default router;
