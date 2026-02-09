import { db } from "../db";
import { storage } from "../storage";
import { gradeCaseStudy } from "../gemini";
import {
  examResults,
  essayPrompts,
  userEssaySubmissions,
  questions,
  syllabusTopicMappings,
  userSyllabusProgress,
  legalArticles,
  examEssays,
} from "../../shared/schema";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";

// ============================================================================
// QUESTIONS ADMIN
// ============================================================================

export async function fixPenalSubjects() {
  const penalQuestions = await db.select().from(questions).where(eq(questions.subject, "penal"));

  if (penalQuestions.length !== 50) {
    return {
      success: false,
      message: `Expected 50 penal questions, found ${penalQuestions.length}. Manual intervention needed.`,
    };
  }

  penalQuestions.sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());

  const procedural = penalQuestions.slice(25, 50);
  const ids = procedural.map((q) => q.id);

  if (ids.length > 0) {
    await db
      .update(questions)
      .set({
        subject: "penal-procedural",
        tags: sql`COALESCE((SELECT array_agg(elem) FROM unnest(${questions.tags}) AS elem WHERE elem NOT LIKE 'subject:%'), ARRAY[]::text[]) || ARRAY['subject:penal-procedural']`,
      })
      .where(inArray(questions.id, ids));
  }

  return { success: true, updated: ids.length, message: `Successfully updated ${ids.length} questions from penal to penal-procedural` };
}

// ============================================================================
// EXAM SESSIONS
// ============================================================================

export async function submitExamSession(
  userId: string,
  data: { year: number; answers: Record<string, string>; timeSpent?: number }
) {
  const { year, answers, timeSpent } = data;

  const allQuestions = await db.select().from(questions);

  let targetQuestions = allQuestions.filter(
    (q) =>
      q.chapter?.includes(`Examen ${year}`) ||
      q.tags?.includes(`year:${year}`) ||
      q.tags?.includes(`Examen ${year}`) ||
      q.tags?.includes(`examen-${year}`)
  );

  const breakdown: Record<string, { correct: number; total: number }> = {
    civil: { correct: 0, total: 0 },
    "civil-procedural": { correct: 0, total: 0 },
    penal: { correct: 0, total: 0 },
    "penal-procedural": { correct: 0, total: 0 },
  };

  let totalScore = 0;

  if (targetQuestions.length === 0) {
    const answerIds = Object.keys(answers);
    if (answerIds.length > 0) {
      targetQuestions = allQuestions.filter((q) => answerIds.includes(q.id));
    }
  }

  const questionsMap = new Map(targetQuestions.map((q) => [q.id, q]));
  const processingSet = [...targetQuestions];

  for (const qId of Object.keys(answers)) {
    let q = questionsMap.get(qId);
    if (!q) {
      const [fetched] = await db.select().from(questions).where(eq(questions.id, qId));
      if (fetched) {
        q = fetched;
        questionsMap.set(qId, q);
        processingSet.push(q);
      }
    }
    if (!q) continue;

    let subjKey = q.subject || "general";
    if (subjKey === "civil-combined") subjKey = "civil";
    if (subjKey === "penal-combined") subjKey = "penal";
    if (subjKey === "procedura-civila") subjKey = "civil-procedural";
    if (subjKey === "procedura-penala") subjKey = "penal-procedural";

    if (!breakdown[subjKey]) breakdown[subjKey] = { correct: 0, total: 0 };

    const userAnswer = answers[qId];
    const correctIndex = q.correctAnswer;
    const correctLetter = correctIndex !== null ? ["A", "B", "C", "D"][correctIndex] : null;

    if (userAnswer === correctLetter) {
      breakdown[subjKey].correct++;
      totalScore++;
    }
  }

  if (processingSet.length > 0) {
    for (const q of processingSet) {
      let s = q.subject;
      if (s === "civil-combined") s = "civil";
      if (s === "penal-combined") s = "penal";
      if (s === "procedura-civila") s = "civil-procedural";
      if (s === "procedura-penala") s = "penal-procedural";
      if (!breakdown[s]) breakdown[s] = { correct: 0, total: 0 };
      breakdown[s].total++;
    }
  }

  const isPassed = totalScore >= 60;

  const [result] = await db
    .insert(examResults)
    .values({
      userId,
      examYear: year,
      examType: "grile-proba-1",
      totalScore,
      isPassed,
      breakdown,
      timeSpent: timeSpent || 0,
    })
    .returning();

  return { success: true, resultId: result.id, score: totalScore, isPassed, breakdown };
}

// ============================================================================
// ESSAYS (PROBE SCRISE)
// ============================================================================

