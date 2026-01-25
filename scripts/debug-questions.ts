import 'dotenv/config';
import { db } from '../server/db.js';
import { questions } from '../shared/schema.js';
import { eq, like } from 'drizzle-orm';

async function debugQuestions() {
    console.log('[DEBUG] Fetching sample questions to analyze correctAnswer field...\n');

    // Get first 10 questions
    const sampleQuestions = await db.select({
        id: questions.id,
        questionText: questions.questionText,
        options: questions.options,
        correctAnswer: questions.correctAnswer,
        subject: questions.subject,
    }).from(questions).limit(10);

    for (const q of sampleQuestions) {
        console.log('='.repeat(80));
        console.log('ID:', q.id);
        console.log('Subject:', q.subject);
        console.log('Question:', q.questionText?.substring(0, 80) + '...');
        console.log('correctAnswer RAW VALUE:', q.correctAnswer);
        console.log('correctAnswer TYPE:', typeof q.correctAnswer);
        console.log('Options count:', Array.isArray(q.options) ? q.options.length : 'NOT ARRAY');

        // Show what each option looks like
        if (Array.isArray(q.options)) {
            q.options.forEach((opt: any, idx: number) => {
                const letter = String.fromCharCode(65 + idx);
                const text = typeof opt === 'string' ? opt : opt?.text || JSON.stringify(opt);
                console.log(`  ${letter}: ${text?.substring(0, 60)}...`);
            });
        }
        console.log('');
    }

    process.exit(0);
}

debugQuestions();
