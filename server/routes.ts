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
      console.log("[UPLOAD] Starting document upload...");
      const { extractTextFromPDF, analyzeLegalDocument } = await import("./gemini");
      const { uploadedDocuments } = await import("@shared/schema");
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

  // RAG: Process document into chunks
  app.post("/api/documents/:id/process-chunks", async (req, res) => {
    try {
      const { uploadedDocuments, documentChunks } = await import("@shared/schema");
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
      const { documentChunks } = await import("@shared/schema");
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
      const { documentChunks } = await import("@shared/schema");
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

  // RAG: Ask legal question with document retrieval
  app.post("/api/legal-assistant/ask", async (req, res) => {
    try {
      const { documentChunks } = await import("@shared/schema");
      const { isNotNull } = await import("drizzle-orm");
      const { generateEmbedding, calculateCosineSimilarity } = await import("./gemini");
      
      const { question, topK = 5 } = req.body;
      
      if (!question || question.trim().length === 0) {
        return res.status(400).json({ error: "Question is required" });
      }
      
      console.log(`[RAG] Question: "${question}"`);
      
      // Generate embedding for question
      const questionEmbedding = await generateEmbedding(question);
      console.log(`[RAG] Generated question embedding (${questionEmbedding.length}D)`);
      
      // Get all chunks with embeddings
      const chunks = await db
        .select()
        .from(documentChunks)
        .where(isNotNull(documentChunks.embedding));
      
      if (chunks.length === 0) {
        return res.status(404).json({ 
          error: "No document embeddings found. Please generate embeddings first." 
        });
      }
      
      console.log(`[RAG] Searching through ${chunks.length} chunks...`);
      
      // Calculate similarities and find top-K
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
      
      console.log(`[RAG] Top ${topK} similarities:`, 
        similarities.map(s => s.similarity.toFixed(4)));
      
      // Build context from top chunks
      const context = similarities
        .map((s, i) => `[${i + 1}] ${s.chunkText}`)
        .join('\n\n');
      
      // Generate answer using Gemini with RAG context
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      
      const systemPrompt = `Ești un asistent juridic expert pentru pregătirea examenului INM.
Răspunzi la întrebări despre concepte juridice în limba română, bazându-te pe documentele furnizate.

REGULI IMPORTANTE:
- Răspunde STRICT bazat pe contextul furnizat din documente
- Citează articole și legi când răspunzi
- Dacă informația nu există în context, spune clar "Nu găsesc această informație în documentele disponibile"
- Răspunsuri concise (max 250 cuvinte)
- Limbaj simplu, fără termeni complicați
- Exemplifică cu cazuri practice când este relevant

CONTEXT din documente:
${context}`;

      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        systemInstruction: systemPrompt,
        contents: [
          {
            role: "user",
            parts: [{ text: question }]
          }
        ]
      });
      
      const answer = result.text || "Nu am putut genera un răspuns.";
      
      // Prepare citations
      const citations = similarities.map(s => ({
        chunkId: s.id,
        text: s.chunkText.substring(0, 200) + (s.chunkText.length > 200 ? "..." : ""),
        similarity: s.similarity,
        metadata: s.metadata
      }));
      
      res.json({
        question,
        answer,
        citations,
        chunksRetrieved: topK
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

  // ============================================
  // BULK IMPORT & SEARCH ROUTES
  // ============================================

  // Get all question batches
  app.get("/api/question-batches", async (req, res) => {
    try {
      const { questionBatches } = await import("@shared/schema");
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
      const { questions, questionBatches } = await import("@shared/schema");
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
          aiFeedback: z.string().optional().nullable()
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
      const setTypeViolations: Array<{index: number; message: string}> = [];
      
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
      const errors: Array<{index: number; error: string}> = [];
      
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
      const { questions, questionBatches } = await import("@shared/schema");
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
      const setTypeViolations: Array<{index: number; message: string}> = [];
      
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
      const errors: Array<{index: number; error: string}> = [];
      
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
      const { questions } = await import("@shared/schema");
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
      const { questionTopics } = await import("@shared/schema");
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
      const { questionTopics } = await import("@shared/schema");
      
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
      const { questions } = await import("@shared/schema");
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
      const { caseStudyBatches } = await import("@shared/schema");
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
      const { caseStudies, caseStudyBatches } = await import("@shared/schema");
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
      const errors: Array<{index: number; error: string}> = [];
      
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
      const { caseStudies } = await import("@shared/schema");
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
      const { caseStudies } = await import("@shared/schema");
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
      const { legalArticles, legalArticleBatches } = await import("@shared/schema");
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
      const { legalArticleBatches } = await import("@shared/schema");
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
      const { legalArticles } = await import("@shared/schema");
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
      const { legalArticles } = await import("@shared/schema");
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
      const { legalArticles, legalArticleBatches } = await import("@shared/schema");
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
      const { legalArticles, legalArticleChunks } = await import("@shared/schema");
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
      const savedChunks = [];
      for (let i = 0; i < allChunks.length; i++) {
        const [saved] = await db
          .insert(legalArticleChunks)
          .values({
            articleId,
            segmentType: allChunks[i].segmentType,
            chunkText: allChunks[i].text,
            chunkIndex: allChunks[i].index,
            embedding: embeddings[i],
            metadata: {
              articleNumber: article.articleNumber,
              title: article.title,
              subject: article.subject,
              segmentType: allChunks[i].segmentType
            }
          })
          .returning();
        savedChunks.push(saved);
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
      const { legalArticles, legalArticleBatches } = await import("@shared/schema");
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

  const httpServer = createServer(app);
  return httpServer;
}
