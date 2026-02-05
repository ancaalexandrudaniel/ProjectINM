
import { db, pool } from "../server/db";
import { questions } from "../shared/schema";
import { eq, inArray, sql } from "drizzle-orm";

async function runBenchmark() {
  console.log("Starting benchmark...");

  // 1. Setup: Create 50 test questions
  console.log("Creating 50 test questions...");
  const testIds: string[] = [];
  const baseTags = ["tag1", "subject:penal", "tag2"];

  for (let i = 0; i < 50; i++) {
    const [q] = await db.insert(questions).values({
      subject: "penal",
      chapter: "Benchmark Test",
      difficulty: "medium",
      setType: "A",
      questionText: `Test Question ${i}`,
      options: [{ text: "A", id: 0 }, { text: "B", id: 1 }],
      correctAnswer: 0,
      explanation: "Test explanation",
      tags: [...baseTags, `unique:${i}`],
      sourceType: "benchmark"
    }).returning({ id: questions.id });
    testIds.push(q.id);
  }

  // Fetch them back to simulate the app logic
  const allQuestions = await db.select().from(questions).where(inArray(questions.id, testIds));
  // Sort by creation (simulate logic in route)
  allQuestions.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());

  const procedural = allQuestions.slice(25, 50); // Second half
  const proceduralIds = procedural.map(q => q.id);

  console.log(`Prepared ${testIds.length} questions. Updating ${procedural.length} of them.`);

  // 2. Measure Baseline (N+1)
  console.log("\n--- Running Baseline (N+1 Updates) ---");
  const startBaseline = performance.now();

  for (const q of procedural) {
    await db.update(questions)
      .set({
        subject: "penal-procedural",
        tags: [...(q.tags || []).filter(t => !t.startsWith('subject:')), 'subject:penal-procedural']
      })
      .where(eq(questions.id, q.id));
  }

  const endBaseline = performance.now();
  const baselineTime = endBaseline - startBaseline;
  console.log(`Baseline time: ${baselineTime.toFixed(2)} ms`);

  // Verify correctness
  const updatedBaseline = await db.select().from(questions).where(inArray(questions.id, proceduralIds));
  const correctBaseline = updatedBaseline.every(q =>
    q.subject === "penal-procedural" &&
    q.tags?.includes("subject:penal-procedural") &&
    !q.tags?.some(t => t.startsWith("subject:penal") && t !== "subject:penal-procedural")
  );
  console.log(`Baseline verification: ${correctBaseline ? "PASSED" : "FAILED"}`);


  // 3. Reset Data
  console.log("\nResetting data...");
  await db.update(questions)
    .set({
      subject: "penal",
      tags: baseTags
    }) // simplified reset
    .where(inArray(questions.id, proceduralIds));

  // Need to restore unique tags for perfect restoration but for benchmark simplified is fine
  // as long as they have 'subject:penal' to be filtered out.
  // Actually, let's restore the tags exactly to be fair.
  for(let i=0; i<procedural.length; i++) {
    const original = procedural[i];
    await db.update(questions)
      .set({ subject: "penal", tags: original.tags })
      .where(eq(questions.id, original.id));
  }

  // 4. Measure Optimized (Single Query)
  console.log("\n--- Running Optimized (Single Query) ---");
  const startOptimized = performance.now();

  if (proceduralIds.length > 0) {
    await db.update(questions)
      .set({
        subject: "penal-procedural",
        tags: sql`
          (
            SELECT array_agg(elem)
            FROM unnest(${questions.tags}) AS elem
            WHERE elem NOT LIKE 'subject:%'
          ) || ARRAY['subject:penal-procedural']
        `
      })
      .where(inArray(questions.id, proceduralIds));
  }

  const endOptimized = performance.now();
  const optimizedTime = endOptimized - startOptimized;
  console.log(`Optimized time: ${optimizedTime.toFixed(2)} ms`);

  // Verify correctness
  const updatedOptimized = await db.select().from(questions).where(inArray(questions.id, proceduralIds));

  // Note: array_agg order is not guaranteed to be same as original but content should be.
  const correctOptimized = updatedOptimized.every(q =>
    q.subject === "penal-procedural" &&
    q.tags?.includes("subject:penal-procedural") &&
    !q.tags?.some(t => t.startsWith("subject:") && t !== "subject:penal-procedural")
  );
  console.log(`Optimized verification: ${correctOptimized ? "PASSED" : "FAILED"}`);

  // Compare
  console.log(`\nImprovement: ${(baselineTime / optimizedTime).toFixed(2)}x faster`);

  // Cleanup
  console.log("\nCleaning up...");
  await db.delete(questions).where(inArray(questions.id, testIds));

  // Close pool
  await pool.end();
}

runBenchmark().catch(console.error);
