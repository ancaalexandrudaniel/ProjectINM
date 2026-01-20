/**
 * Syllabus Topic Seeder - Parses syllabus.json and populates syllabus_topic_mappings table
 * 
 * Usage: npx tsx server/seed-syllabus-topics.ts
 */

import 'dotenv/config';
import { db } from "./db";
import { syllabusTopicMappings } from "../shared/schema";
import fs from "fs";
import path from "path";


interface SyllabusNode {
    id: string;
    title: string;
    children?: SyllabusNode[];
}

// Map disc ID prefixes to subjects
function getSubjectFromId(id: string): string {
    if (id.startsWith("disc-0")) return "civil";
    if (id.startsWith("disc-1")) return "civil-procedural";
    if (id.startsWith("disc-2")) return "penal";
    if (id.startsWith("disc-3")) return "penal-procedural";
    // Fallback based on title content
    return "civil";
}

// Extract article references from title
function extractArticleRefs(title: string): string[] {
    const refs: string[] = [];

    // Match patterns like "art. 30", "Art. 1166-1170", "art. 21 - 37"
    const artMatches = title.match(/art\.?\s*(\d+)(?:\s*[-–]\s*(\d+))?/gi);
    if (artMatches) {
        artMatches.forEach(match => {
            const cleaned = match.replace(/art\.?\s*/i, "Art. ");
            refs.push(cleaned);
        });
    }

    return refs;
}

// Extract name for chapter pattern matching (for questions)
function extractChapterPattern(title: string): string[] {
    const patterns: string[] = [];

    // Clean up title for pattern matching
    const cleanTitle = title
        .replace(/^\d+\.\s*/, "") // Remove leading numbers "1. "
        .replace(/^[IVX]+\.\s*/, "") // Remove Roman numerals "II. "
        .replace(/^-\s*/, "") // Remove leading dash
        .trim();

    if (cleanTitle.length > 5) {
        patterns.push(cleanTitle.toLowerCase());
    }

    return patterns;
}

// Determine if node is a continuation fragment (should be merged with parent)
function isContinuationNode(id: string): boolean {
    return id.startsWith("cont-");
}

// Determine if node is a leaf/subtopic
function isSubtopic(id: string): boolean {
    return id.startsWith("sub-");
}

async function seedSyllabusTopics() {
    console.log("🌱 Starting syllabus topic seeder...\n");

    // Load syllabus.json from disk
    const syllabusPath = path.join(process.cwd(), "syllabus.json");
    if (!fs.existsSync(syllabusPath)) {
        console.error("❌ syllabus.json not found at project root!");
        process.exit(1);
    }
    const syllabusData: SyllabusNode[] = JSON.parse(fs.readFileSync(syllabusPath, "utf-8"));

    let totalInserted = 0;
    let sortOrder = 0;

    async function processNode(
        node: SyllabusNode,
        parentSyllabusId: string | null = null,
        depth: number = 0,
        inheritedSubject?: string
    ) {
        // Skip continuation nodes (they're just text fragments)
        if (isContinuationNode(node.id)) {
            return;
        }

        const subject = inheritedSubject || getSubjectFromId(node.id);
        const articleRefs = extractArticleRefs(node.title);
        const chapterPatterns = extractChapterPattern(node.title);

        // Parse article range for numeric queries
        let articleRangeStart: number | null = null;
        let articleRangeEnd: number | null = null;

        if (articleRefs.length > 0) {
            const firstRef = articleRefs[0];
            const rangeMatch = firstRef.match(/Art\.\s*(\d+)(?:\s*[-–]\s*(\d+))?/);
            if (rangeMatch) {
                articleRangeStart = parseInt(rangeMatch[1]);
                articleRangeEnd = rangeMatch[2] ? parseInt(rangeMatch[2]) : articleRangeStart;
            }
        }

        // Insert the topic
        try {
            await db.insert(syllabusTopicMappings).values({
                syllabusId: node.id,
                subject,
                topicTitle: node.title,
                parentId: parentSyllabusId,
                depth,
                sortOrder: sortOrder++,
                articleRefs: articleRefs.length > 0 ? articleRefs : null,
                articleRangeStart,
                articleRangeEnd,
                chapterPatterns: chapterPatterns.length > 0 ? chapterPatterns : null,
                lawSources: null, // To be populated later with more specific matching
                totalQuestions: 0,
                totalArticles: 0,
            }).onConflictDoUpdate({
                target: syllabusTopicMappings.syllabusId,
                set: {
                    topicTitle: node.title,
                    parentId: parentSyllabusId,
                    depth,
                    sortOrder: sortOrder - 1,
                    articleRefs: articleRefs.length > 0 ? articleRefs : null,
                    articleRangeStart,
                    articleRangeEnd,
                    chapterPatterns: chapterPatterns.length > 0 ? chapterPatterns : null,
                }
            });

            totalInserted++;

            const indent = "  ".repeat(depth);
            console.log(`${indent}✓ ${node.title.substring(0, 60)}${node.title.length > 60 ? '...' : ''}`);

        } catch (error) {
            console.error(`Error inserting ${node.id}:`, error);
        }

        // Process children
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                await processNode(child, node.id, depth + 1, subject);
            }
        }
    }

    // Process all top-level disciplines
    for (const discipline of syllabusData as SyllabusNode[]) {
        console.log(`\n📚 Processing: ${discipline.title}`);
        await processNode(discipline);
    }

    console.log(`\n✅ Seeding complete! Inserted/updated ${totalInserted} topics.`);

    // Print summary
    const summary = await db.select({
        subject: syllabusTopicMappings.subject,
    }).from(syllabusTopicMappings);

    const counts: Record<string, number> = {};
    summary.forEach(s => {
        counts[s.subject] = (counts[s.subject] || 0) + 1;
    });

    console.log("\n📊 Summary by subject:");
    Object.entries(counts).forEach(([subject, count]) => {
        console.log(`   ${subject}: ${count} topics`);
    });
}

// Run the seeder
seedSyllabusTopics()
    .then(() => {
        console.log("\n🎉 Done!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Seeder failed:", error);
        process.exit(1);
    });
