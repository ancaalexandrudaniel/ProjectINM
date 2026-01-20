/**
 * Clean Room Types & Interfaces
 * 
 * Core type definitions for the Clean Room AI architecture.
 * These types ensure IP compliance and structured content generation.
 */

import { z } from 'zod';

// ============================================================================
// SANITIZED DATA TYPES
// ============================================================================

/**
 * Represents a legal text that has been sanitized for Clean Room processing.
 * All HTML, metadata, and proprietary formatting has been removed.
 */
export interface SanitizedLegalText {
    actName: string;           // e.g., "Codul Civil"
    actNumber: string;         // e.g., "287/2009"
    articleNumber?: string;    // e.g., "Art. 1166" (if specific article)
    rawOfficialText: string;   // Plain text, no HTML
    sourceUrl: string;         // For citation (legislatie.just.ro)
    sanitizedAt: Date;
    contentHash: string;       // SHA-256 for verification
}

/**
 * Sanitization options for controlling the cleaning process
 */
export interface SanitizationOptions {
    stripHtml: boolean;
    normalizeWhitespace: boolean;
    removeMetadata: boolean;
    excludeFields?: string[];
}

export const DEFAULT_SANITIZATION_OPTIONS: SanitizationOptions = {
    stripHtml: true,
    normalizeWhitespace: true,
    removeMetadata: true,
    excludeFields: ['editor_notes', 'history_log', 'related_links', 'unofficial_summaries', 'consolidated_by'],
};

// ============================================================================
// OUTPUT SCHEMAS (Section 4.2 from Research Document)
// ============================================================================

/**
 * Official source citation schema
 */
export const OfficialSourceSchema = z.object({
    act_name: z.string().describe('Full name of the legislative act'),
    article_number: z.string().describe('Specific article identifier'),
    exact_text_fragment: z.string().describe('Verbatim quote from the official text provided in context. Do not alter.'),
});

/**
 * Main output schema for legal concept explanations
 * Forces structured output to prevent accidental reproduction of copyrighted expressions
 */
export const LegalConceptOutputSchema = z.object({
    legal_concept: z.string().describe('The name of the legal concept analyzed'),
    official_source: OfficialSourceSchema,
    synthesized_explanation: z.string().describe('A simplified explanation generated solely by restating the official text logic. NO external analogies or doctrinal theories.'),
    exam_relevance: z.string().optional().describe('Why this is relevant for the INM exam'),
    potential_traps: z.array(z.string()).optional().describe('Logical deductions based on the text useful for grid questions'),
});

export type LegalConceptOutput = z.infer<typeof LegalConceptOutputSchema>;
export type OfficialSource = z.infer<typeof OfficialSourceSchema>;

/**
 * Schema for question explanation output
 */
export const QuestionExplanationOutputSchema = z.object({
    question_analysis: z.string().describe('Analysis of what the question is testing'),
    correct_answer_reasoning: z.string().describe('Why the correct answer is correct based on official text'),
    incorrect_options_analysis: z.array(z.object({
        option_text: z.string(),
        why_incorrect: z.string(),
    })).optional(),
    official_sources: z.array(OfficialSourceSchema),
    memory_tip: z.string().optional().describe('A mnemonic or practical tip to remember the concept'),
});

export type QuestionExplanationOutput = z.infer<typeof QuestionExplanationOutputSchema>;

/**
 * Schema for legal synthesis output
 */
export const LegalSynthesisOutputSchema = z.object({
    topic: z.string(),
    summary: z.string().describe('Synthesized summary based ONLY on provided texts'),
    key_articles: z.array(OfficialSourceSchema),
    related_concepts: z.array(z.string()).optional(),
    study_notes: z.array(z.string()).optional(),
});

export type LegalSynthesisOutput = z.infer<typeof LegalSynthesisOutputSchema>;

/**
 * Schema for article breakdown output (for legalArticles table segments)
 * Used to generate educational content for each article from official text
 */
export const ArticleBreakdownOutputSchema = z.object({
    article_number: z.number().describe('The article number'),
    title: z.string().describe('Title or heading of the article'),
    segments: z.object({
        official: z.string().describe('The exact official text of the article from the legislative act'),
        trad: z.string().describe('A simplified, student-friendly translation/explanation of the article in plain Romanian'),
        puncte: z.string().describe('Key points, common exam traps, and gotchas for this article'),
        juris: z.string().optional().describe('Relevant case law or jurisprudence citations if available'),
        radar: z.string().describe('What specifically appears in exams about this article, likely exam questions'),
        logica: z.string().describe('The underlying logic and rationale of the article'),
        conex: z.string().optional().describe('Connections to other related articles or legal concepts'),
    }),
});

export type ArticleBreakdownOutput = z.infer<typeof ArticleBreakdownOutputSchema>;

// ============================================================================
// AGENT CONFIGURATION TYPES
// ============================================================================

/**
 * Generation types supported by Clean Room
 */
export type CleanRoomGenerationType =
    | 'legal_concept_explanation'
    | 'question_explanation'
    | 'legal_synthesis'
    | 'exam_question_generation'
    | 'article_breakdown';

/**
 * Parameters for Clean Room content generation
 */
export interface CleanRoomGenerationParams {
    query: string;
    legislativeContext: SanitizedLegalText[];
    generationType: CleanRoomGenerationType;
    userId?: string;
    enableAuditLog?: boolean;
}

/**
 * Result from Clean Room generation
 */
export interface CleanRoomGenerationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    auditLogId?: string;
    contextSourcesUsed: Array<{ actName: string; articleNumber?: string }>;
}

// ============================================================================
// COMPLIANCE & AUDIT TYPES
// ============================================================================

/**
 * Audit log entry for compliance tracking
 */
export interface CleanRoomAuditEntry {
    userId?: string;
    generationType: CleanRoomGenerationType;
    inputQuery: string;
    systemPromptUsed: string;
    contextProvided: string;
    outputGenerated: string;
    contextSources: Array<{ actName: string; articleNumber?: string }>;
    modelUsed: string;
    similarityScore?: number;
}

/**
 * Forbidden content patterns to check against
 */
export const FORBIDDEN_CONTENT_PATTERNS = [
    // Doctrinal references
    /(?:conform|potrivit|după)\s+(?:doctrin(?:a|ei)|autor(?:ul|ii)|profesor)/gi,
    // External citations
    /(?:a se vedea|vezi|cf\.)\s+[A-Z][a-z]+/g,
    // Commercial database references
    /(?:Lege5|Sintact|Juridice\.ro|Indaco|Hamangiu)/gi,
    // University course references
    /(?:curs|tratat|manual)\s+(?:de\s+)?(?:drept|juridic)/gi,
];

/**
 * Context validation result
 */
export interface ContextValidationResult {
    isValid: boolean;
    issues: string[];
    containsForbiddenContent: boolean;
    externalReferencesFound: string[];
}
