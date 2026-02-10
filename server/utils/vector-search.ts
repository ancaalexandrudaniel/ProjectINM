/**
 * Unified SQL-based vector search across document_chunks and legal_article_chunks.
 *
 * Computes cosine similarity in PostgreSQL instead of loading all embeddings
 * into Node.js memory.  Works with JSONB-stored float[] embeddings (no pgvector).
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

export interface SimilarChunk {
  id: string;
  chunkText: string;
  metadata: Record<string, unknown> | null;
  sourceType: "document" | "legal_article";
  similarity: number;
}

/**
 * Search both chunk tables for the top-K most similar embeddings.
 *
 * The cosine similarity is computed entirely inside PostgreSQL:
 *   cos(A, B) = dot(A, B) / (|A| * |B|)
 *
 * Each embedding column is a JSONB array of 768 floats.
 * We cast it to float8[] so PostgreSQL array functions work.
 */
export async function searchSimilarChunks(
  queryEmbedding: number[],
  topK = 5
): Promise<SimilarChunk[]> {
  // Serialise the query vector once for both sub-queries
  const embStr = `{${queryEmbedding.join(",")}}`;

  const result = await db.execute<{
    id: string;
    chunk_text: string;
    metadata: Record<string, unknown> | null;
    source_type: string;
    similarity: number;
  }>(sql`
    WITH query_vec AS (
      SELECT ${embStr}::float8[] AS vec
    ),
    all_chunks AS (
      -- Document chunks (uploaded PDFs, legislative acts indexed via clean-room)
      SELECT
        dc.id,
        dc.chunk_text,
        dc.metadata,
        'document' AS source_type,
        dc.embedding::float8[] AS emb
      FROM document_chunks dc
      WHERE dc.embedding IS NOT NULL

      UNION ALL

      -- Legal article chunks (imported articles processed for RAG)
      SELECT
        lac.id,
        lac.chunk_text,
        lac.metadata,
        'legal_article' AS source_type,
        lac.embedding::float8[] AS emb
      FROM legal_article_chunks lac
      WHERE lac.embedding IS NOT NULL
    ),
    scored AS (
      SELECT
        ac.id,
        ac.chunk_text,
        ac.metadata,
        ac.source_type,
        (
          SELECT SUM(a * b)
          FROM unnest(ac.emb) WITH ORDINALITY AS e(a, i),
               unnest(qv.vec) WITH ORDINALITY AS q(b, j)
          WHERE e.i = q.j
        ) / NULLIF(
          sqrt((SELECT SUM(a * a) FROM unnest(ac.emb) AS e(a)))
          * sqrt((SELECT SUM(b * b) FROM unnest(qv.vec) AS q(b))),
          0
        ) AS similarity
      FROM all_chunks ac, query_vec qv
    )
    SELECT id, chunk_text, metadata, source_type, similarity
    FROM scored
    WHERE similarity IS NOT NULL
    ORDER BY similarity DESC
    LIMIT ${topK}
  `);

  return result.rows.map((row) => ({
    id: row.id,
    chunkText: row.chunk_text,
    metadata: row.metadata,
    sourceType: row.source_type as "document" | "legal_article",
    similarity: Number(row.similarity),
  }));
}
