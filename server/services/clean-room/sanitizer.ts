/**
 * Clean Room Data Sanitizer
 * 
 * Implements Section 4.3 from the Clean Room research document.
 * Provides data cleaning and decontamination for legal texts.
 */

import crypto from 'crypto';
import type { LegislativeAct } from '@shared/schema';
import type { SanitizedLegalText, SanitizationOptions } from './types';
import { DEFAULT_SANITIZATION_OPTIONS } from './types';

// ============================================================================
// HTML SANITIZATION
// ============================================================================

/**
 * Remove all HTML tags while preserving text content
 * Implements: "Stripping HTML" from research document Section 3.1B
 */
export function sanitizeHtmlContent(html: string): string {
    if (!html || typeof html !== 'string') {
        return '';
    }

    let text = html;

    // Replace common block elements with newlines
    text = text.replace(/<\/(p|div|br|h[1-6]|li|tr)>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');

    // Replace list items with bullets
    text = text.replace(/<li[^>]*>/gi, '• ');

    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // Decode common HTML entities
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
        .replace(/&#x([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

    // Normalize Romanian diacritics (fix encoding issues)
    text = normalizeRomanianDiacritics(text);

    return text;
}

/**
 * Fix common Romanian diacritic encoding issues
 */
function normalizeRomanianDiacritics(text: string): string {
    // Common encoding issues with Romanian characters
    const replacements: Record<string, string> = {
        'ş': 'ș',  // cedilla to comma below
        'Ş': 'Ș',
        'ţ': 'ț',
        'Ţ': 'Ț',
        'ã': 'ă',  // tilde to breve (common OCR error)
    };

    let result = text;
    for (const [from, to] of Object.entries(replacements)) {
        result = result.replace(new RegExp(from, 'g'), to);
    }

    return result;
}

// ============================================================================
// WHITESPACE NORMALIZATION
// ============================================================================

/**
 * Normalize whitespace to eliminate formatting fingerprints
 * Implements: "Normalizarea Textului" from research document Section 3.1B
 */
export function normalizeWhitespace(text: string): string {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        // Convert all types of whitespace to regular space
        .replace(/[\t\f\v]/g, ' ')
        // Normalize line endings to \n
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Remove multiple spaces (but preserve single spaces)
        .replace(/ +/g, ' ')
        // Remove multiple newlines (max 2)
        .replace(/\n{3,}/g, '\n\n')
        // Remove leading/trailing whitespace from lines
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        // Final trim
        .trim();
}

// ============================================================================
// METADATA FILTERING
// ============================================================================

/**
 * Filter out proprietary metadata fields
 * Implements: "Eliminarea Metadatelor" from research document Section 3.1B
 */
export function filterMetadata<T extends Record<string, unknown>>(
    data: T,
    excludeFields: string[] = DEFAULT_SANITIZATION_OPTIONS.excludeFields || []
): Partial<T> {
    const result: Partial<T> = {};

    for (const key of Object.keys(data)) {
        if (!excludeFields.includes(key)) {
            result[key as keyof T] = data[key as keyof T];
        }
    }

    return result;
}

/**
 * Remove potentially proprietary content patterns
 */
export function removeProprietaryPatterns(text: string): string {
    if (!text) return '';

    let cleaned = text;

    // Remove source attribution patterns from third-party databases
    const proprietaryPatterns = [
        /\[?sursa:\s*[^\]]+\]?/gi,
        /\(?\s*preluat\s+de\s+pe\s+[^)]+\)?/gi,
        /legislatie\.just\.ro/gi,  // Remove URL mentions from text body
        /lege5\.ro/gi,
        /sintact\.ro/gi,
        /juridice\.ro/gi,
        /Copyright\s*©?[^.]+\./gi,
        /Toate\s+drepturile\s+rezervate[^.]*\./gi,
    ];

    for (const pattern of proprietaryPatterns) {
        cleaned = cleaned.replace(pattern, '');
    }

    return cleaned;
}

