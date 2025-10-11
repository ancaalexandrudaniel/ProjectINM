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

  const model = ai.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    systemInstruction: systemPrompt
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ]
  });

  const response = await result.response;
  return response.text() || "Nu am putut genera explicația. Încearcă din nou.";
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

  const model = ai.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ]
  });

  const response = await result.response;
  const rawJson = response.text();
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

  const model = ai.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ]
  });

  const response = await result.response;
  const rawJson = response.text();
  if (rawJson) {
    return JSON.parse(rawJson);
  }

  throw new Error("Failed to generate study plan");
}

/**
 * Extracts text from PDF file
 */
export async function extractTextFromPDF(pdfPath: string): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  return data.text;
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

  const model = ai.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ]
  });

  const response = await result.response;
  const rawJson = response.text();
  if (rawJson) {
    return JSON.parse(rawJson);
  }

  throw new Error("Failed to analyze document");
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

  const model = ai.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    systemInstruction: systemPrompt
  });

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

  const result = await model.generateContent({
    contents: contents
  });

  const response = await result.response;
  return response.text() || "Nu am putut genera un răspuns. Încearcă din nou.";
}
