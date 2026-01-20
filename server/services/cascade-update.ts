/**
 * Cascade Update Service
 * 
 * Propagates legislative changes to all dependent content:
 * - Questions: Flag for manual review
 * - Case Studies: Flag for manual review  
 * - Legal Articles: Auto-update text
 */

import { db } from '../db';
import { questions, caseStudies, legalArticles } from '@shared/schema';
import { sql, ilike, or } from 'drizzle-orm';

interface AffectedContent {
    questionsAffected: number;
    caseStudiesAffected: number;
    legalArticlesUpdated: number;
    questionIds: string[];
    caseStudyIds: string[];
}

interface PropagationResult extends AffectedContent {
    changeId: string;
    actName: string;
    affectedArticles: string[];
}

/**
 * Maps act names to their law source identifiers in legalArticles
 */
const ACT_NAME_TO_LAW_SOURCE: Record<string, string[]> = {
    'Codul civil': ['Codul civil', 'Cod civil', 'C.civ.', 'C. civ.'],
    'Codul de procedură civilă': ['Codul de procedură civilă', 'Cod procedură civilă', 'C.proc.civ.', 'CPC'],
    'Codul penal': ['Codul penal', 'Cod penal', 'C.pen.', 'C. pen.'],
    'Codul de procedură penală': ['Codul de procedură penală', 'Cod procedură penală', 'C.proc.pen.', 'CPP'],
    'Codul familiei': ['Codul familiei', 'C.fam.'],
    'Legea nr. 287/2009': ['Legea nr. 287/2009', 'L. 287/2009'],
    'Legea nr. 134/2010': ['Legea nr. 134/2010', 'L. 134/2010'],
};

class CascadeUpdateService {
    /**
     * Main entry point: propagate a legislative change to all dependent content
     */
    async propagateChange(
        changeId: string,
        actName: string,
        affectedArticles: string[],
        newActText?: string
    ): Promise<PropagationResult> {
        console.log(`[CascadeUpdate] Propagating change ${changeId} for ${actName}`);
        console.log(`[CascadeUpdate] Affected articles: ${affectedArticles.join(', ')}`);

        const result: PropagationResult = {
            changeId,
            actName,
            affectedArticles,
            questionsAffected: 0,
            caseStudiesAffected: 0,
            legalArticlesUpdated: 0,
            questionIds: [],
            caseStudyIds: [],
        };

        // 1. Flag affected questions
        const questionResult = await this.flagAffectedQuestions(changeId, actName, affectedArticles);
        result.questionsAffected = questionResult.count;
        result.questionIds = questionResult.ids;

        // 2. Flag affected case studies
        const caseStudyResult = await this.flagAffectedCaseStudies(changeId, actName, affectedArticles);
        result.caseStudiesAffected = caseStudyResult.count;
        result.caseStudyIds = caseStudyResult.ids;

        // 3. Auto-update legal articles (if we have new text)
        if (newActText) {
            result.legalArticlesUpdated = await this.updateLegalArticles(actName, affectedArticles, newActText);
        }

        console.log(`[CascadeUpdate] Propagation complete:`, {
            questions: result.questionsAffected,
            caseStudies: result.caseStudiesAffected,
            legalArticles: result.legalArticlesUpdated
        });

        return result;
    }

    /**
     * Find and flag questions that reference affected articles
     */
    private async flagAffectedQuestions(
        changeId: string,
        actName: string,
        affectedArticles: string[]
    ): Promise<{ count: number; ids: string[] }> {
        if (affectedArticles.length === 0) {
            return { count: 0, ids: [] };
        }

        try {
            // Build search patterns for JSONB search
            // legalReferences is JSONB array like: ["Art. 1166 Cod civil", "Art. 1167 Cod civil"]
            const searchPatterns = this.buildSearchPatterns(actName, affectedArticles);

            // Find questions where legalReferences contains any affected article
            // Using raw SQL for JSONB array search
            const affectedQuestions = await db.execute<{ id: string }>(sql`
                SELECT id FROM questions 
                WHERE legal_references IS NOT NULL
                AND (
                    ${sql.join(
                searchPatterns.map(pattern =>
                    sql`legal_references::text ILIKE ${`%${pattern}%`}`
                ),
                sql` OR `
            )}
                )
            `);

            const ids = affectedQuestions.rows.map(q => q.id);

            if (ids.length > 0) {
                // Flag all affected questions
                await db.execute(sql`
                    UPDATE questions 
                    SET needs_legal_review = true,
                        affected_by_change = ${changeId}
                    WHERE id = ANY(${ids}::varchar[])
                `);

                console.log(`[CascadeUpdate] Flagged ${ids.length} questions for review`);
            }

            return { count: ids.length, ids };
        } catch (error) {
            console.error('[CascadeUpdate] Error flagging questions:', error);
            return { count: 0, ids: [] };
        }
    }

    /**
     * Find and flag case studies that reference affected articles
     */
    private async flagAffectedCaseStudies(
        changeId: string,
        actName: string,
        affectedArticles: string[]
    ): Promise<{ count: number; ids: string[] }> {
        if (affectedArticles.length === 0) {
            return { count: 0, ids: [] };
        }

        try {
            const searchPatterns = this.buildSearchPatterns(actName, affectedArticles);

            // Find case studies where referenceArticles contains any affected article
            const affectedCaseStudies = await db.execute<{ id: string }>(sql`
                SELECT id FROM case_studies 
                WHERE reference_articles IS NOT NULL
                AND (
                    ${sql.join(
                searchPatterns.map(pattern =>
                    sql`reference_articles::text ILIKE ${`%${pattern}%`}`
                ),
                sql` OR `
            )}
                )
            `);

            const ids = affectedCaseStudies.rows.map(cs => cs.id);

            if (ids.length > 0) {
                await db.execute(sql`
                    UPDATE case_studies 
                    SET needs_legal_review = true,
                        affected_by_change = ${changeId}
                    WHERE id = ANY(${ids}::varchar[])
                `);

                console.log(`[CascadeUpdate] Flagged ${ids.length} case studies for review`);
            }

            return { count: ids.length, ids };
        } catch (error) {
            console.error('[CascadeUpdate] Error flagging case studies:', error);
            return { count: 0, ids: [] };
        }
    }

