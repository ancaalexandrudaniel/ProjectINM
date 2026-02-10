import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../middleware/error-handler";
import { z } from "zod";
import { eq, and, ilike, or, desc, asc, gte, lte, sql, count } from "drizzle-orm";
import {
  questions,
  questionBatches,
  questionTopics,
  caseStudies,
  caseStudyBatches,
  userCaseStudySubmissions,
  legalArticles,
  legalArticleBatches,
  legalArticleChunks,
  examEssays,
} from "../../shared/schema";
import { db } from "../db";
import { chunkText } from "../utils/chunking";
import { batchGenerateEmbeddings, gradeCaseStudy } from "../gemini";
import { processArticleForRAG } from "../utils/process-article-rag";

const router = Router();


// ============================================
// EXAM ESSAYS ROUTES
// ============================================

// POST /exam-essays/import-json - Import exam essays from JSON
router.post("/exam-essays/import-json", asyncHandler(async (req, res) => {
  // Validate input schema
  const subjectSchema = z.object({
    id: z.string(),
    area: z.string(),
    title: z.string(),
    scenario: z.string().nullable().optional(),
    requirements: z.array(z.object({
      id: z.string(),
      text: z.string(),
      points: z.union([z.number(), z.string()]),
      time: z.number().optional(),
      solution: z.string(),
      legalRefs: z.array(z.string()).optional(),
      rubric: z.array(z.object({
        criterion: z.string(),
        points: z.union([z.number(), z.string()])
      }))
    }))
  });

  const importSchema = z.object({
    year: z.number().min(2010).max(2030),
    variant: z.number().default(1),
    discipline: z.enum(["civil-combined", "penal-combined"]),
    subjects: z.array(subjectSchema).min(1),
    totalPoints: z.number().optional(),
    totalTime: z.number().optional()
  });

  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid JSON format",
      details: parsed.error.format()
    });
  }

  const { year, variant, discipline, subjects } = parsed.data;

  console.log(`[EXAM-ESSAYS] Importing ${subjects.length} subjects for ${year} V${variant} ${discipline}`);

  const valuesToInsert = [];
  for (const subject of subjects) {
    for (const requirement of subject.requirements) {
      valuesToInsert.push({
        year,
        variant,
        discipline,
        subjectId: subject.id,
        subjectTitle: subject.title,
        subjectArea: subject.area,
        scenario: subject.scenario || null,
        requirementId: requirement.id,
        requirementText: requirement.text,
        points: String(requirement.points),
        recommendedTime: requirement.time || null,
        solution: requirement.solution,
        legalRefs: requirement.legalRefs || [],
        rubric: requirement.rubric.map(r => ({
          criterion: r.criterion,
          points: String(r.points)
        })),
        sourceType: 'official',
      });
    }
  }

  let inserted: any[] = [];
  if (valuesToInsert.length > 0) {
    inserted = await db.insert(examEssays).values(valuesToInsert).returning();
  }

  console.log(`[EXAM-ESSAYS] Successfully imported ${inserted.length} requirements`);

  res.json({
    success: true,
    imported: inserted.length,
    year,
    variant,
    discipline,
    subjects: subjects.length,
    message: `Imported ${inserted.length} requirements from ${subjects.length} subjects (${year} V${variant})`
  });
}));

// GET /exam-essays - List exam essays by year/discipline
router.get("/exam-essays", asyncHandler(async (req, res) => {
  const year = req.query.year ? parseInt(req.query.year as string) : undefined;
  const discipline = req.query.discipline as string | undefined;

  let results;
  if (year && discipline) {
    results = await db.select().from(examEssays).where(
      and(eq(examEssays.year, year), eq(examEssays.discipline, discipline))
    );
  } else if (year) {
    results = await db.select().from(examEssays).where(eq(examEssays.year, year));
  } else {
    results = await db.select().from(examEssays).limit(100);
  }

  res.json({
    essays: results,
    count: results.length
  });
}));

// DELETE /exam-essays/cleanup - Delete exam essays by year (for re-import)
router.delete("/exam-essays/cleanup", asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year as string);
  const discipline = req.query.discipline as string | undefined;

  if (!year) {
    return res.status(400).json({ error: "Year parameter required" });
  }

  let result;
  if (discipline) {
    result = await db.delete(examEssays).where(
      and(eq(examEssays.year, year), eq(examEssays.discipline, discipline))
    ).returning({ id: examEssays.id });
  } else {
    result = await db.delete(examEssays).where(eq(examEssays.year, year)).returning({ id: examEssays.id });
  }

  console.log(`[EXAM-ESSAYS CLEANUP] Deleted ${result.length} requirements from ${year}`);

  res.json({
    success: true,
    deleted: result.length,
    year,
    discipline,
    message: `Deleted ${result.length} essay requirements from ${year}`
  });
}));

// GET /exam-essays/:year/:discipline - Get structured exam data for Time Machine Proba II
router.get("/exam-essays/:year/:discipline", asyncHandler(async (req, res) => {
  const year = parseInt(req.params.year);
  const discipline = req.params.discipline;

  if (isNaN(year) || !discipline) {
    return res.status(400).json({ error: "Year and discipline are required" });
  }

  console.log(`[EXAM-ESSAYS] Fetching exam data for ${year} ${discipline}`);

  // Fetch all requirements for this year/discipline
  const requirements = await db.select().from(examEssays).where(
    and(eq(examEssays.year, year), eq(examEssays.discipline, discipline))
  );

  if (requirements.length === 0) {
    return res.status(404).json({ error: "No exam data found for this year/discipline" });
  }

  // Group by subjectId to build nested structure
  const subjectsMap = new Map<string, {
    subjectId: string;
    subjectTitle: string;
    subjectArea: string;
    scenario: string | null;
    requirements: Array<{
      id: string;
      requirementId: string;
      requirementText: string;
      points: string;
      recommendedTime: number | null;
      solution: string;
      rubric: Array<{ criterion: string; points: string }>;
    }>;
  }>();

  for (const req of requirements) {
    if (!subjectsMap.has(req.subjectId)) {
      subjectsMap.set(req.subjectId, {
        subjectId: req.subjectId,
        subjectTitle: req.subjectTitle,
        subjectArea: req.subjectArea,
        scenario: req.scenario,
        requirements: []
      });
    }

    subjectsMap.get(req.subjectId)!.requirements.push({
      id: req.id,
      requirementId: req.requirementId,
      requirementText: req.requirementText,
      points: req.points,
      recommendedTime: req.recommendedTime,
      solution: req.solution,
      rubric: req.rubric as Array<{ criterion: string; points: string }>
    });
  }

  // Sort requirements within each subject by requirementId
  for (const subject of Array.from(subjectsMap.values())) {
    subject.requirements.sort((a: any, b: any) => a.requirementId.localeCompare(b.requirementId));
  }

  // Build final structure matching ExamData interface
  const subjects = Array.from(subjectsMap.values());
  const totalPoints = subjects.reduce((sum, s) =>
    sum + s.requirements.reduce((rSum, r) => rSum + parseFloat(r.points), 0), 0
  );

  console.log(`[EXAM-ESSAYS] Returning ${subjects.length} subjects with ${requirements.length} total requirements`);

  res.json({
    year,
    discipline,
    subjects,
    totalPoints
  });
}));

