import { db } from '../db';
import { questions } from '../../shared/schema';
import { like } from 'drizzle-orm';

async function deleteExam2024Questions() {
    console.log('[CLEANUP] Deleting Exam 2024 questions...');

    const result = await db
        .delete(questions)
        .where(like(questions.chapter, '%Examen 2024%'))
        .returning({ id: questions.id });

    console.log(`[CLEANUP] Deleted ${result.length} questions from Examen 2024`);
    process.exit(0);
}

deleteExam2024Questions().catch(err => {
    console.error('[CLEANUP] Error:', err);
    process.exit(1);
});
