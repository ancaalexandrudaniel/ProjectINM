/**
 * Clean Room Compliance Logger
 * 
 * Implements Section 5.2 from the Clean Room research document.
 * Provides audit trail for all AI-generated content for legal compliance.
 */

import { db } from '../../db';
import { cleanRoomAuditLogs } from '@shared/schema';
import type { CleanRoomAuditEntry, CleanRoomGenerationType, SanitizedLegalText } from './types';

// ============================================================================
// AUDIT LOG CREATION
// ============================================================================

/**
 * Log a Clean Room generation event
 * Creates an immutable audit record for compliance verification
 */
export async function logCleanRoomGeneration(
    entry: CleanRoomAuditEntry
): Promise<string> {
    const [inserted] = await db
        .insert(cleanRoomAuditLogs)
        .values({
            userId: entry.userId || null,
            generationType: entry.generationType,
            inputQuery: entry.inputQuery,
            systemPromptUsed: entry.systemPromptUsed,
            contextProvided: entry.contextProvided,
            outputGenerated: entry.outputGenerated,
            contextSources: entry.contextSources,
            modelUsed: entry.modelUsed,
            similarityScore: entry.similarityScore,
        })
        .returning({ id: cleanRoomAuditLogs.id });

    return inserted.id;
}

/**
 * Build context sources array from sanitized texts
 */
export function buildContextSourcesArray(
    texts: SanitizedLegalText[]
): Array<{ actName: string; articleNumber?: string }> {
    return texts.map(text => ({
        actName: text.actName,
        articleNumber: text.articleNumber,
    }));
}

/**
 * Create audit entry with all required fields
 */
export function createAuditEntry(params: {
    userId?: string;
    generationType: CleanRoomGenerationType;
    inputQuery: string;
    systemPrompt: string;
    contextTexts: SanitizedLegalText[];
    contextString: string;
    output: string;
    modelUsed: string;
    similarityScore?: number;
}): CleanRoomAuditEntry {
    return {
        userId: params.userId,
        generationType: params.generationType,
        inputQuery: params.inputQuery,
        systemPromptUsed: params.systemPrompt,
        contextProvided: params.contextString,
        outputGenerated: params.output,
        contextSources: buildContextSourcesArray(params.contextTexts),
        modelUsed: params.modelUsed,
        similarityScore: params.similarityScore,
    };
}

// ============================================================================
// AUDIT LOG QUERIES
// ============================================================================

/**
 * Get audit logs for a specific user
 */
export async function getAuditLogsByUser(
    userId: string,
    limit: number = 50
): Promise<typeof cleanRoomAuditLogs.$inferSelect[]> {
    // Note: This requires the schema to be updated - see below
    // For now, return empty array as placeholder
    console.log(`[ComplianceLogger] getAuditLogsByUser called for user: ${userId}, limit: ${limit}`);
    return [];
}

/**
 * Get audit logs by date range
 */
export async function getAuditLogsByDateRange(
    startDate: Date,
    endDate: Date,
    limit: number = 100
): Promise<typeof cleanRoomAuditLogs.$inferSelect[]> {
    console.log(`[ComplianceLogger] getAuditLogsByDateRange called: ${startDate} to ${endDate}`);
    return [];
}

/**
 * Get audit log by ID
 */
export async function getAuditLogById(
    logId: string
): Promise<typeof cleanRoomAuditLogs.$inferSelect | null> {
    console.log(`[ComplianceLogger] getAuditLogById called for: ${logId}`);
    return null;
}

// ============================================================================
// COMPLIANCE REPORTING
// ============================================================================

/**
 * Generate compliance summary for a time period
 */
export interface ComplianceSummary {
    totalGenerations: number;
    generationsByType: Record<CleanRoomGenerationType, number>;
    averageSimilarityScore: number | null;
    highSimilarityFlags: number; // Count of generations with similarity > threshold
    uniqueUsers: number;
    topContextSources: Array<{ actName: string; count: number }>;
}

export async function generateComplianceSummary(
    startDate: Date,
    endDate: Date
): Promise<ComplianceSummary> {
    // Placeholder implementation - will be functional after DB migration
    console.log(`[ComplianceLogger] generateComplianceSummary called: ${startDate} to ${endDate}`);

    return {
        totalGenerations: 0,
        generationsByType: {
            legal_concept_explanation: 0,
            question_explanation: 0,
            legal_synthesis: 0,
            exam_question_generation: 0,
            article_breakdown: 0,
        },
        averageSimilarityScore: null,
        highSimilarityFlags: 0,
        uniqueUsers: 0,
        topContextSources: [],
    };
}

// ============================================================================
// SIMILARITY CHECKING (Optional - for plagiarism detection)
// ============================================================================

/**
 * Calculate simple text similarity using Jaccard index
 * This is a basic implementation - can be enhanced with more sophisticated methods
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
    const union = new Set([...Array.from(words1), ...Array.from(words2)]);

    return Math.round((intersection.size / union.size) * 100);
}

/**
 * Check output against known doctrinal texts (placeholder)
 * In production, this would query a database of known protected texts
 */
export async function checkAgainstKnownTexts(
    generatedOutput: string
): Promise<{ similarityScore: number; flagged: boolean; matchedSource?: string }> {
    // Placeholder - would integrate with plagiarism detection service or database
    return {
        similarityScore: 0,
        flagged: false,
    };
}

// ============================================================================
// EXPORT
// ============================================================================

export {
    CleanRoomAuditEntry,
    CleanRoomGenerationType,
};