// ============================================
// QUESTION BATCHES & BULK IMPORT ROUTES
// ============================================

// GET /question-batches - Get all question batches
router.get("/question-batches", asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const batches = await db
    .select()
    .from(questionBatches)
    .where(eq(questionBatches.userId, userId))
    .orderBy(desc(questionBatches.uploadedAt));

  res.json(batches);
}));

// POST /questions/bulk-import - Bulk import questions from LLM session
router.post("/questions/bulk-import", asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  // Validate request body - supports both single answer and multiple answers
  const optionSchema = z.union([
    z.string(),
    z.object({ id: z.number(), text: z.string() })
  ]);

  const requestSchema = z.object({
    batchName: z.string().min(1, "Batch name is required"),
    subject: z.string().min(1, "Subject is required"),
    setType: z.enum(['A', 'B', 'C'], { required_error: "Set type is required" }),
    sourceType: z.string().optional().default('llm-session'),
    sourceLLM: z.string().optional().nullable(),
    questionsData: z.array(z.object({
      questionText: z.string().min(1, "Question text is required"),
      options: z.array(optionSchema).min(2, "At least 2 options required"),
      correctAnswer: z.number().nullable().optional(),
      correctAnswers: z.array(z.number()).optional().default([]),
      explanation: z.string().optional().default(''),
      chapter: z.string().optional().default('General'),
      topic: z.string().optional().nullable(),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
      legalReferences: z.array(z.string()).optional().nullable(),
      aiFeedback: z.string().optional().nullable(),
      feedbackDetailed: z.object({
        explicatie_generala: z.string().optional(),
        analiza_variante: z.record(z.any()).optional(),
        retine: z.union([z.string(), z.array(z.string())]).optional(),
        schema_aplicatie_practica: z.string().optional(),
        atentie: z.string().optional(),
        are_exceptii: z.boolean().optional(),
        exceptii: z.any().optional()
      }).optional().nullable()
    })).min(1, "At least 1 question required")
  });

  const parseResult = requestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parseResult.error.errors
    });
  }

  const { batchName, subject, setType, sourceType, sourceLLM, questionsData } = parseResult.data;

  // Validate set type rules for all questions BEFORE creating batch
  const setTypeViolations: Array<{ index: number; message: string }> = [];

  for (let i = 0; i < questionsData.length; i++) {
    const q = questionsData[i];
    // Count correct answers - check both correctAnswer and correctAnswers
    let correctCount = 0;
    if (q.correctAnswer !== null && q.correctAnswer !== undefined) {
      correctCount = 1;
    }
    if (q.correctAnswers && q.correctAnswers.length > 0) {
      // If correctAnswers exists and has entries, use its length
      // This handles cases where both might be set
      correctCount = q.correctAnswers.length;
    }

    let violation = '';
    switch (setType) {
      case 'A':
        if (correctCount !== 1) {
          violation = `Set A necesit\u0103 exact 1 r\u0103spuns corect, g\u0103site: ${correctCount}`;
        }
        break;
      case 'B':
        if (correctCount < 1 || correctCount > 3) {
          violation = `Set B necesit\u0103 1-3 r\u0103spunsuri corecte, g\u0103site: ${correctCount}`;
        }
        break;
      case 'C':
        // Set C: 0-4 correct answers
        if (correctCount > 4) {
          violation = `Set C permite maxim 4 r\u0103spunsuri corecte, g\u0103site: ${correctCount}`;
        }
        break;
    }

    if (violation) {
      setTypeViolations.push({ index: i, message: violation });
    }
  }

  if (setTypeViolations.length > 0) {
    return res.status(400).json({
      error: "Set type validation failed",
      message: `${setTypeViolations.length} \u00eentreb\u0103ri nu respect\u0103 regulile ${setType === 'A' ? 'Set A' : setType === 'B' ? 'Set B' : 'Set C'}`,
      violations: setTypeViolations.slice(0, 10)
    });
  }

  // Insert questions with validation errors tracking
  const insertedQuestions: any[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  // Optimization: Prepare all questions for batch insert first
  const preparedQuestions: any[] = [];
  const originalIndices: number[] = [];

  // Prepare question data (no batch ID yet — assigned inside transaction)
  for (let i = 0; i < questionsData.length; i++) {
    const q = questionsData[i];
    try {
      const normalizedOptions = q.options.map((opt, idx) => {
        if (typeof opt === 'string') {
          return { id: idx, text: opt };
        }
        return opt;
      });

      let finalCorrectAnswer: number | null = null;
      let finalCorrectAnswersMultiple: number[] | null = null;

      if (q.correctAnswer !== null && q.correctAnswer !== undefined) {
        finalCorrectAnswer = q.correctAnswer;
      } else if (q.correctAnswers && q.correctAnswers.length === 1) {
        finalCorrectAnswer = q.correctAnswers[0];
      } else if (q.correctAnswers && q.correctAnswers.length > 1) {
        finalCorrectAnswersMultiple = q.correctAnswers;
      } else if (q.correctAnswers && q.correctAnswers.length === 0) {
        finalCorrectAnswersMultiple = [];
      }

      preparedQuestions.push({
        subject,
        chapter: q.chapter,
        topic: q.topic,
        difficulty: q.difficulty,
        setType,
        questionText: q.questionText,
        options: normalizedOptions,
        correctAnswer: finalCorrectAnswer,
        correctAnswersMultiple: finalCorrectAnswersMultiple,
        explanation: q.explanation,
        legalReferences: q.legalReferences,
        aiFeedback: q.aiFeedback,
        feedbackDetailed: q.feedbackDetailed || null,
        sourceType,
        sourceLLM: sourceLLM || null,
        batchId: "" // placeholder — set inside transaction
      });
      originalIndices.push(i);
    } catch (prepErr: any) {
      console.warn(`Failed to prepare question ${i}:`, prepErr.message);
      errors.push({ index: i, error: prepErr.message });
    }
  }

  // Wrap batch creation + question insert in a transaction
  const batch = await db.transaction(async (tx) => {
    const [batch] = await tx.insert(questionBatches).values({
      userId,
      batchName,
      subject,
      sourceType,
      sourceLLM: sourceLLM || null,
      questionsCount: questionsData.length
    }).returning();

    // Assign batchId to all prepared questions
    for (const q of preparedQuestions) {
      q.batchId = batch.id;
    }

    // Attempt Batch Insert
    let batchSuccess = false;
    if (preparedQuestions.length > 0) {
      try {
        console.log(`[BULK IMPORT] Attempting batch insert of ${preparedQuestions.length} questions...`);
        const result = await tx.insert(questions).values(preparedQuestions).returning();
        insertedQuestions.push(...result);
        batchSuccess = true;
        console.log(`[BULK IMPORT] Batch insert successful!`);
      } catch (batchErr: any) {
        console.warn(`[BULK IMPORT] Batch insert failed, falling back to sequential: ${batchErr.message}`);
      }
    }

    // Fallback: Sequential Insert if batch failed
    if (!batchSuccess && preparedQuestions.length > 0) {
      for (let j = 0; j < preparedQuestions.length; j++) {
        const qData = preparedQuestions[j];
        const originalIdx = originalIndices[j];
        try {
          const [inserted] = await tx.insert(questions).values(qData).returning();
          insertedQuestions.push(inserted);
        } catch (qErr: any) {
          console.warn(`Failed to insert question ${originalIdx} (sequential fallback):`, qErr.message);
          errors.push({ index: originalIdx, error: qErr.message });
        }
      }
    }

    return batch;
  });

  res.json({
    batch,
    importedCount: insertedQuestions.length,
    totalProvided: questionsData.length,
    errors: errors.length > 0 ? errors : undefined
  });
}));

