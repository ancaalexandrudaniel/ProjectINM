
import 'dotenv/config'; // Load environment variables from .env
import { db } from "./db";
import { questionTopics } from "@shared/schema";
import fs from "fs";
import path from "path";

// Mapping from syllabus titles to database subject enums
const SUBJECT_MAP: Record<string, string> = {
    "DREPT CIVIL": "civil",
    "DREPT PROCESUAL CIVIL": "civil-procedural",
    "DREPT PENAL": "penal",
    "DREPT PROCESUAL PENAL": "penal-procedural"
};

interface SyllabusNode {
    id: string;
    title: string;
    children?: SyllabusNode[];
}

async function seedSyllabus() {
    console.log("🌱 Starting syllabus seeding...");

    const syllabusPath = path.join(process.cwd(), "syllabus.json");
    if (!fs.existsSync(syllabusPath)) {
        console.error("❌ syllabus.json not found at project root!");
        process.exit(1);
    }

    const syllabusData: SyllabusNode[] = JSON.parse(fs.readFileSync(syllabusPath, "utf-8"));
    let count = 0;

    for (const discipline of syllabusData) {
        const subjectCode = SUBJECT_MAP[discipline.title.trim()];

        if (!subjectCode) {
            console.warn(`⚠️ Unknown discipline title: "${discipline.title}", skipping...`);
            continue;
        }

        console.log(`Processing ${discipline.title} -> ${subjectCode}...`);

        // Helper to traverse and insert
        // We will collect all nodes to insert them. 
        // For now, we flatten the structure. 
        // If you want to preserve hierarchy, we might need a different approach, 
        // but the schema is flat (questionTopics). 
        // We will store the full breadcrumb in 'description' if possible, or just the title.

        const nodesToInsert: { subject: string; topicName: string; description: string }[] = [];

        const traverse = (node: SyllabusNode, parentPath: string[]) => {
            const currentPath = [...parentPath, node.title];

            // We only insert if it's not a root discipline node (which we are iterating over)
            // Actually, standard topics usually correspond to chapters or subchapters.
            // Let's insert everything below the discipline level.

            const isLeaf = !node.children || node.children.length === 0;

            // Construct a description from the path
            // description: "I. Constituția... > art. 30..."
            const description = parentPath.join(" > ");

            nodesToInsert.push({
                subject: subjectCode,
                topicName: node.title,
                description: description || "Main Section"
            });

            if (node.children) {
                for (const child of node.children) {
                    traverse(child, currentPath);
                }
            }
        };

        if (discipline.children) {
            for (const child of discipline.children) {
                traverse(child, []);
            }
        }

        // Batch insert using Drizzle
        // Chunking to avoid parameter limits if necessary, though Drizzle handles some batching.
        // For safety with large arrays, let's insert in chunks of 50.

        const CHUNK_SIZE = 50;
        for (let i = 0; i < nodesToInsert.length; i += CHUNK_SIZE) {
            const chunk = nodesToInsert.slice(i, i + CHUNK_SIZE);
            await db.insert(questionTopics).values(chunk);
            count += chunk.length;
        }
    }

    console.log(`✅ Successfully seeded ${count} topics from syllabus.`);
}


import { fileURLToPath } from "url";

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    seedSyllabus()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("Fatal error seeding syllabus:", error);
            process.exit(1);
        });
}

export { seedSyllabus };
