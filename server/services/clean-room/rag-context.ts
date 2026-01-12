/**
 * Clean Room RAG Context Builder
 * 
 * Implements strict context isolation for RAG (Retrieval-Augmented Generation).
 * Ensures AI only has access to sanitized official legal texts.
 */

import { db } from '../../db';
import { legislativeActs } from '@shared/schema';
import { eq, ilike, or, sql } from 'drizzle-orm';
import { sanitizeLegislativeAct, sanitizeLegislativeActs } from './sanitizer';
import { buildContextSection } from './agent-config';
import type {
    SanitizedLegalText,
    ContextValidationResult,
    FORBIDDEN_CONTENT_PATTERNS
} from './types';
import { FORBIDDEN_CONTENT_PATTERNS as forbiddenPatterns } from './types';

// ============================================================================
// CONTEXT RETRIEVAL
// ============================================================================

/**
 * Retrieve legislative acts by IDs and sanitize them
 */
export async function retrieveLegislativeActsById(
    actIds: string[]
): Promise<SanitizedLegalText[]> {
    if (actIds.length === 0) return [];

    const acts = await db
        .select()
        .from(legislativeActs)
        .where(sql`${legislativeActs.id} = ANY(${actIds})`);

    return sanitizeLegislativeActs(acts);
}

/**
 * Retrieve legislative acts by act type (e.g., 'cod_civil', 'cod_penal')
 */
export async function retrieveLegislativeActsByType(
    actType: string
): Promise<SanitizedLegalText[]> {
    const acts = await db
        .select()
        .from(legislativeActs)
        .where(eq(legislativeActs.actType, actType));

    return sanitizeLegislativeActs(acts);
}

/**
 * Search legislative acts by keyword in title or content
 */
export async function searchLegislativeActs(
    query: string,
    limit: number = 5
): Promise<SanitizedLegalText[]> {
    const searchTerm = `%${query}%`;

    const acts = await db
        .select()
        .from(legislativeActs)
        .where(
            or(
                ilike(legislativeActs.actTitle, searchTerm),
                ilike(legislativeActs.fullText, searchTerm)
            )
        )
        .limit(limit);

    return sanitizeLegislativeActs(acts);
}

/**
 * Retrieve all available legislative acts (for comprehensive context)
 * Use with caution - may produce large context
 */
export async function retrieveAllLegislativeActs(): Promise<SanitizedLegalText[]> {
    const acts = await db
        .select()
        .from(legislativeActs)
        .where(eq(legislativeActs.isCurrentVersion, true));

    return sanitizeLegislativeActs(acts);
}

// ============================================================================
// CONTEXT BUILDING
// ============================================================================

/**
 * Build Clean Room context from sanitized legal texts
 * This creates the isolated context section for AI prompts
 */
export function buildCleanRoomContext(
    sanitizedTexts: SanitizedLegalText[]
): string {
    if (sanitizedTexts.length === 0) {
        return '[CONTEXT LEGAL OFICIAL]\nNu au fost furnizate texte legale în context.\n\nNu poți răspunde la întrebări fără context legal.';
    }

    const contextItems = sanitizedTexts.map(text => ({
        actName: text.actName,
        articleNumber: text.articleNumber,
        rawOfficialText: text.rawOfficialText,
    }));

    return buildContextSection(contextItems);
}

/**
 * Build context with article-level granularity
 * Extracts specific articles from legislative acts
 */
export function extractArticleFromAct(
    sanitizedText: SanitizedLegalText,
    articleNumber: string
): SanitizedLegalText | null {
    // Common patterns for article extraction
    const patterns = [
        // Art. 1234
        new RegExp(`(Art(?:icolul)?\.?\\s*${articleNumber}[^]*?)(?=Art(?:icolul)?\.?\\s*\\d+|$)`, 'i'),
        // Articolul 1234
        new RegExp(`(Articolul\\s*${articleNumber}[^]*?)(?=Articolul\\s*\\d+|$)`, 'i'),
    ];

    for (const pattern of patterns) {
        const match = sanitizedText.rawOfficialText.match(pattern);
        if (match && match[1]) {
            return {
                ...sanitizedText,
                articleNumber: `Art. ${articleNumber}`,
                rawOfficialText: match[1].trim(),
            };
        }
    }

    return null;
}

