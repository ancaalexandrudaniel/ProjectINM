import { db } from "../db";
import { uploadedDocuments, documentChunks } from "../../shared/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import {
  extractTextFromPDF,
  analyzeLegalDocument,
  analyzeExamPatterns,
  batchGenerateEmbeddings,
} from "../gemini";
import { chunkText } from "../utils/chunking";
import { ObjectStorageService } from "../objectStorage";
import fs from "fs";

/**
 * Upload a document from base64 content, extract text, analyze with AI, save to DB.
 */
export async function uploadDocument(
  userId: string,
  data: { fileName: string; documentType: string; subject: string; fileContent: string }
) {
  const { fileName, documentType, subject, fileContent } = data;
  console.log("[UPLOAD] File:", fileName, "Type:", documentType, "Subject:", subject);

  const tmpPath = `/tmp/${Date.now()}-${fileName}`;
  const buffer = Buffer.from(fileContent, "base64");
  console.log("[UPLOAD] Buffer size:", buffer.length);
  fs.writeFileSync(tmpPath, buffer);

  let extractedText = "";
  try {
    extractedText = await extractTextFromPDF(tmpPath);
  } catch (pdfErr) {
    console.warn("[UPLOAD] PDF extraction failed, using empty text");
  }
  extractedText = extractedText
    .replace(/\x00/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  let aiSummary = "Document încărcat. Analiza AI va fi disponibilă când quota se resetează.";
  try {
    const analysis = await analyzeLegalDocument({
      documentText: extractedText,
      documentType: documentType as any,
    });
    aiSummary = analysis.summary;
  } catch (aiErr: any) {
    console.warn("[UPLOAD] AI analysis failed (quota?):", aiErr?.status || aiErr?.message);
  }

  const [document] = await db
    .insert(uploadedDocuments)
    .values({ userId, fileName, documentType, subject, objectPath: tmpPath, extractedText, aiSummary })
    .returning();

  try { fs.unlinkSync(tmpPath); } catch (_e) { /* ignore */ }

  return { document, analysis: { summary: aiSummary, keyPoints: [] } };
}

/**
 * Get all documents for a user.
 */
export async function getDocuments(userId: string) {
  return db.select().from(uploadedDocuments).where(eq(uploadedDocuments.userId, userId));
}

/**
 * Process a document from Object Storage (download → extract → analyze → save).
 */
export async function processDocument(
  userId: string,
  data: { uploadURL: string; fileName: string; documentType: string; subject: string }
) {
  const storageService = new ObjectStorageService();
  const objectPath = storageService.normalizeObjectEntityPath(data.uploadURL);

  const tmpPath = `/tmp/${Date.now()}.pdf`;
  await storageService.downloadObjectEntityToLocal(objectPath, tmpPath);

  const extractedText = await extractTextFromPDF(tmpPath);
  const analysis = await analyzeLegalDocument({
    documentText: extractedText,
    documentType: data.documentType as any,
  });

  const [document] = await db
    .insert(uploadedDocuments)
    .values({
      userId,
      fileName: data.fileName,
      documentType: data.documentType,
      subject: data.subject,
      objectPath,
      extractedText,
      aiSummary: analysis.summary,
    })
    .returning();

  return { document, analysis };
}

/**
 * Analyze exam patterns from selected documents.
 */
export async function analyzeDocumentPatterns(
  userId: string,
  documentIds: string[],
  subject?: string
) {
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
    throw new Error("No exam documents found");
  }

  const examDocuments = docs.map((doc) => {
    const yearMatch = doc.fileName.match(/20\d{2}/);
    return { year: yearMatch ? yearMatch[0] : "unknown", text: doc.extractedText || "" };
  });

  return analyzeExamPatterns({ examDocuments, subject: subject || "Drept Civil" });
}

/**
 * Delete a document.
 */
export async function deleteDocument(userId: string, documentId: string) {
  await db
    .delete(uploadedDocuments)
    .where(and(eq(uploadedDocuments.id, documentId), eq(uploadedDocuments.userId, userId)));
}

/**
 * Process a document into text chunks.
 */
export async function processDocumentChunks(userId: string, documentId: string) {
  const [document] = await db
    .select()
    .from(uploadedDocuments)
    .where(and(eq(uploadedDocuments.id, documentId), eq(uploadedDocuments.userId, userId)))
    .limit(1);

  if (!document) throw new Error("Document not found");
  if (!document.extractedText) throw new Error("Document has no extracted text");

  await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));

  const chunks = chunkText(document.extractedText, {
    chunkSize: 800,
    overlap: 100,
    minChunkSize: 300,
  });

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

  return {
    documentId: document.id,
    fileName: document.fileName,
    chunksCreated: savedChunks.length,
    totalTextLength: document.extractedText.length,
  };
}

/**
 * Get chunks for a document.
 */
export async function getDocumentChunks(documentId: string) {
  return db
    .select()
    .from(documentChunks)
    .where(eq(documentChunks.documentId, documentId))
    .orderBy(asc(documentChunks.chunkIndex));
}

/**
 * Generate embeddings for all chunks of a document.
 */
export async function generateDocumentEmbeddings(documentId: string) {
  const chunks = await db
    .select()
    .from(documentChunks)
    .where(eq(documentChunks.documentId, documentId));

  if (chunks.length === 0) throw new Error("No chunks found for this document");

  const texts = chunks.map((c) => c.chunkText);
  const embeddings = await batchGenerateEmbeddings(texts);

  let updatedCount = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE, chunks.length);
    const updatePromises = [];

    for (let j = i; j < batchEnd; j++) {
      updatePromises.push(
        db.update(documentChunks).set({ embedding: embeddings[j] }).where(eq(documentChunks.id, chunks[j].id))
      );
    }

    await Promise.all(updatePromises);
    updatedCount += batchEnd - i;
  }

  return {
    documentId,
    chunksProcessed: updatedCount,
    embeddingDimensions: embeddings[0]?.length || 0,
  };
}
