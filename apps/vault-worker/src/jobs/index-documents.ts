import { EmbeddingService, PostgresEmbeddingService } from '@tekupvault/vault-search';
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
  // Only use Supabase when explicitly enabled; otherwise use direct Postgres via DATABASE_URL
  const useSupabase = process.env.VAULT_USE_SUPABASE === 'true' && Boolean(config.SUPABASE_URL && (config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY));
    let indexed = 0;

    if (useSupabase) {
      const svc = new EmbeddingService(
        config.OPENAI_API_KEY,
        supabase,
        logger
      );
      indexed = await svc.indexUnindexedDocuments();
    } else {
      const svc = new PostgresEmbeddingService(
        config.OPENAI_API_KEY,
        config.DATABASE_URL,
        logger
      );
      try {
        indexed = await svc.indexUnindexedDocuments();
      } finally {
        await svc.close();
      }
    }

    const duration = Date.now() - startTime;
    logger.info({ duration, indexed }, 'Document indexing job completed');
  } catch (error) {
    logger.error({ error }, 'Document indexing job failed');
    throw error;
  }
}
