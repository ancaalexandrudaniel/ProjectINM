import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../middleware/error-handler";
import { eq, and, gte, lte, or, ilike, desc, asc, sql, count, inArray, isNull } from "drizzle-orm";
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
import { z } from "zod";
import { db } from "../db";
import { storage } from "../storage";
import { gradeCaseStudy } from "../gemini";

const router = Router();


// ============================================================================
// QUESTIONS ADMIN UTILITIES
// ============================================================================

// POST /questions/fix-penal-subjects - Fix penal questions by splitting into penal + penal-procedural
router.post("/questions/fix-penal-subjects", asyncHandler(async (req, res) => {
  // Get all penal questions, ordered by creation date
  const penalQuestions = await db.select()
    .from(questions)
    .where(eq(questions.subject, "penal"));

  console.log(`[FIX-PENAL] Found ${penalQuestions.length} penal questions`);

  if (penalQuestions.length !== 50) {
    return res.json({
      success: false,
      message: `Expected 50 penal questions, found ${penalQuestions.length}. Manual intervention needed.`
    });
  }

  // Sort by createdAt to get consistent order
  penalQuestions.sort((a, b) =>
    new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
  );

  // Update the second half (questions 26-50) to penal-procedural
  const procedural = penalQuestions.slice(25, 50);
  let updated = 0;

  const ids = procedural.map(q => q.id);
  if (ids.length > 0) {
    await db.update(questions)
      .set({
        subject: "penal-procedural",
        tags: sql`COALESCE((SELECT array_agg(elem) FROM unnest(${questions.tags}) AS elem WHERE elem NOT LIKE 'subject:%'), ARRAY[]::text[]) || ARRAY['subject:penal-procedural']`
      })
      .where(inArray(questions.id, ids));
    updated = ids.length;
  }

  console.log(`[FIX-PENAL] Updated ${updated} questions to penal-procedural`);

  res.json({
    success: true,
    updated,
    message: `Successfully updated ${updated} questions from penal to penal-procedural`
  });
}));

// ============================================================================
// EXAM SESSION ROUTES
// ============================================================================

