import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../middleware/error-handler";
import { explainWrongAnswer, generateEmbedding, calculateCosineSimilarity, generatePersonalizedStudyPlan } from "../gemini";
import { questions, documentChunks, studyPlans, insertStudyPlanSchema, examEssays } from "../../shared/schema";
import { eq, and, desc, isNotNull } from "drizzle-orm";
import { generateWithSanitizedContext } from "../services/clean-room/generator";
import { storage } from "../storage";
import { db } from "../db";
import { GoogleGenAI } from "@google/genai";

const router = Router();


// ===========================================================================
// POST /ai/explain-wrong-answer
// ===========================================================================
router.post("/ai/explain-wrong-answer", asyncHandler(async (req, res) => {
  const { questionId, userAnswerId } = req.body;
  const userId = req.user!.id;

  // Get question details
  const [question] = await db.select().from(questions).where(eq(questions.id, questionId));
  if (!question) {
    throw new AppError(404, "Question not found");
  }

  // Get user answer
  const answers = await storage.getUserAnswers(userId);
  const userAnswer = answers.find(a => a.id === userAnswerId);
  if (!userAnswer) {
    throw new AppError(404, "Answer not found");
  }

  // Extract option texts
  // CRITICAL: DB stores correctAnswer as 1-indexed (1=A, 2=B, 3=C)
  const correctAnswerFromDB = question.correctAnswer as number;
  const correctIndex = correctAnswerFromDB - 1; // Convert to 0-indexed for array
  const correctLetter = String.fromCharCode(64 + correctAnswerFromDB); // 64+1='A'

  const options = question.options as any[];
  const correctOptionText = options[correctIndex]?.text || options[correctIndex] || "";
  const userSelectedText = userAnswer.selectedAnswer !== null
    ? (options[userAnswer.selectedAnswer]?.text || options[userAnswer.selectedAnswer] || "")
    : "";

  const userSelectedLetter = userAnswer.selectedAnswer !== null
    ? String.fromCharCode(65 + userAnswer.selectedAnswer)
    : "?";

  // Generate AI explanation
  const explanation = await explainWrongAnswer({
    questionText: question.questionText,
    correctOptionText,
    correctLetter,
    userSelectedText,
    userSelectedLetter,
    explanation: question.explanation || "Nu exista explicatie detaliata.",
    legalReferences: [],
    subject: question.subject || "Drept"
  });

  res.json({ explanation });
}));

// ===========================================================================
// POST /ai/explain-answer-direct
// ===========================================================================
router.post("/ai/explain-answer-direct", asyncHandler(async (req, res) => {
  const { questionId, selectedAnswer } = req.body; // selectedAnswer is 'A', 'B', etc.

  const [question] = await db.select().from(questions).where(eq(questions.id, questionId));
  if (!question) {
    throw new AppError(404, "Question not found");
  }

  const options = question.options as any[];

  // CRITICAL: DB stores correctAnswer as 1-indexed (1=A, 2=B, 3=C)
  // Convert to 0-indexed for array access
  const correctAnswerFromDB = question.correctAnswer as number;
  const correctIndex = correctAnswerFromDB - 1; // 1->0, 2->1, 3->2
  const correctLetter = String.fromCharCode(64 + correctAnswerFromDB); // 64+1='A', 64+2='B'
  const correctOptionText = options[correctIndex]?.text || options[correctIndex] || "";

  // Convert user's letter to 0-indexed
  const letterToIndex: Record<string, number> = { "A": 0, "B": 1, "C": 2, "D": 3 };
  const selectedIndex = letterToIndex[selectedAnswer?.toUpperCase()];
  const userSelectedText = selectedIndex !== undefined
    ? (options[selectedIndex]?.text || options[selectedIndex] || "Niciun raspuns")
    : "Niciun raspuns";

  console.log(`[AI-EXPLAIN] Q: ${questionId}, correctAnswer DB: ${correctAnswerFromDB}, correctIndex: ${correctIndex}, correctLetter: ${correctLetter}, userSelected: ${selectedAnswer}`);

  // Check if user actually answered correctly
  if (correctIndex === selectedIndex) {
    return res.json({ explanation: "\u2705 **Ai raspuns CORECT!** Bravo! Continua tot asa!" });
  }

  const explanation = await explainWrongAnswer({
    questionText: question.questionText,
    correctOptionText,
    correctLetter,
    userSelectedText: userSelectedText || "Raspuns invalid",
    userSelectedLetter: selectedAnswer,
    explanation: question.explanation || "Nicio explicatie stocata.",
    legalReferences: [],
    subject: question.subject || "General"
  });

  res.json({ explanation });
}));

