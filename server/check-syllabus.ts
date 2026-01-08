
import 'dotenv/config';
import { db } from "./db";
import { questionTopics } from "@shared/schema";
import { desc, sql } from "drizzle-orm";
import { fileURLToPath } from "url";

async function checkSyllabus() {
    console.log("🔍 Verifying syllabus topics in database...");

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(questionTopics);
    console.log(`📊 Total topics found: ${countResult[0].count}`);

    const samples = await db.select().from(questionTopics).limit(5);
    console.log("\n📋 Sample topics:");
    samples.forEach(t => {
        console.log(`- [${t.subject}] ${t.topicName}`);
        console.log(`  Context: ${t.description.substring(0, 50)}...`);
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    checkSyllabus()
        .then(() => process.exit(0))
        .catch((e) => { console.error(e); process.exit(1); });
}