// POST /exam-sessions/submit - Grade Proba I and save results
router.post("/exam-sessions/submit", asyncHandler(async (req, res) => {
  // 1. Parse Input
  const schema = z.object({
    year: z.number(),
    answers: z.record(z.string()), // questionId -> answer (A/B/C)
    timeSpent: z.number().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid data", details: parsed.error });
  }

  const { year, answers, timeSpent } = parsed.data;
  const userId = req.user!.id;

  // 2. Fetch Questions (explicitly fetch questions for the exam year)
  const allQuestions = await db.select().from(questions);

  // Filter by tag "Examen {year}" OR matching year mechanism
  let targetQuestions = allQuestions.filter(q =>
    q.chapter?.includes(`Examen ${year}`) ||
    q.tags?.includes(`year:${year}`) ||
    q.tags?.includes(`Examen ${year}`) ||
    q.tags?.includes(`examen-${year}`)
  );

  // 3. Grade
  const breakdown: Record<string, { correct: number; total: number }> = {
    civil: { correct: 0, total: 0 },
    "civil-procedural": { correct: 0, total: 0 },
    penal: { correct: 0, total: 0 },
    "penal-procedural": { correct: 0, total: 0 }
  };

  let totalScore = 0;

  // FALLBACK: If no questions found for year (e.g. they are mock questions),
  // fetch the questions that were answered to at least give a partial score.
  if (targetQuestions.length === 0) {
    console.log(`[SUBMIT] No questions found for year ${year}. Using answered questions as set.`);
    const answerIds = Object.keys(answers);
    if (answerIds.length > 0) {
      targetQuestions = allQuestions.filter(q => answerIds.includes(q.id));
    }
  }

  const questionsMap = new Map(targetQuestions.map(q => [q.id, q]));
  const processingSet = targetQuestions;

  for (const qId of Object.keys(answers)) {
    // If question not in map (maybe answered but not in year set?), try to fetch it
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
    // Normalize
    if (subjKey === 'civil-combined') subjKey = 'civil';
    if (subjKey === 'penal-combined') subjKey = 'penal';
    if (subjKey === 'procedura-civila') subjKey = 'civil-procedural';
    if (subjKey === 'procedura-penala') subjKey = 'penal-procedural';

    // Ensure breakdown init
    if (!breakdown[subjKey]) breakdown[subjKey] = { correct: 0, total: 0 };

    const userAnswer = answers[qId];
    const correctIndex = q.correctAnswer;
    const correctLetter = correctIndex !== null ? ["A", "B", "C", "D"][correctIndex] : null;

    if (userAnswer === correctLetter) {
      breakdown[subjKey].correct++;
      totalScore++;
    }
  }

  // Recalculate Totals based on the Target Set (Standard 100)
  if (processingSet.length > 0) {
    for (const q of processingSet) {
      let s = q.subject;
      // Normalize subject keys to match frontend expectations
      if (s === 'civil-combined') s = 'civil';
      if (s === 'penal-combined') s = 'penal';
      if (s === 'procedura-civila') s = 'civil-procedural';
      if (s === 'procedura-penala') s = 'penal-procedural';

      if (!breakdown[s]) breakdown[s] = { correct: 0, total: 0 };
      breakdown[s].total++;
    }
  }

  // 4. Save
  const isPassed = totalScore >= 60;

  const [result] = await db.insert(examResults).values({
    userId,
    examYear: year,
    examType: "grile-proba-1",
    totalScore,
    isPassed,
    breakdown,
    timeSpent: timeSpent || 0
  }).returning();

  res.json({
    success: true,
    resultId: result.id,
    score: totalScore,
    isPassed,
    breakdown
  });
}));

// ============================================================================
// ESSAY (PROBE SCRISE) ROUTES
// ============================================================================

// GET /essays - List all essay prompts
router.get("/essays", asyncHandler(async (req, res) => {
  const { subject, examDay, limit } = req.query;

  let query = db.select().from(essayPrompts);

  // Note: where clauses would need proper filtering - simplified for now
  const prompts = await query.limit(parseInt(limit as string) || 50);

  res.json({
    prompts: prompts.map(p => ({
      id: p.id,
      subject: p.subject,
      examDay: p.examDay,
      title: p.title,
      difficulty: p.difficulty,
      estimatedTime: p.estimatedTime,
      sourceType: p.sourceType,
      createdAt: p.createdAt,
    })),
    count: prompts.length,
  });
}));

// GET /essays/:id - Get single essay prompt with full content
router.get("/essays/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [prompt] = await db
    .select()
    .from(essayPrompts)
    .where(eq(essayPrompts.id, id))
    .limit(1);

  if (!prompt) {
    return res.status(404).json({ error: "Essay prompt not found" });
  }

  res.json({
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
  });
}));

// POST /essays/:id/submit - Submit essay answer
router.post("/essays/:id/submit", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userAnswer, selfEvaluation, selfScore, timeSpent } = req.body;
  const userId = req.user!.id;

  if (!userAnswer) {
    return res.status(400).json({ error: "userAnswer is required" });
  }

  const [submission] = await db
    .insert(userEssaySubmissions)
    .values({
      userId,
      essayPromptId: id,
      userAnswer,
      selfEvaluation,
      selfScore,
      timeSpent,
    })
    .returning();

  console.log(`[ESSAY] Submission created: ${submission.id}`);

  res.json({
    success: true,
    submissionId: submission.id,
    selfScore,
  });
}));

// GET /essays/submissions/history - Get user's essay submission history
router.get("/essays/submissions/history", asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const submissions = await db
    .select({
      submission: userEssaySubmissions,
      prompt: essayPrompts,
    })
    .from(userEssaySubmissions)
    .innerJoin(essayPrompts, eq(userEssaySubmissions.essayPromptId, essayPrompts.id))
    .where(eq(userEssaySubmissions.userId, userId))
    .orderBy(userEssaySubmissions.submittedAt)
    .limit(50);

  res.json({
    submissions: submissions.map(({ submission, prompt }) => ({
      id: submission.id,
      essayTitle: prompt.title,
      subject: prompt.subject,
      selfScore: submission.selfScore,
      aiScore: submission.aiScore,
      timeSpent: submission.timeSpent,
      submittedAt: submission.submittedAt,
    })),
    count: submissions.length,
  });
}));

