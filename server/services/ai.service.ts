import { db } from "../db";
import { storage } from "../storage";
import {
  questions,
  studyPlans,
  insertStudyPlanSchema,
  examEssays,
} from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  explainWrongAnswer,
  generateEmbedding,
  generatePersonalizedStudyPlan,
} from "../gemini";
import { generateWithSanitizedContext } from "./clean-room/generator";
import { searchSimilarChunks } from "../utils/vector-search";
import { GoogleGenAI } from "@google/genai";

/**
 * Explain a wrong answer by questionId + userAnswerId.
 */
export async function explainWrongAnswerById(
  userId: string,
  questionId: string,
  userAnswerId: string
) {
  const [question] = await db.select().from(questions).where(eq(questions.id, questionId));
  if (!question) throw new Error("Question not found");

  const answers = await storage.getUserAnswers(userId);
  const userAnswer = answers.find((a) => a.id === userAnswerId);
  if (!userAnswer) throw new Error("Answer not found");

  const correctAnswerFromDB = question.correctAnswer as number;
  const correctIndex = correctAnswerFromDB - 1;
  const correctLetter = String.fromCharCode(64 + correctAnswerFromDB);

  const options = question.options as any[];
  const correctOptionText = options[correctIndex]?.text || options[correctIndex] || "";
  const userSelectedText =
    userAnswer.selectedAnswer !== null
      ? options[userAnswer.selectedAnswer]?.text || options[userAnswer.selectedAnswer] || ""
      : "";
  const userSelectedLetter =
    userAnswer.selectedAnswer !== null ? String.fromCharCode(65 + userAnswer.selectedAnswer) : "?";

  const explanation = await explainWrongAnswer({
    questionText: question.questionText,
    correctOptionText,
    correctLetter,
    userSelectedText,
    userSelectedLetter,
    explanation: question.explanation || "Nu exista explicatie detaliata.",
    legalReferences: [],
    subject: question.subject || "Drept",
  });

  return explanation;
}

/**
 * Explain an answer directly (without saving to DB).
 */
export async function explainAnswerDirect(questionId: string, selectedAnswer: string) {
  const [question] = await db.select().from(questions).where(eq(questions.id, questionId));
  if (!question) throw new Error("Question not found");

  const options = question.options as any[];
  const correctAnswerFromDB = question.correctAnswer as number;
  const correctIndex = correctAnswerFromDB - 1;
  const correctLetter = String.fromCharCode(64 + correctAnswerFromDB);
  const correctOptionText = options[correctIndex]?.text || options[correctIndex] || "";

  const letterToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
  const selectedIndex = letterToIndex[selectedAnswer?.toUpperCase()];
  const userSelectedText =
    selectedIndex !== undefined
      ? options[selectedIndex]?.text || options[selectedIndex] || "Niciun raspuns"
      : "Niciun raspuns";

  if (correctIndex === selectedIndex) {
    return "✅ **Ai raspuns CORECT!** Bravo! Continua tot asa!";
  }

  return explainWrongAnswer({
    questionText: question.questionText,
    correctOptionText,
    correctLetter,
    userSelectedText: userSelectedText || "Raspuns invalid",
    userSelectedLetter: selectedAnswer,
    explanation: question.explanation || "Nicio explicatie stocata.",
    legalReferences: [],
    subject: question.subject || "General",
  });
}

/**
 * Grade an essay (Proba II) with AI.
 */
