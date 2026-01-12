/**
 * Clean Room AI Module
 * 
 * Central export for all Clean Room functionality.
 * Use this as the main entry point for Clean Room operations.
 */

// Core types and schemas
export {
    // Types
    type SanitizedLegalText,
    type SanitizationOptions,
    type LegalConceptOutput,
    type QuestionExplanationOutput,
    type LegalSynthesisOutput,
    type CleanRoomGenerationType,
    type CleanRoomGenerationParams,
    type CleanRoomGenerationResult,
    type CleanRoomAuditEntry,
    type ContextValidationResult,

    // Zod schemas for validation
    LegalConceptOutputSchema,
    QuestionExplanationOutputSchema,
    LegalSynthesisOutputSchema,
    OfficialSourceSchema,

    // Constants
    DEFAULT_SANITIZATION_OPTIONS,
    FORBIDDEN_CONTENT_PATTERNS,
} from './types';

// Agent configuration
export {
    CLEAN_ROOM_SYSTEM_PROMPT,
    CLEAN_ROOM_AGENT_CONFIG,
    GENERATION_TYPE_PROMPTS,
    buildSystemPrompt,
    buildContextSection,
    buildCompletePrompt,
} from './agent-config';

// Sanitization functions
export {
    sanitizeHtmlContent,
    normalizeWhitespace,
    filterMetadata,
    removeProprietaryPatterns,
    generateContentHash,
    sanitizeLegislativeAct,
    sanitizeLegislativeActs,
    sanitizeRawText,
    validateSanitizedText,
} from './sanitizer';

// RAG context functions
export {
    retrieveLegislativeActsById,
    retrieveLegislativeActsByType,
    searchLegislativeActs,
    retrieveAllLegislativeActs,
    buildCleanRoomContext,
    extractArticleFromAct,
    buildArticleContext,
    validateContextIsolation,
    validateSanitizedTexts,
    estimateTokenCount,
    truncateContextToLimit,
} from './rag-context';

// Compliance logging
export {
    logCleanRoomGeneration,
    buildContextSourcesArray,
    createAuditEntry,
    getAuditLogsByUser,
    getAuditLogsByDateRange,
    getAuditLogById,
    generateComplianceSummary,
    calculateTextSimilarity,
    checkAgainstKnownTexts,
    type ComplianceSummary,
} from './compliance-logger';

// Main generator functions
export {
    generateCleanRoomContent,
    explainLegalConcept,
    explainQuestion,
    synthesizeLegalTopic,
    generateWithSanitizedContext,
    getAgentConfiguration,
    isCleanRoomReady,
} from './generator';
