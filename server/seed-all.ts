#!/usr/bin/env tsx
// Master seed script - runs all seeds in sequence for 105 questions
import { execSync } from 'child_process';

console.log("🌱 Starting complete database seed (105 questions)...\n");

try {
  console.log("📚 Step 1/3: Seeding base questions (40)...");
  execSync("npx tsx server/seed.ts", { stdio: 'inherit' });
  
  console.log("\n📚 Step 2/3: Seeding additional questions (55)...");
  execSync("npx tsx server/seed-additional.ts", { stdio: 'inherit' });
  
  console.log("\n📚 Step 3/3: Seeding final questions (10)...");
  execSync("npx tsx server/seed-final.ts", { stdio: 'inherit' });
  
  console.log("\n✅ All 105 questions successfully seeded!");
  console.log("📊 Final breakdown:");
  console.log("   - Drept Civil: 28 questions");
  console.log("   - Drept Procesual Civil: 25 questions");
  console.log("   - Drept Penal: 30 questions");
  console.log("   - Drept Procesual Penal: 22 questions");
  console.log("\n🎉 Database is production-ready!");
  
  process.exit(0);
} catch (error) {
  console.error("❌ Error during seed:", error);
  process.exit(1);
}