// POST /questions/bulk-import-session - Bulk import with rich feedback format
router.post("/questions/bulk-import-session", asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  // Schema for the rich session format
  const variantSchema = z.object({
    litera: z.string(),
    text: z.string(),
    este_corecta: z.boolean()
  });

  const feedbackSchema = z.object({
    verdict: z.string().optional(),
    explicatie_generala: z.string().optional(),
    are_exceptii: z.boolean().optional(),
    exceptii: z.any().optional(),
    analiza_variante: z.record(z.any()).optional(),
    retine: z.union([z.string(), z.array(z.string())]).optional(),
    schema_aplicatie_practica: z.string().optional(),
    atentie: z.string().optional()
  }).passthrough();

  const intrebareSchema = z.object({
    id: z.number().optional(),
    tip_set: z.string().optional(),
    tulpina: z.string(),
    variante: z.array(variantSchema).min(2),
    raspuns_utilizator: z.string().optional(),
    este_corect: z.boolean().optional(),
    feedback: feedbackSchema.optional(),
    concepte_cheie: z.array(z.string()).optional(),
    articole_relevante: z.array(z.string()).optional(),
    dificultate: z.string().optional(),
    tags: z.array(z.string()).optional()
  });

  const sessionSchema = z.object({
    session_metadata: z.object({
      segment_articole: z.string().optional(),
      data_referinta: z.string().optional(),
      set_type: z.string().optional(),
      total_intrebari: z.number().optional(),
      scor: z.string().optional(),
      procent: z.string().optional()
    }).optional(),
    intrebari: z.array(intrebareSchema).min(1),
    analiza_finale: z.any().optional(),
    glosar_incremental: z.any().optional(),
    jurnal_erori: z.any().optional()
  });

  const requestSchema = z.object({
    sessionData: sessionSchema,
    subject: z.string().min(1),
    setType: z.enum(['A', 'B', 'C'], { required_error: "Set type is required" }),
    chapter: z.string().optional(),
    sourceLLM: z.string().optional()
  });

  const parseResult = requestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parseResult.error.errors
    });
  }

  const { sessionData, subject, setType, chapter, sourceLLM } = parseResult.data;
  const meta = sessionData.session_metadata;

  // Validate set type rules for all questions BEFORE creating batch
  const setTypeViolations: Array<{ index: number; message: string }> = [];

  for (let i = 0; i < sessionData.intrebari.length; i++) {
    const q = sessionData.intrebari[i];
    const correctCount = q.variante.filter(v => v.este_corecta).length;

    let violation = '';
    switch (setType) {
      case 'A':
        if (correctCount !== 1) {
          violation = `Set A necesit\u0103 exact 1 r\u0103spuns corect, g\u0103site: ${correctCount}`;
        }
        break;
      case 'B':
        if (correctCount < 1 || correctCount > 3) {
          violation = `Set B necesit\u0103 1-3 r\u0103spunsuri corecte, g\u0103site: ${correctCount}`;
        }
        break;
      case 'C':
        // Set C: 0-4 correct answers
        if (correctCount > 4) {
          violation = `Set C permite maxim 4 r\u0103spunsuri corecte, g\u0103site: ${correctCount}`;
        }
        break;
    }

    if (violation) {
      setTypeViolations.push({ index: i, message: violation });
    }
  }

  if (setTypeViolations.length > 0) {
    return res.status(400).json({
      error: "Set type validation failed",
      message: `${setTypeViolations.length} \u00eentreb\u0103ri nu respect\u0103 regulile ${setType === 'A' ? 'Set A' : setType === 'B' ? 'Set B' : 'Set C'}`,
      violations: setTypeViolations.slice(0, 10)
    });
  }

  // Insert questions with rich feedback
  const insertedQuestions: any[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  // Phase 1: Prepare all questions for insertion (no batchId yet)
  const preparedData: Array<{ index: number, value: any }> = [];

  for (let i = 0; i < sessionData.intrebari.length; i++) {
    const q = sessionData.intrebari[i];
    try {
      const options = q.variante.map((v, idx) => ({
        id: idx,
        text: v.text,
        litera: v.litera
      }));

      const correctIndices = q.variante
        .map((v, idx) => v.este_corecta ? idx : -1)
        .filter(idx => idx !== -1);

      const correctAnswer = correctIndices.length === 1 ? correctIndices[0] : null;
      const correctAnswersMultiple = correctIndices.length !== 1 ? correctIndices : null;

      const feedbackDetailed = q.feedback ? {
        explicatie_generala: q.feedback.explicatie_generala,
        analiza_variante: q.feedback.analiza_variante,
        exceptii: q.feedback.exceptii,
        retine: q.feedback.retine,
        schema_aplicatie_practica: q.feedback.schema_aplicatie_practica,
        atentie: q.feedback.atentie,
        are_exceptii: q.feedback.are_exceptii
      } : null;

      const difficultyMap: Record<string, string> = {
        'usor': 'easy', 'u\u0219or': 'easy', 'easy': 'easy',
        'mediu': 'medium', 'medium': 'medium',
        'greu': 'hard', 'hard': 'hard', 'dificil': 'hard'
      };
      const difficulty = difficultyMap[q.dificultate?.toLowerCase() || 'medium'] || 'medium';

      preparedData.push({
        index: i,
        value: {
          subject,
          chapter: chapter || meta?.segment_articole || 'General',
          topic: meta?.segment_articole,
          difficulty,
          setType,
          questionText: q.tulpina,
          options,
          correctAnswer,
          correctAnswersMultiple,
          explanation: q.feedback?.explicatie_generala || '',
          legalReferences: q.articole_relevante,
          feedbackDetailed,
          keyConcepts: q.concepte_cheie,
          tags: q.tags,
          hasExceptions: q.feedback?.are_exceptii || false,
          sourceType: 'llm-session',
          sourceLLM: sourceLLM || null,
          batchId: "" // placeholder — set inside transaction
        }
      });
    } catch (qErr: any) {
      console.warn(`Failed to process question ${i} for batch:`, qErr.message);
      errors.push({ index: i, error: qErr.message });
    }
  }

  // Wrap batch creation + question insert in a transaction
  const batchName = meta?.segment_articole || `Sesiune ${new Date().toLocaleDateString('ro-RO')}`;

  const batch = await db.transaction(async (tx) => {
    const [batch] = await tx.insert(questionBatches).values({
      userId,
      batchName,
      subject,
      sourceType: 'llm-session',
      sourceLLM: sourceLLM || null,
      questionsCount: sessionData.intrebari.length
    }).returning();

    // Assign batchId to all prepared questions
    for (const item of preparedData) {
      item.value.batchId = batch.id;
    }

    // Phase 2: Batch Insert with Fallback
    if (preparedData.length > 0) {
      try {
        console.log(`[BULK-IMPORT] Attempting batch insert for ${preparedData.length} questions...`);
        const valuesToInsert = preparedData.map(p => p.value);
        const inserted = await tx.insert(questions).values(valuesToInsert).returning();
        insertedQuestions.push(...inserted);
        console.log(`[BULK-IMPORT] Batch insert successful!`);
      } catch (batchErr: any) {
        console.warn(`[BULK-IMPORT] Batch insert failed, falling back to sequential: ${batchErr.message}`);

        for (const item of preparedData) {
          try {
            const [inserted] = await tx.insert(questions).values(item.value).returning();
            insertedQuestions.push(inserted);
          } catch (seqErr: any) {
            console.warn(`[BULK-IMPORT] Sequential insert failed for question index ${item.index}:`, seqErr.message);
            errors.push({ index: item.index, error: seqErr.message });
          }
        }
      }
    }

    return batch;
  });

  res.json({
    batch,
    importedCount: insertedQuestions.length,
    totalProvided: sessionData.intrebari.length,
    sessionMetadata: meta,
    errors: errors.length > 0 ? errors : undefined
  });
}));

