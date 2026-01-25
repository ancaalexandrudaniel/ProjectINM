import 'dotenv/config';
import { db } from '../server/db.js';
import { questions } from '../shared/schema.js';

async function purgeAllQuestions() {
    console.log('[PURGE] Starting purge of all questions...');
    try {
        const result = await db.delete(questions);
        console.log('[PURGE] ✅ All questions deleted successfully!');
        console.log('[PURGE] Result:', result);
    } catch (error) {
        console.error('[PURGE] ❌ Error:', error);
    }
    process.exit(0);
}

purgeAllQuestions();
