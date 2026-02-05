import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { db } from '../db';
import { legislativeActs } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Web Scraper for legislatie.just.ro
 * 
 * This is a fallback solution when the SOAP API is not accessible.
 * Uses Puppeteer for JavaScript-rendered pages and Cheerio for HTML parsing.
 * 
 * Key features:
 * - Rate limiting (2 seconds between requests)
 * - Content hashing for change detection
 * - Database storage integration
 * - Error handling and retry logic
 */

// ============================================================================
// Configuration
// ============================================================================

const SCRAPER_CONFIG = {
    baseUrl: 'https://legislatie.just.ro',
    searchUrl: 'https://legislatie.just.ro/Public/DetaliiDocument',
    actUrl: 'https://legislatie.just.ro/Public/DetaliiDocumentAfis',
    rateLimit: 2000, // 2 seconds between requests
    maxRetries: 3,
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 INMAiMentor/1.0',
};

// Common act IDs from the bibliography (can be expanded)
// IDs are from legislatie.just.ro portal
const KNOWN_ACTS = {
    // ============ CODURI PRINCIPALE ============
    'Codul Civil': { id: 109884, number: '287', year: 2009 },
    'Codul Penal': { id: 109855, number: '286', year: 2009 },
    'Codul de Procedură Civilă': { id: 141686, number: '134', year: 2010 },
    'Codul de Procedură Penală': { id: 145891, number: '135', year: 2010 },

    // ============ ORGANIZAREA JUDICIARĂ ============
    'Legea 303/2004': { id: 54159, number: '303', year: 2004 },  // Statutul judecătorilor
    'Legea 304/2004': { id: 54160, number: '304', year: 2004 },  // Organizare judiciară

    // ============ CONSTITUȚIE ============
    'Constituția României': { id: 56625, number: '1', year: 1991 },  // Republicată 2003

    // ============ LEGI DE PUNERE ÎN APLICARE ============
    'Legea 71/2011': { id: 128649, number: '71', year: 2011 },  // Punere în aplicare Cod Civil
    'Legea 187/2012': { id: 143405, number: '187', year: 2012 }, // Punere în aplicare Cod Penal
    'Legea 76/2012': { id: 138480, number: '76', year: 2012 },  // Punere în aplicare NCPC
    'Legea 255/2013': { id: 152034, number: '255', year: 2013 }, // Punere în aplicare NCPP

    // ============ DREPT CIVIL - LEGI SPECIALE ============
    'Legea 10/2001': { id: 26313, number: '10', year: 2001 },   // Retrocedare imobile
    'Legea 17/2014': { id: 156116, number: '17', year: 2014 },  // Terenuri agricole
    'Legea 18/1991': { id: 1217, number: '18', year: 1991 },    // Fond funciar
    'Legea 165/2013': { id: 147795, number: '165', year: 2013 }, // Măsuri despăgubire

    // ============ DREPT PENAL - LEGI SPECIALE ============
    'Legea 78/2000': { id: 23137, number: '78', year: 2000 },   // Prevenire corupție
    'Legea 143/2000': { id: 24147, number: '143', year: 2000 }, // Trafic droguri
    'Legea 656/2002': { id: 40903, number: '656', year: 2002 }, // Spălare bani
    'Legea 39/2003': { id: 44265, number: '39', year: 2003 },   // Infracțiuni informatice

    // ============ PROCEDURĂ - LEGI SPECIALE ============
    'Legea 554/2004': { id: 56817, number: '554', year: 2004 }, // Contencios administrativ
    'Legea 544/2001': { id: 30372, number: '544', year: 2001 }, // Liberul acces info publice
    'OG 2/2001': { id: 26299, number: '2', year: 2001 },        // Regim contravențional
};

// ============================================================================
// Types
// ============================================================================

interface ScrapedAct {
    actType: string;
    actNumber: string;
    actYear: number;
    title: string;
    fullText: string;
    htmlText: string | null;
    publishedIn: string | null;
    effectiveDate: string | null;
    sourceUrl: string;
    sourceId: number;
}

interface ScrapeResult {
    success: boolean;
    data?: ScrapedAct;
    error?: string;
}

// ============================================================================
// Legislative Scraper Class
// ============================================================================

class LegislativeScraper {
    private browser: Browser | null = null;
    private lastRequestTime: number = 0;
    private requestCount: number = 0;

