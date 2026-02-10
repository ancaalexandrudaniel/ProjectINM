import { db } from "../db";
import { storage } from "../storage";
import { createSrsCard } from "../srs";
import {
  questions,
  syllabusTopicMappings,
  userSyllabusProgress,
  insertQuizSessionSchema,
  insertUserAnswerSchema,
} from "../../shared/schema";
import { eq, and, inArray } from "drizzle-orm";

/**
 * Submit a quiz answer with SRS + syllabus progress side-effects.
 */
export async function submitAnswer(
  userId: string,
  body: Record<string, unknown>
) {
  const answerData = insertUserAnswerSchema.parse({
    ...body,
    userId: userId,
  });

  const answer = await storage.createUserAnswer(answerData);

  // Update user progress — direct lookup instead of loading all questions
  const [question] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, answerData.questionId))
    .limit(1);

  if (question) {
    const existingProgress = await storage.getSubjectProgress(
      userId,
      question.subject
    );
    const chapterProgress = existingProgress.find(
      (p) => p.chapter === question.chapter
    );

    if (chapterProgress) {
      const newTotal = (chapterProgress.totalQuestions || 0) + 1;
      const newCorrect =
        (chapterProgress.correctAnswers || 0) + (answerData.isCorrect ? 1 : 0);
      const newAccuracy = Math.round((newCorrect / newTotal) * 100);

      await storage.updateUserProgress(
        userId,
        question.subject,
        question.chapter,
        {
          totalQuestions: newTotal,
          correctAnswers: newCorrect,
          accuracy: newAccuracy,
          lastPracticed: new Date(),
        }
      );
    } else {
      await storage.updateUserProgress(
        userId,
        question.subject,
        question.chapter,
        {
          totalQuestions: 1,
          correctAnswers: answerData.isCorrect ? 1 : 0,
          accuracy: answerData.isCorrect ? 100 : 0,
          lastPracticed: new Date(),
        }
      );
    }

    // SRS Integration: Create card for wrong answers
    if (!answerData.isCorrect) {
      try {
        await createSrsCard(userId, answerData.questionId);
        console.log(
          `[SRS] Created review card for question ${answerData.questionId}`
        );
      } catch (srsError) {
        console.error("[SRS] Failed to create card:", srsError);
      }
    }

    // Syllabus Progress Integration
    try {
      const allTopics = await db
        .select()
        .from(syllabusTopicMappings)
        .where(eq(syllabusTopicMappings.subject, question.subject));

      const matchingTopics = allTopics.filter((topic) => {
        const patterns = topic.chapterPatterns as string[] | null;
        if (!patterns || patterns.length === 0) return false;
        const chapterLower = question.chapter.toLowerCase();
        return patterns.some((p) => chapterLower.includes(p.toLowerCase()));
      });

      if (matchingTopics.length > 0) {
        const topicIds = matchingTopics.map((t) => t.id);

        const existingProgresses = await db
          .select()
          .from(userSyllabusProgress)
          .where(
            and(
              eq(userSyllabusProgress.userId, userId),
              inArray(userSyllabusProgress.syllabusTopicId, topicIds)
            )
          );

        const progressMap = new Map(
          existingProgresses.map((p) => [p.syllabusTopicId, p])
        );
        const toInsert: (typeof userSyllabusProgress.$inferInsert)[] = [];

        for (const topic of matchingTopics) {
          const existingProg = progressMap.get(topic.id);

          if (existingProg) {
            const newAnswered = (existingProg.questionsAnswered || 0) + 1;
            const newCorrect =
              (existingProg.questionsCorrect || 0) +
              (answerData.isCorrect ? 1 : 0);
            const newProgress = Math.round(
              (newCorrect / Math.max(newAnswered, 1)) * 100
            );

            await db
              .update(userSyllabusProgress)
              .set({
                questionsAnswered: newAnswered,
                questionsCorrect: newCorrect,
                progressPercent: newProgress,
                updatedAt: new Date(),
              })
              .where(eq(userSyllabusProgress.id, existingProg.id));
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

        if (toInsert.length > 0) {
          await db.insert(userSyllabusProgress).values(toInsert);
        }
      }

      if (matchingTopics.length > 0) {
        console.log(
          `[Syllabus] Updated progress for ${matchingTopics.length} topics`
        );
      }
    } catch (syllabusError) {
      console.error(
        "[Syllabus] Failed to update syllabus progress:",
        syllabusError
      );
    }
  }

  return answer;
}

/**
 * Get wrong answers enriched with question details, optionally filtered.
 */
export async function getWrongAnswersWithDetails(
  userId: string,
  filters?: { subject?: string; chapter?: string }
) {
  const answers = await storage.getUserAnswers(userId);
  const wrongAnswers = answers.filter((a) => !a.isCorrect);

  // Fetch only the questions we need instead of all questions
  const questionIds = Array.from(new Set(wrongAnswers.map((a) => a.questionId)));
  if (questionIds.length === 0) return [];

  const neededQuestions = await db
    .select()
    .from(questions)
    .where(inArray(questions.id, questionIds));

  const questionMap = new Map(neededQuestions.map((q) => [q.id, q]));

  return wrongAnswers
    .map((answer) => {
      const question = questionMap.get(answer.questionId);
      return question ? { ...answer, question } : null;
    })
    .filter((item) => item !== null)
    .filter((item) => {
      if (filters?.subject && item.question.subject !== filters.subject)
        return false;
      if (filters?.chapter && item.question.chapter !== filters.chapter)
        return false;
      return true;
    });
}
