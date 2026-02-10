/**
 * Zod validation schemas for route request bodies.
 * Centralised to avoid scattering inline z.object() calls.
 */
import { z } from "zod";

// ============ AUTH ============
export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(1, "Full name is required"),
  username: z.string().optional(),
});

// ============ QUIZ ============
export const submitAnswerSchema = z.object({
  sessionId: z.string().optional(),
  questionId: z.string(),
  selectedAnswer: z.number(),
  isCorrect: z.boolean(),
  timeToAnswer: z.number().optional(),
});

export const completeSessionSchema = z.object({
  correctAnswers: z.number().int().min(0),
  timeSpent: z.number().int().min(0),
});

// ============ SRS ============
export const srsReviewSchema = z.object({
  cardId: z.string(),
  grade: z.number().int().min(0).max(5),
});

export const srsCardSchema = z.object({
  questionId: z.string(),
});

// ============ AI ============
export const explainWrongAnswerSchema = z.object({
  questionId: z.string(),
  userAnswerId: z.string(),
});

export const explainAnswerDirectSchema = z.object({
  questionId: z.string(),
  selectedAnswer: z.coerce.string(), // Service expects string
});

export const legalAssistantSchema = z.object({
  question: z.string().min(1, "Question is required"),
  topK: z.number().int().min(1).max(20).optional().default(5),
});

export const studyPlanSchema = z.object({
  daysUntilExam: z.coerce.number().int().min(1),
  hoursPerDay: z.coerce.number().min(0.5),
});

export const gradeEssaySchema = z.object({
  year: z.number(),
  discipline: z.string(),
  answers: z.record(z.string()),
  timeSpent: z.number().optional(),
});

// ============ DOCUMENTS ============
export const uploadDocumentSchema = z.object({
  fileName: z.string().min(1),
  documentType: z.string().min(1),
  subject: z.string().min(1),
  fileContent: z.string().min(1),
});

export const processDocumentSchema = z.object({
  uploadURL: z.string(),
  fileName: z.string(),
  documentType: z.string(),
  subject: z.string(),
});

export const analyzeDocumentPatternsSchema = z.object({
  documentIds: z.array(z.string()).min(1, "At least one document is required"),
  subject: z.string().optional(),
});

// ============ CONTENT ============
export const submitEssaySchema = z.object({
  userAnswer: z.string().min(1, "Answer is required"),
  selfEvaluation: z.string().optional(),
  selfScore: z.number().optional(),
  timeSpent: z.number().optional(),
});

// ============ ROADMAP ============
export const completeNodeSchema = z.object({
  score: z.number().min(0).max(100),
});