// ============================================================================
// CONTENT HASH GENERATION
// ============================================================================

/**
 * Generate SHA-256 hash for content verification
 */
export function generateContentHash(text: string): string {
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

// ============================================================================
// MAIN SANITIZATION PIPELINE
// ============================================================================

/**
 * Full sanitization pipeline for legislative acts
 * Transforms raw database records into Clean Room compatible format
 */
export function sanitizeLegislativeAct(
    act: LegislativeAct,
    options: Partial<SanitizationOptions> = {}
): SanitizedLegalText {
    const opts = { ...DEFAULT_SANITIZATION_OPTIONS, ...options };

    // Start with the full text (prefer plain text, fallback to HTML)
    let processedText = act.fullText || '';

    // Step 1: Strip HTML if present
    if (opts.stripHtml && (act.htmlText || processedText.includes('<'))) {
        processedText = sanitizeHtmlContent(processedText);
    }

    // Step 2: Normalize whitespace
    if (opts.normalizeWhitespace) {
        processedText = normalizeWhitespace(processedText);
    }

    // Step 3: Remove proprietary patterns
    if (opts.removeMetadata) {
        processedText = removeProprietaryPatterns(processedText);
    }

    // Generate content hash for verification
    const contentHash = generateContentHash(processedText);

    return {
        actName: act.actTitle,
        actNumber: act.actNumber,
        rawOfficialText: processedText,
        sourceUrl: act.sourceUrl,
        sanitizedAt: new Date(),
        contentHash,
    };
}

/**
 * Sanitize multiple legislative acts
 */
export function sanitizeLegislativeActs(
    acts: LegislativeAct[],
    options: Partial<SanitizationOptions> = {}
): SanitizedLegalText[] {
    return acts.map(act => sanitizeLegislativeAct(act, options));
}

/**
 * Sanitize raw text input (for texts not from database)
 */
export function sanitizeRawText(
    text: string,
    metadata: { actName: string; actNumber: string; sourceUrl: string; articleNumber?: string },
    options: Partial<SanitizationOptions> = {}
): SanitizedLegalText {
    const opts = { ...DEFAULT_SANITIZATION_OPTIONS, ...options };

    let processedText = text;

    if (opts.stripHtml) {
        processedText = sanitizeHtmlContent(processedText);
    }

    if (opts.normalizeWhitespace) {
        processedText = normalizeWhitespace(processedText);
    }

    if (opts.removeMetadata) {
        processedText = removeProprietaryPatterns(processedText);
    }

    return {
        actName: metadata.actName,
        actNumber: metadata.actNumber,
        articleNumber: metadata.articleNumber,
        rawOfficialText: processedText,
        sourceUrl: metadata.sourceUrl,
        sanitizedAt: new Date(),
        contentHash: generateContentHash(processedText),
    };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate that a text has been properly sanitized
 */
export function validateSanitizedText(text: SanitizedLegalText): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!text.rawOfficialText || text.rawOfficialText.trim().length === 0) {
        issues.push('Text content is empty');
    }

    if (text.rawOfficialText.includes('<') && text.rawOfficialText.includes('>')) {
        issues.push('Text may still contain HTML tags');
    }

    if (!text.actName) {
        issues.push('Act name is missing');
    }

    if (!text.sourceUrl) {
        issues.push('Source URL is missing for citation');
    }

    if (!text.contentHash) {
        issues.push('Content hash is missing');
    }

    // Check for proprietary database mentions in content
    const proprietaryMentions = ['lege5', 'sintact', 'juridice.ro', 'indaco'];
    for (const mention of proprietaryMentions) {
        if (text.rawOfficialText.toLowerCase().includes(mention)) {
            issues.push(`Text contains reference to proprietary database: ${mention}`);
        }
    }

    return {
        valid: issues.length === 0,
        issues,
    };
}
