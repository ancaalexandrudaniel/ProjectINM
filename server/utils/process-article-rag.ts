/**
 * Shared utility for processing a legal article into RAG-ready chunks.
 * Extracts segments, chunks text, generates embeddings, saves to DB, and marks as processed.
 *
 * Used by:
 *  - POST /legal-articles/:id/process-rag (single article)
 *  - POST /legal-articles/batch-process-rag (batch processing)
 *  - setImmediate auto-trigger after bulk import
 */

import { db } from "../db";
import { legalArticles, legalArticleChunks } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { chunkText } from "./chunking";
import { batchGenerateEmbeddings } from "../gemini";
import type { LegalArticle } from "../../shared/schema";

export interface ProcessArticleResult {
  articleId: string;
  articleNumber: number;
  chunksCreated: number;
  embeddingDimensions: number;
}

/**
 * Process a single legal article for RAG:
 * 1. Delete existing chunks
 * 2. Chunk each segment
 * 3. Generate embeddings
 * 4. Save chunks to DB
 * 5. Mark article as processed
 *
 * @returns result with chunk count, or null if article had no text to chunk
 */
export async function processArticleForRAG(article: LegalArticle): Promise<ProcessArticleResult | null> {
  // Delete existing chunks for this article
  await db.delete(legalArticleChunks).where(eq(legalArticleChunks.articleId, article.id));

  // Create chunks from each segment
  const segments = article.segments as Record<string, string>;
  const allChunks: { text: string; segmentType: string; index: number }[] = [];

  for (const [segmentType, segmentText] of Object.entries(segments)) {
    if (!segmentText || typeof segmentText !== "string") continue;
    const segmentChunks = chunkText(segmentText, {
      chunkSize: 600,
      overlap: 50,
      minChunkSize: 200,
    });
    for (const chunk of segmentChunks) {
      allChunks.push({ text: chunk.text, segmentType, index: allChunks.length });
    }
  }

  if (allChunks.length === 0) return null;

  // Generate embeddings
  const texts = allChunks.map((c) => c.text);
  const embeddings = await batchGenerateEmbeddings(texts);

  // Save chunks with embeddings
  const chunksToInsert = allChunks.map((chunk, i) => ({
    articleId: article.id,
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

  if (chunksToInsert.length > 0) {
    await db.insert(legalArticleChunks).values(chunksToInsert);
  }

  // Mark article as processed
  await db
    .update(legalArticles)
    .set({ isProcessedForRag: true })
    .where(eq(legalArticles.id, article.id));

  return {
    articleId: article.id,
    articleNumber: article.articleNumber,
    chunksCreated: allChunks.length,
    embeddingDimensions: embeddings[0]?.length || 0,
  };
}
