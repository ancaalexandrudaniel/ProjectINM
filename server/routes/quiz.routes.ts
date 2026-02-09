import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../middleware/error-handler";
import { z } from "zod";
import { db } from "../db";
import {
  users,
  questions,
  insertQuizSessionSchema,
  insertUserAnswerSchema,
  syllabusTopicMappings,
  userSyllabusProgress,
} from "../../shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { storage } from "../storage";

const router = Router();

// Helper to get first user ID (temporary)
let cachedDefaultUserId: string | null = null;

async function getDefaultUserId(): Promise<string> {
  if (cachedDefaultUserId) return cachedDefaultUserId;

  const allUsers = await db.select().from(users).limit(1);
  if (allUsers.length === 0) {
    throw new Error("No users found in database");
  }
  cachedDefaultUserId = allUsers[0].id;
  return cachedDefaultUserId;
}

// Get all questions
router.get("/questions", asyncHandler(async (req, res) => {
  const allQuestions = await storage.getAllQuestions();
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
    userId: "default-user", // For now, use default user
  });

  const session = await storage.createQuizSession(sessionData);
  res.json(session);
}));

// Submit answer (with SRS + syllabus progress integration)
router.post("/quiz/answer", asyncHandler(async (req, res) => {
  const answerData = insertUserAnswerSchema.parse({
    ...req.body,
    userId: "default-user",
  });

  const answer = await storage.createUserAnswer(answerData);

  // Update user progress
  const question = await storage.getAllQuestions().then(qs =>
    qs.find(q => q.id === answerData.questionId)
  );

  if (question) {
    const existingProgress = await storage.getSubjectProgress("default-user", question.subject);
    const chapterProgress = existingProgress.find(p => p.chapter === question.chapter);

    if (chapterProgress) {
      const newTotal = (chapterProgress.totalQuestions || 0) + 1;
      const newCorrect = (chapterProgress.correctAnswers || 0) + (answerData.isCorrect ? 1 : 0);
      const newAccuracy = Math.round((newCorrect / newTotal) * 100);

      await storage.updateUserProgress("default-user", question.subject, question.chapter, {
        totalQuestions: newTotal,
        correctAnswers: newCorrect,
        accuracy: newAccuracy,
        lastPracticed: new Date(),
      });
    } else {
      await storage.updateUserProgress("default-user", question.subject, question.chapter, {
        totalQuestions: 1,
        correctAnswers: answerData.isCorrect ? 1 : 0,
        accuracy: answerData.isCorrect ? 100 : 0,
        lastPracticed: new Date(),
      });
    }

    // SRS Integration: Create card for wrong answers
    if (!answerData.isCorrect) {
      try {
        const { createSrsCard } = await import("../srs");
        const userId = await getDefaultUserId();
        await createSrsCard(userId, answerData.questionId);
        console.log(`[SRS] Created review card for question ${answerData.questionId}`);
      } catch (srsError) {
        console.error("[SRS] Failed to create card:", srsError);
        // Don't fail the request if SRS fails
      }
    }

    // Syllabus Progress Integration: Update progress for matching syllabus topics
    try {
      const userId = await getDefaultUserId();

      // Find syllabus topics that match this question's chapter via chapterPatterns
      const allTopics = await db.select().from(syllabusTopicMappings)
        .where(eq(syllabusTopicMappings.subject, question.subject));

      const matchingTopics = allTopics.filter(topic => {
        const patterns = topic.chapterPatterns as string[] | null;
        if (!patterns || patterns.length === 0) return false;
        const chapterLower = question.chapter.toLowerCase();
        return patterns.some(p => chapterLower.includes(p.toLowerCase()));
      });

      // Update progress for each matching topic
      if (matchingTopics.length > 0) {
        const topicIds = matchingTopics.map(t => t.id);

        // Batch select existing progress
        const existingProgresses = await db.select().from(userSyllabusProgress)
          .where(
            and(
              eq(userSyllabusProgress.userId, userId),
              inArray(userSyllabusProgress.syllabusTopicId, topicIds)
            )
          );

        const progressMap = new Map(existingProgresses.map(p => [p.syllabusTopicId, p]));
        const toInsert: typeof userSyllabusProgress.$inferInsert[] = [];

        for (const topic of matchingTopics) {
          const existingProg = progressMap.get(topic.id);

          if (existingProg) {
            // Update existing progress
            const newAnswered = (existingProg.questionsAnswered || 0) + 1;
            const newCorrect = (existingProg.questionsCorrect || 0) + (answerData.isCorrect ? 1 : 0);
            const newProgress = Math.round((newCorrect / Math.max(newAnswered, 1)) * 100);

            await db.update(userSyllabusProgress)
              .set({
                questionsAnswered: newAnswered,
                questionsCorrect: newCorrect,
                progressPercent: newProgress,
                updatedAt: new Date(),
              })
              .where(eq(userSyllabusProgress.id, existingProg.id));
          } else {
            // Create new progress entry
            toInsert.push({
              userId,
              syllabusTopicId: topic.id,
              questionsAnswered: 1,
              questionsCorrect: answerData.isCorrect ? 1 : 0,
              articlesRead: 0,
              progressPercent: answerData.isCorrect ? 100 : 0,
            });
          }
        }

        // Batch insert new progress
        if (toInsert.length > 0) {
          await db.insert(userSyllabusProgress).values(toInsert);
        }
      }

      if (matchingTopics.length > 0) {
        console.log(`[Syllabus] Updated progress for ${matchingTopics.length} topics`);
      }
    } catch (syllabusError) {
      console.error("[Syllabus] Failed to update syllabus progress:", syllabusError);
      // Don't fail the request if syllabus progress fails
    }
  }

  res.json(answer);
}));

// Complete quiz session
router.patch("/quiz/session/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const session = await storage.updateQuizSession(id, {
    ...updates,
    completedAt: new Date(),
  });

  if (!session) {
    throw new AppError(404, "Session not found");
  }

  res.json(session);
}));

// Get user progress
router.get("/progress", asyncHandler(async (req, res) => {
  const userId = await getDefaultUserId();
  const progress = await storage.getUserProgress(userId);
  res.json(progress);
}));

// Get user quiz sessions
router.get("/sessions", asyncHandler(async (req, res) => {
  const userId = await getDefaultUserId();
  const sessions = await storage.getUserQuizSessions(userId);
  res.json(sessions);
}));

// Get user answers for analysis
router.get("/answers", asyncHandler(async (req, res) => {
  const userId = await getDefaultUserId();
  const answers = await storage.getUserAnswers(userId);
  res.json(answers);
}));

// Get wrong answers with question details
router.get("/wrong-answers", asyncHandler(async (req, res) => {
  const userId = await getDefaultUserId();
  const subject = req.query.subject as string | undefined;
  const chapter = req.query.chapter as string | undefined;

  const answers = await storage.getUserAnswers(userId);
  const wrongAnswers = answers.filter(a => !a.isCorrect);

  const allQuestions = await storage.getAllQuestions();

  const wrongAnswersWithDetails = wrongAnswers
    .map(answer => {
      const question = allQuestions.find(q => q.id === answer.questionId);
      return question ? { ...answer, question } : null;
    })
    .filter(item => item !== null)
    .filter(item => {
      if (subject && item.question.subject !== subject) return false;
      if (chapter && item.question.chapter !== chapter) return false;
      return true;
    });

  res.json(wrongAnswersWithDetails);
}));

export default router;
