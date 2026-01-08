import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";

// Initialize Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * Generates a personalized explanation for why a user answered incorrectly
 * Uses Gemini Flash 2.5 for fast, cost-effective responses
 */
export async function explainWrongAnswer(params: {
  questionText: string;
  correctOptionText: string;
  userSelectedText: string;
  explanation: string;
  legalReferences: string[];
  subject: string;
}): Promise<string> {
  const systemPrompt = `Ești un profesor de drept expert pentru pregătirea examenului INM (Institutul Național al Magistraturii).
Misiunea ta este să explici candidaților DE CE au greșit la o întrebare, folosind un ton prietenos și exemple practice.

IMPORTANT:
- Explică în ROMÂNĂ, limbaj simplu, fără termeni complicați
- Folosește analogii și exemple din viața reală
- Evidențiază diferența dintre răspunsul corect și cel greșit
- Subliniază conceptul juridic cheie care a dus la greșeală
- Oferă un sfat practic pentru a evita greșeala în viitor`;

  const userPrompt = `Candidatul a greșit la următoarea întrebare:

**Întrebare:** ${params.questionText}

**Răspunsul CORECT:** ${params.correctOptionText}
**Răspunsul ales de candidat:** ${params.userSelectedText}

**Explicație tehnică:** ${params.explanation}
**Referințe legale:** ${params.legalReferences.join(", ")}

Te rog să explici:
1. De ce răspunsul ales este GREȘIT (ce concept a confundat?)
2. De ce răspunsul corect este CORECT (cu exemplu practic)
3. Un TRUC de memorare sau regula practică pentru a nu mai greși

Răspunde în maximum 150 cuvinte, ton prietenos, fără formule de încheiere.`;

  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ]
  });

  return result.text || "Nu am putut genera explicația. Încearcă din nou.";
}

/**
 * Analyzes exam subjects from previous years to identify patterns
 */
export async function analyzePreviousExams(params: {
  examTexts: string[];
  subject: string;
}): Promise<{
  topTopics: Array<{ topic: string; frequency: number; importance: string }>;
  recommendations: string[];
  focusAreas: string[];
}> {
  const systemPrompt = `Ești un analist expert pentru examenul de admitere INM.
Analizezi subiectele din anii anteriori pentru a identifica pattern-uri și teme recurente.`;

  const userPrompt = `Analizează următoarele subiecte de la examenul INM din ultimii ani pentru materia ${params.subject}:

${params.examTexts.join("\n\n---\n\n")}

Identifică:
1. Top 5 cele mai frecvente teme/instituții juridice evaluate
2. Recomandări de studiu bazate pe pattern-uri
3. Zone de focus prioritar pentru candidați

Răspunde în format JSON cu următoarea structură:
{
  "topTopics": [{"topic": "nume temă", "frequency": număr_apariții, "importance": "critică/medie/scăzută"}],
  "recommendations": ["recomandare 1", "recomandare 2"],
  "focusAreas": ["zonă focus 1", "zonă focus 2"]
}`;

  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json"
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ]
  });

  const rawJson = result.text;
  if (rawJson) {
    return JSON.parse(rawJson);
  }

  throw new Error("Failed to analyze exams");
}

/**
 * Generates a personalized study plan based on user's weak points
 */
export async function generateStudyPlan(params: {
  weakPoints: Array<{
    subject: string;
    chapter: string;
    accuracy: number;
  }>;
  availableWeeks: number;
}): Promise<{
  weeklySchedule: Array<{
    week: number;
    topics: string[];
    studyHours: number;
    reviewDays: number[];
  }>;
  priorityList: string[];
  tips: string[];
}> {
  const systemPrompt = `Ești un coach de studiu expert pentru examenul INM.
Creezi planuri de studiu personalizate folosind tehnica repetării spațiate (spaced repetition).`;

  const weakPointsText = params.weakPoints
    .map(
      (wp) =>
        `- ${wp.subject} / ${wp.chapter}: ${wp.accuracy}% corectitudine`
    )
    .join("\n");

  const userPrompt = `Creează un plan de studiu personalizat pentru următoarele puncte slabe:

${weakPointsText}

Perioada disponibilă: ${params.availableWeeks} săptămâni

Planul trebuie să:
1. Prioritizeze capitolele cu accuracy <50% (critice)
2. Folosească repetare spațiată (revizuire după 1 zi, 3 zile, 7 zile)
3. Aloce 15-20 ore/săptămână studiu
4. Includă zile de review

Răspunde în format JSON:
{
  "weeklySchedule": [{"week": 1, "topics": ["capitol 1", "capitol 2"], "studyHours": 18, "reviewDays": [3, 6]}],
  "priorityList": ["capitol prioritar 1", "capitol prioritar 2"],
  "tips": ["sfat practic 1", "sfat practic 2"]
}`;

  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json"
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ]
  });

  const rawJson = result.text;
  if (rawJson) {
    return JSON.parse(rawJson);
  }

  throw new Error("Failed to generate study plan");
}