export async function gradeEssay(data: {
  year: number;
  discipline: string;
  answers: Record<string, string>;
  timeSpent?: number;
}) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  const { year, discipline, answers, timeSpent } = data;

  const requirements = await db
    .select()
    .from(examEssays)
    .where(and(eq(examEssays.year, year), eq(examEssays.discipline, discipline)));

  if (requirements.length === 0) throw new Error("No exam data found for grading");

  const reqMap = new Map(requirements.map((r) => [r.id, r]));

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

    if (!bySubject[requirement.subjectId]) {
      bySubject[requirement.subjectId] = { score: 0, max: 0 };
    }
    bySubject[requirement.subjectId].max += maxPoints;

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
      .map((r) => `- ${r.criterion}: ${r.points}p`)
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
        config: { systemInstruction: systemPrompt, responseMimeType: "application/json" },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
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
          improvements: gradeResult.improvements || [],
        });
      }
    } catch (aiError) {
      console.error(`[GRADE-ESSAY] AI grading failed for ${requirement.requirementId}:`, aiError);
      const partialScore = maxPoints * 0.5;
      totalScore += partialScore;
      bySubject[requirement.subjectId].score += partialScore;

      feedback.push({
        requirementId: requirement.requirementId,
        score: partialScore,
        maxScore: maxPoints,
        feedback: "Evaluare automata indisponibila - punctaj partial acordat.",
        strengths: [],
        improvements: ["Retrimiteti pentru evaluare detaliata"],
      });
    }
  }

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passed = percentage >= 50;

  const avgAnswerLength =
    Object.values(answers).reduce((sum, a) => sum + a.length, 0) /
    Math.max(Object.keys(answers).length, 1);
  const expressionScore = avgAnswerLength > 200 ? 0.45 : avgAnswerLength > 100 ? 0.35 : 0.25;

  return {
    totalScore: totalScore + expressionScore,
    maxScore,
    percentage,
    passed,
    bySubject,
    feedback,
    overallFeedback: passed
      ? "Felicitari! Ai demonstrat o intelegere solida a materiei. Continua sa exersezi pentru a-ti perfectiona argumentarea juridica."
      : "Mai ai de lucrat la fundamentarea juridica. Concentreaza-te pe imbunatatirea structurii IRAC si pe citarea precisa a articolelor de lege.",
    expressionScore,
  };
}

/**
 * RAG-based legal assistant Q&A.
 */
export async function askLegalAssistant(userId: string, question: string, topK = 5) {
  const questionEmbedding = await generateEmbedding(question);

  // Unified SQL search across document_chunks AND legal_article_chunks
  const similarities = await searchSimilarChunks(questionEmbedding, topK);

  if (similarities.length === 0) {
    throw new Error("Baza de date legislativa este goala sau neindexata.");
  }

  const sanitizedContext = similarities.map((s) => ({
    actName: (s.metadata as any)?.actName || (s.metadata as any)?.title || "Act Normativ",
    actNumber: (s.metadata as any)?.actNumber || (s.metadata as any)?.articleNumber || "",
    rawOfficialText: s.chunkText,
    sourceUrl: "legislatie.just.ro",
    sanitizedAt: new Date(),
    contentHash: "vector-retrieved",
    articleNumber: (s.metadata as any)?.articleNumber || "",
  }));

  const result = await generateWithSanitizedContext(
    question,
    sanitizedContext,
    "legal_synthesis",
    userId
  );

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to generate content");
  }

  const resultData = result.data as any;

  const answer = `**${resultData.topic || "Raspuns"}**\n\n${resultData.summary}\n\n**Concepte relationate:** ${resultData.related_concepts?.join(", ")}`;

  const citations = similarities.map((s) => ({
    chunkId: s.id,
    text: s.chunkText,
    similarity: s.similarity,
    metadata: s.metadata,
    sourceType: s.sourceType,
  }));

  return {
    question,
    answer,
    citations,
    chunksRetrieved: topK,
    auditLogId: result.auditLogId,
    cleanRoomData: resultData,
  };
}

/**
 * Generate a personalized study plan.
 */
export async function generateStudyPlanForUser(
  userId: string,
  daysUntilExam: number,
  hoursPerDay: number
) {
  const progress = await storage.getUserProgress(userId);

  const userProgress = progress.map((p) => ({
    subject: p.subject,
    chapter: p.chapter,
    accuracy: p.accuracy || 0,
    totalQuestions: p.totalQuestions || 0,
  }));

  const generatedPlan = await generatePersonalizedStudyPlan({
    userProgress,
    daysUntilExam,
    hoursPerDay,
    examPatterns: [],
  });

  const planData = insertStudyPlanSchema.parse({
    userId,
    daysUntilExam,
    hoursPerDay,
    planData: generatedPlan,
  });

  const [savedPlan] = await db.insert(studyPlans).values(planData).returning();

  return { id: savedPlan.id, ...generatedPlan };
}

/**
 * Get the latest study plan for a user.
 */
export async function getLatestStudyPlan(userId: string) {
  const [latestPlan] = await db
    .select()
    .from(studyPlans)
    .where(eq(studyPlans.userId, userId))
    .orderBy(desc(studyPlans.generatedAt))
    .limit(1);

  if (!latestPlan) throw new Error("No study plan found");

  return {
    id: latestPlan.id,
    daysUntilExam: latestPlan.daysUntilExam,
    hoursPerDay: latestPlan.hoursPerDay,
    generatedAt: latestPlan.generatedAt,
    ...(latestPlan.planData as Record<string, unknown>),
  };
}