// POST /essays/submissions/:submissionId/ai-grade - Get AI grading for a submission
router.post("/essays/submissions/:submissionId/ai-grade", asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  // Get submission with essay prompt
  const [submission] = await db
    .select({
      submission: userEssaySubmissions,
      prompt: essayPrompts,
    })
    .from(userEssaySubmissions)
    .innerJoin(essayPrompts, eq(userEssaySubmissions.essayPromptId, essayPrompts.id))
    .where(eq(userEssaySubmissions.id, submissionId))
    .limit(1);

  if (!submission) {
    return res.status(404).json({ error: "Submission not found" });
  }

  // Check if already graded
  if (submission.submission.aiScore !== null) {
    return res.json({
      success: true,
      cached: true,
      aiScore: submission.submission.aiScore,
      aiFeedback: submission.submission.aiFeedback,
      aiRubricAnalysis: submission.submission.aiRubricAnalysis,
    });
  }

  console.log(`[AI GRADING] Starting AI grading for submission ${submissionId}`);

  // Call Gemini for grading
  const gradeResult = await gradeCaseStudy({
    caseScenario: submission.prompt.prompt,
    sampleAnswer: submission.prompt.sampleAnswer || "Raspuns model nu este disponibil. Evalueaza pe baza criteriilor genrale pentru INM.",
    userAnswer: submission.submission.userAnswer,
  });

  // Convert grade string to number (e.g., "8.50" -> 85)
  const aiScoreNumeric = Math.round(parseFloat(gradeResult.grade) * 10);

  // Update submission with AI grading
  await db
    .update(userEssaySubmissions)
    .set({
      aiScore: aiScoreNumeric,
      aiFeedback: gradeResult.feedback,
      aiRubricAnalysis: gradeResult.evaluation,
    })
    .where(eq(userEssaySubmissions.id, submissionId));

  console.log(`[AI GRADING] Completed: ${gradeResult.grade} for submission ${submissionId}`);

  res.json({
    success: true,
    cached: false,
    aiScore: aiScoreNumeric,
    aiGrade: gradeResult.grade,
    aiFeedback: gradeResult.feedback,
    evaluation: gradeResult.evaluation,
  });
}));

// ============================================================================
// SYLLABUS TOPIC ROUTES
// ============================================================================

// GET /syllabus-topics - Get all syllabus topics with hierarchy and progress
router.get("/syllabus-topics", asyncHandler(async (req, res) => {
  const subject = req.query.subject as string | undefined;
  const parentId = req.query.parentId as string | undefined;

  // Build query
  let topicsQuery = db.select().from(syllabusTopicMappings);

  if (subject) {
    topicsQuery = topicsQuery.where(eq(syllabusTopicMappings.subject, subject)) as any;
  }

  const topics = await topicsQuery.orderBy(syllabusTopicMappings.sortOrder);

  // Get user progress if authenticated (optional)
  let userProgressMap: Map<string, number> = new Map();
  try {
    const userId = req.user!.id;
    const progressData = await db.select().from(userSyllabusProgress)
      .where(eq(userSyllabusProgress.userId, userId));
    progressData.forEach(p => {
      userProgressMap.set(p.syllabusTopicId, p.progressPercent || 0);
    });
  } catch (e) {
    // No user, no progress data
  }

  // Count articles per subject for stats
  const articleCounts = await db
    .select({
      subject: legalArticles.subject,
      count: sql<number>`count(*)::int`
    })
    .from(legalArticles)
    .groupBy(legalArticles.subject);

  const articleCountMap: Record<string, number> = {};
  articleCounts.forEach(ac => {
    articleCountMap[ac.subject] = ac.count;
  });

  // Enrich topics with progress and stats
  const enrichedTopics = topics.map(topic => ({
    ...topic,
    progressPercent: userProgressMap.get(topic.id) || 0,
    hasArticles: (topic.articleRangeStart !== null),
    availableArticles: articleCountMap[topic.subject] || 0,
  }));

  // Build hierarchy for frontend
  const rootTopics = enrichedTopics.filter(t => t.parentId === null || parentId === t.parentId);

  res.json({
    topics: enrichedTopics,
    rootTopics: rootTopics.map(t => t.syllabusId),
    stats: {
      totalTopics: topics.length,
      bySubject: {
        civil: topics.filter(t => t.subject === 'civil').length,
        'civil-procedural': topics.filter(t => t.subject === 'civil-procedural').length,
        penal: topics.filter(t => t.subject === 'penal').length,
        'penal-procedural': topics.filter(t => t.subject === 'penal-procedural').length,
      }
    }
  });
}));

