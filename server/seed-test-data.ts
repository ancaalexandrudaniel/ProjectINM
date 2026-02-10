#!/usr/bin/env tsx
// Seed test data for testing weak points and wrong answers functionality
import { db } from "./db";
import { users, questions, quizSessions, userAnswers, userProgress } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function seedTestData() {
  console.log("🧪 Seeding test data for wrong answers functionality...");

  try {
    // Create default user if doesn't exist
    const existingUsers = await db.select().from(users).where(eq(users.username, "test-user")).limit(1);
    
    let userId = "default-user";
    if (existingUsers.length === 0) {
      const [newUser] = await db.insert(users).values({
        username: "test-user",
        password: "test-password",
        fullName: "Test User",
        email: "test@inm-platform.ro"
      }).returning();
      userId = newUser.id;
      console.log(`Created test user: ${userId}`);
    } else {
      userId = existingUsers[0].id;
      console.log(`Using existing user: ${userId}`);
    }

    // Get some questions from different subjects
    const allQuestions = await db.select().from(questions).limit(30);
    
    if (allQuestions.length === 0) {
      console.log("⚠️  No questions found. Run seed scripts first!");
      return;
    }

    console.log(`Found ${allQuestions.length} questions to use for test data`);

    // Create a quiz session
    const [session] = await db.insert(quizSessions).values({
      userId,
      subject: null,
      sessionType: "practice",
      questions: JSON.stringify(allQuestions.slice(0, 20).map(q => q.id)),
      totalQuestions: 20,
      correctAnswers: 8,
      completedAt: new Date(),
      timeSpent: 1200
    }).returning();

    console.log(`Created quiz session: ${session.id}`);

    // Create answers - mix of correct and incorrect
    let wrongCount = 0;
    for (let i = 0; i < 20 && i < allQuestions.length; i++) {
      const question = allQuestions[i];
      const isCorrect = i % 3 !== 0; // Make every 3rd answer wrong
      
      const selectedAnswer = isCorrect
        ? (question.correctAnswer ?? 0)
        : ((question.correctAnswer ?? 0) + 1) % 4; // Wrong answer

      await db.insert(userAnswers).values({
        userId,
        sessionId: session.id,
        questionId: question.id,
        selectedAnswer,
        isCorrect,
        timeToAnswer: 30 + Math.floor(Math.random() * 30)
      });

      if (!isCorrect) wrongCount++;

      // Update progress for this chapter
      const existing = await db.select()
        .from(userProgress)
        .where(and(
          eq(userProgress.userId, userId),
          eq(userProgress.subject, question.subject),
          eq(userProgress.chapter, question.chapter)
        ))
        .limit(1);

      if (existing.length > 0) {
        const current = existing[0];
        const newTotal = (current.totalQuestions || 0) + 1;
        const newCorrect = (current.correctAnswers || 0) + (isCorrect ? 1 : 0);
        const newAccuracy = Math.round((newCorrect / newTotal) * 100);

        await db.update(userProgress)
          .set({
            totalQuestions: newTotal,
            correctAnswers: newCorrect,
            accuracy: newAccuracy,
            lastPracticed: new Date(),
            updatedAt: new Date()
          })
          .where(eq(userProgress.id, current.id));
      } else {
        await db.insert(userProgress).values({
          userId,
          subject: question.subject,
          chapter: question.chapter,
          totalQuestions: 1,
          correctAnswers: isCorrect ? 1 : 0,
          accuracy: isCorrect ? 100 : 0,
          lastPracticed: new Date()
        });
      }
    }

    console.log(`\n✅ Test data created successfully!`);
    console.log(`   - Created 1 quiz session`);
    console.log(`   - Created 20 answers (${wrongCount} wrong, ${20 - wrongCount} correct)`);
    console.log(`   - Updated progress for multiple chapters`);
    
    // Show weak points
    const weakPoints = await db.select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
    
    const weak = weakPoints.filter(p => (p.accuracy ?? 0) < 60);
    console.log(`\n📊 Weak points created: ${weak.length}`);
    weak.forEach(w => {
      console.log(`   - ${w.subject} / ${w.chapter}: ${w.accuracy}% (${w.totalQuestions} questions)`);
    });

  } catch (error) {
    console.error("❌ Error seeding test data:", error);
    throw error;
  }
}

seedTestData()
  .then(() => {
    console.log("\n✨ Test data seed complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
