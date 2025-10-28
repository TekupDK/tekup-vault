import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const router: RouterType = Router();

/**
 * GET /api/sync-status
 * Returns sync status for all repositories
 */
router.get('/sync-status', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('vault_sync_status')
      .select('id, source, repository, status, last_sync_at, error_message')
      .order('last_sync_at', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to fetch sync status');
      res.status(503).json({ success: false, error: 'Service temporarily unavailable' });
      return;
    }

    res.json({ success: true, items: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    logger.error({ error: message }, 'Sync status exception');
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;

