
async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock DB latency (e.g., 20ms round trip + processing)
const DB_LATENCY_MS = 20;

const QUESTIONS_COUNT = 500;

// Mock data
const questionsData = Array.from({ length: QUESTIONS_COUNT }).map((_, i) => ({
  id: i,
  text: `Question ${i}`
}));

async function mockInsertOne() {
  await delay(DB_LATENCY_MS);
  return { id: 'uuid', status: 'success' };
}

async function mockInsertBatch(count: number) {
  // Batch insert still takes some time, maybe slightly more than one insert due to payload size
  // but significantly less than N inserts.
  await delay(DB_LATENCY_MS + (count * 0.1)); // tiny overhead per item
  return Array.from({ length: count }).map(() => ({ id: 'uuid', status: 'success' }));
}

async function runSequential() {
  console.log(`[Sequential] Starting import of ${QUESTIONS_COUNT} items...`);
  const start = performance.now();

  for (let i = 0; i < questionsData.length; i++) {
    await mockInsertOne();
  }

  const end = performance.now();
  console.log(`[Sequential] Completed in ${(end - start).toFixed(2)}ms`);
  return end - start;
}

async function runBatch() {
  console.log(`[Batch] Starting import of ${QUESTIONS_COUNT} items...`);
  const start = performance.now();

  try {
    await mockInsertBatch(questionsData.length);
  } catch (e) {
    // Fallback logic simulation would go here, but for happy path benchmark it's not needed
  }

  const end = performance.now();
  console.log(`[Batch] Completed in ${(end - start).toFixed(2)}ms`);
  return end - start;
}

async function main() {
  console.log('--- Benchmark Simulation ---');
  console.log(`Simulated DB Latency: ${DB_LATENCY_MS}ms`);

  const seqTime = await runSequential();
  const batchTime = await runBatch();

  const improvement = ((seqTime - batchTime) / seqTime) * 100;
  console.log(`\nPerformance Improvement: ${improvement.toFixed(2)}%`);
  console.log(`Speedup: ${(seqTime / batchTime).toFixed(2)}x`);
}

main();
