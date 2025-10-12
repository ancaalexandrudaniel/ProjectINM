/**
 * Text chunking utilities for RAG (Retrieval-Augmented Generation)
 * Splits legal documents into semantic chunks for embedding and retrieval
 */

export interface TextChunk {
  text: string;
  index: number;
  startPosition: number;
  endPosition: number;
}

export interface ChunkingOptions {
  chunkSize?: number;
  overlap?: number;
  minChunkSize?: number;
}

/**
 * Split text into chunks with overlap for better context preservation
 * Optimized for legal documents (maintains paragraph boundaries when possible)
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = {}
): TextChunk[] {
  const {
    chunkSize = 800,
    overlap = 100,
    minChunkSize = 300,
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let startPos = 0;
  let chunkIndex = 0;

  while (startPos < text.length) {
    let endPos = Math.min(startPos + chunkSize, text.length);

    // If not at the end, try to find a natural break point (paragraph, sentence)
    if (endPos < text.length) {
      // Look for paragraph break first
      const paragraphBreak = text.lastIndexOf('\n\n', endPos);
      if (paragraphBreak > startPos && paragraphBreak >= startPos + minChunkSize) {
        endPos = paragraphBreak + 2; // Include the newlines
      } else {
        // Look for sentence break
        const sentenceBreak = Math.max(
          text.lastIndexOf('. ', endPos),
          text.lastIndexOf('.\n', endPos),
          text.lastIndexOf('! ', endPos),
          text.lastIndexOf('? ', endPos)
        );
        if (sentenceBreak > startPos && sentenceBreak >= startPos + minChunkSize) {
          endPos = sentenceBreak + 1; // Include the period
        }
      }
    }

    const chunkText = text.slice(startPos, endPos).trim();
    
    if (chunkText.length >= minChunkSize || startPos + chunkText.length >= text.length) {
      chunks.push({
        text: chunkText,
        index: chunkIndex,
        startPosition: startPos,
        endPosition: endPos,
      });
      chunkIndex++;
    }

    // Move start position forward with overlap
    const nextStartPos = endPos - overlap;
    
    // Prevent infinite loop - ensure we always move forward
    if (nextStartPos <= startPos) {
      startPos = endPos;
    } else {
      startPos = nextStartPos;
    }
    
    // Safety: if we haven't moved at all, force move forward
    if (startPos >= text.length || endPos === startPos) {
      break;
    }
  }

  return chunks;
}

/**
 * Estimate the number of chunks that will be created from a text
 */
export function estimateChunkCount(
  textLength: number,
  chunkSize: number = 800,
  overlap: number = 100
): number {
  if (textLength === 0) return 0;
  const effectiveChunkSize = chunkSize - overlap;
  return Math.ceil(textLength / effectiveChunkSize);
}