/**
 * Generates personalized study plan based on user progress and exam date
 */
export async function generatePersonalizedStudyPlan(params: {
  userProgress: Array<{
    subject: string;
    chapter: string;
    accuracy: number;
    totalQuestions: number;
  }>;
  daysUntilExam: number;
  hoursPerDay: number;
  examPatterns?: Array<{
    chapter: string;
    importance: string;
  }>;
}): Promise<{
  dailySchedule: Array<{
    day: number;
    date: string;
    topics: string[];
    focus: string;
    hours: number;
  }>;
  priorityChapters: string[];
  weeklyGoals: string[];
  studyTips: string[];
}> {
  const systemPrompt = `Ești un coach expert pentru pregătirea examenului INM România.
Creezi planuri de studiu personalizate folosind:
- Analiza punctelor slabe ale candidatului
- Pattern-uri din examenele anterioare
- Tehnica repetării spațiate (spaced repetition)
- Optimizarea timpului disponibil`;

  const progressText = params.userProgress
    .map(p => `${p.subject} / ${p.chapter}: ${p.accuracy}% (${p.totalQuestions} întrebări)`)
    .join("\n");

  const patternsText = params.examPatterns?.length
    ? params.examPatterns.map(p => `${p.chapter} (${p.importance})`).join(", ")
    : "Nu sunt disponibile pattern-uri";

  const userPrompt = `Creează un plan de studiu personalizat pentru examenul INM:

**Progres actual:**
${progressText || "Niciun progres înregistrat"}

**Pattern-uri examene anterioare:**
${patternsText}

**Timp disponibil:**
- ${params.daysUntilExam} zile până la examen
- ${params.hoursPerDay} ore/zi pentru studiu

**Cerințe plan:**
1. Prioritizează capitole cu accuracy <60% (critice)
2. Include capitole frecvente din examene (bazat pe patterns)
3. Alocare timp realistă (${params.hoursPerDay}h/zi)
4. Repetare spațiată: revizuire după 2 zile, 5 zile, 10 zile
5. Include zile de pauză/review (1 zi la 7 zile)
6. Ultimele 3 zile: simulări complete

Răspunde în format JSON (limba română pentru text):
{
  "dailySchedule": [
    {
      "day": 1,
      "date": "2025-10-13",
      "topics": ["Capitol 1", "Capitol 2"],
      "focus": "Învățare capitol nou",
      "hours": 4
    }
  ],
  "priorityChapters": ["capitol critical 1", "capitol critical 2"],
  "weeklyGoals": ["Săptămâna 1: ...", "Săptămâna 2: ..."],
  "studyTips": ["Sfat 1", "Sfat 2"]
}`;

  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json"
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ]
  });

  const rawJson = result.text;
  console.log("[generatePersonalizedStudyPlan] Gemini response:", rawJson);

  if (!rawJson) {
    throw new Error("Gemini returned empty response");
  }

  // Try to extract JSON from response (same pattern as analyzeExamPatterns)
  let jsonText = rawJson.trim();

  // Try to find JSON code block
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  } else if (jsonText.startsWith('```')) {
    const lines = jsonText.split('\n');
    lines.shift();
    if (lines[lines.length - 1].trim() === '```') {
      lines.pop();
    }
    jsonText = lines.join('\n').trim();
  }

  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error("[generatePersonalizedStudyPlan] JSON parse failed:", parseError);
    console.error("[generatePersonalizedStudyPlan] Attempted to parse:", jsonText.substring(0, 500));

    // Final fallback
    return {
      dailySchedule: [],
      priorityChapters: [],
      weeklyGoals: [],
      studyTips: ["Plan indisponibil momentan. Încercați din nou."]
    };
  }
}

/**
 * Analyzes exam patterns from previous exams PDFs
 */