export async function getEssayPrompts(limit = 50) {
  const prompts = await db.select().from(essayPrompts).limit(limit);
  return prompts.map((p) => ({
    id: p.id,
    subject: p.subject,
    examDay: p.examDay,
    title: p.title,
    difficulty: p.difficulty,
    estimatedTime: p.estimatedTime,
    sourceType: p.sourceType,
    createdAt: p.createdAt,
  }));
}

export async function getEssayPromptById(id: string) {
  const [prompt] = await db.select().from(essayPrompts).where(eq(essayPrompts.id, id)).limit(1);
  if (!prompt) return null;
  return {
    id: prompt.id,
    subject: prompt.subject,
    examDay: prompt.examDay,
    title: prompt.title,
    prompt: prompt.prompt,
    gradingRubric: prompt.gradingRubric,
    sampleAnswer: prompt.sampleAnswer,
    commonMistakes: prompt.commonMistakes,
    difficulty: prompt.difficulty,
    estimatedTime: prompt.estimatedTime,
    sourceType: prompt.sourceType,
  };
}

export async function submitEssay(
  userId: string,
  essayPromptId: string,
  data: { userAnswer: string; selfEvaluation?: string; selfScore?: number; timeSpent?: number }
) {
  const [submission] = await db
    .insert(userEssaySubmissions)
    .values({ userId, essayPromptId, ...data })
    .returning();
  return submission;
}

export async function getEssaySubmissionHistory(userId: string) {
  const submissions = await db
    .select({ submission: userEssaySubmissions, prompt: essayPrompts })
    .from(userEssaySubmissions)
    .innerJoin(essayPrompts, eq(userEssaySubmissions.essayPromptId, essayPrompts.id))
    .where(eq(userEssaySubmissions.userId, userId))
    .orderBy(userEssaySubmissions.submittedAt)
    .limit(50);

  return submissions.map(({ submission, prompt }) => ({
    id: submission.id,
    essayTitle: prompt.title,
    subject: prompt.subject,
    selfScore: submission.selfScore,
    aiScore: submission.aiScore,
    timeSpent: submission.timeSpent,
    submittedAt: submission.submittedAt,
  }));
}

export async function aiGradeSubmission(submissionId: string) {
  const [row] = await db
    .select({ submission: userEssaySubmissions, prompt: essayPrompts })
    .from(userEssaySubmissions)
    .innerJoin(essayPrompts, eq(userEssaySubmissions.essayPromptId, essayPrompts.id))
    .where(eq(userEssaySubmissions.id, submissionId))
    .limit(1);

  if (!row) return null;

  if (row.submission.aiScore !== null) {
    return {
      success: true,
      cached: true,
      aiScore: row.submission.aiScore,
      aiFeedback: row.submission.aiFeedback,
      aiRubricAnalysis: row.submission.aiRubricAnalysis,
    };
  }

  const gradeResult = await gradeCaseStudy({
    caseScenario: row.prompt.prompt,
    sampleAnswer:
      row.prompt.sampleAnswer ||
      "Raspuns model nu este disponibil. Evalueaza pe baza criteriilor genrale pentru INM.",
    userAnswer: row.submission.userAnswer,
  });

  const aiScoreNumeric = Math.round(parseFloat(gradeResult.grade) * 10);

  await db
    .update(userEssaySubmissions)
    .set({
      aiScore: aiScoreNumeric,
      aiFeedback: gradeResult.feedback,
      aiRubricAnalysis: gradeResult.evaluation,
    })
    .where(eq(userEssaySubmissions.id, submissionId));

  return {
    success: true,
    cached: false,
    aiScore: aiScoreNumeric,
    aiGrade: gradeResult.grade,
    aiFeedback: gradeResult.feedback,
    evaluation: gradeResult.evaluation,
  };
}

// ============================================================================
// SYLLABUS TOPICS
// ============================================================================

