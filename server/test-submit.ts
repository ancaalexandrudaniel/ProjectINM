
import fetch from 'node-fetch';

async function testSubmit() {
    try {
        // 1. Fetch some question IDs first to simulate real answers
        console.log("Fetching question IDs...");
        const qRes = await fetch('http://localhost:5000/api/questions?limit=5');
        const questions = await qRes.json();

        if (!Array.isArray(questions) || questions.length === 0) {
            console.error("No questions found to test with.");
            return;
        }

        // Create answers object map
        const answers: Record<string, string> = {};
        questions.forEach((q: any) => {
            // Pick correct answer to test scoring
            const correctIndex = q.correctAnswer;
            const letter = ["A", "B", "C", "D"][correctIndex];
            answers[q.id] = letter;
        });

        console.log(`Submitting answers for ${Object.keys(answers).length} questions...`);

        const payload = {
            year: 2024,
            answers,
            timeSpent: 120
        };

        const res = await fetch('http://localhost:5000/api/exam-sessions/submit', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        console.log("Submission Result:", JSON.stringify(result, null, 2));

    } catch (error) {
        console.error("Test Error:", error);
    }
}

testSubmit();
