import { LocalFileSystemSync } from '@tekupvault/vault-ingest-local';
import { loadConfig } from '@tekupvault/vault-core';
import { logger } from '../lib/logger';

const config = loadConfig();

/**
 * Sync local workspace files
 * Runs after GitHub sync to index local-only documentation
 */
export async function syncLocalWorkspace(): Promise<void> {
  const startTime = Date.now();
  logger.info('Starting local workspace sync job');

  try {
    // Determine base path (use environment variable or default)
    const basePath = process.env.LOCAL_WORKSPACE_PATH || 'c:\\Users\\empir\\Tekup';

    const localSync = new LocalFileSystemSync(
      {
        basePath,
        watchPaths: [
          'docs/',
          'apps/*/docs/',
          'services/*/docs/',
          'tekup-mcp-servers/docs/'
        ],
        excludePaths: [
          'node_modules',
          '.git',
          'dist',
          'build',
          'archive',
          '.turbo',
          'coverage',
          '.next'
        ],
        fileTypes: ['.md', '.mdx'],  // Start with markdown only
        dedupeVsGitHub: true,          // Skip files already in GitHub
        batchSize: 10                  // Same as GitHub sync
      },
      logger,
      config.DATABASE_URL
    );

    const result = await localSync.syncLocalFiles();

    const duration = Date.now() - startTime;
    logger.info({
      duration,
      filesFound: result.filesFound,
      filesProcessed: result.filesProcessed,
      filesSkipped: result.filesSkipped,
      filesFailed: result.filesFailed,
      errors: result.errors.length
    }, 'Local workspace sync job completed');

    // Log errors if any
    if (result.errors.length > 0) {
      logger.warn({ 
        errorCount: result.errors.length,
        errors: result.errors.slice(0, 10)  // Log first 10 errors
      }, 'Errors encountered during local sync');
    }

    // Cleanup
    await localSync.close();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, 'Local workspace sync job failed');
    throw error;
  }
}
