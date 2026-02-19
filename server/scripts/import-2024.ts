/**
 * One-time script to import 2024 INM exam data into the database.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx server/scripts/import-2024.ts
 *
 * Imports:
 *   - 4 grile JSON files (100 questions total) → questions table
 *   - 2 redactare JSON files (24 requirements total) → exam_essays table
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, and, sql } from 'drizzle-orm';
import { questions, examEssays } from '../../shared/schema';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data/exam-imports/2024');

// Connect to DB
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const db = drizzle({ client: pool });

// ─── GRILE IMPORT ────────────────────────────────────────────────────────────

interface GrileQuestion {
  number?: number;
  text: string;
  options: string[];
  correctAnswer: string; // "A" | "B" | "C"
}

interface GrileFile {
  year: number;
  examType: string;
  subject: string;
  questions: GrileQuestion[];
}

async function importGrile() {
  const files = [
    'grile-civil.json',
    'grile-civil-procedural.json',
    'grile-penal.json',
    'grile-penal-procedural.json',
  ];

  let totalImported = 0;

  for (const filename of files) {
    const filepath = path.join(DATA_DIR, filename);
    const data: GrileFile = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const { year, examType, subject } = data;

    // Check for existing questions with same tags
    const existing = await db.select({ count: sql<number>`count(*)` })
      .from(questions)
      .where(
        sql`${questions.tags} @> ARRAY['year:${sql.raw(String(year))}', 'subject:${sql.raw(subject)}', 'type:grile']::text[]`
      );

    const existingCount = Number(existing[0]?.count ?? 0);
    if (existingCount > 0) {
      console.log(`⏭️  Skipping ${filename}: ${existingCount} questions already exist for ${year}/${subject}/grile`);
      continue;
    }

    // Transform to DB format (mirrors import.routes.ts:1458-1495)
    let actualSubject = subject;
    if (subject === 'civil-combined') actualSubject = 'civil';
    if (subject === 'penal-combined') actualSubject = 'penal';

    const questionsToInsert = data.questions.map((q) => {
      const correctIdx = q.correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
      return {
        subject: actualSubject,
        chapter: `Examen ${year} - ${examType === 'grile' ? 'Grilă' : 'Speță'}`,
        topic: `${examType === 'grile' ? 'Proba I' : 'Proba II'} ${year}`,
        difficulty: 'medium',
        setType: 'A',
        questionText: q.text,
        options: q.options.map((text: string, idx: number) => ({ text, id: idx })),
        correctAnswer: correctIdx,
        explanation: `Întrebare din examenul oficial INM ${year}. Răspunsul corect: ${q.correctAnswer}.`,
        sourceType: 'exam-past',
        tags: [`year:${year}`, 'source:inm-official', `type:${examType}`, `subject:${subject}`],
      };
    });

    const inserted = await db.insert(questions).values(questionsToInsert).returning({ id: questions.id });
    console.log(`✅ ${filename}: imported ${inserted.length} questions (${year}/${subject})`);
    totalImported += inserted.length;
  }

  console.log(`\n📊 Grile total: ${totalImported} questions imported`);
  return totalImported;
}

// ─── REDACTARE (ESSAYS) IMPORT ───────────────────────────────────────────────

interface Rubric {
  criterion: string;
  points: number | string;
}

interface Requirement {
  id: string;
  text: string;
  points: number | string;
  time?: number;
  solution: string;
  legalRefs?: string[];
  rubric: Rubric[];
}

interface Subject {
  id: string;
  area: string;
  title: string;
  scenario: string | null;
  requirements: Requirement[];
}

interface EssayFile {
  year: number;
  variant: number;
  discipline: string;
  subjects: Subject[];
}

async function importEssays() {
  const files = [
    'redactare-civil-combined.json',
    'redactare-penal-combined.json',
  ];

  let totalImported = 0;

  for (const filename of files) {
    const filepath = path.join(DATA_DIR, filename);
    const data: EssayFile = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const { year, variant, discipline, subjects } = data;

    // Check for existing essays
    const existing = await db.select({ count: sql<number>`count(*)` })
      .from(examEssays)
      .where(
        and(
          eq(examEssays.year, year),
          eq(examEssays.discipline, discipline),
          eq(examEssays.variant, variant)
        )
      );

    const existingCount = Number(existing[0]?.count ?? 0);
    if (existingCount > 0) {
      console.log(`⏭️  Skipping ${filename}: ${existingCount} requirements already exist for ${year}/V${variant}/${discipline}`);
      continue;
    }

    // Transform to DB format (mirrors import.routes.ts:74-97)
    const valuesToInsert = [];
    for (const subject of subjects) {
      for (const requirement of subject.requirements) {
        valuesToInsert.push({
          year,
          variant,
          discipline,
          subjectId: subject.id,
          subjectTitle: subject.title,
          subjectArea: subject.area,
          scenario: subject.scenario || null,
          requirementId: requirement.id,
          requirementText: requirement.text,
          points: String(requirement.points),
          recommendedTime: requirement.time || null,
          solution: requirement.solution,
          legalRefs: requirement.legalRefs || [],
          rubric: requirement.rubric.map(r => ({
            criterion: r.criterion,
            points: String(r.points)
          })),
          sourceType: 'official',
        });
      }
    }

    if (valuesToInsert.length > 0) {
      const inserted = await db.insert(examEssays).values(valuesToInsert).returning({ id: examEssays.id });
      console.log(`✅ ${filename}: imported ${inserted.length} requirements (${year}/V${variant}/${discipline})`);
      totalImported += inserted.length;
    }
  }

  console.log(`\n📊 Essays total: ${totalImported} requirements imported`);
  return totalImported;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Starting 2024 INM exam data import...\n');
  console.log(`📁 Data directory: ${DATA_DIR}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@')}\n`);

  try {
    const grileCount = await importGrile();
    console.log('');
    const essayCount = await importEssays();

    console.log('\n════════════════════════════════════════');
    console.log(`✅ Import complete: ${grileCount} grile + ${essayCount} essay requirements`);
    console.log('════════════════════════════════════════\n');
  } catch (err) {
    console.error('❌ Import failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
