import { Request, Response, NextFunction } from 'express';
import { loadConfig } from '@tekupvault/vault-core';
import { logger } from '../lib/logger';

const config = loadConfig();

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const configuredKey = config.API_KEY;

  if (!configuredKey) {
    logger.error('API key not configured');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  const headerKey = req.header('x-api-key');
  if (!headerKey || headerKey !== configuredKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}


