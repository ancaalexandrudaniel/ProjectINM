/**
 * Clean Room API Routes
 * 
 * REST endpoints for Clean Room AI content generation.
 * All endpoints require authentication and log to audit trail.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
    explainLegalConcept,
    explainQuestion,
    synthesizeLegalTopic,
    isCleanRoomReady,
    getAgentConfiguration,
    sanitizeRawText,
    LegalConceptOutputSchema,
} from './index';

const router = Router();

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

const ExplainConceptRequestSchema = z.object({
    query: z.string().min(1, 'Query is required'),
    legislativeActIds: z.array(z.string()).min(1, 'At least one legislative act ID is required'),
});

const ExplainQuestionRequestSchema = z.object({
    questionText: z.string().min(1, 'Question text is required'),
    correctAnswer: z.string().min(1, 'Correct answer is required'),
    legislativeActIds: z.array(z.string()).min(1, 'At least one legislative act ID is required'),
});

const SynthesizeTopicRequestSchema = z.object({
    topic: z.string().min(1, 'Topic is required'),
    legislativeActIds: z.array(z.string()).min(1, 'At least one legislative act ID is required'),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/clean-room/status
 * Check if Clean Room is properly configured
 */
router.get('/status', (_req: Request, res: Response) => {
    const isReady = isCleanRoomReady();
    res.json({
        ready: isReady,
        message: isReady
            ? 'Clean Room is ready for content generation'
            : 'Clean Room is not configured. Missing GEMINI_API_KEY.',
    });
});

/**
 * GET /api/clean-room/config
 * Get the agent configuration (for debugging/transparency)
 */
router.get('/config', (_req: Request, res: Response) => {
    const config = getAgentConfiguration();
    res.json({
        agent: config.agent_configuration,
        note: 'This is the Clean Room agent configuration used for all generations.',
    });
});

/**
 * POST /api/clean-room/explain-concept
 * Generate a legal concept explanation using Clean Room methodology
 */
router.post('/explain-concept', async (req: Request, res: Response) => {
    try {
        // Validate request
        const parseResult = ExplainConceptRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                details: parseResult.error.errors,
            });
        }

        const { query, legislativeActIds } = parseResult.data;

        // Get user ID from session (if authenticated)
        const userId = (req as any).session?.userId;

        // Generate content
        const result = await explainLegalConcept(query, legislativeActIds, userId);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error,
            });
        }

        return res.json({
            success: true,
            data: result.data,
            metadata: {
                auditLogId: result.auditLogId,
                contextSourcesUsed: result.contextSourcesUsed,
            },
        });

    } catch (error) {
        console.error('[CleanRoom API] Error in explain-concept:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * POST /api/clean-room/explain-question
 * Generate an explanation for a quiz question answer
 */
router.post('/explain-question', async (req: Request, res: Response) => {
    try {
        const parseResult = ExplainQuestionRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                details: parseResult.error.errors,
            });
        }

        const { questionText, correctAnswer, legislativeActIds } = parseResult.data;
        const userId = (req as any).session?.userId;

        const result = await explainQuestion(
            questionText,
            correctAnswer,
            legislativeActIds,
            userId
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error,
            });
        }

        return res.json({
            success: true,
            data: result.data,
            metadata: {
                auditLogId: result.auditLogId,
                contextSourcesUsed: result.contextSourcesUsed,
            },
        });

    } catch (error) {
        console.error('[CleanRoom API] Error in explain-question:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * POST /api/clean-room/synthesize
 * Generate a legal topic synthesis
 */
router.post('/synthesize', async (req: Request, res: Response) => {
    try {
        const parseResult = SynthesizeTopicRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                details: parseResult.error.errors,
            });
        }

        const { topic, legislativeActIds } = parseResult.data;
        const userId = (req as any).session?.userId;

        const result = await synthesizeLegalTopic(topic, legislativeActIds, userId);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error,
            });
        }

        return res.json({
            success: true,
            data: result.data,
            metadata: {
                auditLogId: result.auditLogId,
                contextSourcesUsed: result.contextSourcesUsed,
            },
        });

    } catch (error) {
        console.error('[CleanRoom API] Error in synthesize:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

/**
 * POST /api/clean-room/generate-article-breakdown
 * Generate educational breakdown for a legal article with 7 segments
 * Used to populate legalArticles table
 */
router.post('/generate-article-breakdown', async (req: Request, res: Response) => {
    try {
        const GenerateBreakdownRequestSchema = z.object({
            articleNumber: z.number().int().positive(),
            articleText: z.string().min(10, 'Article text is required'),
            actName: z.string().min(1, 'Act name is required (e.g., "Codul Civil")'),
            subject: z.enum(['civil', 'civil-procedural', 'penal', 'penal-procedural']),
        });

        const parseResult = GenerateBreakdownRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                details: parseResult.error.errors,
            });
        }

        const { articleNumber, articleText, actName, subject } = parseResult.data;
        const userId = (req as any).session?.userId;

        // Import the function
        const { generateArticleBreakdown } = await import('./index');

        const result = await generateArticleBreakdown(
            articleNumber,
            articleText,
            actName,
            userId
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error,
            });
        }

        // The result.data contains the full breakdown with segments
        return res.json({
            success: true,
            data: result.data,
            subject, // Pass through for storage
            metadata: {
                auditLogId: result.auditLogId,
                contextSourcesUsed: result.contextSourcesUsed,
            },
        });

    } catch (error) {
        console.error('[CleanRoom API] Error in generate-article-breakdown:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
});

export default router;

// Export for use in main routes file
export { router as cleanRoomRoutes };

