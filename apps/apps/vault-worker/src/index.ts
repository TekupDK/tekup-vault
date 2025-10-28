import 'dotenv/config';
import { loadConfig, SYNC_CONFIG } from '@tekupvault/vault-core';
import { logger } from './lib/logger';
import { syncAllGitHubRepos } from './jobs/sync-github';
import { syncLocalWorkspace } from './jobs/sync-local';
import { indexDocuments } from './jobs/index-documents';

const config = loadConfig();

/**
 * Run all worker jobs
 */
async function runJobs(): Promise<void> {
  try {
    logger.info('Starting worker jobs');

    // Sync GitHub repositories
    await syncAllGitHubRepos();

    // Sync local workspace (if enabled)
    if (process.env.LOCAL_SYNC_ENABLED === 'true') {
      await syncLocalWorkspace();
    } else {
      logger.info('Local sync disabled (set LOCAL_SYNC_ENABLED=true to enable)');
    }

    // Index unindexed documents
    await indexDocuments();

    logger.info('All worker jobs completed');
  } catch (error) {
    logger.error({ error }, 'Worker jobs failed');
  }
}

/**
 * Schedule recurring jobs
 */
function scheduleJobs(): void {
  const intervalMs = SYNC_CONFIG.intervalHours * 60 * 60 * 1000;
  
  logger.info({ 
    intervalHours: SYNC_CONFIG.intervalHours 
  }, 'Scheduling recurring jobs');

  setInterval(() => {
    void runJobs();
  }, intervalMs);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  logger.info({ 
    env: config.NODE_ENV,
    intervalHours: SYNC_CONFIG.intervalHours 
  }, 'Vault Worker starting');

  // Run jobs immediately on startup
  await runJobs();

  // Schedule recurring jobs
  scheduleJobs();

  logger.info('Vault Worker started successfully');
}

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the worker
main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error({ error: message }, 'Fatal error in worker');
  process.exit(1);
});