// GET /questions/search - Search questions with filters
router.get("/questions/search", asyncHandler(async (req, res) => {
  const { subject, chapter, topic, difficulty, keyword, sourceType, limit: limitStr, page: pageStr, pageSize: pageSizeStr } = req.query;
  const page = Math.max(1, parseInt(pageStr as string) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(pageSizeStr as string) || parseInt(limitStr as string) || 50));
  const offset = (page - 1) * pageSize;

  const conditions = [];

  // Only add condition if value exists and is not 'all'
  if (subject && subject !== 'all' && subject !== '') {
    conditions.push(eq(questions.subject, subject as string));
  }
  if (chapter && chapter !== 'all' && chapter !== '') {
    conditions.push(eq(questions.chapter, chapter as string));
  }
  if (topic && topic !== 'all' && topic !== '') {
    conditions.push(eq(questions.topic, topic as string));
  }
  if (difficulty && difficulty !== 'all' && difficulty !== '') {
    conditions.push(eq(questions.difficulty, difficulty as string));
  }
  if (sourceType && sourceType !== 'all' && sourceType !== '') {
    conditions.push(eq(questions.sourceType, sourceType as string));
  }
  if (keyword && keyword !== '') {
    conditions.push(
      sql`to_tsvector('romanian', ${questions.questionText} || ' ' || ${questions.explanation}) @@ plainto_tsquery('romanian', ${keyword})`
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, results] = await Promise.all([
    db.select({ count: count() }).from(questions).where(whereClause),
    db.select().from(questions).where(whereClause).orderBy(desc(questions.createdAt)).limit(pageSize).offset(offset),
  ]);

  res.json({ data: results, total: totalResult[0]?.count || 0, page, pageSize });
}));

