import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuizSessionSchema, insertUserAnswerSchema } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { users } from "@shared/schema";

// Helper to get first user ID
async function getDefaultUserId(): Promise<string> {
  const allUsers = await db.select().from(users).limit(1);
  if (allUsers.length === 0) {
    throw new Error("No users found in database");
  }
  return allUsers[0].id;
}

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
      const userId = await getDefaultUserId();
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // Get user quiz sessions
  app.get("/api/sessions", async (req, res) => {
    try {
      const userId = await getDefaultUserId();
      const sessions = await storage.getUserQuizSessions(userId);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Get user answers for analysis
  app.get("/api/answers", async (req, res) => {
    try {
      const userId = await getDefaultUserId();
      const answers = await storage.getUserAnswers(userId);
      res.json(answers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch answers" });
    }
  });

  // Get wrong answers with question details
  app.get("/api/wrong-answers", async (req, res) => {
    try {
      const userId = await getDefaultUserId();
      const subject = req.query.subject as string | undefined;
      const chapter = req.query.chapter as string | undefined;
      
      const answers = await storage.getUserAnswers(userId);
      const wrongAnswers = answers.filter(a => !a.isCorrect);
      
      const questions = await storage.getAllQuestions();
      
      const wrongAnswersWithDetails = wrongAnswers
        .map(answer => {
          const question = questions.find(q => q.id === answer.questionId);
          return question ? { ...answer, question } : null;
        })
        .filter(item => item !== null)
        .filter(item => {
          if (subject && item.question.subject !== subject) return false;
          if (chapter && item.question.chapter !== chapter) return false;
          return true;
        });
      
      res.json(wrongAnswersWithDetails);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wrong answers" });
    }
  });

  // AI: Explain wrong answer
  app.post("/api/ai/explain-wrong-answer", async (req, res) => {
    try {
      const { explainWrongAnswer } = await import("./gemini");
      const { aiExplanations, questions } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const { questionId, userAnswerId } = req.body;
      const userId = await getDefaultUserId();
      
      // Get question details
      const [question] = await db.select().from(questions).where(eq(questions.id, questionId));
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      
      // Get user answer
      const answers = await storage.getUserAnswers(userId);
      const userAnswer = answers.find(a => a.id === userAnswerId);
      if (!userAnswer) {
        return res.status(404).json({ error: "Answer not found" });
      }
      
      // Extract option texts
      const options = question.options as any[];
      const correctOptionText = options[question.correctAnswer]?.text || "";
      const userSelectedText = userAnswer.selectedAnswer !== null 
        ? options[userAnswer.selectedAnswer]?.text || ""
        : "";
      
      // Generate AI explanation
      const explanation = await explainWrongAnswer({
        questionText: question.questionText,
        correctOptionText,
        userSelectedText,
        explanation: question.explanation,
        legalReferences: (question.legalReferences as string[]) || [],
        subject: question.subject
      });
      
      // Save explanation to database
      await db.insert(aiExplanations).values({
        userId,
        questionId,
        userAnswerId,
        explanation
      });
      
      res.json({ explanation });
    } catch (error) {
      console.error("AI explanation error:", error);
      res.status(500).json({ error: "Failed to generate AI explanation" });
    }
  });

  // AI: Upload and process document (simplified - base64 upload)
  app.post("/api/documents/upload", async (req, res) => {
    try {
      const { extractTextFromPDF, analyzeLegalDocument } = await import("./gemini");
      const { uploadedDocuments } = await import("@shared/schema");
      const userId = await getDefaultUserId();
      const fs = await import("fs");
      
      const { fileName, documentType, subject, fileContent } = req.body;
      
      // Save base64 to temporary file
      const tmpPath = `/tmp/${Date.now()}-${fileName}`;
      const buffer = Buffer.from(fileContent, 'base64');
      fs.writeFileSync(tmpPath, buffer);
      
      // Extract text from PDF
      const extractedText = await extractTextFromPDF(tmpPath);
      
      // Analyze document with AI
      const analysis = await analyzeLegalDocument({
        documentText: extractedText,
        documentType: documentType as any
      });
      
      // Save document metadata to database
      const [document] = await db.insert(uploadedDocuments).values({
        userId,
        fileName,
        documentType,
        subject,
        objectPath: tmpPath, // store temp path for reference
        extractedText,
        aiSummary: analysis.summary
      }).returning();
      
      // Clean up temp file
      fs.unlinkSync(tmpPath);
      
      res.json({ 
        document, 
        analysis 
      });
    } catch (error) {
      console.error("Document upload error:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  // AI: Get all uploaded documents
  app.get("/api/documents", async (req, res) => {
    try {
      const { uploadedDocuments } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const userId = await getDefaultUserId();
      
      const docs = await db
        .select()
        .from(uploadedDocuments)
        .where(eq(uploadedDocuments.userId, userId));
      
      res.json(docs);
    } catch (error) {
      console.error("Fetch documents error:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // AI: Process uploaded document
  app.post("/api/documents/process", async (req, res) => {
    try {
      const { ObjectStorageService } = await import("./objectStorage");
      const { extractTextFromPDF, analyzeLegalDocument } = await import("./gemini");
      const { uploadedDocuments } = await import("@shared/schema");
      const storageService = new ObjectStorageService();
      const userId = await getDefaultUserId();
      
      const { uploadURL, fileName, documentType, subject } = req.body;
      
      // Normalize object path
      const objectPath = storageService.normalizeObjectEntityPath(uploadURL);
      
      // Download PDF to temporary location
      const tmpPath = `/tmp/${Date.now()}.pdf`;
      await storageService.downloadObjectEntityToLocal(objectPath, tmpPath);
      
      // Extract text from PDF
      const extractedText = await extractTextFromPDF(tmpPath);
      
      // Analyze document with AI
      const analysis = await analyzeLegalDocument({
        documentText: extractedText,
        documentType: documentType as any
      });
      
      // Save document metadata to database
      const [document] = await db.insert(uploadedDocuments).values({
        userId,
        fileName,
        documentType,
        subject,
        objectPath,
        extractedText,
        aiSummary: analysis.summary
      }).returning();
      
      res.json({ 
        document, 
        analysis 
      });
    } catch (error) {
      console.error("Document processing error:", error);
      res.status(500).json({ error: "Failed to process document" });
    }
  });

  // AI: Analyze exam patterns from uploaded exam documents
  app.post("/api/documents/analyze-patterns", async (req, res) => {
    try {
      const { analyzeExamPatterns } = await import("./gemini");
      const { uploadedDocuments } = await import("@shared/schema");
      const { eq, and, inArray } = await import("drizzle-orm");
      const userId = await getDefaultUserId();
      
      const { documentIds, subject } = req.body;
      
      if (!documentIds || documentIds.length === 0) {
        return res.status(400).json({ error: "No documents specified" });
      }
      
      // Fetch exam documents with extracted text
      const docs = await db
        .select()
        .from(uploadedDocuments)
        .where(
          and(
            eq(uploadedDocuments.userId, userId),
            inArray(uploadedDocuments.id, documentIds),
            eq(uploadedDocuments.documentType, "subiecte")
          )
        );
      
      if (docs.length === 0) {
        return res.status(404).json({ error: "No exam documents found" });
      }
      
      // Prepare documents for analysis (extract year from filename if available)
      const examDocuments = docs.map(doc => {
        const yearMatch = doc.fileName.match(/20\d{2}/); // Extract year like 2019, 2020, etc.
        return {
          year: yearMatch ? yearMatch[0] : "unknown",
          text: doc.extractedText || ""
        };
      });
      
      // Analyze with AI
      const analysis = await analyzeExamPatterns({
        examDocuments,
        subject: subject || "Drept Civil"
      });
      
      res.json(analysis);
    } catch (error) {
      console.error("Exam pattern analysis error:", error);
      res.status(500).json({ error: "Failed to analyze exam patterns" });
    }
  });

  // AI: Delete document
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const { uploadedDocuments } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const userId = await getDefaultUserId();
      const documentId = req.params.id;
      
      await db
        .delete(uploadedDocuments)
        .where(
          and(
            eq(uploadedDocuments.id, documentId),
            eq(uploadedDocuments.userId, userId)
          )
        );
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // AI: Generate personalized study plan
  app.post("/api/study-plan/generate", async (req, res) => {
    try {
      const { generatePersonalizedStudyPlan } = await import("./gemini");
      const { studyPlans, insertStudyPlanSchema } = await import("@shared/schema");
      
      const userId = await getDefaultUserId();
      const { daysUntilExam, hoursPerDay } = req.body;
      
      // Validate input
      if (!daysUntilExam || !hoursPerDay) {
        return res.status(400).json({ error: "Missing daysUntilExam or hoursPerDay" });
      }
      
      // Get user progress
      const progress = await storage.getUserProgress(userId);
      
      // Format progress for AI
      const userProgress = progress.map(p => ({
        subject: p.subject,
        chapter: p.chapter,
        accuracy: p.accuracy || 0,
        totalQuestions: p.totalQuestions || 0
      }));
      
      // Generate plan with AI
      const generatedPlan = await generatePersonalizedStudyPlan({
        userProgress,
        daysUntilExam: parseInt(daysUntilExam),
        hoursPerDay: parseInt(hoursPerDay),
        examPatterns: [] // Can be enhanced later with exam patterns
      });
      
      // Save plan to database
      const planData = insertStudyPlanSchema.parse({
        userId,
        daysUntilExam: parseInt(daysUntilExam),
        hoursPerDay: parseInt(hoursPerDay),
        planData: generatedPlan
      });
      
      const [savedPlan] = await db.insert(studyPlans).values(planData).returning();
      
      res.json({
        id: savedPlan.id,
        ...generatedPlan
      });
    } catch (error) {
      console.error("Study plan generation error:", error);
      res.status(500).json({ error: "Failed to generate study plan" });
    }
  });

  // Get latest study plan
  app.get("/api/study-plan/latest", async (req, res) => {
    try {
      const { studyPlans } = await import("@shared/schema");
      const { desc, eq } = await import("drizzle-orm");
      
      const userId = await getDefaultUserId();
      
      const [latestPlan] = await db
        .select()
        .from(studyPlans)
        .where(eq(studyPlans.userId, userId))
        .orderBy(desc(studyPlans.generatedAt))
        .limit(1);
      
      if (!latestPlan) {
        return res.status(404).json({ error: "No study plan found" });
      }
      
      res.json({
        id: latestPlan.id,
        daysUntilExam: latestPlan.daysUntilExam,
        hoursPerDay: latestPlan.hoursPerDay,
        generatedAt: latestPlan.generatedAt,
        ...latestPlan.planData
      });
    } catch (error) {
      console.error("Get study plan error:", error);
      res.status(500).json({ error: "Failed to fetch study plan" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
