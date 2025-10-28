import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { EmbeddingService } from '@tekupvault/vault-search';
import { SearchQuerySchema, loadConfig } from '@tekupvault/vault-core';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { requireApiKey } from '../middleware/auth';

const router: RouterType = Router();
const config = loadConfig();

const embeddingService = new EmbeddingService(
  config.OPENAI_API_KEY || 'placeholder_key',
  supabase,
  logger
);

/**
 * POST /api/search
 * Semantic search endpoint
 */
router.post('/search', requireApiKey, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const query = SearchQuerySchema.parse(req.body);

    // Perform search
    const results = await embeddingService.search(query.query, {
      limit: query.limit,
      threshold: query.threshold,
      source: query.source,
      repository: query.repository
    });

    res.json({
      success: true,
      results,
      count: results.length
    });
  } catch (error) {
    const isDev = process.env.NODE_ENV !== 'production';
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: message }, 'Search request failed');

    if (message.includes('fetch failed') || message.includes('TypeError')) {
      res.status(503).json({ success: false, error: 'Service temporarily unavailable' });
      return;
    }

    res.status(400).json({
      success: false,
      error: 'Invalid request',
      ...(isDev ? { details: message } : {})
    });
  }
});

export default router;
