import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertQuizSessionSchema, insertUserAnswerSchema, questionTopics, essayPrompts, userEssaySubmissions, questions } from "../shared/schema";
import { z } from "zod";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq, and } from "drizzle-orm";
import {
  createSession,
  validateSession,
  invalidateSession,
  verifyPassword,
  type AuthenticatedUser
} from "./auth";
import multer from "multer";
import { parsePDFBuffer, cleanPDFText, detectExamPaperType } from "./services/pdf-parser";

// Configure multer for file uploads (memory storage for PDF processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}

// Helper to get first user ID
async function getDefaultUserId(): Promise<string> {
  const allUsers = await db.select().from(users).limit(1);
  if (allUsers.length === 0) {
    throw new Error("No users found in database");
  }
  return allUsers[0].id;
}

// ============================================================================
// Authentication Middleware
// ============================================================================
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const sessionToken = req.headers.authorization?.replace("Bearer ", "") ||
    req.cookies?.session_token;

  if (!sessionToken) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = await validateSession(sessionToken);
  if (!user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.user = user;
  req.sessionToken = sessionToken;
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {

  // ============================================================================
  // AUTHENTICATION ROUTES
  // ============================================================================

  // POST /api/login - Authenticate user and create session
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password (now async with bcrypt)
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Get client info for fingerprint
      const userAgent = req.headers["user-agent"] || "unknown";
      const ipAddress = req.ip || req.socket.remoteAddress || "unknown";

      // Create session (with kick-old logic)
      const sessionToken = await createSession({
        userId: user.id,
        userAgent,
        ipAddress,
        subscriptionTier: user.subscriptionTier || "free",
      });

      console.log(`[AUTH] User ${user.email} logged in successfully`);

      res.json({
        success: true,
        sessionToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          subscriptionTier: user.subscriptionTier || "free",
        },
      });
    } catch (error) {
      console.error("[AUTH] Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // POST /api/logout - Invalidate session
  app.post("/api/logout", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace("Bearer ", "");

      if (sessionToken) {
        await invalidateSession(sessionToken);
        console.log("[AUTH] Session invalidated");
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[AUTH] Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  // GET /api/me - Get current user
  app.get("/api/me", async (req, res) => {
    try {
      const sessionToken = req.headers.authorization?.replace("Bearer ", "");

      if (!sessionToken) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await validateSession(sessionToken);

      if (!user) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }

      res.json({ user });
    } catch (error) {
      console.error("[AUTH] Me error:", error);
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  // Protected route example
  app.get("/api/protected/profile", authMiddleware, async (req, res) => {
    res.json({
      message: "This is a protected route",
      user: req.user,
    });
  });

  // ============================================================================
  // SRS (SPACED REPETITION) ROUTES
  // ============================================================================

  // GET /api/srs/due - Get cards due for review
  app.get("/api/srs/due", async (req, res) => {
    try {
      const { getDueCards } = await import("./srs");
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
    } catch (error) {
      console.error("[SRS] Get due cards error:", error);
      res.status(500).json({ error: "Failed to get due cards" });
    }
  });

  // GET /api/srs/stats - Get SRS statistics
  app.get("/api/srs/stats", async (req, res) => {
    try {
      const { getSrsStats } = await import("./srs");
      const userId = await getDefaultUserId();

      const stats = await getSrsStats(userId);

      res.json(stats);
    } catch (error) {
      console.error("[SRS] Get stats error:", error);
      res.status(500).json({ error: "Failed to get SRS stats" });
    }
  });

  // POST /api/srs/review - Process a card review
  app.post("/api/srs/review", async (req, res) => {
    try {
      const { processReview } = await import("./srs");
      const userId = await getDefaultUserId();

      const { cardId, grade } = req.body;

      if (!cardId || grade === undefined) {
        return res.status(400).json({ error: "cardId and grade are required" });
      }

      if (grade < 0 || grade > 5) {
        return res.status(400).json({ error: "Grade must be between 0 and 5" });
      }

      const result = await processReview(userId, cardId, grade as 0 | 1 | 2 | 3 | 4 | 5);

      res.json({
        success: true,
        nextReviewAt: result.nextReviewAt,
        interval: result.interval,
        easeFactor: result.easeFactor,
      });
    } catch (error) {
      console.error("[SRS] Review error:", error);
      res.status(500).json({ error: "Failed to process review" });
    }
  });

  // POST /api/srs/card - Create an SRS card for a question
  app.post("/api/srs/card", async (req, res) => {
    try {
      const { createSrsCard } = await import("./srs");
      const userId = await getDefaultUserId();

      const { questionId } = req.body;

      if (!questionId) {
        return res.status(400).json({ error: "questionId is required" });
      }

      await createSrsCard(userId, questionId);

      res.json({ success: true });
    } catch (error) {
      console.error("[SRS] Create card error:", error);
      res.status(500).json({ error: "Failed to create SRS card" });
    }
  });

  // GET /api/srs/count - Get count of cards due today (for dashboard)
  app.get("/api/srs/count", async (req, res) => {
    try {
      const { getDueCardCount } = await import("./srs");
      const userId = await getDefaultUserId();

      const count = await getDueCardCount(userId);

      res.json({ dueCount: count });
    } catch (error) {
      console.error("[SRS] Get count error:", error);
      res.status(500).json({ error: "Failed to get due count" });
    }
  });

  // ============================================================================
  // EXAM PAPERS (SUBIECTE + BAREME) ROUTES
  // ============================================================================

  // DELETE /api/exam-papers/cleanup - Delete exam questions by year (for re-import)
  app.delete("/api/exam-papers/cleanup", async (req, res) => {
    try {
      const { questions } = await import("../shared/schema");
      const { like } = await import("drizzle-orm");

      const year = req.query.year as string;
      if (!year) {
        return res.status(400).json({ error: "Year parameter required" });
      }

      const result = await db
        .delete(questions)
        .where(like(questions.chapter, `%Examen ${year}%`))
        .returning({ id: questions.id });

      console.log(`[EXAM CLEANUP] Deleted ${result.length} questions from year ${year}`);

      res.json({
        success: true,
        deleted: result.length,
        year,
        message: `Deleted ${result.length} questions from Examen ${year}`
      });
    } catch (error) {
      console.error("[EXAM CLEANUP] Error:", error);
      res.status(500).json({ error: "Failed to cleanup exam questions" });
    }
  });

  // GET /api/exam-papers - Get exam papers by year/subject
  app.get("/api/exam-papers", async (req, res) => {
    try {
      const { questions } = await import("../shared/schema");
      const { and, eq: eqOp, ilike } = await import("drizzle-orm");

      const year = req.query.year as string | undefined;
      const subject = req.query.subject as string | undefined;

      // Query questions that have sourceType = 'exam-past'
      let query = db.select().from(questions);

      const results = await query.where(
        eqOp(questions.sourceType, 'exam-past')
      ).limit(100);

      // Filter by year tag if specified
      const filtered = year
        ? results.filter(q => (q.tags as string[] || []).includes(`year:${year}`))
        : results;

      res.json(filtered.map(q => ({
        id: q.id,
        year: (q.tags as string[] || []).find(t => t.startsWith('year:'))?.replace('year:', '') || 'unknown',
        subject: q.subject,
        type: 'grila',
        content: q.questionText,
        correctAnswer: q.correctAnswer,
        createdAt: q.createdAt,
      })));
    } catch (error) {
      console.error("[EXAM] List papers error:", error);
      res.status(500).json({ error: "Failed to get exam papers" });
    }
  });

  // POST /api/exam-papers/import - Import exam papers from parsed questions
  app.post("/api/exam-papers/import", async (req, res) => {
    try {
      const { questions: questionsTable } = await import("../shared/schema");
      const userId = await getDefaultUserId();

      const { year, subject, type, questions: parsedQuestions } = req.body;

      if (!year || !subject || !parsedQuestions || !Array.isArray(parsedQuestions)) {
        return res.status(400).json({ error: "year, subject, and questions are required" });
      }

      console.log(`[EXAM] Importing ${parsedQuestions.length} questions from ${year} ${subject}`);

      const inserted = [];
      for (const q of parsedQuestions) {
        const [insertedQ] = await db.insert(questionsTable).values({
          subject,
          chapter: `Examen ${year}`,
          topic: `Subiecte ${year}`,
          difficulty: 'medium',
          setType: 'A', // Standard single answer
          questionText: q.questionText,
          options: q.options.map((text: string, idx: number) => ({ text, id: idx })),
          correctAnswer: q.correctAnswer || 0,
          explanation: `Întrebare din examenul INM ${year}. Răspunsul corect conform baremului oficial.`,
          sourceType: 'exam-past',
          tags: [`year:${year}`, `source:inm-official`],
        }).returning();

        inserted.push(insertedQ);
      }

      console.log(`[EXAM] Successfully imported ${inserted.length} questions`);

      res.json({
        success: true,
        imported: inserted.length,
        year,
        subject,
      });
    } catch (error) {
      console.error("[EXAM] Import error:", error);
      res.status(500).json({ error: "Failed to import exam papers" });
    }
  });

  // POST /api/exam-papers/import-json - Import exam papers from direct JSON input
  // This is the preferred method for importing questions (bypasses PDF parsing)
  app.post("/api/exam-papers/import-json", async (req, res) => {
    try {
      const { questions: questionsTable } = await import("../shared/schema");
      const userId = await getDefaultUserId();

      // Validate input schema
      const importSchema = z.object({
        year: z.number().min(2010).max(2030),
        examType: z.enum(["grile", "spete"]),
        subject: z.enum([
          "civil", "civil-procedural", "penal", "penal-procedural",
          "civil-combined", "penal-combined"
        ]),
        questions: z.array(z.object({
          number: z.number().optional(),
          text: z.string().min(5),
          options: z.array(z.string()).min(2).max(4),
          correctAnswer: z.union([
            z.enum(["A", "B", "C", "D"]),
            z.number().min(1).max(4)
          ])
        })).min(1)
      });

      const parsed = importSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid JSON format",
          details: parsed.error.format()
        });
      }

      const { year, examType, subject, questions: jsonQuestions } = parsed.data;

      console.log(`[EXAM-JSON] Importing ${jsonQuestions.length} questions: ${year} ${examType} ${subject}`);

      // Determine actual subject(s) for combined types
      let actualSubject = subject;
      if (subject === "civil-combined") actualSubject = "civil"; // Store as civil for now
      if (subject === "penal-combined") actualSubject = "penal";

      const inserted = [];
      for (const q of jsonQuestions) {
        // Convert correctAnswer to index (1-based)
        let correctIdx: number;
        if (typeof q.correctAnswer === 'string') {
          correctIdx = q.correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
        } else {
          correctIdx = q.correctAnswer;
        }

        const [insertedQ] = await db.insert(questionsTable).values({
          subject: actualSubject,
          chapter: `Examen ${year} - ${examType === 'grile' ? 'Grilă' : 'Speță'}`,
          topic: `${examType === 'grile' ? 'Proba I' : 'Proba II'} ${year}`,
          difficulty: 'medium',
          setType: 'A', // Standard single answer for grile
          questionText: q.text,
          options: q.options.map((text: string, idx: number) => ({ text, id: idx })),
          correctAnswer: correctIdx,
          explanation: `Întrebare din examenul oficial INM ${year}. Răspunsul corect: ${typeof q.correctAnswer === 'string' ? q.correctAnswer : String.fromCharCode(64 + q.correctAnswer)}.`,
          sourceType: 'exam-past',
          tags: [`year:${year}`, `source:inm-official`, `type:${examType}`, `subject:${subject}`],
        }).returning();

        inserted.push(insertedQ);
      }

      console.log(`[EXAM-JSON] Successfully imported ${inserted.length} questions`);

      res.json({
        success: true,
        imported: inserted.length,
        year,
        examType,
        subject,
        message: `Imported ${inserted.length} ${examType} questions for ${subject} (${year})`
      });
    } catch (error) {
      console.error("[EXAM-JSON] Import error:", error);
      res.status(500).json({ error: "Failed to import JSON exam data" });
    }
  });
  app.post("/api/exam-papers/upload-pdf", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(`[PDF UPLOAD] Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

      // Parse the PDF
      const parseResult = await parsePDFBuffer(req.file.buffer);

      if (!parseResult.success) {
        return res.status(400).json({
          error: "Failed to parse PDF",
          details: parseResult.error
        });
      }

      // Clean the extracted text
      const cleanedText = cleanPDFText(parseResult.text);

      // Auto-detect exam paper type
      const detectedType = detectExamPaperType(cleanedText);

      console.log(`[PDF UPLOAD] Parsed ${parseResult.numPages} pages, detected:`, detectedType);

      res.json({
        success: true,
        filename: req.file.originalname,
        numPages: parseResult.numPages,
        textLength: cleanedText.length,
        textPreview: cleanedText.substring(0, 1000) + (cleanedText.length > 1000 ? '...' : ''),
        fullText: cleanedText,
        detectedType,
        info: parseResult.info,
      });
    } catch (error) {
      console.error("[PDF UPLOAD] Error:", error);
      res.status(500).json({ error: "Failed to process PDF upload" });
    }
  });

  // ============================================================================
  // EXAM ESSAYS (PROBE SCRISE / SPEȚE) IMPORT ROUTES
  // ============================================================================

  // POST /api/exam-essays/import-json - Import structured essay exam from JSON
  app.post("/api/exam-essays/import-json", async (req, res) => {
    try {
      const { examEssays } = await import("../shared/schema");

      // Validate input schema
      const subjectSchema = z.object({
        id: z.string(),
        area: z.string(),
        title: z.string(),
        scenario: z.string().nullable().optional(),
        requirements: z.array(z.object({
          id: z.string(),
          text: z.string(),
          points: z.union([z.number(), z.string()]),
          time: z.number().optional(),
          solution: z.string(),
          legalRefs: z.array(z.string()).optional(),
          rubric: z.array(z.object({
            criterion: z.string(),
            points: z.union([z.number(), z.string()])
          }))
        }))
      });

      const importSchema = z.object({
        year: z.number().min(2010).max(2030),
        variant: z.number().default(1),
        discipline: z.enum(["civil-combined", "penal-combined"]),
        subjects: z.array(subjectSchema).min(1),
        totalPoints: z.number().optional(),
        totalTime: z.number().optional()
      });

      const parsed = importSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid JSON format",
          details: parsed.error.format()
        });
      }

      const { year, variant, discipline, subjects } = parsed.data;

      console.log(`[EXAM-ESSAYS] Importing ${subjects.length} subjects for ${year} V${variant} ${discipline}`);

      const inserted = [];
      for (const subject of subjects) {
        for (const req of subject.requirements) {
          const [insertedReq] = await db.insert(examEssays).values({
            year,
            variant,
            discipline,
            subjectId: subject.id,
            subjectTitle: subject.title,
            subjectArea: subject.area,
            scenario: subject.scenario || null,
            requirementId: req.id,
            requirementText: req.text,
            points: String(req.points),
            recommendedTime: req.time || null,
            solution: req.solution,
            legalRefs: req.legalRefs || [],
            rubric: req.rubric.map(r => ({
              criterion: r.criterion,
              points: String(r.points)
            })),
            sourceType: 'official',
          }).returning();

          inserted.push(insertedReq);
        }
      }

      console.log(`[EXAM-ESSAYS] Successfully imported ${inserted.length} requirements`);

      res.json({
        success: true,
        imported: inserted.length,
        year,
        variant,
        discipline,
        subjects: subjects.length,
        message: `Imported ${inserted.length} requirements from ${subjects.length} subjects (${year} V${variant})`
      });
    } catch (error) {
      console.error("[EXAM-ESSAYS] Import error:", error);
      res.status(500).json({ error: "Failed to import exam essays" });
    }
  });

  // GET /api/exam-essays - List exam essays by year/discipline
  app.get("/api/exam-essays", async (req, res) => {
    try {
      const { examEssays } = await import("../shared/schema");
      const { eq: eqOp, and } = await import("drizzle-orm");

      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const discipline = req.query.discipline as string | undefined;

      let results;
      if (year && discipline) {
        results = await db.select().from(examEssays).where(
          and(eqOp(examEssays.year, year), eqOp(examEssays.discipline, discipline))
        );
      } else if (year) {
        results = await db.select().from(examEssays).where(eqOp(examEssays.year, year));
      } else {
        results = await db.select().from(examEssays).limit(100);
      }

      res.json({
        essays: results,
        count: results.length
      });
    } catch (error) {
      console.error("[EXAM-ESSAYS] List error:", error);
      res.status(500).json({ error: "Failed to list exam essays" });
    }
  });

  // DELETE /api/exam-essays/cleanup - Delete exam essays by year (for re-import)
  app.delete("/api/exam-essays/cleanup", async (req, res) => {
    try {
      const { examEssays } = await import("../shared/schema");
      const { eq: eqOp, and } = await import("drizzle-orm");

      const year = parseInt(req.query.year as string);
      const discipline = req.query.discipline as string | undefined;

      if (!year) {
        return res.status(400).json({ error: "Year parameter required" });
      }

      let result;
      if (discipline) {
        result = await db.delete(examEssays).where(
          and(eqOp(examEssays.year, year), eqOp(examEssays.discipline, discipline))
        ).returning({ id: examEssays.id });
      } else {
        result = await db.delete(examEssays).where(eqOp(examEssays.year, year)).returning({ id: examEssays.id });
      }

      console.log(`[EXAM-ESSAYS CLEANUP] Deleted ${result.length} requirements from ${year}`);

      res.json({
        success: true,
        deleted: result.length,
        year,
        discipline,
        message: `Deleted ${result.length} essay requirements from ${year}`
      });
    } catch (error) {
      console.error("[EXAM-ESSAYS CLEANUP] Error:", error);
      res.status(500).json({ error: "Failed to cleanup exam essays" });
    }
  });

  // GET /api/exam-essays/:year/:discipline - Get structured exam data for Time Machine Proba II
  app.get("/api/exam-essays/:year/:discipline", async (req, res) => {
    try {
      const { examEssays } = await import("../shared/schema");
      const { eq: eqOp, and } = await import("drizzle-orm");

      const year = parseInt(req.params.year);
      const discipline = req.params.discipline;

      if (isNaN(year) || !discipline) {
        return res.status(400).json({ error: "Year and discipline are required" });
      }

      console.log(`[EXAM-ESSAYS] Fetching exam data for ${year} ${discipline}`);

      // Fetch all requirements for this year/discipline
      const requirements = await db.select().from(examEssays).where(
        and(eqOp(examEssays.year, year), eqOp(examEssays.discipline, discipline))
      );

      if (requirements.length === 0) {
        return res.status(404).json({ error: "No exam data found for this year/discipline" });
      }

      // Group by subjectId to build nested structure
      const subjectsMap = new Map<string, {
        subjectId: string;
        subjectTitle: string;
        subjectArea: string;
        scenario: string | null;
        requirements: Array<{
          id: string;
          requirementId: string;
          requirementText: string;
          points: string;
          recommendedTime: number | null;
          solution: string;
          rubric: Array<{ criterion: string; points: string }>;
        }>;
      }>();

      for (const req of requirements) {
        if (!subjectsMap.has(req.subjectId)) {
          subjectsMap.set(req.subjectId, {
            subjectId: req.subjectId,
            subjectTitle: req.subjectTitle,
            subjectArea: req.subjectArea,
            scenario: req.scenario,
            requirements: []
          });
        }

        subjectsMap.get(req.subjectId)!.requirements.push({
          id: req.id,
          requirementId: req.requirementId,
          requirementText: req.requirementText,
          points: req.points,
          recommendedTime: req.recommendedTime,
          solution: req.solution,
          rubric: req.rubric as Array<{ criterion: string; points: string }>
        });
      }

      // Sort requirements within each subject by requirementId
      for (const subject of subjectsMap.values()) {
        subject.requirements.sort((a, b) => a.requirementId.localeCompare(b.requirementId));
      }

      // Build final structure matching ExamData interface
      const subjects = Array.from(subjectsMap.values());
      const totalPoints = subjects.reduce((sum, s) =>
        sum + s.requirements.reduce((rSum, r) => rSum + parseFloat(r.points), 0), 0
      );

      console.log(`[EXAM-ESSAYS] Returning ${subjects.length} subjects with ${requirements.length} total requirements`);

      res.json({
        year,
        discipline,
        subjects,
        totalPoints
      });
    } catch (error) {
      console.error("[EXAM-ESSAYS] Fetch by year/discipline error:", error);
      res.status(500).json({ error: "Failed to fetch exam essays" });
    }
  });

  // POST /api/ai/grade-essay - AI-powered grading for Proba II essays
  app.post("/api/ai/grade-essay", async (req, res) => {
    try {
      const { examEssays } = await import("../shared/schema");
      const { eq: eqOp, and } = await import("drizzle-orm");
      const { GoogleGenAI } = await import("@google/genai");

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

      // Parse request
      const schema = z.object({
        year: z.number(),
        discipline: z.string(),
        answers: z.record(z.string()), // requirementId -> userAnswer
        timeSpent: z.number().optional()
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error });
      }

      const { year, discipline, answers, timeSpent } = parsed.data;

      console.log(`[GRADE-ESSAY] Grading ${Object.keys(answers).length} answers for ${year} ${discipline}`);

      // Fetch official requirements/rubrics from DB
      const requirements = await db.select().from(examEssays).where(
        and(eqOp(examEssays.year, year), eqOp(examEssays.discipline, discipline))
      );

      if (requirements.length === 0) {
        return res.status(404).json({ error: "No exam data found for grading" });
      }

      // Build requirements map for quick lookup
      const reqMap = new Map(requirements.map(r => [r.id, r]));

      // Grade each answered requirement
      const feedback: Array<{
        requirementId: string;
        score: number;
        maxScore: number;
        feedback: string;
        strengths: string[];
        improvements: string[];
      }> = [];

      let totalScore = 0;
      let maxScore = 0;
      const bySubject: Record<string, { score: number; max: number }> = {};

      for (const [reqId, userAnswer] of Object.entries(answers)) {
        const req = reqMap.get(reqId);
        if (!req || !userAnswer.trim()) continue;

        const maxPoints = parseFloat(req.points);
        maxScore += maxPoints;

        // Initialize bySubject tracking
        if (!bySubject[req.subjectId]) {
          bySubject[req.subjectId] = { score: 0, max: 0 };
        }
        bySubject[req.subjectId].max += maxPoints;

        // Build AI grading prompt using "Warm Mentor" protocol
        const systemPrompt = `Ești un mentor prietenos și exigent pentru pregătirea examenului INM (Institutul Național al Magistraturii).
Te adresezi direct studentului la persoana a 2-a (tu/ți-ai/te), cu un ton cald dar constructiv.

Rolul tău este să evaluezi răspunsul studentului pentru o cerință specifică din Proba II (probe scrise).
Notezi obiectiv pe baza baremului oficial și oferi feedback util pentru îmbunătățire.

Răspunde STRICT în format JSON:
{
  "score": număr_cu_2_zecimale_între_0_și_maxim,
  "feedback": "paragraf scurt de evaluare generală (max 50 cuvinte)",
  "strengths": ["punct tare 1", "punct tare 2"],
  "improvements": ["aspect de îmbunătățit 1", "aspect 2"]
}`;

        const rubricText = (req.rubric as Array<{ criterion: string; points: string }>)
          .map(r => `- ${r.criterion}: ${r.points}p`)
          .join("\n");

        const userPrompt = `Evaluează răspunsul pentru cerința ${req.requirementId}:

=== CERINȚA (${req.points} puncte) ===
${req.requirementText}

=== BAREM OFICIAL ===
${rubricText}

=== SOLUȚIE MODEL ===
${req.solution}

=== RĂSPUNSUL STUDENTULUI ===
${userAnswer}

Punctaj maxim posibil: ${req.points}
Notează obiectiv pe baza baremului.`;

        try {
          const result = await ai.models.generateContent({
            model: "gemini-2.0-flash-001",
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: "application/json"
            },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }]
          });

          const rawJson = result.text?.replace(/```json|```/g, "").trim();
          if (rawJson) {
            const gradeResult = JSON.parse(rawJson);
            const earnedScore = Math.min(Math.max(0, gradeResult.score), maxPoints);

            totalScore += earnedScore;
            bySubject[req.subjectId].score += earnedScore;

            feedback.push({
              requirementId: req.requirementId,
              score: earnedScore,
              maxScore: maxPoints,
              feedback: gradeResult.feedback || "",
              strengths: gradeResult.strengths || [],
              improvements: gradeResult.improvements || []
            });
          }
        } catch (aiError) {
          console.error(`[GRADE-ESSAY] AI grading failed for ${req.requirementId}:`, aiError);
          // Fallback: give partial credit
          const partialScore = maxPoints * 0.5;
          totalScore += partialScore;
          bySubject[req.subjectId].score += partialScore;

          feedback.push({
            requirementId: req.requirementId,
            score: partialScore,
            maxScore: maxPoints,
            feedback: "Evaluare automată indisponibilă - punctaj parțial acordat.",
            strengths: [],
            improvements: ["Retrimiteți pentru evaluare detaliată"]
          });
        }
      }

      // Calculate overall stats
      const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      const passed = percentage >= 50; // 50% minimum for written exams

      // Expression score (0.50 bonus for clarity - simplified calculation)
      const avgAnswerLength = Object.values(answers).reduce((sum, a) => sum + a.length, 0) / Math.max(Object.keys(answers).length, 1);
      const expressionScore = avgAnswerLength > 200 ? 0.45 : avgAnswerLength > 100 ? 0.35 : 0.25;

      console.log(`[GRADE-ESSAY] Grading complete: ${totalScore.toFixed(2)}/${maxScore} (${percentage}%)`);

      res.json({
        totalScore: totalScore + expressionScore,
        maxScore,
        percentage,
        passed,
        bySubject,
        feedback,
        overallFeedback: passed
          ? "Felicitări! Ai demonstrat o înțelegere solidă a materiei. Continuă să exersezi pentru a-ți perfecționa argumentarea juridică."
          : "Mai ai de lucrat la fundamentarea juridică. Concentrează-te pe îmbunătățirea structurii IRAC și pe citarea precisă a articolelor de lege.",
        expressionScore
      });
    } catch (error) {
      console.error("[GRADE-ESSAY] Error:", error);
      res.status(500).json({ error: "Failed to grade essay" });
    }
  });

  // POST /api/questions/fix-penal-subjects - Fix penal questions by splitting into penal + penal-procedural
  app.post("/api/questions/fix-penal-subjects", async (req, res) => {
    try {
      const { questions: questionsTable } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      // Get all penal questions, ordered by creation date
      const penalQuestions = await db.select()
        .from(questionsTable)
        .where(eq(questionsTable.subject, "penal"));

      console.log(`[FIX-PENAL] Found ${penalQuestions.length} penal questions`);

      if (penalQuestions.length !== 50) {
        return res.json({
          success: false,
          message: `Expected 50 penal questions, found ${penalQuestions.length}. Manual intervention needed.`
        });
      }

      // Sort by createdAt to get consistent order
      penalQuestions.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Update the second half (questions 26-50) to penal-procedural
      const procedural = penalQuestions.slice(25, 50);
      let updated = 0;

      for (const q of procedural) {
        await db.update(questionsTable)
          .set({
            subject: "penal-procedural",
            tags: [...(q.tags || []).filter(t => !t.startsWith('subject:')), 'subject:penal-procedural']
          })
          .where(eq(questionsTable.id, q.id));
        updated++;
      }

      console.log(`[FIX-PENAL] Updated ${updated} questions to penal-procedural`);

      res.json({
        success: true,
        updated,
        message: `Successfully updated ${updated} questions from penal to penal-procedural`
      });
    } catch (error) {
      console.error("[FIX-PENAL] Error:", error);
      res.status(500).json({ error: "Failed to fix penal subjects" });
    }
  });

  // POST /api/exam-sessions/submit - Grade Proba I and save results
  app.post("/api/exam-sessions/submit", async (req, res) => {
    try {
      const { examResults } = await import("../shared/schema");
      const { eq, and, sql } = await import("drizzle-orm");

      // 1. Parse Input
      const schema = z.object({
        year: z.number(),
        answers: z.record(z.string()), // questionId -> answer (A/B/C)
        timeSpent: z.number().optional()
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error });
      }

      const { year, answers, timeSpent } = parsed.data;
      const userId = await getDefaultUserId();

      // 2. Fetch Questions (explicitly fetch questions for the exam year)
      // 2. Fetch Questions (explicitly fetch questions for the exam year)
      // Removed local import to avoid shadowing

      const allQuestions = await db.select().from(questions);

      // Filter by tag "Examen {year}" OR matching year mechanism if we had one
      // Since we rely on tags for now:
      const examQuestions = allQuestions.filter(q =>
        q.tags?.includes(`Examen ${year}`) ||
        q.tags?.includes(`examen-${year}`) ||
        // Also include if no specific exam tag but subject matches standard pool? 
        // No, strict exam simulation needs exact questions.
        // Fallback: if we imported them recently, maybe they don't have tags?
        // Let's assume tags are present from import.
        // For our specific 2024 import, let's verify tags.
        // If 0 questions found, we might want to panic.
        true // FOR DEV: Allow all questions to match for testing if tags missing
      ); // TODO: Refine filter logic for production

      // Filter logic refinement:
      // Real exam questions MUST have the year tag or property
      const relevantQuestions = examQuestions.filter(q => true); // Placeholder

      // 3. Grade
      const breakdown = {
        civil: { correct: 0, total: 0 },
        "civil-procedural": { correct: 0, total: 0 },
        penal: { correct: 0, total: 0 },
        "penal-procedural": { correct: 0, total: 0 }
      };

      let totalScore = 0;


      // Iterate over user answers to calculate score based on WHAT WAS ANSWERED
      // But we need to know the Total Questions count per section to verify 100 total.
      // Better: Iterate over ALL exam questions for that year to establish the denominator.

      // Let's assume we use the questions from the DB that match the criteria.
      // If we can't reliably filter by year yet, we'll try to match by IDs sent?
      // No, for security we trust the DB.

      // IMPROVED LOGIC:
      // The frontend sends `answers`. We need to score them.
      // We will iterate through keys of `answers` and check against DB.
      // AND we need to count total questions for the denominator.

      // For now, let's look up each answered question. The Breakdown 'total' might be distinct from 'answered'.

      // Actually, to get a proper score (X/100), we need the full set of 100 questions.
      // Since we don't have a reliable "Exam Definition" object yet, we might have to rely on the
      // questions having the correct tags.

      // Temporary: Use matching questions from DB that have tags 'Examen' and '2024'.

      // 2. Identify the Target Question Set
      // Try to find questions for this year
      let allDbQuestions = await db.select().from(questions);
      let targetQuestions = allDbQuestions.filter(q => q.chapter.includes(`Examen ${year}`) || (q.tags && q.tags.includes(`year:${year}`)));

      // FALLBACK: If no questions found for year (e.g. they are mock questions), 
      // fetch the questions that were answered to at least give a partial score.
      // Ideally we would want the full set of 100.
      if (targetQuestions.length === 0) {
        console.log(`[SUBMIT] No questions found for year ${year}. Using answered questions as set.`);
        const answerIds = Object.keys(answers);
        if (answerIds.length > 0) {
          // Fetch explicitly answered questions
          // We can't use 'inArray' with huge list efficiently usually, but for 100 it's fine.
          // Logic: fetch all questions and filter? Or just rely on what we have.
          // We already have allQuestions from the initial fetch, so filter that.
          targetQuestions = allQuestions.filter(q => answerIds.includes(q.id));
        }
      }

      const questionsMap = new Map(targetQuestions.map(q => [q.id, q]));
      const processingSet = targetQuestions;

      for (const qId of Object.keys(answers)) {
        // If question not in map (maybe answered but not in year set?), try to fetch it
        let q = questionsMap.get(qId);
        if (!q) {
          const [fetched] = await db.select().from(questions).where(eq(questions.id, qId));
          if (fetched) {
            q = fetched;
            questionsMap.set(qId, q);
            processingSet.push(q);
          }
        }

        if (!q) continue;

        let subjKey = q.subject || "general";
        // Normalize
        if (subjKey === 'civil-combined') subjKey = 'civil';
        if (subjKey === 'penal-combined') subjKey = 'penal';
        if (subjKey === 'procedura-civila') subjKey = 'civil-procedural';
        if (subjKey === 'procedura-penala') subjKey = 'penal-procedural';

        // Ensure breakdown init
        if (!breakdown[subjKey]) breakdown[subjKey] = { correct: 0, total: 0 };


        const userAnswer = answers[qId];
        const correctIndex = q.correctAnswer;
        const correctLetter = correctIndex !== null ? ["A", "B", "C", "D"][correctIndex] : null;

        if (userAnswer === correctLetter) {
          breakdown[subjKey].correct++;
          totalScore++;
        }
      }

      // Recalculate Totals based on the Target Set (Standard 100)
      if (processingSet.length > 0) {
        for (const q of processingSet) {
          let s = q.subject;
          // Normalize subject keys to match frontend expectations
          if (s === 'civil-combined') s = 'civil';
          if (s === 'penal-combined') s = 'penal';
          if (s === 'procedura-civila') s = 'civil-procedural'; // Db might have this
          if (s === 'procedura-penala') s = 'penal-procedural'; // Db might have this

          if (!breakdown[s]) breakdown[s] = { correct: 0, total: 0 };
          breakdown[s].total++;
        }
      } else {
        // Fallback totals from answers (inaccurate if skipped)
        // For now, just trust the client knows there are 100? No.
        // Let's manually set totals to 25 if we can't find them, or dynamic.
      }

      // 4. Save
      const isPassed = totalScore >= 60;

      const [result] = await db.insert(examResults).values({
        userId,
        examYear: year,
        examType: "grile-proba-1",
        totalScore,
        isPassed,
        breakdown,
        timeSpent: timeSpent || 0
      }).returning();

      res.json({
        success: true,
        resultId: result.id,
        score: totalScore,
        isPassed,
        breakdown
      });

    } catch (error) {
      console.error("[EXAM-SUBMIT] Error:", error);
      res.status(500).json({ error: "Failed to process submission" });
    }
  });

  // ============================================================================
  // ESSAY (PROBE SCRISE) ROUTES
  // ============================================================================

  // GET /api/essays - List all essay prompts
  app.get("/api/essays", async (req, res) => {
    try {
      const { subject, examDay, limit } = req.query;

      let query = db.select().from(essayPrompts);

      // Note: where clauses would need proper filtering - simplified for now
      const prompts = await query.limit(parseInt(limit as string) || 50);

      res.json({
        prompts: prompts.map(p => ({
          id: p.id,
          subject: p.subject,
          examDay: p.examDay,
          title: p.title,
          difficulty: p.difficulty,
          estimatedTime: p.estimatedTime,
          sourceType: p.sourceType,
          createdAt: p.createdAt,
        })),
        count: prompts.length,
      });
    } catch (error) {
      console.error("[ESSAY] List prompts error:", error);
      res.status(500).json({ error: "Failed to get essay prompts" });
    }
  });

  // GET /api/essays/:id - Get single essay prompt with full content
  app.get("/api/essays/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const [prompt] = await db
        .select()
        .from(essayPrompts)
        .where(eq(essayPrompts.id, id))
        .limit(1);

      if (!prompt) {
        return res.status(404).json({ error: "Essay prompt not found" });
      }

      res.json({
        id: prompt.id,
        subject: prompt.subject,
        examDay: prompt.examDay,
        title: prompt.title,
        prompt: prompt.prompt,
        gradingRubric: prompt.gradingRubric,
        sampleAnswer: prompt.sampleAnswer,
        commonMistakes: prompt.commonMistakes,
        difficulty: prompt.difficulty,
        estimatedTime: prompt.estimatedTime,
        sourceType: prompt.sourceType,
      });
    } catch (error) {
      console.error("[ESSAY] Get prompt error:", error);
      res.status(500).json({ error: "Failed to get essay prompt" });
    }
  });

  // POST /api/essays/:id/submit - Submit essay answer
  app.post("/api/essays/:id/submit", async (req, res) => {
    try {
      const { id } = req.params;
      const { userAnswer, selfEvaluation, selfScore, timeSpent } = req.body;
      const userId = await getDefaultUserId();

      if (!userAnswer) {
        return res.status(400).json({ error: "userAnswer is required" });
      }

      const [submission] = await db
        .insert(userEssaySubmissions)
        .values({
          userId,
          essayPromptId: id,
          userAnswer,
          selfEvaluation,
          selfScore,
          timeSpent,
        })
        .returning();

      console.log(`[ESSAY] Submission created: ${submission.id}`);

      res.json({
        success: true,
        submissionId: submission.id,
        selfScore,
      });
    } catch (error) {
      console.error("[ESSAY] Submit error:", error);
      res.status(500).json({ error: "Failed to submit essay" });
    }
  });

  // GET /api/essays/submissions/history - Get user's essay submission history
  app.get("/api/essays/submissions/history", async (req, res) => {
    try {
      const userId = await getDefaultUserId();

      const submissions = await db
        .select({
          submission: userEssaySubmissions,
          prompt: essayPrompts,
        })
        .from(userEssaySubmissions)
        .innerJoin(essayPrompts, eq(userEssaySubmissions.essayPromptId, essayPrompts.id))
        .where(eq(userEssaySubmissions.userId, userId))
        .orderBy(userEssaySubmissions.submittedAt)
        .limit(50);

      res.json({
        submissions: submissions.map(({ submission, prompt }) => ({
          id: submission.id,
          essayTitle: prompt.title,
          subject: prompt.subject,
          selfScore: submission.selfScore,
          aiScore: submission.aiScore,
          timeSpent: submission.timeSpent,
          submittedAt: submission.submittedAt,
        })),
        count: submissions.length,
      });
    } catch (error) {
      console.error("[ESSAY] History error:", error);
      res.status(500).json({ error: "Failed to get submission history" });
    }
  });

  // POST /api/essays/submissions/:submissionId/ai-grade - Get AI grading for a submission
  app.post("/api/essays/submissions/:submissionId/ai-grade", async (req, res) => {
    try {
      const { submissionId } = req.params;

      // Get submission with essay prompt
      const [submission] = await db
        .select({
          submission: userEssaySubmissions,
          prompt: essayPrompts,
        })
        .from(userEssaySubmissions)
        .innerJoin(essayPrompts, eq(userEssaySubmissions.essayPromptId, essayPrompts.id))
        .where(eq(userEssaySubmissions.id, submissionId))
        .limit(1);

      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Check if already graded
      if (submission.submission.aiScore !== null) {
        return res.json({
          success: true,
          cached: true,
          aiScore: submission.submission.aiScore,
          aiFeedback: submission.submission.aiFeedback,
          aiRubricAnalysis: submission.submission.aiRubricAnalysis,
        });
      }

      console.log(`[AI GRADING] Starting AI grading for submission ${submissionId}`);

      // Call Gemini for grading
      const { gradeCaseStudy } = await import("./gemini");
      const gradeResult = await gradeCaseStudy({
        caseScenario: submission.prompt.prompt,
        sampleAnswer: submission.prompt.sampleAnswer || "Răspuns model nu este disponibil. Evaluează pe baza criteriilor genrale pentru INM.",
        userAnswer: submission.submission.userAnswer,
      });

      // Convert grade string to number (e.g., "8.50" -> 85)
      const aiScoreNumeric = Math.round(parseFloat(gradeResult.grade) * 10);

      // Update submission with AI grading
      await db
        .update(userEssaySubmissions)
        .set({
          aiScore: aiScoreNumeric,
          aiFeedback: gradeResult.feedback,
          aiRubricAnalysis: gradeResult.evaluation,
        })
        .where(eq(userEssaySubmissions.id, submissionId));

      console.log(`[AI GRADING] Completed: ${gradeResult.grade} for submission ${submissionId}`);

      res.json({
        success: true,
        cached: false,
        aiScore: aiScoreNumeric,
        aiGrade: gradeResult.grade,
        aiFeedback: gradeResult.feedback,
        evaluation: gradeResult.evaluation,
      });
    } catch (error) {
      console.error("[AI GRADING] Error:", error);
      res.status(500).json({ error: "Failed to get AI grading" });
    }
  });

  // ============================================================================
  // EXISTING ROUTES
  // ============================================================================

  // Get question topics
  app.get("/api/question-topics", async (req, res) => {
    try {
      const topics = await db.select().from(questionTopics);
      res.json(topics);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch question topics" });
    }
  });

  // Get question topics by subject
  app.get("/api/question-topics/:subject", async (req, res) => {
    try {
      const topics = await db.select().from(questionTopics).where(eq(questionTopics.subject, req.params.subject));
      res.json(topics);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch question topics by subject" });
    }
  });

  // ============================================================================
  // SYLLABUS TOPIC ROUTES - Tematica & Bibliografie Integration
  // ============================================================================

  // GET /api/syllabus-topics - Get all syllabus topics with hierarchy and progress
  app.get("/api/syllabus-topics", async (req, res) => {
    try {
      const { syllabusTopicMappings, userSyllabusProgress, legalArticles, questions } = await import("../shared/schema");
      const { and, isNull, sql, count } = await import("drizzle-orm");

      const subject = req.query.subject as string | undefined;
      const parentId = req.query.parentId as string | undefined;

      // Build query
      let topicsQuery = db.select().from(syllabusTopicMappings);

      if (subject) {
        topicsQuery = topicsQuery.where(eq(syllabusTopicMappings.subject, subject)) as any;
      }

      const topics = await topicsQuery.orderBy(syllabusTopicMappings.sortOrder);

      // Get user progress if authenticated (optional)
      let userProgressMap: Map<string, number> = new Map();
      try {
        const userId = await getDefaultUserId();
        const progressData = await db.select().from(userSyllabusProgress)
          .where(eq(userSyllabusProgress.userId, userId));
        progressData.forEach(p => {
          userProgressMap.set(p.syllabusTopicId, p.progressPercent || 0);
        });
      } catch (e) {
        // No user, no progress data
      }

      // Count articles per subject for stats
      const articleCounts = await db
        .select({
          subject: legalArticles.subject,
          count: sql<number>`count(*)::int`
        })
        .from(legalArticles)
        .groupBy(legalArticles.subject);

      const articleCountMap: Record<string, number> = {};
      articleCounts.forEach(ac => {
        articleCountMap[ac.subject] = ac.count;
      });

      // Enrich topics with progress and stats
      const enrichedTopics = topics.map(topic => ({
        ...topic,
        progressPercent: userProgressMap.get(topic.id) || 0,
        hasArticles: (topic.articleRangeStart !== null),
        availableArticles: articleCountMap[topic.subject] || 0,
      }));

      // Build hierarchy for frontend
      const rootTopics = enrichedTopics.filter(t => t.parentId === null || parentId === t.parentId);

      res.json({
        topics: enrichedTopics,
        rootTopics: rootTopics.map(t => t.syllabusId),
        stats: {
          totalTopics: topics.length,
          bySubject: {
            civil: topics.filter(t => t.subject === 'civil').length,
            'civil-procedural': topics.filter(t => t.subject === 'civil-procedural').length,
            penal: topics.filter(t => t.subject === 'penal').length,
            'penal-procedural': topics.filter(t => t.subject === 'penal-procedural').length,
          }
        }
      });
    } catch (error) {
      console.error("[SYLLABUS] Error fetching topics:", error);
      res.status(500).json({ error: "Failed to fetch syllabus topics" });
    }
  });

  // GET /api/syllabus-topics/:syllabusId - Get single topic with children
  app.get("/api/syllabus-topics/:syllabusId", async (req, res) => {
    try {
      const { syllabusTopicMappings } = await import("../shared/schema");
      const { syllabusId } = req.params;

      // Get the topic
      const [topic] = await db.select().from(syllabusTopicMappings)
        .where(eq(syllabusTopicMappings.syllabusId, syllabusId))
        .limit(1);

      if (!topic) {
        return res.status(404).json({ error: "Topic not found" });
      }

      // Get children
      const children = await db.select().from(syllabusTopicMappings)
        .where(eq(syllabusTopicMappings.parentId, syllabusId))
        .orderBy(syllabusTopicMappings.sortOrder);

      // Get parent path (breadcrumb)
      const breadcrumb: { id: string; title: string }[] = [];
      let currentParentId = topic.parentId;
      while (currentParentId) {
        const [parent] = await db.select().from(syllabusTopicMappings)
          .where(eq(syllabusTopicMappings.syllabusId, currentParentId))
          .limit(1);
        if (parent) {
          breadcrumb.unshift({ id: parent.syllabusId, title: parent.topicTitle });
          currentParentId = parent.parentId;
        } else {
          break;
        }
      }

      res.json({
        topic,
        children,
        breadcrumb,
        hasChildren: children.length > 0,
      });
    } catch (error) {
      console.error("[SYLLABUS] Error fetching topic:", error);
      res.status(500).json({ error: "Failed to fetch topic details" });
    }
  });

  // GET /api/syllabus-topics/:syllabusId/content - Get legal content for a topic
  app.get("/api/syllabus-topics/:syllabusId/content", async (req, res) => {
    try {
      const { syllabusTopicMappings, legalArticles, questions } = await import("../shared/schema");
      const { and, gte, lte, or, ilike } = await import("drizzle-orm");
      const { syllabusId } = req.params;

      // Get the topic
      const [topic] = await db.select().from(syllabusTopicMappings)
        .where(eq(syllabusTopicMappings.syllabusId, syllabusId))
        .limit(1);

      if (!topic) {
        return res.status(404).json({ error: "Topic not found" });
      }

      // Find matching legal articles by article range
      let matchingArticles: any[] = [];
      if (topic.articleRangeStart && topic.articleRangeEnd) {
        matchingArticles = await db.select().from(legalArticles)
          .where(
            and(
              eq(legalArticles.subject, topic.subject),
              gte(legalArticles.articleNumber, topic.articleRangeStart),
              lte(legalArticles.articleNumber, topic.articleRangeEnd)
            )
          )
          .orderBy(legalArticles.articleNumber)
          .limit(50);
      }

      // Find matching questions by chapter pattern
      let matchingQuestions: any[] = [];
      const patterns = topic.chapterPatterns as string[] | null;
      if (patterns && patterns.length > 0) {
        // Search for questions matching any of the patterns
        try {
          const allQuestions = await db.select().from(questions)
            .where(eq(questions.subject, topic.subject))
            .limit(100);

          matchingQuestions = allQuestions.filter(q => {
            const chapterLower = q.chapter.toLowerCase();
            return patterns.some(p => chapterLower.includes(p.toLowerCase()));
          }).slice(0, 20);
        } catch (e) {
          console.log("[SYLLABUS] No matching questions found");
        }
      }

      res.json({
        topic: {
          id: topic.id,
          syllabusId: topic.syllabusId,
          title: topic.topicTitle,
          subject: topic.subject,
          articleRefs: topic.articleRefs,
        },
        content: {
          articles: matchingArticles.map(a => ({
            id: a.id,
            articleNumber: a.articleNumber,
            title: a.title,
            segments: a.segments, // All 7 segment types
            lawSource: a.lawSource,
          })),
          articlesCount: matchingArticles.length,
          questions: matchingQuestions.map(q => ({
            id: q.id,
            questionText: q.questionText.substring(0, 200) + (q.questionText.length > 200 ? '...' : ''),
            chapter: q.chapter,
            difficulty: q.difficulty,
          })),
          questionsCount: matchingQuestions.length,
        },
        segmentTypes: ['official', 'trad', 'puncte', 'juris', 'radar', 'logica', 'conex'],
      });
    } catch (error) {
      console.error("[SYLLABUS] Error fetching topic content:", error);
      res.status(500).json({ error: "Failed to fetch topic content" });
    }
  });

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
      const setType = req.query.setType as string | undefined;
      const questions = await storage.getRandomQuestions(subject, count, setType);
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

        // SRS Integration: Create card for wrong answers
        if (!answerData.isCorrect) {
          try {
            const { createSrsCard } = await import("./srs");
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
          const { syllabusTopicMappings, userSyllabusProgress } = await import("../shared/schema");
          const { ilike } = await import("drizzle-orm");
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
          for (const topic of matchingTopics) {
            const [existingProgress] = await db.select().from(userSyllabusProgress)
              .where(
                and(
                  eq(userSyllabusProgress.userId, userId),
                  eq(userSyllabusProgress.syllabusTopicId, topic.id)
                )
              )
              .limit(1);

            if (existingProgress) {
              // Update existing progress
              const newAnswered = (existingProgress.questionsAnswered || 0) + 1;
              const newCorrect = (existingProgress.questionsCorrect || 0) + (answerData.isCorrect ? 1 : 0);
              const newProgress = Math.round((newCorrect / Math.max(newAnswered, 1)) * 100);

              await db.update(userSyllabusProgress)
                .set({
                  questionsAnswered: newAnswered,
                  questionsCorrect: newCorrect,
                  progressPercent: newProgress,
                  updatedAt: new Date()
                })
                .where(eq(userSyllabusProgress.id, existingProgress.id));
            } else {
              // Create new progress entry
              await db.insert(userSyllabusProgress).values({
                userId,
                syllabusTopicId: topic.id,
                questionsAnswered: 1,
                questionsCorrect: answerData.isCorrect ? 1 : 0,
                articlesRead: 0,
                progressPercent: answerData.isCorrect ? 100 : 0,
              });
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
      const { aiExplanations, questions } = await import("../shared/schema");
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
      // CRITICAL: DB stores correctAnswer as 1-indexed (1=A, 2=B, 3=C)
      const correctAnswerFromDB = question.correctAnswer as number;
      const correctIndex = correctAnswerFromDB - 1; // Convert to 0-indexed for array
      const correctLetter = String.fromCharCode(64 + correctAnswerFromDB); // 64+1='A'

      const options = question.options as any[];
      const correctOptionText = options[correctIndex]?.text || options[correctIndex] || "";
      const userSelectedText = userAnswer.selectedAnswer !== null
        ? (options[userAnswer.selectedAnswer]?.text || options[userAnswer.selectedAnswer] || "")
        : "";

      const userSelectedLetter = userAnswer.selectedAnswer !== null
        ? String.fromCharCode(65 + userAnswer.selectedAnswer)
        : "?";

      // Generate AI explanation
      // Note: We might want to pass stored legal references if available, but for now we let AI infer from text
      const explanation = await explainWrongAnswer({
        questionText: question.questionText,
        correctOptionText,
        correctLetter,
        userSelectedText,
        userSelectedLetter,
        explanation: question.explanation || "Nu există explicație detaliată.",
        legalReferences: [],
        subject: question.subject || "Drept"
      });

      res.json({ explanation });

    } catch (error) {
      console.error("[AI-EXPLAIN] Error:", error);
      res.status(500).json({ error: "Failed to generate explanation" });
    }
  });

  // [NEW] Direct explanation without user answer ID key constraint (for simulation)
  app.post("/api/ai/explain-answer-direct", async (req, res) => {
    try {
      const { explainWrongAnswer } = await import("./gemini");
      const { questions } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      const { questionId, selectedAnswer } = req.body; // selectedAnswer is 'A', 'B', etc.

      const [question] = await db.select().from(questions).where(eq(questions.id, questionId));
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }

      const options = question.options as any[];

      // CRITICAL: DB stores correctAnswer as 1-indexed (1=A, 2=B, 3=C)
      // Convert to 0-indexed for array access
      const correctAnswerFromDB = question.correctAnswer as number;
      const correctIndex = correctAnswerFromDB - 1; // 1->0, 2->1, 3->2
      const correctLetter = String.fromCharCode(64 + correctAnswerFromDB); // 64+1='A', 64+2='B'
      const correctOptionText = options[correctIndex]?.text || options[correctIndex] || "";

      // Convert user's letter to 0-indexed
      const letterToIndex: Record<string, number> = { "A": 0, "B": 1, "C": 2, "D": 3 };
      const selectedIndex = letterToIndex[selectedAnswer?.toUpperCase()];
      const userSelectedText = selectedIndex !== undefined
        ? (options[selectedIndex]?.text || options[selectedIndex] || "Niciun răspuns")
        : "Niciun răspuns";

      console.log(`[AI-EXPLAIN] Q: ${questionId}, correctAnswer DB: ${correctAnswerFromDB}, correctIndex: ${correctIndex}, correctLetter: ${correctLetter}, userSelected: ${selectedAnswer}`);

      // Check if user actually answered correctly
      if (correctIndex === selectedIndex) {
        return res.json({ explanation: "✅ **Ai răspuns CORECT!** Bravo! Continuă tot așa!" });
      }

      const explanation = await explainWrongAnswer({
        questionText: question.questionText,
        correctOptionText,
        correctLetter,
        userSelectedText: userSelectedText || "Răspuns invalid",
        userSelectedLetter: selectedAnswer,
        explanation: question.explanation || "Nicio explicație stocată.",
        legalReferences: [],
        subject: question.subject || "General"
      });

      res.json({ explanation });

    } catch (error) {
      console.error("[AI-EXPLAIN-DIRECT] Error:", error);
      res.status(500).json({ error: "Failed to generate explanation" });
    }
  });


  // AI: Upload and process document (simplified - base64 upload)
  app.post("/api/documents/upload", async (req, res) => {
    try {
      console.log("[UPLOAD] Starting document upload...");
      const { extractTextFromPDF, analyzeLegalDocument } = await import("./gemini");
      const { uploadedDocuments } = await import("../shared/schema");
      const userId = await getDefaultUserId();
      const fs = await import("fs");

      const { fileName, documentType, subject, fileContent } = req.body;
      console.log("[UPLOAD] File:", fileName, "Type:", documentType, "Subject:", subject);
      console.log("[UPLOAD] Content length:", fileContent?.length || 0);

      // Save base64 to temporary file
      const tmpPath = `/tmp/${Date.now()}-${fileName}`;
      const buffer = Buffer.from(fileContent, 'base64');
      console.log("[UPLOAD] Buffer size:", buffer.length);
      fs.writeFileSync(tmpPath, buffer);
      console.log("[UPLOAD] Saved to temp:", tmpPath);

      // Extract text from PDF
      console.log("[UPLOAD] Extracting text...");
      let extractedText = "";
      try {
        extractedText = await extractTextFromPDF(tmpPath);
      } catch (pdfErr) {
        console.warn("[UPLOAD] PDF extraction failed, using empty text");
        extractedText = "";
      }
      // Clean text: remove null bytes and invalid UTF8 characters for PostgreSQL
      extractedText = extractedText.replace(/\x00/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
      console.log("[UPLOAD] Extracted text length:", extractedText?.length || 0);

      // Try AI analysis, but don't fail if quota exceeded
      let aiSummary = "Document încărcat. Analiza AI va fi disponibilă când quota se resetează.";
      try {
        console.log("[UPLOAD] Analyzing with AI...");
        const analysis = await analyzeLegalDocument({
          documentText: extractedText,
          documentType: documentType as any
        });
        aiSummary = analysis.summary;
        console.log("[UPLOAD] AI analysis complete");
      } catch (aiErr: any) {
        console.warn("[UPLOAD] AI analysis failed (quota?):", aiErr?.status || aiErr?.message);
        // Keep default message
      }

      // Save document metadata to database
      console.log("[UPLOAD] Saving to database...");
      const [document] = await db.insert(uploadedDocuments).values({
        userId,
        fileName,
        documentType,
        subject,
        objectPath: tmpPath,
        extractedText,
        aiSummary
      }).returning();

      // Clean up temp file
      try {
        fs.unlinkSync(tmpPath);
      } catch (e) {
        // ignore cleanup errors
      }

      console.log("[UPLOAD] Success!");
      res.json({
        document,
        analysis: { summary: aiSummary, keyPoints: [] }
      });
    } catch (error) {
      console.error("Document upload error:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  // AI: Get all uploaded documents
  app.get("/api/documents", async (req, res) => {
    try {
      const { uploadedDocuments } = await import("../shared/schema");
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
      const { uploadedDocuments } = await import("../shared/schema");
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
      const { uploadedDocuments } = await import("../shared/schema");
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
      const { uploadedDocuments } = await import("../shared/schema");
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

  // RAG: Process document into chunks
  app.post("/api/documents/:id/process-chunks", async (req, res) => {
    try {
      const { uploadedDocuments, documentChunks } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const { chunkText } = await import("./utils/chunking");

      const userId = await getDefaultUserId();
      const documentId = req.params.id;

      // Get document
      const [document] = await db
        .select()
        .from(uploadedDocuments)
        .where(
          and(
            eq(uploadedDocuments.id, documentId),
            eq(uploadedDocuments.userId, userId)
          )
        )
        .limit(1);

      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (!document.extractedText) {
        return res.status(400).json({ error: "Document has no extracted text" });
      }

      // Delete existing chunks for this document
      await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));

      // Create chunks
      const chunks = chunkText(document.extractedText, {
        chunkSize: 800,
        overlap: 100,
        minChunkSize: 300
      });

      console.log(`[CHUNKING] Created ${chunks.length} chunks from ${document.extractedText.length} chars`);

      // Save chunks to database
      const savedChunks = [];
      for (const chunk of chunks) {
        const [saved] = await db
          .insert(documentChunks)
          .values({
            documentId: document.id,
            chunkText: chunk.text,
            chunkIndex: chunk.index,
            metadata: {
              documentType: document.documentType,
              subject: document.subject,
              fileName: document.fileName,
              startPosition: chunk.startPosition,
              endPosition: chunk.endPosition
            }
          })
          .returning();
        savedChunks.push(saved);
      }

      res.json({
        documentId: document.id,
        fileName: document.fileName,
        chunksCreated: savedChunks.length,
        totalTextLength: document.extractedText.length
      });
    } catch (error) {
      console.error("Process chunks error:", error);
      res.status(500).json({ error: "Failed to process document chunks" });
    }
  });

  // RAG: Get document chunks
  app.get("/api/documents/:id/chunks", async (req, res) => {
    try {
      const { documentChunks } = await import("../shared/schema");
      const { eq, asc } = await import("drizzle-orm");

      const documentId = req.params.id;

      const chunks = await db
        .select()
        .from(documentChunks)
        .where(eq(documentChunks.documentId, documentId))
        .orderBy(asc(documentChunks.chunkIndex));

      res.json(chunks);
    } catch (error) {
      console.error("Get chunks error:", error);
      res.status(500).json({ error: "Failed to fetch document chunks" });
    }
  });

  // RAG: Generate embeddings for document chunks
  app.post("/api/documents/:id/generate-embeddings", async (req, res) => {
    try {
      const { documentChunks } = await import("../shared/schema");
      const { eq, isNull } = await import("drizzle-orm");
      const { batchGenerateEmbeddings } = await import("./gemini");

      const documentId = req.params.id;

      // Get chunks without embeddings
      const chunks = await db
        .select()
        .from(documentChunks)
        .where(eq(documentChunks.documentId, documentId));

      if (chunks.length === 0) {
        return res.status(404).json({ error: "No chunks found for this document" });
      }

      console.log(`[EMBEDDINGS] Generating embeddings for ${chunks.length} chunks...`);

      // Generate embeddings for all chunks
      const texts = chunks.map(c => c.chunkText);
      const embeddings = await batchGenerateEmbeddings(texts);

      console.log(`[EMBEDDINGS] Generated ${embeddings.length} embeddings, updating DB...`);

      // Update chunks with embeddings
      let updatedCount = 0;
      for (let i = 0; i < chunks.length; i++) {
        await db
          .update(documentChunks)
          .set({ embedding: embeddings[i] })
          .where(eq(documentChunks.id, chunks[i].id));
        updatedCount++;
      }

      console.log(`[EMBEDDINGS] Updated ${updatedCount} chunks with embeddings`);

      res.json({
        documentId,
        chunksProcessed: updatedCount,
        embeddingDimensions: embeddings[0]?.length || 0
      });
    } catch (error) {
      console.error("Generate embeddings error:", error);
      res.status(500).json({ error: "Failed to generate embeddings" });
    }
  });

  // RAG: Ask legal question with document retrieval (Clean Room Integration)
  app.post("/api/legal-assistant/ask", async (req, res) => {
    try {
      const { documentChunks } = await import("../shared/schema");
      const { isNotNull } = await import("drizzle-orm");
      const { generateEmbedding, calculateCosineSimilarity } = await import("./gemini");
      const { generateWithSanitizedContext } = await import("./services/clean-room/generator");
      const userId = await getDefaultUserId();

      const { question, topK = 5 } = req.body;

      if (!question || question.trim().length === 0) {
        return res.status(400).json({ error: "Question is required" });
      }

      console.log(`[RAG-CLEAN] Question: "${question}"`);

      // 1. Generate embedding for question
      const questionEmbedding = await generateEmbedding(question);

      // 2. Get all chunks with embeddings (filtering for Clean Room content if possible, but currently all chunks are Clean Room)
      const chunks = await db
        .select()
        .from(documentChunks)
        .where(isNotNull(documentChunks.embedding));

      if (chunks.length === 0) {
        return res.status(404).json({
          error: "Baza de date legislativă este goală sau neindexată. Vă rugăm să contactați administratorul."
        });
      }

      // 3. Vector Search (Cosine Similarity)
      const similarities = chunks
        .map(chunk => ({
          ...chunk,
          similarity: calculateCosineSimilarity(
            questionEmbedding,
            chunk.embedding as number[]
          )
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);

      console.log(`[RAG-CLEAN] Found ${similarities.length} relevant chunks`);

      // 4. Prepare Context for Clean Room
      const sanitizedContext = similarities.map(s => ({
        actName: (s.metadata as any)?.actName || "Act Normativ",
        actNumber: (s.metadata as any)?.actNumber || "",
        rawOfficialText: s.chunkText,
        sourceUrl: "legislatie.just.ro",
        sanitizedAt: new Date(),
        contentHash: "vector-retrieved",
        articleNumber: "" // Can be parsed from text if needed
      }));

      // 5. Generate Answer using Clean Room Generator
      // We use 'legal_synthesis' as it provides a structured summary suitable for general questions
      const result = await generateWithSanitizedContext(
        question,
        sanitizedContext,
        'legal_synthesis',
        userId
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to generate content");
      }

      // 6. Format response for UI
      // The UI expects { answer, citations, ... }
      // We map the structured 'LegalSynthesisOutput' to this format
      const data = result.data as any; // Cast to access properties

      const answer = `**${data.topic || "Răspuns"}**\n\n${data.summary}\n\n**Concepte relaționate:** ${data.related_concepts?.join(", ")}`;

      const citations = similarities.map(s => ({
        chunkId: s.id,
        text: s.chunkText,
        similarity: s.similarity,
        metadata: s.metadata
      }));

      res.json({
        question,
        answer,
        citations, // Legacy format for UI to show sources
        chunksRetrieved: topK,
        auditLogId: result.auditLogId,
        cleanRoomData: data // Full structured data if UI wants to use it
      });

    } catch (error) {
      console.error("Legal assistant error:", error);
      res.status(500).json({ error: "Failed to answer question" });
    }
  });

  // AI: Generate personalized study plan
  app.post("/api/study-plan/generate", async (req, res) => {
    try {
      const { generatePersonalizedStudyPlan } = await import("./gemini");
      const { studyPlans, insertStudyPlanSchema } = await import("../shared/schema");

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
      const { studyPlans } = await import("../shared/schema");
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

  // ============================================
  // BULK IMPORT & SEARCH ROUTES
  // ============================================

  // Get all question batches
  app.get("/api/question-batches", async (req, res) => {
    try {
      const { questionBatches } = await import("../shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      const userId = await getDefaultUserId();

      const batches = await db
        .select()
        .from(questionBatches)
        .where(eq(questionBatches.userId, userId))
        .orderBy(desc(questionBatches.uploadedAt));

      res.json(batches);
    } catch (error) {
      console.error("Get batches error:", error);
      res.status(500).json({ error: "Failed to fetch question batches" });
    }
  });

  // Bulk import questions from LLM session
  app.post("/api/questions/bulk-import", async (req, res) => {
    try {
      const { questions, questionBatches } = await import("../shared/schema");
      const { z } = await import("zod");
      const userId = await getDefaultUserId();

      // Validate request body - supports both single answer and multiple answers
      const optionSchema = z.union([
        z.string(),
        z.object({ id: z.number(), text: z.string() })
      ]);

      const requestSchema = z.object({
        batchName: z.string().min(1, "Batch name is required"),
        subject: z.string().min(1, "Subject is required"),
        setType: z.enum(['A', 'B', 'C'], { required_error: "Set type is required" }),
        sourceType: z.string().optional().default('llm-session'),
        sourceLLM: z.string().optional().nullable(),
        questionsData: z.array(z.object({
          questionText: z.string().min(1, "Question text is required"),
          options: z.array(optionSchema).min(2, "At least 2 options required"),
          correctAnswer: z.number().nullable().optional(),
          correctAnswers: z.array(z.number()).optional().default([]),
          explanation: z.string().optional().default(''),
          chapter: z.string().optional().default('General'),
          topic: z.string().optional().nullable(),
          difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
          legalReferences: z.array(z.string()).optional().nullable(),
          aiFeedback: z.string().optional().nullable(),
          feedbackDetailed: z.object({
            explicatie_generala: z.string().optional(),
            analiza_variante: z.record(z.any()).optional(),
            retine: z.union([z.string(), z.array(z.string())]).optional(),
            schema_aplicatie_practica: z.string().optional(),
            atentie: z.string().optional(),
            are_exceptii: z.boolean().optional(),
            exceptii: z.any().optional()
          }).optional().nullable()
        })).min(1, "At least 1 question required")
      });

      const parseResult = requestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.errors
        });
      }

      const { batchName, subject, setType, sourceType, sourceLLM, questionsData } = parseResult.data;

      // Validate set type rules for all questions BEFORE creating batch
      const setTypeViolations: Array<{ index: number; message: string }> = [];

      for (let i = 0; i < questionsData.length; i++) {
        const q = questionsData[i];
        // Count correct answers - check both correctAnswer and correctAnswers
        let correctCount = 0;
        if (q.correctAnswer !== null && q.correctAnswer !== undefined) {
          correctCount = 1;
        }
        if (q.correctAnswers && q.correctAnswers.length > 0) {
          // If correctAnswers exists and has entries, use its length
          // This handles cases where both might be set
          correctCount = q.correctAnswers.length;
        }

        let violation = '';
        switch (setType) {
          case 'A':
            if (correctCount !== 1) {
              violation = `Set A necesită exact 1 răspuns corect, găsite: ${correctCount}`;
            }
            break;
          case 'B':
            if (correctCount < 1 || correctCount > 3) {
              violation = `Set B necesită 1-3 răspunsuri corecte, găsite: ${correctCount}`;
            }
            break;
          case 'C':
            // Set C: 0-4 correct answers
            if (correctCount > 4) {
              violation = `Set C permite maxim 4 răspunsuri corecte, găsite: ${correctCount}`;
            }
            break;
        }

        if (violation) {
          setTypeViolations.push({ index: i, message: violation });
        }
      }

      if (setTypeViolations.length > 0) {
        return res.status(400).json({
          error: "Set type validation failed",
          message: `${setTypeViolations.length} întrebări nu respectă regulile ${setType === 'A' ? 'Set A' : setType === 'B' ? 'Set B' : 'Set C'}`,
          violations: setTypeViolations.slice(0, 10)
        });
      }

      // Create batch record
      const [batch] = await db.insert(questionBatches).values({
        userId,
        batchName,
        subject,
        sourceType,
        sourceLLM: sourceLLM || null,
        questionsCount: questionsData.length
      }).returning();

      // Insert questions with validation errors tracking
      const insertedQuestions = [];
      const errors: Array<{ index: number; error: string }> = [];

      for (let i = 0; i < questionsData.length; i++) {
        const q = questionsData[i];
        try {
          // Normalize options to array of objects with id and text
          const normalizedOptions = q.options.map((opt, idx) => {
            if (typeof opt === 'string') {
              return { id: idx, text: opt };
            }
            return opt;
          });

          // Determine correctAnswer and correctAnswersMultiple
          let finalCorrectAnswer: number | null = null;
          let finalCorrectAnswersMultiple: number[] | null = null;

          if (q.correctAnswer !== null && q.correctAnswer !== undefined) {
            // Single correct answer
            finalCorrectAnswer = q.correctAnswer;
          } else if (q.correctAnswers && q.correctAnswers.length === 1) {
            // Single answer in array format
            finalCorrectAnswer = q.correctAnswers[0];
          } else if (q.correctAnswers && q.correctAnswers.length > 1) {
            // Multiple correct answers
            finalCorrectAnswersMultiple = q.correctAnswers;
          } else if (q.correctAnswers && q.correctAnswers.length === 0) {
            // No correct answer (God Mode Set C edge case)
            finalCorrectAnswersMultiple = [];
          }

          const [inserted] = await db.insert(questions).values({
            subject,
            chapter: q.chapter,
            topic: q.topic,
            difficulty: q.difficulty,
            setType,
            questionText: q.questionText,
            options: normalizedOptions,
            correctAnswer: finalCorrectAnswer,
            correctAnswersMultiple: finalCorrectAnswersMultiple,
            explanation: q.explanation,
            legalReferences: q.legalReferences,
            aiFeedback: q.aiFeedback,
            feedbackDetailed: q.feedbackDetailed || null,
            sourceType,
            sourceLLM: sourceLLM || null,
            batchId: batch.id
          }).returning();
          insertedQuestions.push(inserted);
        } catch (qErr: any) {
          console.warn(`Failed to insert question ${i}:`, qErr.message);
          errors.push({ index: i, error: qErr.message });
        }
      }

      res.json({
        batch,
        importedCount: insertedQuestions.length,
        totalProvided: questionsData.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Bulk import error:", error);
      res.status(500).json({ error: "Failed to bulk import questions" });
    }
  });

  // Bulk import questions from LLM session with rich feedback format
  app.post("/api/questions/bulk-import-session", async (req, res) => {
    try {
      const { questions, questionBatches } = await import("../shared/schema");
      const { z } = await import("zod");
      const userId = await getDefaultUserId();

      // Schema for the rich session format
      const variantSchema = z.object({
        litera: z.string(),
        text: z.string(),
        este_corecta: z.boolean()
      });

      const feedbackSchema = z.object({
        verdict: z.string().optional(),
        explicatie_generala: z.string().optional(),
        are_exceptii: z.boolean().optional(),
        exceptii: z.any().optional(),
        analiza_variante: z.record(z.any()).optional(),
        retine: z.union([z.string(), z.array(z.string())]).optional(),
        schema_aplicatie_practica: z.string().optional(),
        atentie: z.string().optional()
      }).passthrough();

      const intrebareSchema = z.object({
        id: z.number().optional(),
        tip_set: z.string().optional(),
        tulpina: z.string(),
        variante: z.array(variantSchema).min(2),
        raspuns_utilizator: z.string().optional(),
        este_corect: z.boolean().optional(),
        feedback: feedbackSchema.optional(),
        concepte_cheie: z.array(z.string()).optional(),
        articole_relevante: z.array(z.string()).optional(),
        dificultate: z.string().optional(),
        tags: z.array(z.string()).optional()
      });

      const sessionSchema = z.object({
        session_metadata: z.object({
          segment_articole: z.string().optional(),
          data_referinta: z.string().optional(),
          set_type: z.string().optional(),
          total_intrebari: z.number().optional(),
          scor: z.string().optional(),
          procent: z.string().optional()
        }).optional(),
        intrebari: z.array(intrebareSchema).min(1),
        analiza_finale: z.any().optional(),
        glosar_incremental: z.any().optional(),
        jurnal_erori: z.any().optional()
      });

      const requestSchema = z.object({
        sessionData: sessionSchema,
        subject: z.string().min(1),
        setType: z.enum(['A', 'B', 'C'], { required_error: "Set type is required" }),
        chapter: z.string().optional(),
        sourceLLM: z.string().optional()
      });

      const parseResult = requestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.errors
        });
      }

      const { sessionData, subject, setType, chapter, sourceLLM } = parseResult.data;
      const meta = sessionData.session_metadata;

      // Validate set type rules for all questions BEFORE creating batch
      const setTypeViolations: Array<{ index: number; message: string }> = [];

      for (let i = 0; i < sessionData.intrebari.length; i++) {
        const q = sessionData.intrebari[i];
        const correctCount = q.variante.filter(v => v.este_corecta).length;

        let violation = '';
        switch (setType) {
          case 'A':
            if (correctCount !== 1) {
              violation = `Set A necesită exact 1 răspuns corect, găsite: ${correctCount}`;
            }
            break;
          case 'B':
            if (correctCount < 1 || correctCount > 3) {
              violation = `Set B necesită 1-3 răspunsuri corecte, găsite: ${correctCount}`;
            }
            break;
          case 'C':
            // Set C: 0-4 correct answers
            if (correctCount > 4) {
              violation = `Set C permite maxim 4 răspunsuri corecte, găsite: ${correctCount}`;
            }
            break;
        }

        if (violation) {
          setTypeViolations.push({ index: i, message: violation });
        }
      }

      if (setTypeViolations.length > 0) {
        return res.status(400).json({
          error: "Set type validation failed",
          message: `${setTypeViolations.length} întrebări nu respectă regulile ${setType === 'A' ? 'Set A' : setType === 'B' ? 'Set B' : 'Set C'}`,
          violations: setTypeViolations.slice(0, 10)
        });
      }

      // Create batch with session metadata
      const batchName = meta?.segment_articole || `Sesiune ${new Date().toLocaleDateString('ro-RO')}`;

      const [batch] = await db.insert(questionBatches).values({
        userId,
        batchName,
        subject,
        sourceType: 'llm-session',
        sourceLLM: sourceLLM || null,
        questionsCount: sessionData.intrebari.length
      }).returning();

      // Insert questions with rich feedback
      const insertedQuestions = [];
      const errors: Array<{ index: number; error: string }> = [];

      for (let i = 0; i < sessionData.intrebari.length; i++) {
        const q = sessionData.intrebari[i];
        try {
          // Convert variante to options format
          const options = q.variante.map((v, idx) => ({
            id: idx,
            text: v.text,
            litera: v.litera
          }));

          // Find correct answers
          const correctIndices = q.variante
            .map((v, idx) => v.este_corecta ? idx : -1)
            .filter(idx => idx !== -1);

          const correctAnswer = correctIndices.length === 1 ? correctIndices[0] : null;
          const correctAnswersMultiple = correctIndices.length !== 1 ? correctIndices : null;

          // Build feedbackDetailed from rich feedback
          const feedbackDetailed = q.feedback ? {
            explicatie_generala: q.feedback.explicatie_generala,
            analiza_variante: q.feedback.analiza_variante,
            exceptii: q.feedback.exceptii,
            retine: q.feedback.retine,
            schema_aplicatie_practica: q.feedback.schema_aplicatie_practica,
            atentie: q.feedback.atentie,
            are_exceptii: q.feedback.are_exceptii
          } : null;

          // Map difficulty
          const difficultyMap: Record<string, string> = {
            'usor': 'easy', 'ușor': 'easy', 'easy': 'easy',
            'mediu': 'medium', 'medium': 'medium',
            'greu': 'hard', 'hard': 'hard', 'dificil': 'hard'
          };
          const difficulty = difficultyMap[q.dificultate?.toLowerCase() || 'medium'] || 'medium';

          const [inserted] = await db.insert(questions).values({
            subject,
            chapter: chapter || meta?.segment_articole || 'General',
            topic: meta?.segment_articole,
            difficulty,
            setType,
            questionText: q.tulpina,
            options,
            correctAnswer,
            correctAnswersMultiple,
            explanation: q.feedback?.explicatie_generala || '',
            legalReferences: q.articole_relevante,
            feedbackDetailed,
            keyConcepts: q.concepte_cheie,
            tags: q.tags,
            hasExceptions: q.feedback?.are_exceptii || false,
            sourceType: 'llm-session',
            sourceLLM: sourceLLM || null,
            batchId: batch.id
          }).returning();

          insertedQuestions.push(inserted);
        } catch (qErr: any) {
          console.warn(`Failed to insert question ${i}:`, qErr.message);
          errors.push({ index: i, error: qErr.message });
        }
      }

      res.json({
        batch,
        importedCount: insertedQuestions.length,
        totalProvided: sessionData.intrebari.length,
        sessionMetadata: meta,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Bulk import session error:", error);
      res.status(500).json({ error: "Failed to bulk import session questions" });
    }
  });

  // Search questions with filters
  app.get("/api/questions/search", async (req, res) => {
    try {
      const { questions } = await import("../shared/schema");
      const { eq, ilike, and, or, desc } = await import("drizzle-orm");

      const { subject, chapter, topic, difficulty, keyword, sourceType, limit: limitStr } = req.query;
      const limit = parseInt(limitStr as string) || 50;

      const conditions = [];

      // Only add condition if value exists and is not 'all'
      if (subject && subject !== 'all' && subject !== '') {
        conditions.push(eq(questions.subject, subject as string));
      }
      if (chapter && chapter !== 'all' && chapter !== '') {
        conditions.push(eq(questions.chapter, chapter as string));
      }
      if (topic && topic !== 'all' && topic !== '') {
        conditions.push(eq(questions.topic, topic as string));
      }
      if (difficulty && difficulty !== 'all' && difficulty !== '') {
        conditions.push(eq(questions.difficulty, difficulty as string));
      }
      if (sourceType && sourceType !== 'all' && sourceType !== '') {
        conditions.push(eq(questions.sourceType, sourceType as string));
      }
      if (keyword && keyword !== '') {
        conditions.push(
          or(
            ilike(questions.questionText, `%${keyword}%`),
            ilike(questions.explanation, `%${keyword}%`)
          )
        );
      }

      let query = db.select().from(questions);

      const results = await db
        .select()
        .from(questions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(questions.createdAt))
        .limit(limit);

      res.json(results);
    } catch (error) {
      console.error("Search questions error:", error);
      res.status(500).json({ error: "Failed to search questions" });
    }
  });

  // Get question topics
  app.get("/api/question-topics", async (req, res) => {
    try {
      const { questionTopics } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      const { subject } = req.query;

      let results;
      if (subject) {
        results = await db.select().from(questionTopics).where(eq(questionTopics.subject, subject as string));
      } else {
        results = await db.select().from(questionTopics);
      }

      res.json(results);
    } catch (error) {
      console.error("Get topics error:", error);
      res.status(500).json({ error: "Failed to fetch question topics" });
    }
  });

  // Create question topic
  app.post("/api/question-topics", async (req, res) => {
    try {
      const { questionTopics } = await import("../shared/schema");

      const { subject, topicName, description, articleReferences } = req.body;

      if (!subject || !topicName) {
        return res.status(400).json({ error: "Missing required fields: subject, topicName" });
      }

      const [topic] = await db.insert(questionTopics).values({
        subject,
        topicName,
        description: description || null,
        articleReferences: articleReferences || null
      }).returning();

      res.json(topic);
    } catch (error) {
      console.error("Create topic error:", error);
      res.status(500).json({ error: "Failed to create topic" });
    }
  });

  // Get unique chapters/topics for a subject (for filters)
  app.get("/api/questions/filters/:subject", async (req, res) => {
    try {
      const { questions } = await import("../shared/schema");
      const { eq, sql } = await import("drizzle-orm");

      const { subject } = req.params;

      const chapters = await db
        .selectDistinct({ chapter: questions.chapter })
        .from(questions)
        .where(eq(questions.subject, subject));

      const topics = await db
        .selectDistinct({ topic: questions.topic })
        .from(questions)
        .where(eq(questions.subject, subject));

      res.json({
        chapters: chapters.map(c => c.chapter).filter(Boolean),
        topics: topics.map(t => t.topic).filter(Boolean)
      });
    } catch (error) {
      console.error("Get filters error:", error);
      res.status(500).json({ error: "Failed to fetch filters" });
    }
  });

  // ============================================
  // CASE STUDIES (SPEȚE) ROUTES
  // ============================================

  // Get all case study batches
  app.get("/api/case-study-batches", async (req, res) => {
    try {
      const { caseStudyBatches } = await import("../shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      const userId = await getDefaultUserId();

      const batches = await db
        .select()
        .from(caseStudyBatches)
        .where(eq(caseStudyBatches.userId, userId))
        .orderBy(desc(caseStudyBatches.uploadedAt));

      res.json(batches);
    } catch (error) {
      console.error("Get case study batches error:", error);
      res.status(500).json({ error: "Failed to fetch case study batches" });
    }
  });

  // Bulk import case studies from LLM session
  app.post("/api/case-studies/bulk-import", async (req, res) => {
    try {
      const { caseStudies, caseStudyBatches } = await import("../shared/schema");
      const { z } = await import("zod");
      const userId = await getDefaultUserId();

      const requestSchema = z.object({
        batchName: z.string().min(1, "Batch name is required"),
        subject: z.string().min(1, "Subject is required"),
        examDay: z.string().optional().nullable(),
        sourceType: z.string().optional().default('llm-session'),
        sourceLLM: z.string().optional().nullable(),
        caseStudiesData: z.array(z.object({
          title: z.string().min(1, "Title is required"),
          scenario: z.string().min(1, "Scenario is required"),
          questions: z.array(z.string()).optional().nullable(),
          referenceArticles: z.array(z.string()).optional().nullable(),
          sampleAnswer: z.string().optional().nullable(),
          modelEvaluation: z.string().optional().nullable(),
          aiFeedback: z.string().optional().nullable(),
          difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
          estimatedTime: z.number().optional().nullable()
        })).min(1, "At least 1 case study required")
      });

      const parseResult = requestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.errors
        });
      }

      const { batchName, subject, examDay, sourceType, sourceLLM, caseStudiesData } = parseResult.data;

      const [batch] = await db.insert(caseStudyBatches).values({
        userId,
        batchName,
        subject,
        examDay: examDay || null,
        sourceType,
        sourceLLM: sourceLLM || null,
        caseStudiesCount: caseStudiesData.length
      }).returning();

      const insertedCaseStudies = [];
      const errors: Array<{ index: number; error: string }> = [];

      for (let i = 0; i < caseStudiesData.length; i++) {
        const cs = caseStudiesData[i];
        try {
          const [inserted] = await db.insert(caseStudies).values({
            userId,
            subject,
            examDay: examDay || null,
            title: cs.title,
            scenario: cs.scenario,
            questions: cs.questions,
            referenceArticles: cs.referenceArticles,
            sampleAnswer: cs.sampleAnswer,
            modelEvaluation: cs.modelEvaluation,
            aiFeedback: cs.aiFeedback,
            sourceType,
            sourceLLM: sourceLLM || null,
            batchId: batch.id,
            difficulty: cs.difficulty,
            estimatedTime: cs.estimatedTime
          }).returning();
          insertedCaseStudies.push(inserted);
        } catch (csErr: any) {
          console.warn(`Failed to insert case study ${i}:`, csErr.message);
          errors.push({ index: i, error: csErr.message });
        }
      }

      res.json({
        batch,
        importedCount: insertedCaseStudies.length,
        totalProvided: caseStudiesData.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Bulk import case studies error:", error);
      res.status(500).json({ error: "Failed to bulk import case studies" });
    }
  });

  // Search case studies with filters
  app.get("/api/case-studies/search", async (req, res) => {
    try {
      const { caseStudies } = await import("../shared/schema");
      const { eq, ilike, and, or, desc } = await import("drizzle-orm");

      const { subject, examDay, difficulty, keyword, limit: limitStr } = req.query;
      const limit = parseInt(limitStr as string) || 50;

      const conditions = [];

      if (subject && subject !== 'all' && subject !== '') {
        conditions.push(eq(caseStudies.subject, subject as string));
      }
      if (examDay && examDay !== 'all' && examDay !== '') {
        conditions.push(eq(caseStudies.examDay, examDay as string));
      }
      if (difficulty && difficulty !== 'all' && difficulty !== '') {
        conditions.push(eq(caseStudies.difficulty, difficulty as string));
      }
      if (keyword && keyword !== '') {
        conditions.push(
          or(
            ilike(caseStudies.title, `%${keyword}%`),
            ilike(caseStudies.scenario, `%${keyword}%`)
          )
        );
      }

      const results = await db
        .select()
        .from(caseStudies)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(caseStudies.createdAt))
        .limit(limit);

      res.json(results);
    } catch (error) {
      console.error("Search case studies error:", error);
      res.status(500).json({ error: "Failed to search case studies" });
    }
  });

  // Get single case study by ID
  app.get("/api/case-studies/:id", async (req, res) => {
    try {
      const { caseStudies } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      const [caseStudy] = await db
        .select()
        .from(caseStudies)
        .where(eq(caseStudies.id, req.params.id));

      if (!caseStudy) {
        return res.status(404).json({ error: "Case study not found" });
      }

      res.json(caseStudy);
    } catch (error) {
      console.error("Get case study error:", error);
      res.status(500).json({ error: "Failed to fetch case study" });
    }
  });

  // ==================== LEGAL ARTICLES ENDPOINTS ====================

  // Bulk import legal articles from structured JSON
  app.post("/api/legal-articles/bulk-import", async (req, res) => {
    try {
      const { legalArticles, legalArticleBatches } = await import("../shared/schema");
      const userId = await getDefaultUserId();

      const {
        batchName,
        subject,
        lawSource,
        sourceLLM,
        articles: articlesData,
        meta
      } = req.body;

      if (!articlesData || !Array.isArray(articlesData) || articlesData.length === 0) {
        return res.status(400).json({ error: "No articles provided" });
      }

      if (!subject) {
        return res.status(400).json({ error: "Subject is required" });
      }

      // Validate articles have required fields before processing
      const validArticles = articlesData.filter((a: any) =>
        a.article && typeof a.article === 'number' && a.title && a.segments && typeof a.segments === 'object'
      );

      if (validArticles.length === 0) {
        return res.status(400).json({ error: "No valid articles found. Each article must have: article (number), title (string), segments (object)" });
      }

      // Extract article range from validated data
      const articleNumbers = validArticles.map((a: any) => a.article);
      const minArticle = Math.min(...articleNumbers);
      const maxArticle = Math.max(...articleNumbers);
      const articleRange = minArticle === maxArticle ? `${minArticle}` : `${minArticle}-${maxArticle}`;

      // Create batch
      const [batch] = await db.insert(legalArticleBatches).values({
        userId,
        batchName: batchName || `${lawSource || 'Articole'} ${articleRange}`,
        subject,
        lawSource: lawSource || meta?.source || null,
        articleRange,
        sourceLLM: sourceLLM || null,
        articlesCount: validArticles.length
      }).returning();

      // Insert validated articles only
      const insertedArticles = [];
      const errors: { index: number; error: string }[] = [];

      for (let i = 0; i < validArticles.length; i++) {
        const art = validArticles[i];
        try {

          // Build raw content from all segments
          const rawContent = Object.entries(art.segments || {})
            .map(([key, value]) => `[${key.toUpperCase()}]\n${value}`)
            .join('\n\n');

          const [inserted] = await db.insert(legalArticles).values({
            userId,
            articleNumber: art.article,
            title: art.title,
            subject,
            lawSource: lawSource || meta?.source || null,
            segments: art.segments,
            rawContent: art.raw || rawContent,
            batchId: batch.id,
            isProcessedForRag: false
          }).returning();

          insertedArticles.push(inserted);
        } catch (artErr: any) {
          console.warn(`Failed to insert article ${art.article}:`, artErr.message);
          errors.push({ index: i, error: artErr.message });
        }
      }

      res.json({
        batch,
        importedCount: insertedArticles.length,
        totalProvided: articlesData.length,
        articleRange,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Bulk import legal articles error:", error);
      res.status(500).json({ error: "Failed to bulk import legal articles" });
    }
  });

  // Get all legal article batches
  app.get("/api/legal-article-batches", async (req, res) => {
    try {
      const { legalArticleBatches } = await import("../shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      const userId = await getDefaultUserId();

      const batches = await db
        .select()
        .from(legalArticleBatches)
        .where(eq(legalArticleBatches.userId, userId))
        .orderBy(desc(legalArticleBatches.uploadedAt));

      res.json(batches);
    } catch (error) {
      console.error("Get legal article batches error:", error);
      res.status(500).json({ error: "Failed to fetch legal article batches" });
    }
  });

  // Get all legal articles with optional filters
  app.get("/api/legal-articles", async (req, res) => {
    try {
      const { legalArticles } = await import("../shared/schema");
      const { eq, and, gte, lte, ilike, desc, asc } = await import("drizzle-orm");
      const userId = await getDefaultUserId();

      const { subject, lawSource, articleFrom, articleTo, search, batchId } = req.query;

      const conditions = [eq(legalArticles.userId, userId)];

      if (subject && subject !== 'all') {
        conditions.push(eq(legalArticles.subject, subject as string));
      }
      if (lawSource) {
        conditions.push(eq(legalArticles.lawSource, lawSource as string));
      }
      if (articleFrom) {
        conditions.push(gte(legalArticles.articleNumber, parseInt(articleFrom as string)));
      }
      if (articleTo) {
        conditions.push(lte(legalArticles.articleNumber, parseInt(articleTo as string)));
      }
      if (batchId) {
        conditions.push(eq(legalArticles.batchId, batchId as string));
      }
      if (search) {
        conditions.push(ilike(legalArticles.rawContent, `%${search}%`));
      }

      const articles = await db
        .select()
        .from(legalArticles)
        .where(and(...conditions))
        .orderBy(asc(legalArticles.articleNumber));

      res.json(articles);
    } catch (error) {
      console.error("Get legal articles error:", error);
      res.status(500).json({ error: "Failed to fetch legal articles" });
    }
  });

  // Get single legal article by ID
  app.get("/api/legal-articles/:id", async (req, res) => {
    try {
      const { legalArticles } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");

      const [article] = await db
        .select()
        .from(legalArticles)
        .where(eq(legalArticles.id, req.params.id));

      if (!article) {
        return res.status(404).json({ error: "Legal article not found" });
      }

      res.json(article);
    } catch (error) {
      console.error("Get legal article error:", error);
      res.status(500).json({ error: "Failed to fetch legal article" });
    }
  });

  // Delete legal article batch (and its articles)
  app.delete("/api/legal-article-batches/:id", async (req, res) => {
    try {
      const { legalArticles, legalArticleBatches } = await import("../shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const userId = await getDefaultUserId();
      const batchId = req.params.id;

      // Delete articles first
      await db.delete(legalArticles).where(eq(legalArticles.batchId, batchId));

      // Delete batch
      await db.delete(legalArticleBatches).where(
        and(
          eq(legalArticleBatches.id, batchId),
          eq(legalArticleBatches.userId, userId)
        )
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Delete legal article batch error:", error);
      res.status(500).json({ error: "Failed to delete legal article batch" });
    }
  });

  // Process legal articles for RAG (chunk segments and generate embeddings)
  app.post("/api/legal-articles/:id/process-rag", async (req, res) => {
    try {
      const { legalArticles, legalArticleChunks } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      const { chunkText } = await import("./utils/chunking");
      const { batchGenerateEmbeddings } = await import("./gemini");

      const articleId = req.params.id;

      // Get article
      const [article] = await db
        .select()
        .from(legalArticles)
        .where(eq(legalArticles.id, articleId));

      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      // Delete existing chunks for this article
      await db.delete(legalArticleChunks).where(eq(legalArticleChunks.articleId, articleId));

      // Create chunks from each segment
      const segments = article.segments as Record<string, string>;
      const allChunks: { text: string; segmentType: string; index: number }[] = [];

      for (const [segmentType, segmentText] of Object.entries(segments)) {
        if (!segmentText || typeof segmentText !== 'string') continue;

        // Chunk the segment
        const segmentChunks = chunkText(segmentText, {
          chunkSize: 600,
          overlap: 50,
          minChunkSize: 200
        });

        for (const chunk of segmentChunks) {
          allChunks.push({
            text: chunk.text,
            segmentType,
            index: allChunks.length
          });
        }
      }

      if (allChunks.length === 0) {
        return res.status(400).json({ error: "No text to chunk in article segments" });
      }

      console.log(`[RAG] Created ${allChunks.length} chunks for article ${article.articleNumber}`);

      // Generate embeddings
      const texts = allChunks.map(c => c.text);
      const embeddings = await batchGenerateEmbeddings(texts);

      // Save chunks with embeddings
      const chunksToInsert = allChunks.map((chunk, i) => ({
        articleId,
        segmentType: chunk.segmentType,
        chunkText: chunk.text,
        chunkIndex: chunk.index,
        embedding: embeddings[i],
        metadata: {
          articleNumber: article.articleNumber,
          title: article.title,
          subject: article.subject,
          segmentType: chunk.segmentType,
        },
      }));

      let savedChunks: any[] = [];
      if (chunksToInsert.length > 0) {
        savedChunks = await db
          .insert(legalArticleChunks)
          .values(chunksToInsert)
          .returning();
      }

      // Mark article as processed
      await db
        .update(legalArticles)
        .set({ isProcessedForRag: true })
        .where(eq(legalArticles.id, articleId));

      res.json({
        articleId,
        articleNumber: article.articleNumber,
        chunksCreated: savedChunks.length,
        embeddingDimensions: embeddings[0]?.length || 0
      });
    } catch (error) {
      console.error("Process article RAG error:", error);
      res.status(500).json({ error: "Failed to process article for RAG" });
    }
  });

  // Get statistics for legal articles
  app.get("/api/legal-articles/stats", async (req, res) => {
    try {
      const { legalArticles, legalArticleBatches } = await import("../shared/schema");
      const { eq, count } = await import("drizzle-orm");
      const userId = await getDefaultUserId();

      const [articlesCount] = await db
        .select({ count: count() })
        .from(legalArticles)
        .where(eq(legalArticles.userId, userId));

      const [batchesCount] = await db
        .select({ count: count() })
        .from(legalArticleBatches)
        .where(eq(legalArticleBatches.userId, userId));

      const [ragProcessed] = await db
        .select({ count: count() })
        .from(legalArticles)
        .where(eq(legalArticles.isProcessedForRag, true));

      res.json({
        totalArticles: articlesCount?.count || 0,
        totalBatches: batchesCount?.count || 0,
        ragProcessedArticles: ragProcessed?.count || 0
      });
    } catch (error) {
      console.error("Get legal articles stats error:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Submit case study solution for grading
  app.post("/api/case-studies/:id/submit", async (req, res) => {
    try {
      const { userCaseStudySubmissions, caseStudies } = await import("../shared/schema");
      const { eq } = await import("drizzle-orm");
      const { gradeCaseStudy } = await import("./gemini");

      const userId = await getDefaultUserId();
      const caseStudyId = req.params.id;
      const { userAnswer, timeSpent } = req.body;

      const [caseStudy] = await db.select().from(caseStudies).where(eq(caseStudies.id, caseStudyId));

      if (!caseStudy) {
        return res.status(404).json({ error: "Case study not found" });
      }

      const gradingResult = await gradeCaseStudy({
        caseScenario: caseStudy.scenario,
        sampleAnswer: caseStudy.sampleAnswer || "Indisponibil",
        userAnswer
      });

      const [submission] = await db.insert(userCaseStudySubmissions).values({
        userId,
        caseStudyId,
        userAnswer,
        aiGrade: gradingResult.grade,
        aiFeedback: JSON.stringify(gradingResult.evaluation),
        timeSpent: timeSpent || 0,
        submittedAt: new Date()
      }).returning();

      res.json({
        submission,
        grading: gradingResult
      });
    } catch (error) {
      console.error("Case study submission error:", error);
      res.status(500).json({ error: "Failed to submit case study" });
    }
  });

  // Get user submissions for a case study
  app.get("/api/case-studies/:id/submissions", async (req, res) => {
    try {
      const { userCaseStudySubmissions } = await import("../shared/schema");
      const { eq, and, desc } = await import("drizzle-orm");

      const userId = await getDefaultUserId();
      const caseStudyId = req.params.id;

      const submissions = await db
        .select()
        .from(userCaseStudySubmissions)
        .where(
          and(
            eq(userCaseStudySubmissions.userId, userId),
            eq(userCaseStudySubmissions.caseStudyId, caseStudyId)
          )
        )
        .orderBy(desc(userCaseStudySubmissions.submittedAt));

      res.json(submissions);
    } catch (error) {
      console.error("Get submissions error:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // ============================================================================
  // [NEW] LEGISLATIVE API TEST ROUTES
  // ============================================================================

  const { registerLegislativeTestRoutes } = await import("./services/legislative-test-routes");
  registerLegislativeTestRoutes(app);

  // ============================================================================
  // [NEW] PORTAL JUST API TEST ROUTES
  // ============================================================================

  const { registerPortalJustTestRoutes } = await import("./services/portal-just-test-routes");
  registerPortalJustTestRoutes(app);

  // ============================================================================
  // [NEW] RAW LEGISLATIVE API TEST ROUTES (Direct HTTP SOAP)
  // ============================================================================

  const { registerRawLegislativeTestRoutes } = await import("./services/raw-legislative-api");
  registerRawLegislativeTestRoutes(app);

  // ============================================================================
  // [NEW] LEGISLATIVE SCRAPER TEST ROUTES (Puppeteer fallback)
  // ============================================================================

  const { registerScraperTestRoutes } = await import("./services/scraper-test-routes");
  registerScraperTestRoutes(app);

  // ============================================================================
  // [NEW] LEGAL ACTS API ROUTES (Browse/Search legislative acts from DB)
  // ============================================================================

  const { registerLegalActsRoutes } = await import("./services/legal-acts-routes");
  registerLegalActsRoutes(app);

  // ============================================================================
  // [CLEAN ROOM] AI Content Generation Routes
  // ============================================================================

  const { cleanRoomRoutes } = await import("./services/clean-room/routes");
  app.use("/api/clean-room", cleanRoomRoutes);
  console.log("[ROUTES] Clean Room routes registered at /api/clean-room");

  // ============================================================================
  // [NEW] BULLETIN BOARD - Legislative Changes Tracking
  // ============================================================================

  const { registerBulletinBoardRoutes } = await import("./services/bulletin-board-routes");
  registerBulletinBoardRoutes(app);

  // ============================================================================
  // [ADMIN] Database Purge Endpoint
  // ============================================================================

  app.post("/api/admin/purge-questions", async (req: Request, res: Response) => {
    try {
      console.log("[ADMIN] Purging all questions from database...");
      await db.delete(questions);
      console.log("[ADMIN] Questions purged successfully.");
      res.json({ success: true, message: "All questions deleted successfully." });
    } catch (error) {
      console.error("[ADMIN] Purge failed:", error);
      res.status(500).json({ success: false, error: "Failed to purge questions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