// GET /question-topics - Get question topics (query-param version)
router.get("/question-topics", asyncHandler(async (req, res) => {
  const { subject } = req.query;

  let results;
  if (subject) {
    results = await db.select().from(questionTopics).where(eq(questionTopics.subject, subject as string));
  } else {
    results = await db.select().from(questionTopics);
  }

  res.json(results);
}));

// POST /question-topics - Create question topic
router.post("/question-topics", asyncHandler(async (req, res) => {
  const { subject, topicName, description, articleReferences } = req.body;

  if (!subject || !topicName) {
    return res.status(400).json({ error: "Missing required fields: subject, topicName" });
  }

  const [topic] = await db.insert(questionTopics).values({
    subject,
    topicName,
    description: description || null,
    articleReferences: articleReferences || null
  }).returning();

  res.json(topic);
}));

// GET /questions/filters/:subject - Get unique chapters/topics for a subject (for filters)
router.get("/questions/filters/:subject", asyncHandler(async (req, res) => {
  const { subject } = req.params;

  const chapters = await db
    .selectDistinct({ chapter: questions.chapter })
    .from(questions)
    .where(eq(questions.subject, subject));

  const topics = await db
    .selectDistinct({ topic: questions.topic })
    .from(questions)
    .where(eq(questions.subject, subject));

  res.json({
    chapters: chapters.map(c => c.chapter).filter(Boolean),
    topics: topics.map(t => t.topic).filter(Boolean)
  });
}));

// ============================================
// CASE STUDIES (SPETE) ROUTES
// ============================================

// GET /case-study-batches - Get all case study batches
router.get("/case-study-batches", asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const batches = await db
    .select()
    .from(caseStudyBatches)
    .where(eq(caseStudyBatches.userId, userId))
    .orderBy(desc(caseStudyBatches.uploadedAt));

  res.json(batches);
}));

// POST /case-studies/bulk-import - Bulk import case studies from LLM session
router.post("/case-studies/bulk-import", asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const requestSchema = z.object({
    batchName: z.string().min(1, "Batch name is required"),
    subject: z.string().min(1, "Subject is required"),
    examDay: z.string().optional().nullable(),
    sourceType: z.string().optional().default('llm-session'),
    sourceLLM: z.string().optional().nullable(),
    caseStudiesData: z.array(z.object({
      title: z.string().min(1, "Title is required"),
      scenario: z.string().min(1, "Scenario is required"),
      questions: z.array(z.string()).optional().nullable(),
      referenceArticles: z.array(z.string()).optional().nullable(),
      sampleAnswer: z.string().optional().nullable(),
      modelEvaluation: z.string().optional().nullable(),
      aiFeedback: z.string().optional().nullable(),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
      estimatedTime: z.number().optional().nullable()
    })).min(1, "At least 1 case study required")
  });

  const parseResult = requestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: parseResult.error.errors
    });
  }

  const { batchName, subject, examDay, sourceType, sourceLLM, caseStudiesData } = parseResult.data;

  const insertedCaseStudies: any[] = [];
  const errors: Array<{ index: number; error: string }> = [];

  // Wrap batch creation + case study insert in a transaction
  const batch = await db.transaction(async (tx) => {
    const [batch] = await tx.insert(caseStudyBatches).values({
      userId,
      batchName,
      subject,
      examDay: examDay || null,
      sourceType,
      sourceLLM: sourceLLM || null,
      caseStudiesCount: caseStudiesData.length
    }).returning();

    const caseStudiesDataPrepared = caseStudiesData.map((cs: any) => ({
      userId,
      subject,
      examDay: examDay || null,
      title: cs.title,
      scenario: cs.scenario,
      questions: cs.questions,
      referenceArticles: cs.referenceArticles,
      sampleAnswer: cs.sampleAnswer,
      modelEvaluation: cs.modelEvaluation,
      aiFeedback: cs.aiFeedback,
      sourceType,
      sourceLLM: sourceLLM || null,
      batchId: batch.id,
      difficulty: cs.difficulty,
      estimatedTime: cs.estimatedTime
    }));

    try {
      const inserted = await tx.insert(caseStudies).values(caseStudiesDataPrepared).returning();
      inserted.forEach(i => insertedCaseStudies.push(i));
    } catch (batchError) {
      console.warn("[Bulk Import] Batch insert failed, falling back to sequential insert:", batchError);

      for (let i = 0; i < caseStudiesDataPrepared.length; i++) {
        const csData = caseStudiesDataPrepared[i];
        try {
          const [inserted] = await tx.insert(caseStudies).values(csData).returning();
          insertedCaseStudies.push(inserted);
        } catch (csErr: any) {
          console.warn(`Failed to insert case study ${i}:`, csErr.message);
          errors.push({ index: i, error: csErr.message });
        }
      }
    }

    return batch;
  });

  res.json({
    batch,
    importedCount: insertedCaseStudies.length,
    totalProvided: caseStudiesData.length,
    errors: errors.length > 0 ? errors : undefined
  });
}));

