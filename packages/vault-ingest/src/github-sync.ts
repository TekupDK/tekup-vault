import { Octokit } from '@octokit/rest';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'pino';
import {
  SourceType,
  SyncStatus,
  Document,
  BINARY_FILE_EXTENSIONS,
  SYNC_CONFIG
} from '@tekupvault/vault-core';

export interface GitHubSyncOptions {
  owner: string;
  repo: string;
  branch?: string;
}

export class GitHubSync {
  private octokit: Octokit;
  private supabase: SupabaseClient;
  private logger: Logger;

  constructor(token: string, supabase: SupabaseClient, logger: Logger) {
    this.octokit = new Octokit({ auth: token });
    this.supabase = supabase;
    this.logger = logger;
  }

  /**
   * Sync a GitHub repository
   */
  async syncRepository(options: GitHubSyncOptions): Promise<void> {
    const { owner, repo, branch = 'main' } = options;
    const repoKey = `${owner}/${repo}`;

    this.logger.info({ owner, repo, branch }, 'Starting GitHub sync');

    try {
      // Update sync status to in_progress
      await this.updateSyncStatus(repoKey, SyncStatus.IN_PROGRESS);

      // Get the repository tree
      const tree = await this.getRepositoryTree(owner, repo, branch);
      this.logger.info({ owner, repo, filesCount: tree.length }, 'Retrieved repository tree');

      // Filter out binary files
      const textFiles = tree.filter(file => {
        const ext = file.path?.split('.').pop()?.toLowerCase();
        return ext && !BINARY_FILE_EXTENSIONS.includes(ext);
      });

      this.logger.info({ 
        owner, 
        repo, 
        totalFiles: tree.length,
        textFiles: textFiles.length 
      }, 'Filtered text files');

      // Process files in batches
      let processedCount = 0;
      for (let i = 0; i < textFiles.length; i += SYNC_CONFIG.batchSize) {
        const batch = textFiles.slice(i, i + SYNC_CONFIG.batchSize);
        await this.processBatch(owner, repo, batch);
        processedCount += batch.length;
        
        this.logger.debug({ 
          owner, 
          repo, 
          processed: processedCount, 
          total: textFiles.length 
        }, 'Batch processed');
      }

      // Update sync status to success
      await this.updateSyncStatus(repoKey, SyncStatus.SUCCESS);
      this.logger.info({ owner, repo, filesProcessed: processedCount }, 'GitHub sync completed');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateSyncStatus(repoKey, SyncStatus.ERROR, errorMessage);
      this.logger.error({ owner, repo, error: errorMessage }, 'GitHub sync failed');
      throw error;
    }
  }

  /**
   * Get repository tree
   */
  private async getRepositoryTree(
    owner: string,
    repo: string,
    branch: string
  ): Promise<Array<{ path?: string; sha?: string; type?: string }>> {
    const { data: refData } = await this.octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });

    const commitSha = refData.object.sha;

    const { data: treeData } = await this.octokit.git.getTree({
      owner,
      repo,
      tree_sha: commitSha,
      recursive: 'true'
    });

    return treeData.tree.filter(item => item.type === 'blob');
  }

  /**
   * Process a batch of files
   */
  private async processBatch(
    owner: string,
    repo: string,
    files: Array<{ path?: string; sha?: string }>
  ): Promise<void> {
    const documents = await Promise.all(
      files.map(async (file) => {
        if (!file.path || !file.sha) return null;

        try {
          const { data } = await this.octokit.git.getBlob({
            owner,
            repo,
            file_sha: file.sha
          });

          const content = Buffer.from(data.content, 'base64').toString('utf-8');

          const document: Document = {
            source: SourceType.GITHUB,
            repository: `${owner}/${repo}`,
            path: file.path,
            content,
            sha: file.sha,
            metadata: {
              size: data.size,
              encoding: data.encoding
            }
          };

          return document;
        } catch (error) {
          this.logger.warn({ owner, repo, path: file.path, error }, 'Failed to fetch file');
          return null;
        }
      })
    );

    // Filter out nulls and upsert documents
    const validDocuments = documents.filter((doc): doc is Document => doc !== null);
    
    for (const doc of validDocuments) {
      await this.upsertDocument(doc);
    }
  }

  /**
   * Upsert a document to the database
   */
  private async upsertDocument(document: Document): Promise<void> {
    const { error } = await this.supabase
      .from('vault_documents')
      .upsert({
        source: document.source,
        repository: document.repository,
        path: document.path,
        content: document.content,
        metadata: document.metadata,
        sha: document.sha,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'source,repository,path'
      });

    if (error) {
      this.logger.error({ document, error }, 'Failed to upsert document');
      throw error;
    }
  }

  /**
   * Update sync status
   */
  private async updateSyncStatus(
    repository: string,
    status: SyncStatus,
    errorMessage?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('vault_sync_status')
      .upsert({
        source: SourceType.GITHUB,
        repository,
        status,
        last_sync_at: new Date().toISOString(),
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'source,repository'
      });

    if (error) {
      this.logger.error({ repository, status, error }, 'Failed to update sync status');
    }
  }
}
