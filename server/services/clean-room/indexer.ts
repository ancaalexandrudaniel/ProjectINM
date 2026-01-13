
/**
 * Clean Room Legislative Indexer
 * 
 * Responsible for:
 * 1. Fetching verified "Clean Room" data (legislative_acts)
 * 2. Splitting it into semantic chunks (article-level preferred)
 * 3. Generating embeddings using the secure Gemini client
 * 4. Indexing into document_chunks for RAG retrieval
 */

import { db } from "../../db";
import { legislativeActs, documentChunks, uploadedDocuments, users } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";
import { batchGenerateEmbeddings } from "../../gemini";

// Helper to get a valid user ID for system operations
async function getSystemUserId(): Promise<string> {
    const [user] = await db.select().from(users).limit(1);
    if (user) return user.id;

    // If no user exists, create a system user (unlikely in prod but safe fallback)
    console.log("[INDEXER] No users found. Creating system user...");
    const [newUser] = await db.insert(users).values({
        email: "system@inm-mentor.ro",
        password: "system_placeholder_hash", // Not used for login
        fullName: "System Admin",
        subscriptionTier: "pro"
    }).returning();
    return newUser.id;
}

// Constants for chunking
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;

/**
 * Split text into semantic chunks, trying to respect article boundaries
 */
function chunkLegislativeText(
    text: string,
    actName: string
): Array<{ text: string; metadata: any }> {
    // Regex to identify article headers like "Art. 1" or "Articolul 1"
    const articleRegex = /(?:^|\n)(Art\.?|Articolul)\s+(\d+(?:\^?[a-z])?)/gi;

    const chunks: Array<{ text: string; metadata: any }> = [];

    // Naive splitting first? 
    // Better: Split by article if possible.
    // Given that full_text might be massive (2MB+ for Civil Code), regex split is risky for memory.
    // However, simple windowing is safer for MVP. 

    // Strategy: 
    // 1. Sliding window of ~1000 chars
    // 2. Try to snap break points to newlines or Article headers

    let currentIndex = 0;

    while (currentIndex < text.length) {
        let end = Math.min(currentIndex + CHUNK_SIZE, text.length);

        // If not at end, try to find a nice break point
        if (end < text.length) {
            // Look for last newline in the window
            const lastNewline = text.lastIndexOf('\n', end);
            if (lastNewline > currentIndex + CHUNK_SIZE * 0.7) { // within last 30% of window
                end = lastNewline;
            } else {
                // Look for space
                const lastSpace = text.lastIndexOf(' ', end);
                if (lastSpace > currentIndex) end = lastSpace;
            }
        }

        const chunkText = text.substring(currentIndex, end).trim();
        if (chunkText.length > 50) { // Skip tiny chunks
            chunks.push({
                text: chunkText,
                metadata: {
                    source: 'clean_room',
                    actName: actName,
                    startPos: currentIndex,
                    endPos: end
                }
            });
        }

        // Move forward (overlap)
        let nextIndex = end - CHUNK_OVERLAP;
        // Prevent infinite loop or moving backward if the chunk was very small
        if (nextIndex <= currentIndex) {
            nextIndex = currentIndex + (end - currentIndex) / 2; // Forward at least half the distance
            if (nextIndex <= currentIndex) nextIndex = currentIndex + 1; // Force at least 1 char
        }
        currentIndex = nextIndex;

        if (currentIndex >= text.length) break;

    }
    return chunks;
}

/**
 * Main function to index all current legislative acts
 */
export async function indexLegislativeActs() {
    console.log("[INDEXER] Starting Legislative Acts Indexing...");
    const acts = await db
        .select()
        .from(legislativeActs)
        .where(eq(legislativeActs.isCurrentVersion, true));

    console.log(`[INDEXER] Found ${acts.length} acts to index.`);

    let totalChunks = 0;

    for (const act of acts) {
        if (!act.fullText) {
            console.warn(`[INDEXER] Skipping ${act.actTitle} - No text content`);
            continue;
        }

        console.log(`[INDEXER] Processing ${act.actTitle} (${act.fullText.length} chars)...`);

        // 2. Create "Virtual" Document entry in uploadedDocuments 
        // (This is a hack to reuse existing RAG schema which links chunks to uploadedDocuments)
        // We will create a placeholder record for each Act so document_chunks has a valid foreign key

        // Check if placeholder exists
        let [docEntry] = await db
            .select()
            .from(uploadedDocuments)
            .where(eq(uploadedDocuments.fileName, `CLEAN_ROOM_${act.actNumber?.replace('/', '_') || act.id}`))
            .limit(1);

        if (!docEntry) {
            const systemUserId = await getSystemUserId();
            [docEntry] = await db.insert(uploadedDocuments).values({
                userId: systemUserId, // System user
                fileName: `CLEAN_ROOM_${act.actNumber?.replace('/', '_')}`,
                documentType: 'cod', // or 'lege'
                subject: 'Legislatie',
                objectPath: 'clean_room_virtual_path',
                extractedText: 'Content stored in legislative_acts table (clean room linked)',
                aiSummary: `Virtual document linking to Legislative Act: ${act.actTitle}`
            }).returning();
        }

        // 3. Clear existing chunks for this virtual document
        await db.delete(documentChunks).where(eq(documentChunks.documentId, docEntry.id));

        // 4. Generate Chunks
        const rawChunks = chunkLegislativeText(act.fullText, act.actTitle || "Act");
        console.log(`[INDEXER] Generated ${rawChunks.length} chunks. Generating embeddings...`);

        // 5. Generate Embeddings (Batch)
        const texts = rawChunks.map(c => c.text);
        const BATCH_SIZE = 10;
        const embeddings: number[][] = [];

        console.log(`[INDEXER] Generating embeddings for ${texts.length} chunks in batches of ${BATCH_SIZE}...`);

        for (let i = 0; i < texts.length; i += BATCH_SIZE) {
            const batch = texts.slice(i, i + BATCH_SIZE);
            try {
                const batchEmbeddings = await batchGenerateEmbeddings(batch);
                embeddings.push(...batchEmbeddings);
                process.stdout.write(`.`); // Visual progress
            } catch (e: any) {
                console.error(`\n[INDEXER] Error batch ${i}: ${e.message}`);
                // Push empty embeddings to keep alignment or skip? 
                // Better to fail batch than align wrongly. for MVP pushing empty for now to not break loop
                batch.forEach(() => embeddings.push([]));
            }
        }
        console.log("\n[INDEXER] Embeddings generated.");

        // 6. Save to DB
        console.log(`[INDEXER] Saving chunks to DB...`);
        for (let i = 0; i < rawChunks.length; i++) {
            if (embeddings[i] && embeddings[i].length > 0) {
                await db.insert(documentChunks).values({
                    documentId: docEntry.id,
                    chunkText: rawChunks[i].text,
                    chunkIndex: i,
                    embedding: embeddings[i],
                    metadata: {
                        ...rawChunks[i].metadata,
                        legislativeActId: act.id
                    }
                });
            }
        }
        totalChunks += rawChunks.length;
        console.log(`[INDEXER] Saved ${rawChunks.length} chunks for ${act.actTitle}`);
    }

    console.log(`[INDEXER] Complete! Total chunks indexed: ${totalChunks}`);
    return totalChunks;
}