// GET /case-studies/search - Search case studies with filters
router.get("/case-studies/search", asyncHandler(async (req, res) => {
  const { subject, examDay, difficulty, keyword, limit: limitStr, page: pageStr, pageSize: pageSizeStr } = req.query;
  const page = Math.max(1, parseInt(pageStr as string) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(pageSizeStr as string) || parseInt(limitStr as string) || 50));
  const offset = (page - 1) * pageSize;

  const conditions: any[] = [];

  if (subject && subject !== 'all' && subject !== '') {
    conditions.push(eq(caseStudies.subject, subject as string));
  }
  if (examDay && examDay !== 'all' && examDay !== '') {
    conditions.push(eq(caseStudies.examDay, examDay as string));
  }
  if (difficulty && difficulty !== 'all' && difficulty !== '') {
    conditions.push(eq(caseStudies.difficulty, difficulty as string));
  }
  if (keyword && keyword !== '') {
    conditions.push(
      or(
        ilike(caseStudies.title, `%${keyword}%`),
        ilike(caseStudies.scenario, `%${keyword}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalResult, results] = await Promise.all([
    db.select({ count: count() }).from(caseStudies).where(whereClause),
    db.select().from(caseStudies).where(whereClause).orderBy(desc(caseStudies.createdAt)).limit(pageSize).offset(offset),
  ]);

  res.json({ data: results, total: totalResult[0]?.count || 0, page, pageSize });
}));

// GET /case-studies/:id - Get single case study by ID
router.get("/case-studies/:id", asyncHandler(async (req, res) => {
  const [caseStudy] = await db
    .select()
    .from(caseStudies)
    .where(eq(caseStudies.id, req.params.id));

  if (!caseStudy) {
    return res.status(404).json({ error: "Case study not found" });
  }

  res.json(caseStudy);
}));

// POST /case-studies/:id/submit - Submit case study solution for grading
router.post("/case-studies/:id/submit", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const caseStudyId = req.params.id;
  const { userAnswer, timeSpent } = req.body;

  const [caseStudy] = await db.select().from(caseStudies).where(eq(caseStudies.id, caseStudyId));

  if (!caseStudy) {
    return res.status(404).json({ error: "Case study not found" });
  }

  const gradingResult = await gradeCaseStudy({
    caseScenario: caseStudy.scenario,
    sampleAnswer: caseStudy.sampleAnswer || "Indisponibil",
    userAnswer
  });

  const [submission] = await db.insert(userCaseStudySubmissions).values({
    userId,
    caseStudyId,
    userAnswer,
    aiGrade: gradingResult.grade,
    aiFeedback: JSON.stringify(gradingResult.evaluation),
    timeSpent: timeSpent || 0,
    submittedAt: new Date()
  }).returning();

  res.json({
    submission,
    grading: gradingResult
  });
}));

// GET /case-studies/:id/submissions - Get user submissions for a case study
router.get("/case-studies/:id/submissions", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const caseStudyId = req.params.id;

  const submissions = await db
    .select()
    .from(userCaseStudySubmissions)
    .where(
      and(
        eq(userCaseStudySubmissions.userId, userId),
        eq(userCaseStudySubmissions.caseStudyId, caseStudyId)
      )
    )
    .orderBy(desc(userCaseStudySubmissions.submittedAt));

  res.json(submissions);
}));

// ============================================
// LEGAL ARTICLES ROUTES
// ============================================

// POST /legal-articles/bulk-import - Bulk import legal articles from structured JSON
router.post("/legal-articles/bulk-import", asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const {
    batchName,
    subject,
    lawSource,
    sourceLLM,
    articles: articlesData,
    meta
  } = req.body;

  if (!articlesData || !Array.isArray(articlesData) || articlesData.length === 0) {
    return res.status(400).json({ error: "No articles provided" });
  }

  if (!subject) {
    return res.status(400).json({ error: "Subject is required" });
  }

  // Validate articles have required fields before processing
  const validArticles = articlesData.filter((a: any) =>
    a.article && typeof a.article === 'number' && a.title && a.segments && typeof a.segments === 'object'
  );

  if (validArticles.length === 0) {
    return res.status(400).json({ error: "No valid articles found. Each article must have: article (number), title (string), segments (object)" });
  }

  // Extract article range from validated data
  const articleNumbers = validArticles.map((a: any) => a.article);
  const minArticle = Math.min(...articleNumbers);
  const maxArticle = Math.max(...articleNumbers);
  const articleRange = minArticle === maxArticle ? `${minArticle}` : `${minArticle}-${maxArticle}`;

  // Insert validated articles only
  let insertedArticles: any[] = [];
  const errors: { index: number; error: string }[] = [];

  // Wrap batch creation + article insert in a transaction
  const batch = await db.transaction(async (tx) => {
    const [batch] = await tx.insert(legalArticleBatches).values({
      userId,
      batchName: batchName || `${lawSource || 'Articole'} ${articleRange}`,
      subject,
      lawSource: lawSource || meta?.source || null,
      articleRange,
      sourceLLM: sourceLLM || null,
      articlesCount: validArticles.length
    }).returning();

    // Prepare all values for insertion
    const allValues = validArticles.map((art: any) => {
      const rawContent = Object.entries(art.segments || {})
        .map(([key, value]) => `[${key.toUpperCase()}]\n${value}`)
        .join('\n\n');

      return {
        userId,
        articleNumber: art.article,
        title: art.title,
        subject,
        lawSource: lawSource || meta?.source || null,
        segments: art.segments,
        rawContent: art.raw || rawContent,
        batchId: batch.id,
        isProcessedForRag: false
      };
    });

    try {
      insertedArticles = await tx.insert(legalArticles).values(allValues).returning();
    } catch (batchErr) {
      console.warn("Batch insert failed, falling back to sequential insert:", batchErr);

      for (let i = 0; i < validArticles.length; i++) {
        const art = validArticles[i];
        try {
          const [inserted] = await tx.insert(legalArticles).values(allValues[i]).returning();
          insertedArticles.push(inserted);
        } catch (artErr: any) {
          console.warn(`Failed to insert article ${art.article}:`, artErr.message);
          errors.push({ index: i, error: artErr.message });
        }
      }
    }

    return batch;
  });

  res.json({
    batch,
    importedCount: insertedArticles.length,
    totalProvided: articlesData.length,
    articleRange,
    errors: errors.length > 0 ? errors : undefined
  });

  // Auto-trigger RAG processing in background for newly imported articles
  if (insertedArticles.length > 0) {
    setImmediate(async () => {
      console.log(`[RAG-AUTO] Starting background RAG processing for batch ${batch.id} (${insertedArticles.length} articles)...`);
      let processed = 0;
      for (const article of insertedArticles) {
        try {
          const result = await processArticleForRAG(article);
          if (result) processed++;
        } catch (err: any) {
          console.error(`[RAG-AUTO] Failed to process article ${article.id}:`, err.message);
        }
      }
      console.log(`[RAG-AUTO] Background processing complete: ${processed}/${insertedArticles.length} articles indexed`);
    });
  }
}));

// GET /legal-article-batches - Get all legal article batches
router.get("/legal-article-batches", asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const batches = await db
    .select()
    .from(legalArticleBatches)
    .where(eq(legalArticleBatches.userId, userId))
    .orderBy(desc(legalArticleBatches.uploadedAt));

  res.json(batches);
}));

// GET /legal-articles - Get all legal articles with optional filters
router.get("/legal-articles", asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const { subject, lawSource, articleFrom, articleTo, search, batchId } = req.query;

  const conditions: any[] = [eq(legalArticles.userId, userId)];

  if (subject && subject !== 'all') {
    conditions.push(eq(legalArticles.subject, subject as string));
  }
  if (lawSource) {
    conditions.push(eq(legalArticles.lawSource, lawSource as string));
  }
  if (articleFrom) {
    conditions.push(gte(legalArticles.articleNumber, parseInt(articleFrom as string)));
  }
  if (articleTo) {
    conditions.push(lte(legalArticles.articleNumber, parseInt(articleTo as string)));
  }
  if (batchId) {
    conditions.push(eq(legalArticles.batchId, batchId as string));
  }
  if (search) {
    conditions.push(ilike(legalArticles.rawContent, `%${search}%`));
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize as string) || 50));
  const offset = (page - 1) * pageSize;

  const whereClause = and(...conditions);

  const [totalResult, articles] = await Promise.all([
    db.select({ count: count() }).from(legalArticles).where(whereClause),
    db.select().from(legalArticles).where(whereClause).orderBy(asc(legalArticles.articleNumber)).limit(pageSize).offset(offset),
  ]);

  res.json({ data: articles, total: totalResult[0]?.count || 0, page, pageSize });
}));

// GET /legal-articles/stats - Get statistics for legal articles
router.get("/legal-articles/stats", asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const [articlesCount] = await db
    .select({ count: count() })
    .from(legalArticles)
    .where(eq(legalArticles.userId, userId));

  const [batchesCount] = await db
    .select({ count: count() })
    .from(legalArticleBatches)
    .where(eq(legalArticleBatches.userId, userId));

  const [ragProcessed] = await db
    .select({ count: count() })
    .from(legalArticles)
    .where(eq(legalArticles.isProcessedForRag, true));

  res.json({
    totalArticles: articlesCount?.count || 0,
    totalBatches: batchesCount?.count || 0,
    ragProcessedArticles: ragProcessed?.count || 0
  });
}));

// GET /legal-articles/:id - Get single legal article by ID
router.get("/legal-articles/:id", asyncHandler(async (req, res) => {
  const [article] = await db
    .select()
    .from(legalArticles)
    .where(eq(legalArticles.id, req.params.id));

  if (!article) {
    return res.status(404).json({ error: "Legal article not found" });
  }

  res.json(article);
}));

// DELETE /legal-article-batches/:id - Delete legal article batch (and its articles)
router.delete("/legal-article-batches/:id", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const batchId = req.params.id;

  // Delete articles first
  await db.delete(legalArticles).where(eq(legalArticles.batchId, batchId));

  // Delete batch
  await db.delete(legalArticleBatches).where(
    and(
      eq(legalArticleBatches.id, batchId),
      eq(legalArticleBatches.userId, userId)
    )
  );

  res.json({ success: true });
}));

// POST /legal-articles/:id/process-rag - Process single legal article for RAG
router.post("/legal-articles/:id/process-rag", asyncHandler(async (req, res) => {
  const articleId = req.params.id;

  const [article] = await db
    .select()
    .from(legalArticles)
    .where(eq(legalArticles.id, articleId));

  if (!article) {
    return res.status(404).json({ error: "Article not found" });
  }

  const result = await processArticleForRAG(article);

  if (!result) {
    return res.status(400).json({ error: "No text to chunk in article segments" });
  }

  res.json(result);
}));

// POST /legal-articles/batch-process-rag - Batch process all unprocessed articles for RAG
router.post("/legal-articles/batch-process-rag", asyncHandler(async (req, res) => {
  const batchId = req.query.batchId as string | undefined;

  // Find articles that need processing
  const conditions = [eq(legalArticles.isProcessedForRag, false)];
  if (batchId) {
    conditions.push(eq(legalArticles.batchId, batchId));
  }

  const unprocessed = await db
    .select()
    .from(legalArticles)
    .where(and(...conditions));

  if (unprocessed.length === 0) {
    return res.json({ processed: 0, message: "No unprocessed articles found" });
  }

  console.log(`[RAG-BATCH] Processing ${unprocessed.length} articles for RAG...`);

  let processed = 0;
  const errors: Array<{ articleId: string; error: string }> = [];

  for (const article of unprocessed) {
    try {
      const result = await processArticleForRAG(article);
      if (result) {
        processed++;
        console.log(`[RAG-BATCH] Processed article ${article.articleNumber} (${result.chunksCreated} chunks)`);
      }
    } catch (err: any) {
      console.error(`[RAG-BATCH] Failed article ${article.id}:`, err.message);
      errors.push({ articleId: article.id, error: err.message });
    }
  }

  res.json({
    processed,
    total: unprocessed.length,
    errors: errors.length > 0 ? errors : undefined,
    message: `Processed ${processed}/${unprocessed.length} articles for RAG`,
  });
}));

// ============================================
// EXAM PAPERS (SUBIECTE + BAREME) ROUTES
// ============================================

import multer from "multer";
import { parsePDFBuffer, cleanPDFText, detectExamPaperType } from "../services/pdf-parser";
import { like, arrayContains } from "drizzle-orm";

// Configure multer for file uploads (memory storage for PDF processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// DELETE /exam-papers/cleanup - Delete exam questions by year (for re-import)
router.delete("/exam-papers/cleanup", asyncHandler(async (req, res) => {
  const year = req.query.year as string;
  if (!year) {
    throw new AppError(400, "Year parameter required");
  }

  const result = await db
    .delete(questions)
    .where(like(questions.chapter, `%Examen ${year}%`))
    .returning({ id: questions.id });

  console.log(`[EXAM CLEANUP] Deleted ${result.length} questions from year ${year}`);

  res.json({
    success: true,
    deleted: result.length,
    year,
    message: `Deleted ${result.length} questions from Examen ${year}`,
  });
}));

// GET /exam-papers - Get exam papers by year/subject
router.get("/exam-papers", asyncHandler(async (req, res) => {
  const year = req.query.year as string | undefined;
  const conditions: any[] = [eq(questions.sourceType, "exam-past")];

  if (year) {
    conditions.push(arrayContains(questions.tags, [`year:${year}`]));
  }

  const results = await db
    .select()
    .from(questions)
    .where(and(...conditions))
    .limit(100);

  res.json(
    results.map((q) => ({
      id: q.id,
      year:
        ((q.tags as string[]) || [])
          .find((t) => t.startsWith("year:"))
          ?.replace("year:", "") || "unknown",
      subject: q.subject,
      type: "grila",
      content: q.questionText,
      correctAnswer: q.correctAnswer,
      createdAt: q.createdAt,
    }))
  );
}));

// POST /exam-papers/import - Import exam papers from parsed questions
router.post("/exam-papers/import", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { year, subject, type, questions: parsedQuestions } = req.body;

  if (!year || !subject || !parsedQuestions || !Array.isArray(parsedQuestions)) {
    throw new AppError(400, "year, subject, and questions are required");
  }

  console.log(`[EXAM] Importing ${parsedQuestions.length} questions from ${year} ${subject}`);

  if (parsedQuestions.length === 0) {
    return res.json({ success: true, imported: 0, year, subject });
  }

  const valuesToInsert = parsedQuestions.map((q: any) => ({
    subject,
    chapter: `Examen ${year}`,
    topic: `Subiecte ${year}`,
    difficulty: "medium",
    setType: "A",
    questionText: q.questionText,
    options: q.options.map((text: string, idx: number) => ({ text, id: idx })),
    correctAnswer: q.correctAnswer || 0,
    explanation: `Întrebare din examenul INM ${year}. Răspunsul corect conform baremului oficial.`,
    sourceType: "exam-past",
    tags: [`year:${year}`, `source:inm-official`],
  }));

  const inserted = await db.insert(questions).values(valuesToInsert).returning();
  console.log(`[EXAM] Successfully imported ${inserted.length} questions`);

  res.json({ success: true, imported: inserted.length, year, subject });
}));

// POST /exam-papers/import-json - Import exam papers from direct JSON input
router.post("/exam-papers/import-json", asyncHandler(async (req, res) => {
  const importSchema = z.object({
    year: z.number().min(2010).max(2030),
    examType: z.enum(["grile", "spete"]),
    subject: z.enum([
      "civil", "civil-procedural", "penal", "penal-procedural",
      "civil-combined", "penal-combined",
    ]),
    questions: z.array(
      z.object({
        number: z.number().optional(),
        text: z.string().min(5),
        options: z.array(z.string()).min(2).max(4),
        correctAnswer: z.union([z.enum(["A", "B", "C", "D"]), z.number().min(1).max(4)]),
      })
    ).min(1),
  });

  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid JSON format", details: parsed.error.format() });
  }

  const { year, examType, subject, questions: jsonQuestions } = parsed.data;
  console.log(`[EXAM-JSON] Importing ${jsonQuestions.length} questions: ${year} ${examType} ${subject}`);

  let actualSubject = subject;
  if (subject === "civil-combined") actualSubject = "civil";
  if (subject === "penal-combined") actualSubject = "penal";

  const questionsToInsert = jsonQuestions.map((q) => {
    let correctIdx: number;
    if (typeof q.correctAnswer === "string") {
      correctIdx = q.correctAnswer.charCodeAt(0) - "A".charCodeAt(0) + 1;
    } else {
      correctIdx = q.correctAnswer;
    }

    return {
      subject: actualSubject,
      chapter: `Examen ${year} - ${examType === "grile" ? "Grilă" : "Speță"}`,
      topic: `${examType === "grile" ? "Proba I" : "Proba II"} ${year}`,
      difficulty: "medium",
      setType: "A",
      questionText: q.text,
      options: q.options.map((text: string, idx: number) => ({ text, id: idx })),
      correctAnswer: correctIdx,
      explanation: `Întrebare din examenul oficial INM ${year}. Răspunsul corect: ${
        typeof q.correctAnswer === "string"
          ? q.correctAnswer
          : String.fromCharCode(64 + q.correctAnswer)
      }.`,
      sourceType: "exam-past",
      tags: [`year:${year}`, `source:inm-official`, `type:${examType}`, `subject:${subject}`],
    };
  });

  const inserted = await db.insert(questions).values(questionsToInsert).returning();
  console.log(`[EXAM-JSON] Successfully imported ${inserted.length} questions`);

  res.json({
    success: true,
    imported: inserted.length,
    year,
    examType,
    subject,
    message: `Imported ${inserted.length} ${examType} questions for ${subject} (${year})`,
  });
}));

// POST /exam-papers/upload-pdf - Upload and parse PDF exam paper
router.post("/exam-papers/upload-pdf", upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError(400, "No file uploaded");
  }

  console.log(`[PDF UPLOAD] Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

  const parseResult = await parsePDFBuffer(req.file.buffer);
  if (!parseResult.success) {
    return res.status(400).json({ error: "Failed to parse PDF", details: parseResult.error });
  }

  const cleanedText = cleanPDFText(parseResult.text);
  const detectedType = detectExamPaperType(cleanedText);

  console.log(`[PDF UPLOAD] Parsed ${parseResult.numPages} pages, detected:`, detectedType);

  res.json({
    success: true,
    filename: req.file.originalname,
    numPages: parseResult.numPages,
    textLength: cleanedText.length,
    textPreview: cleanedText.substring(0, 1000) + (cleanedText.length > 1000 ? "..." : ""),
    fullText: cleanedText,
    detectedType,
    info: parseResult.info,
  });
}));

export default router;
