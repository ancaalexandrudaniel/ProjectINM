import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuizSessionSchema, insertUserAnswerSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all questions
  app.get("/api/questions", async (req, res) => {
    try {
      const questions = await storage.getAllQuestions();
      res.json(questions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // Get questions by subject
  app.get("/api/questions/:subject", async (req, res) => {
    try {
      const { subject } = req.params;
      const questions = await storage.getQuestionsBySubject(subject);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // Get random questions for quiz
  app.get("/api/quiz/random", async (req, res) => {
    try {
      const subject = req.query.subject as string;
      const count = parseInt(req.query.count as string) || 20;
      const questions = await storage.getRandomQuestions(subject, count);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch random questions" });
    }
  });

  // Create quiz session
  app.post("/api/quiz/session", async (req, res) => {
    try {
      const sessionData = insertQuizSessionSchema.parse({
        ...req.body,
        userId: "default-user" // For now, use default user
      });
      
      const session = await storage.createQuizSession(sessionData);
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid session data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create quiz session" });
      }
    }
  });

  // Submit answer
  app.post("/api/quiz/answer", async (req, res) => {
    try {
      const answerData = insertUserAnswerSchema.parse({
        ...req.body,
        userId: "default-user"
      });
      
      const answer = await storage.createUserAnswer(answerData);
      
      // Update user progress
      const question = await storage.getAllQuestions().then(questions => 
        questions.find(q => q.id === answerData.questionId)
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
            lastPracticed: new Date()
          });
        } else {
          await storage.updateUserProgress("default-user", question.subject, question.chapter, {
            totalQuestions: 1,
            correctAnswers: answerData.isCorrect ? 1 : 0,
            accuracy: answerData.isCorrect ? 100 : 0,
            lastPracticed: new Date()
          });
        }
      }
      
      res.json(answer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid answer data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to submit answer" });
      }
    }
  });

  // Complete quiz session
  app.patch("/api/quiz/session/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const session = await storage.updateQuizSession(id, {
        ...updates,
        completedAt: new Date()
      });
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: "Failed to update quiz session" });
    }
  });

  // Get user progress
  app.get("/api/progress", async (req, res) => {
    try {
      const progress = await storage.getUserProgress("default-user");
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // Get user quiz sessions
  app.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await storage.getUserQuizSessions("default-user");
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Get user answers for analysis
  app.get("/api/answers", async (req, res) => {
    try {
      const answers = await storage.getUserAnswers("default-user");
      res.json(answers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch answers" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
