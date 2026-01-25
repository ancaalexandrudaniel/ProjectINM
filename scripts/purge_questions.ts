
import { db } from "../server/db";
import { questions } from "../shared/schema";
import { sql } from "drizzle-orm";

async function run() {
    console.log("Starting purge of all questions...");
    try {
        // Delete all records from questions table
        await db.delete(questions);
        console.log("✅ Successfully deleted all questions.");
    } catch (error) {
        console.error("❌ Error purging questions:", error);
    }
    process.exit(0);
}

run();
