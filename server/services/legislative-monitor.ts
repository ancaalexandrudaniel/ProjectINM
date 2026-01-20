/**
 * Legislative Monitor Service
 * 
 * Periodically checks for changes in legislative acts by comparing content hashes.
 * Generates article-level diffs when changes are detected and stores them for
 * the Bulletin Board UI.
 */

import { db } from '../db';
import { legislativeActs, legislativeChangeLog } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getLegislativeScraper, KNOWN_ACTS, type ScrapeResult } from './legislative-scraper';
import crypto from 'crypto';
import { diffLines, Change } from 'diff';

// ============================================================================
// Types
// ============================================================================

export interface DetectedChange {
    actId: string;
    actName: string;
    actNumber: string;
    previousHash: string;
    newHash: string;
    detectedAt: Date;
    diffSummary: string;
    affectedArticles: string[];
}

export interface MonitorSyncResult {
    success: boolean;
    actsChecked: number;
    changesDetected: DetectedChange[];
    errors: string[];
    syncedAt: Date;
}

export interface BulletinBoardItem {
    id: string;
    actName: string;
    actNumber: string;
    changeType: string;
    changeDescription: string | null;
    diffSummary: string | null;
    affectedArticles: string[] | null;
    detectedAt: Date;
    isReviewed: boolean;
}

// ============================================================================
// Legislative Monitor Class
// ============================================================================

class LegislativeMonitor {
    private scraper = getLegislativeScraper();