export async function getSyllabusTopics(userId: string, filters?: { subject?: string; parentId?: string }) {
  let topicsQuery = db.select().from(syllabusTopicMappings);

  if (filters?.subject) {
    topicsQuery = topicsQuery.where(eq(syllabusTopicMappings.subject, filters.subject)) as any;
  }

  const topics = await topicsQuery.orderBy(syllabusTopicMappings.sortOrder);

  let userProgressMap: Map<string, number> = new Map();
  try {
    const progressData = await db
      .select()
      .from(userSyllabusProgress)
      .where(eq(userSyllabusProgress.userId, userId));
    progressData.forEach((p) => {
      userProgressMap.set(p.syllabusTopicId, p.progressPercent || 0);
    });
  } catch (_e) {
    // No progress data
  }

  const articleCounts = await db
    .select({ subject: legalArticles.subject, count: sql<number>`count(*)::int` })
    .from(legalArticles)
    .groupBy(legalArticles.subject);

  const articleCountMap: Record<string, number> = {};
  articleCounts.forEach((ac) => {
    articleCountMap[ac.subject] = ac.count;
  });

  const enrichedTopics = topics.map((topic) => ({
    ...topic,
    progressPercent: userProgressMap.get(topic.id) || 0,
    hasArticles: topic.articleRangeStart !== null,
    availableArticles: articleCountMap[topic.subject] || 0,
  }));

  const rootTopics = enrichedTopics.filter(
    (t) => t.parentId === null || filters?.parentId === t.parentId
  );

  return {
    topics: enrichedTopics,
    rootTopics: rootTopics.map((t) => t.syllabusId),
    stats: {
      totalTopics: topics.length,
      bySubject: {
        civil: topics.filter((t) => t.subject === "civil").length,
        "civil-procedural": topics.filter((t) => t.subject === "civil-procedural").length,
        penal: topics.filter((t) => t.subject === "penal").length,
        "penal-procedural": topics.filter((t) => t.subject === "penal-procedural").length,
      },
    },
  };
}

export async function getSyllabusTopicById(syllabusId: string) {
  const [topic] = await db
    .select()
    .from(syllabusTopicMappings)
    .where(eq(syllabusTopicMappings.syllabusId, syllabusId))
    .limit(1);

  if (!topic) return null;

  const children = await db
    .select()
    .from(syllabusTopicMappings)
    .where(eq(syllabusTopicMappings.parentId, syllabusId))
    .orderBy(syllabusTopicMappings.sortOrder);

  const breadcrumb: { id: string; title: string }[] = [];
  let currentParentId = topic.parentId;
  while (currentParentId) {
    const [parent] = await db
      .select()
      .from(syllabusTopicMappings)
      .where(eq(syllabusTopicMappings.syllabusId, currentParentId))
      .limit(1);
    if (parent) {
      breadcrumb.unshift({ id: parent.syllabusId, title: parent.topicTitle });
      currentParentId = parent.parentId;
    } else {
      break;
    }
  }

  return { topic, children, breadcrumb, hasChildren: children.length > 0 };
}

export async function getSyllabusTopicContent(syllabusId: string) {
  const [topic] = await db
    .select()
    .from(syllabusTopicMappings)
    .where(eq(syllabusTopicMappings.syllabusId, syllabusId))
    .limit(1);

  if (!topic) return null;

  let matchingArticles: any[] = [];
  if (topic.articleRangeStart && topic.articleRangeEnd) {
    matchingArticles = await db
      .select()
      .from(legalArticles)
      .where(
        and(
          eq(legalArticles.subject, topic.subject),
          gte(legalArticles.articleNumber, topic.articleRangeStart),
          lte(legalArticles.articleNumber, topic.articleRangeEnd)
        )
      )
      .orderBy(legalArticles.articleNumber)
      .limit(50);
  }

  let matchingQuestions: any[] = [];
  const patterns = topic.chapterPatterns as string[] | null;
  if (patterns && patterns.length > 0) {
    try {
      const allQuestions = await db
        .select()
        .from(questions)
        .where(eq(questions.subject, topic.subject))
        .limit(100);

      matchingQuestions = allQuestions
        .filter((q) => {
          const chapterLower = q.chapter.toLowerCase();
          return patterns.some((p) => chapterLower.includes(p.toLowerCase()));
        })
        .slice(0, 20);
    } catch (_e) {
      // No matching questions
    }
  }

  return {
    topic: {
      id: topic.id,
      syllabusId: topic.syllabusId,
      title: topic.topicTitle,
      subject: topic.subject,
      articleRefs: topic.articleRefs,
    },
    content: {
      articles: matchingArticles.map((a) => ({
        id: a.id,
        articleNumber: a.articleNumber,
        title: a.title,
        segments: a.segments,
        lawSource: a.lawSource,
      })),
      articlesCount: matchingArticles.length,
      questions: matchingQuestions.map((q) => ({
        id: q.id,
        questionText: q.questionText.substring(0, 200) + (q.questionText.length > 200 ? "..." : ""),
        chapter: q.chapter,
        difficulty: q.difficulty,
      })),
      questionsCount: matchingQuestions.length,
    },
    segmentTypes: ["official", "trad", "puncte", "juris", "radar", "logica", "conex"],
  };
}
