import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import crypto from 'crypto';
import { loadConfig } from '@tekupvault/vault-core';
import { logger } from '../lib/logger';

const router: RouterType = Router();
const config = loadConfig();

/**
 * Verify GitHub webhook signature
 */
function verifyGitHubSignature(payload: string, signature: string): boolean {
  if (!config.GITHUB_WEBHOOK_SECRET) {
    logger.warn('GitHub webhook secret not configured');
    return false;
  }

  const hmac = crypto.createHmac('sha256', config.GITHUB_WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * POST /webhook/github
 * GitHub webhook handler
 */
router.post('/github', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const eventHeader = req.headers['x-github-event'];
    const event = typeof eventHeader === 'string' ? eventHeader : '';

    if (!signature) {
      res.status(401).json({ error: 'Missing signature' });
      return;
    }

    // Verify signature
    const payload = JSON.stringify(req.body);
    if (!verifyGitHubSignature(payload, signature)) {
      logger.warn('Invalid GitHub webhook signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Log the webhook event (avoid unsafe any access)
    const body = req.body as unknown as { repository?: { full_name?: string } };
    const repoName = body?.repository?.full_name || 'unknown';
    logger.info({ event, repository: repoName }, 'GitHub webhook received');

    // Acknowledge webhook immediately
    res.status(202).json({ message: 'Webhook received' });

    // TODO: Trigger async sync job
    // This should be handled by the worker service

  } catch (error) {
    logger.error({ error }, 'Webhook processing failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