    /**
     * Check all known acts for updates by comparing content hashes
     */
    async checkForUpdates(): Promise<MonitorSyncResult> {
        const result: MonitorSyncResult = {
            success: true,
            actsChecked: 0,
            changesDetected: [],
            errors: [],
            syncedAt: new Date(),
        };

        console.log('[Monitor] Starting legislative sync check...');

        try {
            // Get all acts from database
            const storedActs = await db.query.legislativeActs.findMany({
                where: eq(legislativeActs.isCurrentVersion, true),
            });

            const storedActsMap = new Map(
                storedActs.map(act => [act.apiSourceId, act])
            );

            // Check each known act
            for (const [actName, actInfo] of Object.entries(KNOWN_ACTS)) {
                result.actsChecked++;
                const sourceId = actInfo.id.toString();

                try {
                    console.log(`[Monitor] Checking: ${actName}`);

                    // Scrape current version
                    const scrapeResult = await this.scraper.scrapeActById(actInfo.id);

                    if (!scrapeResult.success || !scrapeResult.data) {
                        result.errors.push(`Failed to scrape ${actName}: ${scrapeResult.error}`);
                        continue;
                    }

                    const newHash = crypto
                        .createHash('sha256')
                        .update(scrapeResult.data.fullText)
                        .digest('hex');

                    const storedAct = storedActsMap.get(sourceId);

                    if (!storedAct) {
                        // New act - save it
                        console.log(`[Monitor] New act found: ${actName}`);
                        await this.scraper.saveToDatabase(scrapeResult.data);
                        continue;
                    }

                    // Compare hashes
                    if (storedAct.contentHash !== newHash) {
                        console.log(`[Monitor] CHANGE DETECTED: ${actName}`);

                        // Generate diff
                        const diffResult = this.generateDiff(
                            storedAct.fullText,
                            scrapeResult.data.fullText
                        );

                        // Extract affected articles
                        const affectedArticles = this.extractAffectedArticles(diffResult.changes);

                        // Create change record
                        const change: DetectedChange = {
                            actId: storedAct.id,
                            actName: actName,
                            actNumber: storedAct.actNumber,
                            previousHash: storedAct.contentHash,
                            newHash: newHash,
                            detectedAt: new Date(),
                            diffSummary: diffResult.summary,
                            affectedArticles: affectedArticles,
                        };

                        result.changesDetected.push(change);

                        // Save change to database
                        await this.saveChange(change, scrapeResult.data.fullText);
                    }
                } catch (error: any) {
                    result.errors.push(`Error checking ${actName}: ${error.message}`);
                }

                // Rate limiting between acts
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error: any) {
            result.success = false;
            result.errors.push(`Monitor sync failed: ${error.message}`);
        }

        console.log(`[Monitor] Sync complete. Checked: ${result.actsChecked}, Changes: ${result.changesDetected.length}`);
        return result;
    }

    /**
     * Generate a readable diff between old and new text
     */
    generateDiff(oldText: string, newText: string): { summary: string; changes: Change[] } {
        const changes = diffLines(oldText, newText);

        let addedLines = 0;
        let removedLines = 0;
        const significantChanges: string[] = [];

        for (const part of changes) {
            if (part.added) {
                addedLines += part.count || 1;
                // Extract first 100 chars of added content
                const preview = part.value.trim().substring(0, 100);
                if (preview.length > 10) {
                    significantChanges.push(`+ ${preview}...`);
                }
            } else if (part.removed) {
                removedLines += part.count || 1;
            }
        }

        const summary = [
            `**${addedLines} linii adăugate**, **${removedLines} linii eliminate**`,
            '',
            ...significantChanges.slice(0, 5), // Show max 5 changes
        ].join('\n');

        return { summary, changes };
    }

    /**
     * Extract article numbers from diff changes
     */
    private extractAffectedArticles(changes: Change[]): string[] {
        const articles = new Set<string>();
        const articlePattern = /Art\.?\s*(\d+(?:\^?\d*)?)/gi;

        for (const change of changes) {
            if (change.added || change.removed) {
                let match;
                while ((match = articlePattern.exec(change.value)) !== null) {
                    articles.add(`Art. ${match[1]}`);
                }
            }
        }

        return Array.from(articles).slice(0, 20); // Limit to 20 articles
    }

    /**
     * Save detected change to database and propagate to dependent content
     */
    private async saveChange(change: DetectedChange, newFullText: string): Promise<void> {
        // Insert into legislative_change_log
        const [insertedChange] = await db.insert(legislativeChangeLog).values({
            actId: change.actId,
            changeType: 'amendment',
            changeDescription: `Modificare detectată automat la ${change.actName}`,
            oldContentHash: change.previousHash,
            newContentHash: change.newHash,
            affectedArticles: change.affectedArticles,
        }).returning({ id: legislativeChangeLog.id });

        // Update the act with new content
        await db.update(legislativeActs)
            .set({
                fullText: newFullText,
                contentHash: change.newHash,
                needsReview: true,
                updatedAt: new Date(),
            })
            .where(eq(legislativeActs.id, change.actId));

        // Cascade update: propagate change to dependent content
        try {
            const { getCascadeUpdateService } = await import('./cascade-update');
            const cascadeService = getCascadeUpdateService();

            const propagationResult = await cascadeService.propagateChange(
                insertedChange.id,
                change.actName,
                change.affectedArticles,
                newFullText
            );

            console.log(`[Monitor] Cascade update: ${propagationResult.questionsAffected} questions, ` +
                `${propagationResult.caseStudiesAffected} case studies flagged`);
        } catch (cascadeError: any) {
            console.error('[Monitor] Cascade update failed:', cascadeError.message);
            // Don't fail the whole operation if cascade fails
        }
    }

    /**
     * Get recent changes for Bulletin Board
     */
    async getRecentChanges(limit: number = 20): Promise<BulletinBoardItem[]> {
        const changes = await db.query.legislativeChangeLog.findMany({
            orderBy: [desc(legislativeChangeLog.detectedAt)],
            limit: limit,
            with: {
                act: true,
            },
        });

        // TypeScript: handle the relation properly
        return changes.map((change: any) => ({
            id: change.id,
            actName: change.act?.actTitle || 'Unknown',
            actNumber: change.act?.actNumber || '',
            changeType: change.changeType,
            changeDescription: change.changeDescription,
            diffSummary: null, // We'll store this separately
            affectedArticles: change.affectedArticles as string[] | null,
            detectedAt: change.detectedAt,
            isReviewed: change.verifiedByUser || false,
        }));
    }

    /**
     * Get unreviewed changes count (for badge)
     */
    async getUnreviewedCount(): Promise<number> {
        const result = await db.query.legislativeChangeLog.findMany({
            where: eq(legislativeChangeLog.verifiedByUser, false),
        });
        return result.length;
    }

    /**
     * Mark a change as reviewed
     */
    async markAsReviewed(changeId: string, userId: string, notes?: string): Promise<void> {
        await db.update(legislativeChangeLog)
            .set({
                verifiedByUser: true,
                verifiedAt: new Date(),
                verificationNotes: notes,
            })
            .where(eq(legislativeChangeLog.id, changeId));
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

let monitorInstance: LegislativeMonitor | null = null;

export function getLegislativeMonitor(): LegislativeMonitor {
    if (!monitorInstance) {
        monitorInstance = new LegislativeMonitor();
    }
    return monitorInstance;
}

export { LegislativeMonitor };
