/**
 * PDF Parsing Service
 * Extracts text from PDF files for exam papers import
 */

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

// Use createRequire for CommonJS module pdf-parse
const require = createRequire(import.meta.url);
const pdfLib = require('pdf-parse');

// Helper to get the actual parsing function or create a wrapper for class-based lib
function getPdfParser() {
    const libToUse = pdfLib.default || pdfLib;
    const ClassRef = pdfLib.PDFParse || (libToUse && libToUse.PDFParse) || libToUse;

    // Check if it's the class-based version (v2+)
    if (ClassRef.prototype && ClassRef.prototype.getText) {
        console.log('[PDF-PARSE] Detected class-based library (v2+). Creating wrapper.');
        return async (buffer: Buffer) => {
            // Correct usage from cli.mjs: new PDFParse({ data: buffer })
            const parser = new ClassRef({ data: buffer });

            try {
                // Extract text
                const textResult = await parser.getText();
                // Extract info (metadata, page count)
                const infoResult = await parser.getInfo();

                // Normalize output to match original pdf-parse interface
                return {
                    text: textResult.text || '',
                    numpages: infoResult.total || 0,
                    info: infoResult.info || {},
                    metadata: infoResult.metadata,
                    version: infoResult.version
                };
            } finally {
                if (parser.destroy) {
                    await parser.destroy();
                }
            }
        };
    }

    // Fallback to standard function-based version (v1)
    console.log('[PDF-PARSE] Detected function-based library (standard).');
    if (typeof ClassRef === 'function') return ClassRef;

    throw new Error(`Could not find compatible PDF parsing function. Keys: ${Object.keys(pdfLib).join(', ')}`);
}

const parsePdfFn = getPdfParser();

interface ParsedPDFResult {
    success: boolean;
    text: string;
    numPages: number;
    info?: {
        title?: string;
        author?: string;
        creationDate?: Date;
    };
    error?: string;
}

/**
 * Parse a PDF file and extract its text content
 */
export async function parsePDF(filePath: string): Promise<ParsedPDFResult> {
    try {
        // Read the file
        const dataBuffer = fs.readFileSync(filePath);

        // Parse the PDF
        const data = await parsePdfFn(dataBuffer);

        return {
            success: true,
            text: data.text,
            numPages: data.numpages,
            info: {
                title: data.info?.Title,
                author: data.info?.Author,
                creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
            }
        };
    } catch (error) {
        console.error('Error parsing PDF:', error);
        return {
            success: false,
            text: '',
            numPages: 0,
            error: error instanceof Error ? error.message : 'Unknown error parsing PDF'
        };
    }
}

/**
 * Parse a PDF from buffer (for uploaded files)
 */
export async function parsePDFBuffer(buffer: Buffer): Promise<ParsedPDFResult> {
    try {
        const data = await parsePdfFn(buffer);

        return {
            success: true,
            text: data.text,
            numPages: data.numpages,
            info: {
                title: data.info?.Title,
                author: data.info?.Author,
                creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
            }
        };
    } catch (error) {
        console.error('Error parsing PDF buffer:', error);
        return {
            success: false,
            text: '',
            numPages: 0,
            error: error instanceof Error ? error.message : 'Unknown error parsing PDF'
        };
    }
}

/**
 * Clean extracted PDF text
 * Removes extra whitespace, page numbers, headers/footers
 */
export function cleanPDFText(text: string): string {
    return text
        // Remove page numbers (common patterns)
        .replace(/\n\s*\d+\s*\n/g, '\n')
        .replace(/pagina?\s*\d+/gi, '')
        // Remove multiple consecutive newlines
        .replace(/\n{3,}/g, '\n\n')
        // Remove leading/trailing whitespace from lines
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        // Remove multiple spaces
        .replace(/  +/g, ' ')
        .trim();
}

/**
 * Detect exam paper type from content
 */
export function detectExamPaperType(text: string): {
    year?: number;
    subject?: 'civil' | 'penal';
    examPart?: 'grile' | 'redactare';
    documentType?: 'subiecte' | 'bareme';
} {
    const result: ReturnType<typeof detectExamPaperType> = {};

    // Try to detect year (2015-2030)
    const yearMatch = text.match(/\b(201[5-9]|202[0-9]|2030)\b/);
    if (yearMatch) {
        result.year = parseInt(yearMatch[1]);
    }

    // Detect subject
    if (text.toLowerCase().includes('drept civil') || text.toLowerCase().includes('cod civil')) {
        result.subject = 'civil';
    } else if (text.toLowerCase().includes('drept penal') || text.toLowerCase().includes('cod penal')) {
        result.subject = 'penal';
    }

    // Detect exam part (grile vs redactare)
    const grileKeywords = ['grilă', 'grile', 'răspuns corect', 'varianta corectă', 'a)', 'b)', 'c)', 'd)'];
    const redactareKeywords = ['speță', 'redactați', 'analizați', 'motivați', 'rezolvați'];

    const grileScore = grileKeywords.filter(kw => text.toLowerCase().includes(kw)).length;
    const redactareScore = redactareKeywords.filter(kw => text.toLowerCase().includes(kw)).length;

    if (grileScore > redactareScore) {
        result.examPart = 'grile';
    } else if (redactareScore > 0) {
        result.examPart = 'redactare';
    }

    // Detect document type
    if (text.toLowerCase().includes('barem') || text.toLowerCase().includes('răspunsuri corecte')) {
        result.documentType = 'bareme';
    } else {
        result.documentType = 'subiecte';
    }

    return result;
}
