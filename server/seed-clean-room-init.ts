
import 'dotenv/config';
import { db } from "./db";
import {
    uploadedDocuments,
    documentChunks,
    questions,
    questionBatches,
    userAnswers,
    aiExplanations,
    userSrsCards,
    cleanRoomAuditLogs
} from "@shared/schema";
import { sql } from "drizzle-orm";

async function main() {
    console.log("[CLEANUP] Starting Clean Room initialization...");

    try {
        // 1. Purge Document Chunks (RAG data from user uploads)
        console.log("[CLEANUP] Deleting document chunks...");
        await db.delete(documentChunks);

        // 2. Purge Uploaded Documents (PDFs)
        console.log("[CLEANUP] Deleting uploaded documents...");
        await db.delete(uploadedDocuments);

        // 3. Purge Dependent Question Data
        console.log("[CLEANUP] Deleting AI explanations...");
        await db.delete(aiExplanations);

        console.log("[CLEANUP] Deleting SRS cards...");
        await db.delete(userSrsCards);

        console.log("[CLEANUP] Deleting user answers...");
        await db.delete(userAnswers);

        // 4. Purge Questions and Batches
        console.log("[CLEANUP] Deleting questions...");
        await db.delete(questions);

        console.log("[CLEANUP] Deleting question batches...");
        await db.delete(questionBatches);

        // Optional: Clear old audit logs if they reference deleted data?
        // User requested "clean room", so let's keep the logs of *previous* actions as history, 
        // OR wipe them to start "Clean". 
        // Given the request "sa nu fie contaminata", standard Clean Room practice is to keep audit trails, 
        // but if the audit trail refs deleted objects it might be messy.
        // For now, I will NOT delete audit logs unless they fail FK constraints (they assume loose coupling usually).
        // Looking at schema: cleanRoomAuditLogs has NO foreign keys to content tables, only userId. Safe to keep.

        console.log("[CLEANUP] Database purged of user-uploaded content.");
    } catch (error) {
        console.error("[CLEANUP] Error during cleanup:", error);
        process.exit(1);
    }

    process.exit(0);
}

main();
