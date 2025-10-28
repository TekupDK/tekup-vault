import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { glob } from 'glob';
import { Pool } from 'pg';
import { Logger } from 'pino';
import { Document, SourceType } from '@tekupvault/vault-core';
import { LocalSyncConfig, LocalSyncResult } from './types';

/**
 * Local filesystem sync for TekupVault
 * Scans local workspace and indexes documentation files
 */
export class LocalFileSystemSync {
  private dbPool: Pool;

  constructor(
    private config: LocalSyncConfig,
    private logger: Logger,
    databaseUrl: string
  ) {
    this.dbPool = new Pool({ connectionString: databaseUrl });
  }

  /**
   * Scan and sync local files
   */
  async syncLocalFiles(): Promise<LocalSyncResult> {
    const startTime = Date.now();
    this.logger.info({ basePath: this.config.basePath }, 'Starting local filesystem sync');

    const result: LocalSyncResult = {
      filesFound: 0,
      filesProcessed: 0,
      filesSkipped: 0,
      filesFailed: 0,
      duration: 0,
      errors: []
    };

    try {
      // 1. Find all matching files
      const files = await this.findFiles();
      result.filesFound = files.length;
      this.logger.info({ filesFound: files.length }, 'Files discovered');

      if (files.length === 0) {
        this.logger.warn('No files found to sync');
        result.duration = Date.now() - startTime;
        return result;
      }

      // 2. Process in batches
      for (let i = 0; i < files.length; i += this.config.batchSize) {
        const batch = files.slice(i, i + this.config.batchSize);
        const batchResult = await this.processBatch(batch);
        
        result.filesProcessed += batchResult.processed;
        result.filesSkipped += batchResult.skipped;
        result.filesFailed += batchResult.failed;
        result.errors.push(...batchResult.errors);

        this.logger.debug({ 
          processed: result.filesProcessed, 
          total: files.length 
        }, 'Batch processed');
      }

      result.duration = Date.now() - startTime;
      this.logger.info({ 
        duration: result.duration,
        filesProcessed: result.filesProcessed,
        filesSkipped: result.filesSkipped,
        filesFailed: result.filesFailed
      }, 'Local sync completed');

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error({ error: errorMessage }, 'Local sync failed');
      result.duration = Date.now() - startTime;
      result.errors.push({ file: 'GLOBAL', error: errorMessage });
      return result;
    }
  }

  /**
   * Find all files matching config patterns
   */
  private async findFiles(): Promise<string[]> {
    const allFiles: string[] = [];

    for (const watchPath of this.config.watchPaths) {
      // Build glob pattern for each file type
      for (const fileType of this.config.fileTypes) {
        const pattern = path.join(
          this.config.basePath,
          watchPath,
          '**',
          `*${fileType}`
        );

        try {
          const matches = await glob(pattern, {
            ignore: this.config.excludePaths.map(p => `**/${p}/**`),
            nodir: true,
            windowsPathsNoEscape: true  // Important for Windows paths
          });
          
          allFiles.push(...matches);
        } catch (error) {
          this.logger.warn({ pattern, error }, 'Failed to scan pattern');
        }
      }
    }

    // Remove duplicates
    return [...new Set(allFiles)];
  }

  /**
   * Process batch of files
   */
  private async processBatch(files: string[]): Promise<{
    processed: number;
    skipped: number;
    failed: number;
    errors: Array<{ file: string; error: string }>;
  }> {
    const result = {
      processed: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ file: string; error: string }>
    };

    const documents: Document[] = [];

    for (const filePath of files) {
      try {
        // Read file
        if (!fs.existsSync(filePath)) {
          this.logger.warn({ filePath }, 'File no longer exists, skipping');
          result.skipped++;
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const stats = fs.statSync(filePath);
        const sha = this.calculateSHA(content);

        // Dedupe check
        if (this.config.dedupeVsGitHub) {
          const isDupe = await this.checkIfDuplicate(sha);
          if (isDupe) {
            this.logger.debug({ filePath }, 'Skipping duplicate (exists in GitHub)');
            result.skipped++;
            continue;
          }
        }

        // Calculate relative path
        const relativePath = path.relative(this.config.basePath, filePath)
          .replace(/\\/g, '/');  // Normalize to forward slashes

        const document: Document = {
          source: SourceType.LOCAL,
          repository: 'tekup-workspace',
          path: relativePath,
          content,
          sha,
          metadata: {
            size: stats.size,
            mtime: stats.mtime.toISOString(),
            fullPath: filePath
          }
        };

        documents.push(document);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn({ filePath, error: errorMessage }, 'Failed to read file');
        result.failed++;
        result.errors.push({ file: filePath, error: errorMessage });
      }
    }

    // Upsert valid documents
    if (documents.length > 0) {
      try {
        await this.upsertDocuments(documents);
        result.processed = documents.length;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error({ error: errorMessage }, 'Failed to upsert documents');
        result.failed += documents.length;
        result.errors.push({ file: 'BATCH_UPSERT', error: errorMessage });
      }
    }

    return result;
  }

  /**
   * Calculate SHA-256 hash
   */
  private calculateSHA(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if document already exists from GitHub (by SHA)
   */
  private async checkIfDuplicate(sha: string): Promise<boolean> {
    try {
      const result = await this.dbPool.query<{ id: string }>(
        'SELECT id FROM vault_documents WHERE sha = $1 AND source = $2 LIMIT 1',
        [sha, 'github']
      );
      return result.rows.length > 0;
    } catch {
      return false;  // On error, assume not duplicate
    }
  }

  /**
   * Upsert documents to database
   */
  private async upsertDocuments(documents: Document[]): Promise<void> {
    const client = await this.dbPool.connect();
    try {
      await client.query('BEGIN');

      for (const doc of documents) {
        await client.query(
          `INSERT INTO vault_documents (source, repository, path, content, sha, metadata, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (source, repository, path) 
           DO UPDATE SET 
             content = EXCLUDED.content,
             sha = EXCLUDED.sha,
             metadata = EXCLUDED.metadata,
             updated_at = NOW()`,
          [doc.source, doc.repository, doc.path, doc.content, doc.sha, JSON.stringify(doc.metadata || {})]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      const message = error instanceof Error ? error.message : 'Unknown database error';
      throw new Error(`Failed to upsert documents: ${message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {
    await this.dbPool.end();
  }
}
