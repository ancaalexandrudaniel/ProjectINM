
import express from 'express';
import { registerRoutes } from '../server/routes';
import { createServer } from 'http';
import { db } from '../server/db';
import { questionBatches, users, questions } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function runBenchmark() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: false, limit: '50mb' }));

  // Mock auth middleware to bypass authentication for the benchmark
  app.use((req, res, next) => {
    // We don't need to actually set req.user because the bulk-import endpoint
    // uses getDefaultUserId() which fetches the first user from DB.
    // However, we should ensure at least one user exists.
    next();
  });

  const server = await registerRoutes(app);

  // Find a free port
  const port = 5001;

  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      console.log(`Benchmark server running on port ${port}`);
      resolve();
    });
  });

  try {
    // Ensure a user exists
    const allUsers = await db.select().from(users).limit(1);
    if (allUsers.length === 0) {
      console.log('Creating a test user...');
      await db.insert(users).values({
        username: 'benchmark_user',
        password: 'password',
        fullName: 'Benchmark User',
        email: 'benchmark@test.com'
      });
    }

    // Prepare payload
    const BATCH_SIZE = 500;
    console.log(`Preparing payload with ${BATCH_SIZE} questions...`);

    const questionsData = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      questionsData.push({
        questionText: `Benchmark Question ${i} - ${Date.now()}`,
        options: [
          { id: 0, text: "Option A" },
          { id: 1, text: "Option B" },
          { id: 2, text: "Option C" }
        ],
        correctAnswer: 0,
        explanation: "Explanation text",
        chapter: "Benchmark Chapter",
        topic: "Benchmark Topic",
        difficulty: "medium",
        legalReferences: [],
        aiFeedback: null,
        feedbackDetailed: null
      });
    }

    const payload = {
      batchName: `Benchmark Batch ${Date.now()}`,
      subject: "civil",
      setType: "A",
      sourceType: "manual",
      questionsData: questionsData
    };

    console.log('Starting benchmark...');
    const startTime = performance.now();

    const response = await fetch(`http://localhost:${port}/api/questions/bulk-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed: ${response.status} ${text}`);
    }

    const result = await response.json();
    console.log(`Benchmark completed in ${duration.toFixed(2)}ms`);
    console.log(`Imported: ${result.importedCount} questions`);

    // Cleanup
    if (result.batch && result.batch.id) {
        console.log('Cleaning up...');
        // Delete questions first
        await db.delete(questions).where(eq(questions.batchId, result.batch.id));
        // Delete batch
        await db.delete(questionBatches).where(eq(questionBatches.id, result.batch.id));
        console.log('Cleanup done.');
    }

  } catch (error) {
    console.error('Benchmark failed:', error);
  } finally {
    server.close();
    process.exit(0);
  }
}

runBenchmark();