// ===========================================================================
// POST /ai/grade-essay
// ===========================================================================
router.post("/ai/grade-essay", asyncHandler(async (req, res) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  // Parse request
  const schema = z.object({
    year: z.number(),
    discipline: z.string(),
    answers: z.record(z.string()), // requirementId -> userAnswer
    timeSpent: z.number().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, "Invalid data");
  }

  const { year, discipline, answers, timeSpent } = parsed.data;

  console.log(`[GRADE-ESSAY] Grading ${Object.keys(answers).length} answers for ${year} ${discipline}`);

  // Fetch official requirements/rubrics from DB
  const requirements = await db.select().from(examEssays).where(
    and(eq(examEssays.year, year), eq(examEssays.discipline, discipline))
  );

  if (requirements.length === 0) {
    throw new AppError(404, "No exam data found for grading");
  }

  // Build requirements map for quick lookup
  const reqMap = new Map(requirements.map(r => [r.id, r]));

  // Grade each answered requirement
  const feedback: Array<{
    requirementId: string;
    score: number;
    maxScore: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  }> = [];

  let totalScore = 0;
  let maxScore = 0;
  const bySubject: Record<string, { score: number; max: number }> = {};

  for (const [reqId, userAnswer] of Object.entries(answers)) {
    const requirement = reqMap.get(reqId);
    if (!requirement || !userAnswer.trim()) continue;

    const maxPoints = parseFloat(requirement.points);
    maxScore += maxPoints;

    // Initialize bySubject tracking
    if (!bySubject[requirement.subjectId]) {
      bySubject[requirement.subjectId] = { score: 0, max: 0 };
    }
    bySubject[requirement.subjectId].max += maxPoints;

    // Build AI grading prompt using "Warm Mentor" protocol
    const systemPrompt = `Esti un mentor prietenos si exigent pentru pregatirea examenului INM (Institutul National al Magistraturii).
Te adresezi direct studentului la persoana a 2-a (tu/ti-ai/te), cu un ton cald dar constructiv.

Rolul tau este sa evaluezi raspunsul studentului pentru o cerinta specifica din Proba II (probe scrise).
Notezi obiectiv pe baza baremului oficial si oferi feedback util pentru imbunatatire.

Raspunde STRICT in format JSON:
{
  "score": numar_cu_2_zecimale_intre_0_si_maxim,
  "feedback": "paragraf scurt de evaluare generala (max 50 cuvinte)",
  "strengths": ["punct tare 1", "punct tare 2"],
  "improvements": ["aspect de imbunatatit 1", "aspect 2"]
}`;

    const rubricText = (requirement.rubric as Array<{ criterion: string; points: string }>)
      .map(r => `- ${r.criterion}: ${r.points}p`)
      .join("\n");

    const userPrompt = `Evalueaza raspunsul pentru cerinta ${requirement.requirementId}:

=== CERINTA (${requirement.points} puncte) ===
${requirement.requirementText}

=== BAREM OFICIAL ===
${rubricText}

=== SOLUTIE MODEL ===
${requirement.solution}

=== RASPUNSUL STUDENTULUI ===
${userAnswer}

Punctaj maxim posibil: ${requirement.points}
Noteaza obiectiv pe baza baremului.`;

    try {
      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash-001",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }]
      });

      const rawJson = result.text?.replace(/```json|```/g, "").trim();
      if (rawJson) {
        const gradeResult = JSON.parse(rawJson);
        const earnedScore = Math.min(Math.max(0, gradeResult.score), maxPoints);

        totalScore += earnedScore;
        bySubject[requirement.subjectId].score += earnedScore;

        feedback.push({
          requirementId: requirement.requirementId,
          score: earnedScore,
          maxScore: maxPoints,
          feedback: gradeResult.feedback || "",
          strengths: gradeResult.strengths || [],
          improvements: gradeResult.improvements || []
        });
      }
    } catch (aiError) {
      console.error(`[GRADE-ESSAY] AI grading failed for ${requirement.requirementId}:`, aiError);
      // Fallback: give partial credit
      const partialScore = maxPoints * 0.5;
      totalScore += partialScore;
      bySubject[requirement.subjectId].score += partialScore;

      feedback.push({
        requirementId: requirement.requirementId,
        score: partialScore,
        maxScore: maxPoints,
        feedback: "Evaluare automata indisponibila - punctaj partial acordat.",
        strengths: [],
        improvements: ["Retrimiteti pentru evaluare detaliata"]
      });
    }
  }

  // Calculate overall stats
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passed = percentage >= 50; // 50% minimum for written exams

  // Expression score (0.50 bonus for clarity - simplified calculation)
  const avgAnswerLength = Object.values(answers).reduce((sum, a) => sum + a.length, 0) / Math.max(Object.keys(answers).length, 1);
  const expressionScore = avgAnswerLength > 200 ? 0.45 : avgAnswerLength > 100 ? 0.35 : 0.25;

  console.log(`[GRADE-ESSAY] Grading complete: ${totalScore.toFixed(2)}/${maxScore} (${percentage}%)`);

  res.json({
    totalScore: totalScore + expressionScore,
    maxScore,
    percentage,
    passed,
    bySubject,
    feedback,
    overallFeedback: passed
      ? "Felicitari! Ai demonstrat o intelegere solida a materiei. Continua sa exersezi pentru a-ti perfectiona argumentarea juridica."
      : "Mai ai de lucrat la fundamentarea juridica. Concentreaza-te pe imbunatatirea structurii IRAC si pe citarea precisa a articolelor de lege.",
    expressionScore
  });
}));

