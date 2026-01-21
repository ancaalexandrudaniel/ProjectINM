/**
 * Clean Room Content Generator
 * 
 * Main orchestrator for Clean Room AI content generation.
 * Implements the full pipeline: sanitization → context building → generation → validation → logging.
 */

import { GoogleGenAI } from "@google/genai";
import {
    buildCompletePrompt,
    CLEAN_ROOM_AGENT_CONFIG
} from './agent-config';
import {
    sanitizeLegislativeActs,
    validateSanitizedText,
} from './sanitizer';
import {
    buildCleanRoomContext,
    validateContextIsolation,
    retrieveLegislativeActsById,
    truncateContextToLimit,
} from './rag-context';
import {
    logCleanRoomGeneration,
    createAuditEntry,
} from './compliance-logger';
import {
    LegalConceptOutputSchema,
    QuestionExplanationOutputSchema,
    LegalSynthesisOutputSchema,
    ArticleBreakdownOutputSchema,
    type CleanRoomGenerationParams,
    type CleanRoomGenerationResult,
    type LegalConceptOutput,
    type QuestionExplanationOutput,
    type LegalSynthesisOutput,
    type ArticleBreakdownOutput,
    type SanitizedLegalText,
    type CleanRoomGenerationType,
} from './types';

// Initialize Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Model configuration
const CLEAN_ROOM_MODEL = "gemini-2.0-flash";

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

/**
 * Generate content using Clean Room methodology.
 * This is the main entry point for IP-compliant AI content generation.
 * 
 * @param params - Generation parameters including query and context
 * @returns Validated, structured output with audit trail
 */
export async function generateCleanRoomContent<T = LegalConceptOutput>(
    params: CleanRoomGenerationParams
): Promise<CleanRoomGenerationResult<T>> {
    const startTime = Date.now();

    try {
        // Step 1: Validate input context
        const contextValidation = validateContextIsolation(
            params.legislativeContext.map(t => t.rawOfficialText).join('\n')
        );

        if (!contextValidation.isValid) {
            console.warn('[CleanRoom] Context validation warnings:', contextValidation.issues);
            // Don't fail, but log warnings - some patterns may be false positives
        }

        // Step 2: Truncate context if needed (to fit token limits)
        const truncatedContext = truncateContextToLimit(params.legislativeContext);

        // Step 3: Build prompts
        const contextForPrompt = truncatedContext.map(t => ({
            actName: t.actName,
            articleNumber: t.articleNumber,
            rawOfficialText: t.rawOfficialText,
        }));

        const { systemPrompt, userPrompt } = buildCompletePrompt(
            params.generationType,
            contextForPrompt,
            params.query
        );

        // Step 4: Call Gemini with structured output
        // Combine system prompt with user message as the SDK requires
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

        console.log('[CleanRoom] Calling Gemini API...');
        const result = await ai.models.generateContent({
            model: CLEAN_ROOM_MODEL,
            config: {
                responseMimeType: "application/json",
                temperature: 0.3, // Lower temperature for more consistent, factual responses
            },
            contents: fullPrompt,
        });

        console.log('[CleanRoom] Gemini response received');

        // Handle different response formats from the SDK
        let rawOutput: string | undefined;
        if (typeof result.text === 'string') {
            rawOutput = result.text;
        } else if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
            rawOutput = result.candidates[0].content.parts[0].text;
        } else if (typeof result === 'object' && 'text' in result) {
            rawOutput = String(result.text);
        }

        console.log('[CleanRoom] Raw output length:', rawOutput?.length || 0);

        if (!rawOutput) {
            console.error('[CleanRoom] No output - response structure:', JSON.stringify(result, null, 2).substring(0, 500));
            throw new Error("Gemini returned empty response");
        }

        // Step 5: Parse and validate output
        const parsedOutput = parseAndValidateOutput<T>(rawOutput, params.generationType);

        // Step 6: Log to audit trail (if enabled)
        let auditLogId: string | undefined;
        if (params.enableAuditLog !== false) {
            const contextString = buildCleanRoomContext(truncatedContext);
            const auditEntry = createAuditEntry({
                userId: params.userId,
                generationType: params.generationType,
                inputQuery: params.query,
                systemPrompt: systemPrompt,
                contextTexts: truncatedContext,
                contextString: contextString,
                output: rawOutput,
                modelUsed: CLEAN_ROOM_MODEL,
            });

            try {
                auditLogId = await logCleanRoomGeneration(auditEntry);
            } catch (logError) {
                // Don't fail generation if logging fails, but log the error
                console.error('[CleanRoom] Audit logging failed:', logError);
            }
        }

        const duration = Date.now() - startTime;
        console.log(`[CleanRoom] Generation completed in ${duration}ms`);

        return {
            success: true,
            data: parsedOutput,
            auditLogId,
            contextSourcesUsed: truncatedContext.map(t => ({
                actName: t.actName,
                articleNumber: t.articleNumber,
            })),
        };

    } catch (error) {
        // Safely log error without crashing on complex error objects
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[CleanRoom] Generation failed:', errorMessage);
        return {
            success: false,
            error: errorMessage,
            contextSourcesUsed: [],
        };
    }
}

// ============================================================================
// SPECIALIZED GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate a legal concept explanation
 */