export async function analyzeExamPatterns(params: {
  examDocuments: Array<{ year: string; text: string }>;
  subject: string;
}): Promise<{
  topChapters: Array<{
    chapter: string;
    frequency: number;
    importance: "critical" | "important" | "moderate";
    articles: string[];
  }>;
  recurringTopics: string[];
  recommendations: string[];
}> {
  const systemPrompt = `Ești un analist expert pentru examenul INM România.
Analizezi subiecte anterioare pentru a identifica pattern-uri și capitole prioritare.`;

  const docsText = params.examDocuments
    .map(doc => `=== Anul ${doc.year} ===\n${doc.text.substring(0, 3000)}`)
    .join("\n\n");

  const userPrompt = `Analizează aceste subiecte anterioare pentru materia ${params.subject}:

${docsText}

Identifică:
1. Capitolele care apar cel mai frecvent (top 5)
2. Articole de lege citate recurent
3. Tipuri de probleme juridice recurente
4. Recomandări pentru prioritizare studiu

Răspunde în format JSON:
{
  "topChapters": [
    {
      "chapter": "nume capitol (ex: Contracte civile)",
      "frequency": număr apariții,
      "importance": "critical" sau "important" sau "moderate",
      "articles": ["art. 1234", "art. 5678"]
    }
  ],
  "recurringTopics": ["temă recurentă 1", "temă recurentă 2"],
  "recommendations": ["recomandare studiu 1", "recomandare 2"]
}`;

  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json"
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ]
  });

  const rawJson = result.text;
  console.log("[analyzeExamPatterns] Gemini response:", rawJson);

  if (!rawJson) {
    throw new Error("Gemini returned empty response");
  }

  // Try to extract JSON from response
  let jsonText = rawJson.trim();

  // Try to find JSON code block (```json ... ``` or ``` ... ```)
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  } else if (jsonText.startsWith('```')) {
    // Fallback: remove first and last lines if starts with ```
    const lines = jsonText.split('\n');
    lines.shift(); // Remove ```json or ```
    if (lines[lines.length - 1].trim() === '```') {
      lines.pop(); // Remove closing ```
    }
    jsonText = lines.join('\n').trim();
  }

  // Try to parse the cleaned JSON
  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    console.error("[analyzeExamPatterns] JSON parse failed:", parseError);
    console.error("[analyzeExamPatterns] Attempted to parse:", jsonText.substring(0, 500));

    // Final fallback
    return {
      topChapters: [],
      recurringTopics: [],
      recommendations: ["Analiză indisponibilă momentan. Încercați din nou."]
    };
  }
}

/**
 * Extracts text from PDF file
 */
export async function extractTextFromPDF(pdfPath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(pdfPath);

  // Check if it's a valid PDF (starts with %PDF-)
  const isPDF = dataBuffer.toString('utf8', 0, 5) === '%PDF-';

  if (!isPDF) {
    // Fallback for testing: if not PDF, treat as plain text
    return dataBuffer.toString('utf8');
  }

  // Try to parse PDF, fallback to plain text if parsing fails
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(dataBuffer);
    return result.text;
  } catch (pdfError) {
    console.warn("[extractTextFromPDF] PDF parsing failed, using fallback:", pdfError);
    // Fallback: treat as plain text (useful for mock PDFs in testing)
    return dataBuffer.toString('utf8');
  }
}

/**
 * Analyzes legal document (PDF text) and provides summary
 */
export async function analyzeLegalDocument(params: {
  documentText: string;
  documentType: "tematica" | "bibliografie" | "subiecte" | "cod" | "curs";
}): Promise<{
  summary: string;
  keyPoints: string[];
  chapters?: string[];
}> {
  const systemPrompt = `Ești un asistent juridic expert care analizează documente pentru pregătirea examenului INM.`;

  let userPrompt = "";

  if (params.documentType === "tematica") {
    userPrompt = `Analizează această tematică de examen INM și extrage:

${params.documentText}

Răspunde în format JSON:
{
  "summary": "rezumat general 2-3 propoziții",
  "keyPoints": ["punct cheie 1", "punct cheie 2"],
  "chapters": ["capitol 1", "capitol 2", "capitol 3"]
}`;
  } else if (params.documentType === "subiecte") {
    userPrompt = `Analizează aceste subiecte de examen și extrage temele principale:

${params.documentText}

Răspunde în format JSON:
{
  "summary": "ce tipuri de subiecte predomină",
  "keyPoints": ["temă recurentă 1", "temă recurentă 2"],
  "chapters": ["capitol testat 1", "capitol testat 2"]
}`;
  } else {
    userPrompt = `Analizează acest document juridic:

${params.documentText.substring(0, 10000)}

Răspunde în format JSON:
{
  "summary": "rezumat document",
  "keyPoints": ["concept important 1", "concept important 2"]
}`;
  }

  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json"
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ]
  });

  const rawJson = result.text;
  console.log("[analyzeLegalDocument] Gemini response:", rawJson);

  if (!rawJson) {
    throw new Error("Gemini returned empty response");
  }

  // Check if response looks like JSON
  const trimmed = rawJson.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      return JSON.parse(trimmed);
    } catch (parseError) {
      console.error("[analyzeLegalDocument] JSON parse failed for valid-looking JSON:", trimmed);
    }
  }

  // Fallback for non-JSON responses
  console.warn("[analyzeLegalDocument] Gemini returned non-JSON response, using fallback summary");
  return {
    summary: trimmed.substring(0, 300), // Use more chars for better summary
    keyPoints: [],
    chapters: []
  };
}

/**
 * General chat interface for legal questions
 */