// ===========================================================================
// POST /legal-assistant/ask  (RAG Q&A with Clean Room)
// ===========================================================================
router.post("/legal-assistant/ask", asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const { question, topK = 5 } = req.body;

  if (!question || question.trim().length === 0) {
    throw new AppError(400, "Question is required");
  }

  console.log(`[RAG-CLEAN] Question: "${question}"`);

  // 1. Generate embedding for question
  const questionEmbedding = await generateEmbedding(question);

  // 2. Get all chunks with embeddings
  const chunks = await db
    .select()
    .from(documentChunks)
    .where(isNotNull(documentChunks.embedding));

  if (chunks.length === 0) {
    throw new AppError(404, "Baza de date legislativa este goala sau neindexata. Va rugam sa contactati administratorul.");
  }

  // 3. Vector Search (Cosine Similarity)
  const similarities = chunks
    .map(chunk => ({
      ...chunk,
      similarity: calculateCosineSimilarity(
        questionEmbedding,
        chunk.embedding as number[]
      )
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  console.log(`[RAG-CLEAN] Found ${similarities.length} relevant chunks`);

  // 4. Prepare Context for Clean Room
  const sanitizedContext = similarities.map(s => ({
    actName: (s.metadata as any)?.actName || "Act Normativ",
    actNumber: (s.metadata as any)?.actNumber || "",
    rawOfficialText: s.chunkText,
    sourceUrl: "legislatie.just.ro",
    sanitizedAt: new Date(),
    contentHash: "vector-retrieved",
    articleNumber: "" // Can be parsed from text if needed
  }));

  // 5. Generate Answer using Clean Room Generator
  const result = await generateWithSanitizedContext(
    question,
    sanitizedContext,
    'legal_synthesis',
    userId
  );

  if (!result.success || !result.data) {
    throw new AppError(500, result.error || "Failed to generate content");
  }

  // 6. Format response for UI
  const data = result.data as any;

  const answer = `**${data.topic || "Raspuns"}**\n\n${data.summary}\n\n**Concepte relationate:** ${data.related_concepts?.join(", ")}`;

  const citations = similarities.map(s => ({
    chunkId: s.id,
    text: s.chunkText,
    similarity: s.similarity,
    metadata: s.metadata
  }));

  res.json({
    question,
    answer,
    citations,
    chunksRetrieved: topK,
    auditLogId: result.auditLogId,
    cleanRoomData: data
  });
}));

// ===========================================================================
// POST /study-plan/generate
// ===========================================================================
router.post("/study-plan/generate", asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { daysUntilExam, hoursPerDay } = req.body;

  // Validate input
  if (!daysUntilExam || !hoursPerDay) {
    throw new AppError(400, "Missing daysUntilExam or hoursPerDay");
  }

  // Get user progress
  const progress = await storage.getUserProgress(userId);

  // Format progress for AI
  const userProgress = progress.map(p => ({
    subject: p.subject,
    chapter: p.chapter,
    accuracy: p.accuracy || 0,
    totalQuestions: p.totalQuestions || 0
  }));

  // Generate plan with AI
  const generatedPlan = await generatePersonalizedStudyPlan({
    userProgress,
    daysUntilExam: parseInt(daysUntilExam),
    hoursPerDay: parseInt(hoursPerDay),
    examPatterns: [] // Can be enhanced later with exam patterns
  });

  // Save plan to database
  const planData = insertStudyPlanSchema.parse({
    userId,
    daysUntilExam: parseInt(daysUntilExam),
    hoursPerDay: parseInt(hoursPerDay),
    planData: generatedPlan
  });

  const [savedPlan] = await db.insert(studyPlans).values(planData).returning();

  res.json({
    id: savedPlan.id,
    ...generatedPlan
  });
}));

// ===========================================================================
// GET /study-plan/latest
// ===========================================================================
router.get("/study-plan/latest", asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const [latestPlan] = await db
    .select()
    .from(studyPlans)
    .where(eq(studyPlans.userId, userId))
    .orderBy(desc(studyPlans.generatedAt))
    .limit(1);

  if (!latestPlan) {
    throw new AppError(404, "No study plan found");
  }

  res.json({
    id: latestPlan.id,
    daysUntilExam: latestPlan.daysUntilExam,
    hoursPerDay: latestPlan.hoursPerDay,
    generatedAt: latestPlan.generatedAt,
    ...(latestPlan.planData as Record<string, unknown>)
  });
}));

export default router;
