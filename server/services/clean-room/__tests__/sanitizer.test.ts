/**
 * Clean Room Sanitizer Unit Tests
 * 
 * Tests for the data sanitization layer to ensure proper cleaning
 * of HTML, metadata, and proprietary patterns.
 */

import { describe, it, expect } from 'vitest';
import {
    sanitizeHtmlContent,
    normalizeWhitespace,
    filterMetadata,
    removeProprietaryPatterns,
    generateContentHash,
    validateSanitizedText,
} from '../sanitizer';
import type { SanitizedLegalText } from '../types';

describe('sanitizeHtmlContent', () => {
    it('should remove all HTML tags', () => {
        const input = '<p>Art. 1166 <strong>Cod Civil</strong></p>';
        const result = sanitizeHtmlContent(input);
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
    });

    it('should preserve text content', () => {
        const input = '<p>Contractul este acordul de voințe.</p>';
        const result = sanitizeHtmlContent(input);
        expect(result).toContain('Contractul este acordul de voințe.');
    });

    it('should decode HTML entities', () => {
        const input = 'Art. 5 &amp; Art. 6 &lt;important&gt;';
        const result = sanitizeHtmlContent(input);
        expect(result).toContain('Art. 5 & Art. 6 <important>');
    });

    it('should handle empty input', () => {
        expect(sanitizeHtmlContent('')).toBe('');
        expect(sanitizeHtmlContent(null as any)).toBe('');
    });

    it('should normalize Romanian diacritics', () => {
        const input = 'Legea prevede că şi ţara...'; // cedilla versions
        const result = sanitizeHtmlContent(input);
        expect(result).toContain('ș'); // comma-below version
        expect(result).toContain('ț');
    });
});

describe('normalizeWhitespace', () => {
    it('should remove multiple spaces', () => {
        const input = 'Text   cu    multe    spații';
        const result = normalizeWhitespace(input);
        expect(result).toBe('Text cu multe spații');
    });

    it('should limit multiple newlines to max 2', () => {
        const input = 'Para 1\n\n\n\n\nPara 2';
        const result = normalizeWhitespace(input);
        expect(result).toBe('Para 1\n\nPara 2');
    });

    it('should trim lines', () => {
        const input = '  Line 1  \n  Line 2  ';
        const result = normalizeWhitespace(input);
        expect(result).toBe('Line 1\nLine 2');
    });

    it('should handle empty input', () => {
        expect(normalizeWhitespace('')).toBe('');
    });
});

describe('filterMetadata', () => {
    it('should remove specified fields', () => {
        const input = {
            text: 'Legal text',
            editor_notes: 'Some notes',
            history_log: ['change1'],
            title: 'Title',
        };
        const result = filterMetadata(input, ['editor_notes', 'history_log']);

        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('title');
        expect(result).not.toHaveProperty('editor_notes');
        expect(result).not.toHaveProperty('history_log');
    });

    it('should return all fields if no exclusions', () => {
        const input = { a: 1, b: 2 };
        const result = filterMetadata(input, []);
        expect(result).toEqual(input);
    });
});

describe('removeProprietaryPatterns', () => {
    it('should remove database name references', () => {
        const input = 'Text preluat de pe Lege5.ro și Sintact.ro';
        const result = removeProprietaryPatterns(input);
        expect(result.toLowerCase()).not.toContain('lege5');
        expect(result.toLowerCase()).not.toContain('sintact');
    });

    it('should remove copyright notices', () => {
        const input = 'Legal text. Copyright © 2024 Wolters Kluwer. Toate drepturile rezervate.';
        const result = removeProprietaryPatterns(input);
        expect(result).not.toContain('Copyright');
        expect(result).not.toContain('Toate drepturile rezervate');
    });

    it('should preserve clean legal text', () => {
        const input = 'Art. 1166 din Codul Civil definește contractul.';
        const result = removeProprietaryPatterns(input);
        expect(result).toContain('Art. 1166 din Codul Civil');
    });
});

describe('generateContentHash', () => {
    it('should generate consistent hash for same content', () => {
        const text = 'Test content';
        const hash1 = generateContentHash(text);
        const hash2 = generateContentHash(text);
        expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different content', () => {
        const hash1 = generateContentHash('Content A');
        const hash2 = generateContentHash('Content B');
        expect(hash1).not.toBe(hash2);
    });

    it('should generate 64-character hex string (SHA-256)', () => {
        const hash = generateContentHash('Test');
        expect(hash).toHaveLength(64);
        expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
});

describe('validateSanitizedText', () => {
    const validText: SanitizedLegalText = {
        actName: 'Codul Civil',
        actNumber: '287/2009',
        rawOfficialText: 'Art. 1166 - Contractul este acordul de voințe.',
        sourceUrl: 'https://legislatie.just.ro/Public/DetaliiDocument/109884',
        sanitizedAt: new Date(),
        contentHash: 'abc123',
    };

    it('should validate correct sanitized text', () => {
        const result = validateSanitizedText(validText);
        expect(result.valid).toBe(true);
        expect(result.issues).toHaveLength(0);
    });

    it('should detect empty text content', () => {
        const invalid = { ...validText, rawOfficialText: '' };
        const result = validateSanitizedText(invalid);
        expect(result.valid).toBe(false);
        expect(result.issues).toContain('Text content is empty');
    });

    it('should detect HTML tags in content', () => {
        const invalid = { ...validText, rawOfficialText: '<p>Still has HTML</p>' };
        const result = validateSanitizedText(invalid);
        expect(result.issues.some(i => i.includes('HTML'))).toBe(true);
    });

    it('should detect proprietary database mentions', () => {
        const invalid = { ...validText, rawOfficialText: 'Text from Lege5 database' };
        const result = validateSanitizedText(invalid);
        expect(result.issues.some(i => i.includes('lege5'))).toBe(true);
    });

    it('should detect missing source URL', () => {
        const invalid = { ...validText, sourceUrl: '' };
        const result = validateSanitizedText(invalid);
        expect(result.issues.some(i => i.includes('Source URL'))).toBe(true);
    });
});