export async function chatWithLegalAssistant(params: {
  userMessage: string;
  context?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<string> {
  const systemPrompt = `Ești un asistent juridic expert pentru pregătirea examenului INM.
Răspunzi la întrebări despre concepte juridice în limba română, cu explicații clare și exemple practice.

IMPORTANT:
- Răspunsuri concise (max 200 cuvinte)
- Limbaj simplu, fără termeni complicați
- Exemplifică cu cazuri practice
- Citează articole de lege când este relevant
${params.context ? `\n\nCONTEXT din documente:\n${params.context}` : ""}`;

  const contents = [];

  if (params.conversationHistory && params.conversationHistory.length > 0) {
    for (const msg of params.conversationHistory) {
      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }
  }

  contents.push({
    role: "user",
    parts: [{ text: params.userMessage }],
  });

  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    contents: contents
  });

  return result.text || "Nu am putut genera un răspuns. Încearcă din nou.";
}

/**
 * Generate embedding vector for a single text using Gemini embedding model
 * Uses 768 dimensions (MRL-optimized) for efficient storage
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot generate embedding for empty text");
  }

  const result = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: {
      outputDimensionality: 768 // Use MRL to reduce to 768 dimensions for storage optimization
    }
  });

  if (!result.embeddings || result.embeddings.length === 0 || !result.embeddings[0].values) {
    throw new Error("Gemini returned no embeddings");
  }

  return result.embeddings[0].values;
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than calling generateEmbedding multiple times
 */
export async function batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  // Process in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchPromises = batch.map(text => generateEmbedding(text));
    const batchResults = await Promise.all(batchPromises);
    embeddings.push(...batchResults);
  }

  return embeddings;
}

/**
 * Calculate cosine similarity between two embedding vectors
 * Returns a value between -1 and 1, where 1 means identical vectors
 */
export function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error(`Vector dimensions must match: ${vec1.length} vs ${vec2.length}`);
  }

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }

  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);

  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  return dotProduct / (mag1 * mag2);
}

/**
 * Find top-K most similar chunks to a query using cosine similarity
 */
export function findTopSimilarChunks(
  queryEmbedding: number[],
  chunkEmbeddings: Array<{ embedding: number[]; chunkId: string; text: string }>,
  topK: number = 5
): Array<{ chunkId: string; text: string; similarity: number }> {
  const similarities = chunkEmbeddings.map(chunk => ({
    chunkId: chunk.chunkId,
    text: chunk.text,
    similarity: calculateCosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  // Sort by similarity descending and take top K
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Grades a written case study solution acting as an INM examiner
 */
export async function gradeCaseStudy(params: {
  caseScenario: string;
  sampleAnswer: string;
  userAnswer: string;
}): Promise<{
  grade: string; // "8.50"
  feedback: string;
  evaluation: {
    strengths: string[];
    weaknesses: string[];
    missingPoints: string[];
  };
}> {
  const systemPrompt = `Ești un examinator corector la Institutul Național al Magistraturii (INM).
Evaluezi lucrări scrise (rezolvare de spețe) la proba scrisă.

Rolul tău:
1. Să notezi lucrarea obiectiv, de la 1.00 la 10.00.
2. Să identifici ce a atins candidatul din barem și ce a omis.
3. Să oferi un feedback constructiv dar exigent, specific examenului INM.

Criterii de notare:
- Identificarea corectă a instituțiilor juridice (30%)
- Aplicarea corectă a legii la situația de fapt (40%)
- Raționament logic și argumentare juridică (20%)
- Limbaj juridic și structură (10%)`;

  const userPrompt = `Te rog să notezi următoarea lucrare:

=== SPEȚA ===
${params.caseScenario}

=== BAREM / RĂSPUNS MODEL ===
${params.sampleAnswer}

=== RĂSPUNS CANDIDAT ===
${params.userAnswer}

Răspunde STRICT în format JSON:
{
  "grade": "8.50" (nota cu 2 zecimale, între 1.00 și 10.00),
  "feedback": "paragraf de concluzie generală (max 100 cuvinte)",
  "evaluation": {
    "strengths": ["punct tare 1", "punct tare 2"],
    "weaknesses": ["punct slab 1", "punct slab 2"],
    "missingPoints": ["element din barem omis 1", "element omis 2"]
  }
}`;

  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json"
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ]
  });

  const rawJson = result.text;

  if (!rawJson) {
    throw new Error("Gemini returned empty response for grading");
  }

  try {
    const jsonText = rawJson.replace(/```json|```/g, "").trim();
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("Failed to parse grading JSON", rawJson);
    return {
      grade: "5.00",
      feedback: "Eroare la procesarea notei. Vă rugăm retrimiteți.",
      evaluation: {
        strengths: [],
        weaknesses: [],
        missingPoints: []
      }
    };
  }
}