export async function explainLegalConcept(
    query: string,
    legislativeActIds: string[],
    userId?: string
): Promise<CleanRoomGenerationResult<LegalConceptOutput>> {
    // Retrieve and sanitize acts
    const sanitizedTexts = await retrieveLegislativeActsById(legislativeActIds);

    if (sanitizedTexts.length === 0) {
        return {
            success: false,
            error: 'No legislative acts found for the provided IDs',
            contextSourcesUsed: [],
        };
    }

    return generateCleanRoomContent<LegalConceptOutput>({
        query,
        legislativeContext: sanitizedTexts,
        generationType: 'legal_concept_explanation',
        userId,
        enableAuditLog: true,
    });
}

/**
 * Generate a question explanation
 */
export async function explainQuestion(
    questionText: string,
    correctAnswer: string,
    legislativeActIds: string[],
    userId?: string
): Promise<CleanRoomGenerationResult<QuestionExplanationOutput>> {
    const sanitizedTexts = await retrieveLegislativeActsById(legislativeActIds);

    const query = `Întrebare: ${questionText}\nRăspuns corect: ${correctAnswer}`;

    return generateCleanRoomContent<QuestionExplanationOutput>({
        query,
        legislativeContext: sanitizedTexts,
        generationType: 'question_explanation',
        userId,
        enableAuditLog: true,
    });
}

/**
 * Generate a legal synthesis
 */
export async function synthesizeLegalTopic(
    topic: string,
    legislativeActIds: string[],
    userId?: string
): Promise<CleanRoomGenerationResult<LegalSynthesisOutput>> {
    const sanitizedTexts = await retrieveLegislativeActsById(legislativeActIds);

    return generateCleanRoomContent<LegalSynthesisOutput>({
        query: `Sintetizează informații despre: ${topic}`,
        legislativeContext: sanitizedTexts,
        generationType: 'legal_synthesis',
        userId,
        enableAuditLog: true,
    });
}

/**
 * Generate content with pre-sanitized texts (for custom pipelines)
 */
export async function generateWithSanitizedContext(
    query: string,
    sanitizedTexts: SanitizedLegalText[],
    generationType: CleanRoomGenerationType,
    userId?: string
): Promise<CleanRoomGenerationResult<unknown>> {
    return generateCleanRoomContent({
        query,
        legislativeContext: sanitizedTexts,
        generationType,
        userId,
        enableAuditLog: true,
    });
}

// ============================================================================
// OUTPUT PARSING & VALIDATION
// ============================================================================

/**
 * Parse raw JSON output and validate against appropriate schema
 */
function parseAndValidateOutput<T>(
    rawOutput: string,
    generationType: CleanRoomGenerationType
): T {
    // Clean the output (remove markdown code blocks if present)
    let cleanedOutput = rawOutput.trim();

    const codeBlockMatch = cleanedOutput.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
        cleanedOutput = codeBlockMatch[1].trim();
    } else if (cleanedOutput.startsWith('```')) {
        const lines = cleanedOutput.split('\n');
        lines.shift();
        if (lines[lines.length - 1]?.trim() === '```') {
            lines.pop();
        }
        cleanedOutput = lines.join('\n').trim();
    }

    // Parse JSON
    const parsed = JSON.parse(cleanedOutput);

    // Validate against appropriate schema
    switch (generationType) {
        case 'legal_concept_explanation':
            return LegalConceptOutputSchema.parse(parsed) as T;
        case 'question_explanation':
            return QuestionExplanationOutputSchema.parse(parsed) as T;
        case 'legal_synthesis':
            return LegalSynthesisOutputSchema.parse(parsed) as T;
        case 'article_breakdown':
            return ArticleBreakdownOutputSchema.parse(parsed) as T;
        case 'exam_question_generation':
            // For now, return as-is (schema can be added later)
            return parsed as T;
        default:
            return parsed as T;
    }
}

// ============================================================================
// ARTICLE BREAKDOWN GENERATION (for legalArticles table)
// ============================================================================

/**
 * Generate article breakdown with 7 segments for legalArticles table
 * Takes raw legislative text and produces educational content
 */
export async function generateArticleBreakdown(
    articleNumber: number,
    articleText: string,
    actName: string,
    userId?: string
): Promise<CleanRoomGenerationResult<ArticleBreakdownOutput>> {
    // Create sanitized text structure
    const sanitizedText: SanitizedLegalText = {
        actName,
        actNumber: '',
        articleNumber: `Art. ${articleNumber}`,
        rawOfficialText: articleText,
        sourceUrl: 'legislatie.just.ro',
        sanitizedAt: new Date(),
        contentHash: '', // Not needed for this flow
    };

    const query = `Generează un breakdown complet pentru Articolul ${articleNumber} din ${actName}. 
    Textul articolului este furnizat în context. 
    Returnează toate cele 7 segmente (official, trad, puncte, juris, radar, logica, conex).`;

    return generateCleanRoomContent<ArticleBreakdownOutput>({
        query,
        legislativeContext: [sanitizedText],
        generationType: 'article_breakdown',
        userId,
        enableAuditLog: true,
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the agent configuration (for inspection/debugging)
 */
export function getAgentConfiguration() {
    return CLEAN_ROOM_AGENT_CONFIG;
}

/**
 * Check if Clean Room is properly configured
 */
export function isCleanRoomReady(): boolean {
    return !!(process.env.GEMINI_API_KEY);
}

