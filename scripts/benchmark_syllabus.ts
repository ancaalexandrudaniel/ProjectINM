
import 'dotenv/config';
import { db } from "../server/db";
import { users, syllabusTopicMappings, userSyllabusProgress } from "../shared/schema";
import { eq, and, inArray } from "drizzle-orm";

async function run() {
  console.log("Starting benchmark...");

  // 1. Get a user or create one if none exist
  let user = (await db.select().from(users).limit(1))[0];
  if (!user) {
    console.log("No user found, this test requires a user.");
    process.exit(0);
  }
  const userId = user.id;

  // 2. Get some topics
  const topics = await db.select().from(syllabusTopicMappings).limit(20);
  if (topics.length === 0) {
    console.log("No topics found, skipping test");
    process.exit(0);
  }

  const matchingTopics = topics.map(t => ({ id: t.id }));
  const answerData = { isCorrect: true };

  console.log(`Running benchmark with user ${userId} and ${matchingTopics.length} topics`);

  // We wrap in transaction to avoid persisting changes
  await db.transaction(async (tx) => {
    // Measure "Before" (N+1)
    const startBefore = performance.now();
    for (const topic of matchingTopics) {
        const [existingProgress] = await tx.select().from(userSyllabusProgress)
          .where(
            and(
              eq(userSyllabusProgress.userId, userId),
              eq(userSyllabusProgress.syllabusTopicId, topic.id)
            )
          )
          .limit(1);

        if (existingProgress) {
            // Update simulation
             const newAnswered = (existingProgress.questionsAnswered || 0) + 1;
             await tx.update(userSyllabusProgress)
                .set({ questionsAnswered: newAnswered })
                .where(eq(userSyllabusProgress.id, existingProgress.id));
        } else {
             // Insert simulation
              await tx.insert(userSyllabusProgress).values({
                userId,
                syllabusTopicId: topic.id,
                questionsAnswered: 1,
                questionsCorrect: answerData.isCorrect ? 1 : 0,
                articlesRead: 0,
                progressPercent: answerData.isCorrect ? 100 : 0,
              });
        }
    }
    const endBefore = performance.now();
    console.log(`Before (N+1 Selects + Updates/Inserts): ${(endBefore - startBefore).toFixed(2)}ms`);

    // Rollback changes by throwing error or just letting transaction finish?
    // Drizzle transaction commits if no error. I need to rollback manually or use a nested transaction logic if I want to run "After" in same state.
    // Actually, to make "After" fair, I should run it in a separate transaction or rollback this one.
    // Since I can't easily rollback and continue in the same script without throwing, I'll just rely on the fact that I'm measuring.
    // But wait, if I insert rows in "Before", "After" will see them as existing rows, which changes the behavior (Update vs Insert).
    // So I MUST rollback.

    throw new Error("ROLLBACK_BEFORE");
  }).catch(e => {
      if (e.message !== "ROLLBACK_BEFORE") console.error(e);
  });

  await db.transaction(async (tx) => {
     // Measure "After" (Batch)
    const startAfter = performance.now();

    // 1. Batch Select
    const topicIds = matchingTopics.map(t => t.id);
    const existingProgresses = await tx.select().from(userSyllabusProgress)
      .where(
        and(
          eq(userSyllabusProgress.userId, userId),
          inArray(userSyllabusProgress.syllabusTopicId, topicIds)
        )
      );

    const progressMap = new Map(existingProgresses.map(p => [p.syllabusTopicId, p]));
    const toInsert = [];
    const toUpdate = [];

    // 2. Prepare
    for (const topic of matchingTopics) {
        const existingProgress = progressMap.get(topic.id);
        if (existingProgress) {
             const newAnswered = (existingProgress.questionsAnswered || 0) + 1;
             // We can't batch update easily with different values, so we still iterate updates
             toUpdate.push({
                 id: existingProgress.id,
                 questionsAnswered: newAnswered
             });
        } else {
             toInsert.push({
                userId,
                syllabusTopicId: topic.id,
                questionsAnswered: 1,
                questionsCorrect: answerData.isCorrect ? 1 : 0,
                articlesRead: 0,
                progressPercent: answerData.isCorrect ? 100 : 0,
             });
        }
    }

    // 3. Batch Insert
    if (toInsert.length > 0) {
        await tx.insert(userSyllabusProgress).values(toInsert);
    }

    // 4. Individual Updates (Still N in worst case, but saved N selects)
    for (const update of toUpdate) {
        await tx.update(userSyllabusProgress)
            .set({ questionsAnswered: update.questionsAnswered })
            .where(eq(userSyllabusProgress.id, update.id));
    }

    const endAfter = performance.now();
    console.log(`After (Batch Select + Batch Insert + Updates): ${(endAfter - startAfter).toFixed(2)}ms`);

    throw new Error("ROLLBACK_AFTER");
  }).catch(e => {
      if (e.message !== "ROLLBACK_AFTER") console.error(e);
  });

  process.exit(0);
}

run();
