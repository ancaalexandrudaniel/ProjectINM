// Unified seed script with all 105 legal questions for INM exam
import { db } from "./db";
import { questions } from "@shared/schema";

async function seedAll() {
  console.log("🌱 Starting unified database seed with all 105 questions...");

  try {
    const existingQuestions = await db.select().from(questions).limit(1);
    
    if (existingQuestions.length > 0) {
      console.log("⚠️  Database already contains questions. Skipping seed.");
      const all = await db.select().from(questions);
      console.log(`Current count: ${all.length} questions`);
      return;
    }

    // Run all seed scripts in sequence
    const { sampleQuestions } = await import('./seed');
    const { additionalQuestions } = await import('./seed-additional');
    const { finalQuestions } = await import('./seed-final');
    
    const allQuestions = [...sampleQuestions, ...additionalQuestions, ...finalQuestions];
    
    const withSetType = allQuestions.map(q => ({ ...q, setType: (q as any).setType || 'A' }));
    await db.insert(questions).values(withSetType as any);

    console.log(`✅ Successfully seeded ${allQuestions.length} questions`);
    
    const totals = await db.select().from(questions);
    const breakdown = {
      civil: totals.filter(q => q.subject === 'civil').length,
      'civil-procedural': totals.filter(q => q.subject === 'civil-procedural').length,
      penal: totals.filter(q => q.subject === 'penal').length,
      'penal-procedural': totals.filter(q => q.subject === 'penal-procedural').length
    };
    
    console.log(`\n📊 FINAL DATABASE:`);
    console.log(`   Total: ${totals.length} questions`);
    console.log(`   - Drept Civil: ${breakdown.civil}`);
    console.log(`   - Drept Procesual Civil: ${breakdown['civil-procedural']}`);
    console.log(`   - Drept Penal: ${breakdown.penal}`);
    console.log(`   - Drept Procesual Penal: ${breakdown['penal-procedural']}`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seedAll()
  .then(() => {
    console.log("\n✨ Unified seed complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