/**
 * Build context for specific articles from multiple acts
 */
export async function buildArticleContext(
    articleReferences: Array<{ actId: string; articleNumber: string }>
): Promise<SanitizedLegalText[]> {
    const result: SanitizedLegalText[] = [];

    for (const ref of articleReferences) {
        const acts = await db
            .select()
            .from(legislativeActs)
            .where(eq(legislativeActs.id, ref.actId))
            .limit(1);

        if (acts.length > 0) {
            const sanitizedAct = sanitizeLegislativeAct(acts[0]);
            const article = extractArticleFromAct(sanitizedAct, ref.articleNumber);
            if (article) {
                result.push(article);
            }
        }
    }

    return result;
}

// ============================================================================
// CONTEXT VALIDATION
// ============================================================================

/**
 * Validate that context does not contain forbidden content
 * This is the "firewall" that prevents contaminated data from entering
 */
export function validateContextIsolation(
    context: string
): ContextValidationResult {
    const issues: string[] = [];
    const externalReferences: string[] = [];
    let containsForbidden = false;

    // Check for forbidden content patterns
    for (const pattern of forbiddenPatterns) {
        const matches = context.match(pattern);
        if (matches) {
            containsForbidden = true;
            externalReferences.push(...matches);
            issues.push(`Found forbidden pattern: ${matches[0].substring(0, 50)}...`);
        }
    }

    // Check for external URLs (except official sources)
    const urlPattern = /https?:\/\/[^\s]+/gi;
    const urls = context.match(urlPattern) || [];
    const allowedDomains = ['legislatie.just.ro', 'scj.ro', 'rejust.ro', 'portal.just.ro'];

    for (const url of urls) {
        const isAllowed = allowedDomains.some(domain => url.includes(domain));
        if (!isAllowed) {
            issues.push(`External URL found: ${url}`);
            externalReferences.push(url);
            containsForbidden = true;
        }
    }

    // Check for doctrinal author patterns
    const authorPatterns = [
        /(?:prof\.|dr\.|acad\.)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/gi,
        /\b(?:Beleiu|Boroi|Ciobanu|Deleanu|Pop|Ungureanu|Stătescu)\b/gi, // Common doctrine authors
    ];

    for (const pattern of authorPatterns) {
        const matches = context.match(pattern);
        if (matches) {
            issues.push(`Doctrinal author reference found: ${matches[0]}`);
            externalReferences.push(...matches);
            // Note: This is a warning, not automatic failure
        }
    }

    return {
        isValid: !containsForbidden,
        issues,
        containsForbiddenContent: containsForbidden,
        externalReferencesFound: externalReferences,
    };
}

/**
 * Validate sanitized texts before using them as context
 */
export function validateSanitizedTexts(
    texts: SanitizedLegalText[]
): { valid: boolean; allIssues: Array<{ actName: string; issues: string[] }> } {
    const allIssues: Array<{ actName: string; issues: string[] }> = [];

    for (const text of texts) {
        const validation = validateContextIsolation(text.rawOfficialText);
        if (!validation.isValid) {
            allIssues.push({
                actName: text.actName,
                issues: validation.issues,
            });
        }
    }

    return {
        valid: allIssues.length === 0,
        allIssues,
    };
}

// ============================================================================
// CONTEXT SIZE MANAGEMENT
// ============================================================================

/**
 * Estimate token count for context (rough approximation)
 * Romanian text averages ~4 characters per token
 */
export function estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Truncate context to fit within token limit while preserving complete articles
 */
export function truncateContextToLimit(
    texts: SanitizedLegalText[],
    maxTokens: number = 16000
): SanitizedLegalText[] {
    const result: SanitizedLegalText[] = [];
    let currentTokens = 0;

    for (const text of texts) {
        const textTokens = estimateTokenCount(text.rawOfficialText);

        if (currentTokens + textTokens <= maxTokens) {
            result.push(text);
            currentTokens += textTokens;
        } else {
            // Stop adding more texts
            break;
        }
    }

    return result;
}

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export type {
    SanitizedLegalText,
    ContextValidationResult,
};
