import { EmbeddingService } from '@tekupvault/vault-search';
import { loadConfig } from '@tekupvault/vault-core';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const config = loadConfig();

/**
 * Index all unindexed documents
 */
export async function indexDocuments(): Promise<void> {
  // Skip indexing if OpenAI API key not configured
  if (!config.OPENAI_API_KEY) {
    logger.info('Document indexing skipped (OPENAI_API_KEY not configured)');
    return;
  }

  const startTime = Date.now();
  logger.info('Starting document indexing job');

  try {
    const embeddingService = new EmbeddingService(
      config.OPENAI_API_KEY,
      supabase,
      logger
    );

    const indexed = await embeddingService.indexUnindexedDocuments();

    const duration = Date.now() - startTime;
    logger.info({ duration, indexed }, 'Document indexing job completed');
  } catch (error) {
    logger.error({ error }, 'Document indexing job failed');
    throw error;
  }
}