// GET /syllabus-topics/:syllabusId - Get single topic with children
router.get("/syllabus-topics/:syllabusId", asyncHandler(async (req, res) => {
  const { syllabusId } = req.params;

  // Get the topic
  const [topic] = await db.select().from(syllabusTopicMappings)
    .where(eq(syllabusTopicMappings.syllabusId, syllabusId))
    .limit(1);

  if (!topic) {
    return res.status(404).json({ error: "Topic not found" });
  }

  // Get children
  const children = await db.select().from(syllabusTopicMappings)
    .where(eq(syllabusTopicMappings.parentId, syllabusId))
    .orderBy(syllabusTopicMappings.sortOrder);

  // Get parent path (breadcrumb)
  const breadcrumb: { id: string; title: string }[] = [];
  let currentParentId = topic.parentId;
  while (currentParentId) {
    const [parent] = await db.select().from(syllabusTopicMappings)
      .where(eq(syllabusTopicMappings.syllabusId, currentParentId))
      .limit(1);
    if (parent) {
      breadcrumb.unshift({ id: parent.syllabusId, title: parent.topicTitle });
      currentParentId = parent.parentId;
    } else {
      break;
    }
  }

  res.json({
    topic,
    children,
    breadcrumb,
    hasChildren: children.length > 0,
  });
}));

// GET /syllabus-topics/:syllabusId/content - Get legal content for a topic
router.get("/syllabus-topics/:syllabusId/content", asyncHandler(async (req, res) => {
  const { syllabusId } = req.params;

  // Get the topic
  const [topic] = await db.select().from(syllabusTopicMappings)
    .where(eq(syllabusTopicMappings.syllabusId, syllabusId))
    .limit(1);

  if (!topic) {
    return res.status(404).json({ error: "Topic not found" });
  }

  // Find matching legal articles by article range
  let matchingArticles: any[] = [];
  if (topic.articleRangeStart && topic.articleRangeEnd) {
    matchingArticles = await db.select().from(legalArticles)
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

  // Find matching questions by chapter pattern
  let matchingQuestions: any[] = [];
  const patterns = topic.chapterPatterns as string[] | null;
  if (patterns && patterns.length > 0) {
    // Search for questions matching any of the patterns
    try {
      const allQuestions = await db.select().from(questions)
        .where(eq(questions.subject, topic.subject))
        .limit(100);

      matchingQuestions = allQuestions.filter(q => {
        const chapterLower = q.chapter.toLowerCase();
        return patterns.some(p => chapterLower.includes(p.toLowerCase()));
      }).slice(0, 20);
    } catch (e) {
      console.log("[SYLLABUS] No matching questions found");
    }
  }

  res.json({
    topic: {
      id: topic.id,
      syllabusId: topic.syllabusId,
      title: topic.topicTitle,
      subject: topic.subject,
      articleRefs: topic.articleRefs,
    },
    content: {
      articles: matchingArticles.map(a => ({
        id: a.id,
        articleNumber: a.articleNumber,
        title: a.title,
        segments: a.segments, // All 7 segment types
        lawSource: a.lawSource,
      })),
      articlesCount: matchingArticles.length,
      questions: matchingQuestions.map(q => ({
        id: q.id,
        questionText: q.questionText.substring(0, 200) + (q.questionText.length > 200 ? '...' : ''),
        chapter: q.chapter,
        difficulty: q.difficulty,
      })),
      questionsCount: matchingQuestions.length,
    },
    segmentTypes: ['official', 'trad', 'puncte', 'juris', 'radar', 'logica', 'conex'],
  });
}));

export default router;