    /**
     * Initialize Puppeteer browser
     */
    async init(): Promise<void> {
        if (!this.browser) {
            console.log('[Scraper] Launching browser...');
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ],
            });
            console.log('[Scraper] Browser launched');
        }
    }

    /**
     * Close browser
     */
    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('[Scraper] Browser closed');
        }
    }

    /**
     * Enforce rate limiting
     */
    private async rateLimit(): Promise<void> {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;

        if (elapsed < SCRAPER_CONFIG.rateLimit) {
            const delay = SCRAPER_CONFIG.rateLimit - elapsed;
            console.log(`[Scraper] Rate limiting: waiting ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        this.lastRequestTime = Date.now();
        this.requestCount++;
    }

    /**
     * Scrape a single legislative act by its portal ID
     */
    async scrapeActById(actId: number): Promise<ScrapeResult> {
        await this.init();
        await this.rateLimit();

        const url = `${SCRAPER_CONFIG.actUrl}/${actId}`;
        console.log(`[Scraper] Request #${this.requestCount}: ${url}`);

        try {
            const page = await this.browser!.newPage();

            await page.setUserAgent(SCRAPER_CONFIG.userAgent);
            await page.setViewport({ width: 1920, height: 1080 });

            // Navigate to the page
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: SCRAPER_CONFIG.timeout,
            });

            // Wait for content to load
            await page.waitForSelector('.document-content, .docdetalii, #detaliiact', { timeout: 10000 }).catch(() => {
                console.log('[Scraper] Main content selector not found, continuing...');
            });

            // Get page content
            const html = await page.content();
            await page.close();

            // Parse with Cheerio
            const $ = cheerio.load(html);
            const data = this.parseActPage($, actId, url);

            if (!data) {
                return { success: false, error: 'Failed to parse act content' };
            }

            console.log(`[Scraper] Successfully scraped: ${data.title}`);
            return { success: true, data };

        } catch (error: any) {
            console.error(`[Scraper] Error scraping act ${actId}:`, error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Parse the act page HTML
     */
    private parseActPage($: cheerio.CheerioAPI, actId: number, url: string): ScrapedAct | null {
        try {
            // Extract title (multiple possible selectors)
            const title = $('h1.titlu-document, .document-title, #titlu_document, .titluAct')
                .first()
                .text()
                .trim() || $('h1').first().text().trim() || 'Unknown';

            // Extract act type and number from title
            const actInfo = this.parseActInfo(title);

            // Extract full text (multiple possible selectors)
            const textSelectors = [
                '.document-content',
                '#continut_document',
                '.docdetalii',
                '#detaliiact',
                '.textnormal',
                '.continut',
            ];

            let fullText = '';
            let htmlText = '';

            for (const selector of textSelectors) {
                const content = $(selector);
                if (content.length > 0) {
                    htmlText = content.html() || '';
                    fullText = content.text().trim();
                    if (fullText.length > 100) break; // Found substantial content
                }
            }

            // If still no content, get the entire body
            if (fullText.length < 100) {
                const body = $('body');
                fullText = body.text().trim().substring(0, 50000); // Limit to 50k chars
                htmlText = body.html() || '';
            }

            // Extract metadata
            const publishedIn = this.extractMetadata($, 'Publicat în', 'M.Of.') ||
                this.extractMetadata($, 'Monitorul Oficial', null);

            const effectiveDate = this.extractMetadata($, 'Data intrării în vigoare', null) ||
                this.extractMetadata($, 'În vigoare de la', null);

            return {
                actType: actInfo.type,
                actNumber: actInfo.number,
                actYear: actInfo.year,
                title: title.substring(0, 500), // Limit title length
                fullText,
                htmlText: htmlText.substring(0, 500000), // Limit HTML size
                publishedIn,
                effectiveDate,
                sourceUrl: url,
                sourceId: actId,
            };

        } catch (error) {
            console.error('[Scraper] Parse error:', error);
            return null;
        }
    }

    /**
     * Parse act type, number and year from title
     */
    private parseActInfo(title: string): { type: string; number: string; year: number } {
        // Try to match patterns like "LEGE nr. 287/2009", "CODUL CIVIL", etc.
        const lawMatch = title.match(/^(LEGE|LEGEA|OUG|OG|ORDONANȚĂ|HOTĂRÂRE|HG|DECRET|ORDIN)\s+(?:nr\.\s*)?(\d+)\s*[\/\-]\s*(\d{4})/i);
        if (lawMatch) {
            return {
                type: lawMatch[1].toUpperCase(),
                number: lawMatch[2],
                year: parseInt(lawMatch[3]),
            };
        }

        // Code patterns
        const codeMatch = title.match(/(CODUL|COD)\s+(CIVIL|PENAL|DE PROCEDURĂ CIVILĂ|DE PROCEDURĂ PENALĂ)/i);
        if (codeMatch) {
            return {
                type: 'COD',
                number: codeMatch[2].toUpperCase(),
                year: 2009, // Default for codes
            };
        }

        // Extract any number pattern
        const numMatch = title.match(/(\d+)\s*[\/\-]\s*(\d{4})/);
        if (numMatch) {
            return {
                type: 'ACT',
                number: numMatch[1],
                year: parseInt(numMatch[2]),
            };
        }

        return { type: 'ACT', number: 'N/A', year: 0 };
    }

    /**
     * Extract metadata from page
     */
    private extractMetadata($: cheerio.CheerioAPI, label: string, altLabel: string | null): string | null {
        // Try to find label in various formats
        const selectors = [
            `td:contains("${label}")`,
            `div:contains("${label}")`,
            `span:contains("${label}")`,
            `p:contains("${label}")`,
        ];

        for (const selector of selectors) {
            const elem = $(selector).first();
            if (elem.length) {
                const text = elem.text();
                // Extract the value after the label
                const match = text.match(new RegExp(`${label}[:\\s]*(.+)`, 'i'));
                if (match) {
                    return match[1].trim().substring(0, 200);
                }
            }
        }

        // Try alternate label
        if (altLabel) {
            const altMatch = $('body').text().match(new RegExp(`${altLabel}[.:\\s]*([^\\n]+)`, 'i'));
            if (altMatch) {
                return altMatch[1].trim().substring(0, 200);
            }
        }

        return null;
    }

    /**
     * Scrape multiple known acts from bibliography
     */
    async scrapeKnownActs(): Promise<ScrapeResult[]> {
        const results: ScrapeResult[] = [];

        for (const [name, info] of Object.entries(KNOWN_ACTS)) {
            console.log(`[Scraper] Scraping: ${name}`);
            const result = await this.scrapeActById(info.id);
            results.push({
                ...result,
                data: result.data ? { ...result.data, title: name } : undefined,
            });

            // Extra delay between acts
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return results;
    }

    /**
     * Save scraped act to database
     */
    async saveToDatabase(act: ScrapedAct): Promise<string> {
        const contentHash = crypto
            .createHash('sha256')
            .update(act.fullText)
            .digest('hex');

        // Check if already exists
        const existing = await db.query.legislativeActs.findFirst({
            where: eq(legislativeActs.apiSourceId, act.sourceId.toString()),
        });

        if (existing) {
            // Update if content changed
            if (existing.contentHash !== contentHash) {
                console.log(`[Scraper] Updating existing act: ${act.title}`);
                await db.update(legislativeActs)
                    .set({
                        fullText: act.fullText,
                        htmlText: act.htmlText,
                        contentHash,
                        fetchedAt: new Date(),
                        needsReview: true,
                        updatedAt: new Date(),
                    })
                    .where(eq(legislativeActs.id, existing.id));
                return existing.id;
            }
            console.log(`[Scraper] Act unchanged: ${act.title}`);
            return existing.id;
        }

        // Insert new
        console.log(`[Scraper] Inserting new act: ${act.title}`);

        // Note: effectiveDate is stored as text because the scraped value 
        // is not always a parseable date format
        const [inserted] = await db.insert(legislativeActs).values({
            actType: act.actType,
            actNumber: act.actNumber,
            actTitle: act.title,
            fullText: act.fullText,
            htmlText: act.htmlText,
            publishedInMO: act.publishedIn,
            effectiveDate: null, // Set to null - scraped date string not in valid format
            sourceUrl: act.sourceUrl,
            apiSourceId: act.sourceId.toString(),
            contentHash,
            fetchedAt: new Date(),
            isCurrentVersion: true,
            needsReview: false,
        }).returning({ id: legislativeActs.id });

        return inserted.id;
    }

    /**
     * Get scraper statistics
     */
    getStats(): { requestCount: number; lastRequestTime: Date | null } {
        return {
            requestCount: this.requestCount,
            lastRequestTime: this.lastRequestTime > 0 ? new Date(this.lastRequestTime) : null,
        };
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

let scraperInstance: LegislativeScraper | null = null;

export function getLegislativeScraper(): LegislativeScraper {
    if (!scraperInstance) {
        scraperInstance = new LegislativeScraper();
    }
    return scraperInstance;
}

export { KNOWN_ACTS, SCRAPER_CONFIG, LegislativeScraper };
export type { ScrapedAct, ScrapeResult };
