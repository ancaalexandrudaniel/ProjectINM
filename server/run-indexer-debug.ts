
import 'dotenv/config';
import { db } from "./db";
import { legislativeActs, documentChunks, uploadedDocuments, users } from "@shared/schema";
import { eq } from "drizzle-orm";
// import { batchGenerateEmbeddings } from "./gemini"; // We will implement local batching to debug

import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function generateEmbeddingLocal(text: string): Promise<number[]> {
    try {
        const result = await ai.models.embedContent({
            model: "gemini-embedding-001",
            contents: text,
            config: { outputDimensionality: 768 }
        });
        return result.embeddings?.[0]?.values || [];
    } catch (e: any) {
        console.error(`[EMBED-FAIL] ${e.message}`);
        return [];
    }
}

async function main() {
    console.log("[INDEXER-DEBUG] Starting...");
    const systemUser = await db.select().from(users).limit(1);
    const userId = systemUser[0]?.id;
    if (!userId) throw new Error("No user found");

    const acts = await db.select().from(legislativeActs).where(eq(legislativeActs.isCurrentVersion, true));
    console.log(`[INDEXER-DEBUG] Found ${acts.length} acts`);

    for (const act of acts) {
        if (!act.fullText) continue;
        console.log(`[INDEXER-DEBUG] Processing: ${act.actTitle}`);

        // Create doc
        let [doc] = await db.select().from(uploadedDocuments).where(eq(uploadedDocuments.fileName, `CLEAN_ROOM_${act.actNumber?.replace('/', '_') || act.id}`)).limit(1);
        if (!doc) {
            [doc] = await db.insert(uploadedDocuments).values({
                userId,
                fileName: `CLEAN_ROOM_${act.actNumber?.replace('/', '_') || act.id}`,
                documentType: 'cod',
                subject: 'Legislatie',
                objectPath: 'virtual',
                extractedText: 'Virtual',
                aiSummary: 'Clean Room'
            }).returning();
        }

        // Chunking
        const rawChunks = [];
        for (let i = 0; i < act.fullText.length; i += 1000) {
            rawChunks.push({
                text: act.fullText.substring(i, i + 1000),
                index: i / 1000
            });
        }
        console.log(`[INDEXER-DEBUG] Created ${rawChunks.length} chunks. Embedding one by one...`);

        // Embedding loop
        for (const chunk of rawChunks) {
            process.stdout.write(`.`);
            const emb = await generateEmbeddingLocal(chunk.text);
            if (emb.length > 0) {
                await db.insert(documentChunks).values({
                    documentId: doc.id,
                    chunkText: chunk.text,
                    chunkIndex: chunk.index,
                    embedding: emb,
                    metadata: { actName: act.actTitle }
                });
            }
        }
        console.log("\n[INDEXER-DEBUG] Act complete.");
    }
    process.exit(0);
}

main();