    /**
     * Auto-update legalArticles with new content from the act
     * This extracts the new text for each affected article and updates the segments
     */
    private async updateLegalArticles(
        actName: string,
        affectedArticles: string[],
        newActText: string
    ): Promise<number> {
        try {
            const lawSources = ACT_NAME_TO_LAW_SOURCE[actName] || [actName];
            let updatedCount = 0;

            for (const articleRef of affectedArticles) {
                // Extract article number from reference like "Art. 1166" or "Articolul 1166"
                const articleMatch = articleRef.match(/(?:Art\.?|Articolul)\s*(\d+)/i);
                if (!articleMatch) continue;

                const articleNumber = parseInt(articleMatch[1], 10);

                // Extract the new article text from the full act text
                const newArticleText = this.extractArticleText(newActText, articleNumber);
                if (!newArticleText) continue;

                // Update legalArticles where articleNumber matches and lawSource matches
                for (const lawSource of lawSources) {
                    const result = await db.execute(sql`
                        UPDATE legal_articles
                        SET segments = jsonb_set(
                            COALESCE(segments, '{}'::jsonb),
                            '{official}',
                            to_jsonb(${newArticleText}::text)
                        ),
                        raw_content = ${newArticleText},
                        is_processed_for_rag = false
                        WHERE article_number = ${articleNumber}
                        AND law_source ILIKE ${`%${lawSource}%`}
                    `);

                    if (result.rowCount && result.rowCount > 0) {
                        updatedCount += result.rowCount;
                    }
                }
            }

            if (updatedCount > 0) {
                console.log(`[CascadeUpdate] Updated ${updatedCount} legal articles`);
            }

            return updatedCount;
        } catch (error) {
            console.error('[CascadeUpdate] Error updating legal articles:', error);
            return 0;
        }
    }

    /**
     * Extract article text from full act text
     */
    private extractArticleText(fullText: string, articleNumber: number): string | null {
        // Pattern to find the article start
        const startPattern = new RegExp(
            `(?:Art\\.?|Articolul)\\s*${articleNumber}[.\\s\\-–—]`,
            'i'
        );

        // Pattern to find the next article (or end)
        const nextPattern = new RegExp(
            `(?:Art\\.?|Articolul)\\s*${articleNumber + 1}[.\\s\\-–—]`,
            'i'
        );

        const startMatch = fullText.match(startPattern);
        if (!startMatch || startMatch.index === undefined) {
            return null;
        }

        const startIndex = startMatch.index;
        const afterStart = fullText.substring(startIndex);

        const nextMatch = afterStart.match(nextPattern);
        const endIndex = nextMatch && nextMatch.index !== undefined
            ? startIndex + nextMatch.index
            : Math.min(startIndex + 5000, fullText.length); // Max 5000 chars per article

        return fullText.substring(startIndex, endIndex).trim();
    }

    /**
     * Build search patterns for JSONB text search
     */
    private buildSearchPatterns(actName: string, affectedArticles: string[]): string[] {
        const patterns: string[] = [];

        for (const article of affectedArticles) {
            // Extract just the number
            const numMatch = article.match(/\d+/);
            if (numMatch) {
                const num = numMatch[0];
                // Add various patterns that might appear in references
                patterns.push(`Art. ${num}`);
                patterns.push(`Art.${num}`);
                patterns.push(`Articolul ${num}`);
                patterns.push(`art. ${num}`);
            }
            // Also search for the full reference string
            patterns.push(article);
        }

        return patterns;
    }

    /**
     * Get count of content needing legal review
     */
    async getReviewStats(): Promise<{
        questionsNeedingReview: number;
        caseStudiesNeedingReview: number;
    }> {
        const [questionCount, caseStudyCount] = await Promise.all([
            db.execute<{ count: string }>(sql`
                SELECT COUNT(*) as count FROM questions WHERE needs_legal_review = true
            `),
            db.execute<{ count: string }>(sql`
                SELECT COUNT(*) as count FROM case_studies WHERE needs_legal_review = true
            `)
        ]);

        return {
            questionsNeedingReview: parseInt(questionCount.rows[0]?.count || '0', 10),
            caseStudiesNeedingReview: parseInt(caseStudyCount.rows[0]?.count || '0', 10)
        };
    }

    /**
     * Clear review flag after manual review
     */
    async markReviewed(type: 'question' | 'caseStudy', id: string): Promise<void> {
        if (type === 'question') {
            await db.execute(sql`
                UPDATE questions 
                SET needs_legal_review = false, affected_by_change = NULL
                WHERE id = ${id}
            `);
        } else {
            await db.execute(sql`
                UPDATE case_studies 
                SET needs_legal_review = false, affected_by_change = NULL
                WHERE id = ${id}
            `);
        }
    }
}

// Singleton instance
let cascadeUpdateInstance: CascadeUpdateService | null = null;

export function getCascadeUpdateService(): CascadeUpdateService {
    if (!cascadeUpdateInstance) {
        cascadeUpdateInstance = new CascadeUpdateService();
    }
    return cascadeUpdateInstance;
}

export type { AffectedContent, PropagationResult };
