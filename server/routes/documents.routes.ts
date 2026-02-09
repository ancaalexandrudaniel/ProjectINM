import { Router } from "express";
import { db } from "../db";
import { uploadedDocuments, documentChunks } from "../../shared/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import { extractTextFromPDF, analyzeLegalDocument, analyzeExamPatterns, batchGenerateEmbeddings } from "../gemini";
import { chunkText } from "../utils/chunking";
import { ObjectStorageService } from "../objectStorage";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../middleware/error-handler";
import fs from "fs";

const router = Router();


// POST /documents/upload - Upload document (base64)
router.post("/documents/upload", asyncHandler(async (req, res) => {
  console.log("[UPLOAD] Starting document upload...");
  const userId = req.user!.id;

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
  let aiSummary = "Document \u00eenc\u0103rcat. Analiza AI va fi disponibil\u0103 c\u00e2nd quota se reseteaz\u0103.";
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
}));

// GET /documents - Get all uploaded documents
router.get("/documents", asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const docs = await db
    .select()
    .from(uploadedDocuments)
    .where(eq(uploadedDocuments.userId, userId));

  res.json(docs);
}));

// POST /documents/process - Process uploaded document
router.post("/documents/process", asyncHandler(async (req, res) => {
  const storageService = new ObjectStorageService();
  const userId = req.user!.id;

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
}));

// POST /documents/analyze-patterns - Analyze exam patterns from uploaded exam documents
router.post("/documents/analyze-patterns", asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const { documentIds, subject } = req.body;

  if (!documentIds || documentIds.length === 0) {
    throw new AppError(400, "No documents specified");
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
    throw new AppError(404, "No exam documents found");
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
}));

// DELETE /documents/:id - Delete document
router.delete("/documents/:id", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
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
}));

// POST /documents/:id/process-chunks - Process document into chunks
router.post("/documents/:id/process-chunks", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
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
    throw new AppError(404, "Document not found");
  }

  if (!document.extractedText) {
    throw new AppError(400, "Document has no extracted text");
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
  let savedChunks: any[] = [];
  if (chunks.length > 0) {
    savedChunks = await db
      .insert(documentChunks)
      .values(
        chunks.map((chunk) => ({
          documentId: document.id,
          chunkText: chunk.text,
          chunkIndex: chunk.index,
          metadata: {
            documentType: document.documentType,
            subject: document.subject,
            fileName: document.fileName,
            startPosition: chunk.startPosition,
            endPosition: chunk.endPosition,
          },
        }))
      )
      .returning();
  }

  res.json({
    documentId: document.id,
    fileName: document.fileName,
    chunksCreated: savedChunks.length,
    totalTextLength: document.extractedText.length
  });
}));

// GET /documents/:id/chunks - Get document chunks
router.get("/documents/:id/chunks", asyncHandler(async (req, res) => {
  const documentId = req.params.id;

  const chunks = await db
    .select()
    .from(documentChunks)
    .where(eq(documentChunks.documentId, documentId))
    .orderBy(asc(documentChunks.chunkIndex));

  res.json(chunks);
}));

// POST /documents/:id/generate-embeddings - Generate embeddings for document chunks
router.post("/documents/:id/generate-embeddings", asyncHandler(async (req, res) => {
  const documentId = req.params.id;

  // Get chunks without embeddings
  const chunks = await db
    .select()
    .from(documentChunks)
    .where(eq(documentChunks.documentId, documentId));

  if (chunks.length === 0) {
    throw new AppError(404, "No chunks found for this document");
  }

  console.log(`[EMBEDDINGS] Generating embeddings for ${chunks.length} chunks...`);

  // Generate embeddings for all chunks
  const texts = chunks.map(c => c.chunkText);
  const embeddings = await batchGenerateEmbeddings(texts);

  console.log(`[EMBEDDINGS] Generated ${embeddings.length} embeddings, updating DB...`);

  // Update chunks with embeddings (batched parallel updates)
  let updatedCount = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE, chunks.length);
    const updatePromises = [];

    for (let j = i; j < batchEnd; j++) {
      updatePromises.push(
        db
          .update(documentChunks)
          .set({ embedding: embeddings[j] })
          .where(eq(documentChunks.id, chunks[j].id))
      );
    }

    await Promise.all(updatePromises);
    updatedCount += (batchEnd - i);
  }

  console.log(`[EMBEDDINGS] Updated ${updatedCount} chunks with embeddings`);

  res.json({
    documentId,
    chunksProcessed: updatedCount,
    embeddingDimensions: embeddings[0]?.length || 0
  });
}));

export default router;
