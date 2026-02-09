import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { z } from "zod";
import {
  fixPenalSubjects,
  submitExamSession,
  getEssayPrompts,
  getEssayPromptById,
  submitEssay,
  getEssaySubmissionHistory,
  aiGradeSubmission,
  getSyllabusTopics,
  getSyllabusTopicById,
  getSyllabusTopicContent,
} from "../services/content.service";

const router = Router();

// POST /questions/fix-penal-subjects
router.post("/questions/fix-penal-subjects", asyncHandler(async (_req, res) => {
  const result = await fixPenalSubjects();
  res.json(result);
}));

// POST /exam-sessions/submit
router.post("/exam-sessions/submit", asyncHandler(async (req, res) => {
  const schema = z.object({
    year: z.number(),
    answers: z.record(z.string()),
    timeSpent: z.number().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error });

  const userId = req.user!.id;
  const result = await submitExamSession(userId, parsed.data);
  res.json(result);
}));

// GET /essays
router.get("/essays", asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const prompts = await getEssayPrompts(limit);
  res.json({ prompts, count: prompts.length });
}));

// GET /essays/:id
router.get("/essays/:id", asyncHandler(async (req, res) => {
  const prompt = await getEssayPromptById(req.params.id);
  if (!prompt) return res.status(404).json({ error: "Essay prompt not found" });
  res.json(prompt);
}));

// POST /essays/:id/submit
router.post("/essays/:id/submit", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { userAnswer, selfEvaluation, selfScore, timeSpent } = req.body;
  if (!userAnswer) return res.status(400).json({ error: "userAnswer is required" });

  const submission = await submitEssay(userId, req.params.id, { userAnswer, selfEvaluation, selfScore, timeSpent });
  res.json({ success: true, submissionId: submission.id, selfScore });
}));

// GET /essays/submissions/history
router.get("/essays/submissions/history", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const submissions = await getEssaySubmissionHistory(userId);
  res.json({ submissions, count: submissions.length });
}));

// POST /essays/submissions/:submissionId/ai-grade
router.post("/essays/submissions/:submissionId/ai-grade", asyncHandler(async (req, res) => {
  const result = await aiGradeSubmission(req.params.submissionId);
  if (!result) return res.status(404).json({ error: "Submission not found" });
  res.json(result);
}));

// GET /syllabus-topics
router.get("/syllabus-topics", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const subject = req.query.subject as string | undefined;
  const parentId = req.query.parentId as string | undefined;
  const result = await getSyllabusTopics(userId, { subject, parentId });
  res.json(result);
}));

// GET /syllabus-topics/:syllabusId
router.get("/syllabus-topics/:syllabusId", asyncHandler(async (req, res) => {
  const result = await getSyllabusTopicById(req.params.syllabusId);
  if (!result) return res.status(404).json({ error: "Topic not found" });
  res.json(result);
}));

// GET /syllabus-topics/:syllabusId/content
router.get("/syllabus-topics/:syllabusId/content", asyncHandler(async (req, res) => {
  const result = await getSyllabusTopicContent(req.params.syllabusId);
  if (!result) return res.status(404).json({ error: "Topic not found" });
  res.json(result);
}));

export default router;
