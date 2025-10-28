/**
 * Extended MCP Tools for TekupVault
 * Additional tools beyond the basic search/fetch capabilities
 */

import { vault } from '@tekup/database';
import { Logger } from 'pino';

export interface McpToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  structuredContent?: any;
}

/**
 * Summarize repository - Get overview of recent documents
 */
export async function summarizeRepository(
  args: { repository: string; limit?: number },
  vault: typeof vault,
  logger: Logger
): Promise<McpToolResult> {
  const { repository, limit = 20 } = args;
  
  if (!repository) {
    throw new Error('Repository parameter is required');
  }

  logger.info({ repository, limit }, 'Summarizing repository');

  // Get recent documents from repository
  const { data, error } = await supabase
    .from('vault_documents')
    .select('id, path, content, updated_at, metadata')
    .eq('repository', repository)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch repository documents: ${error.message}`);
  }

  const summary = {
    repository,
    totalDocuments: data?.length || 0,
    recentFiles: data?.map(doc => ({
      id: doc.id,
      path: doc.path,
      lastUpdated: doc.updated_at,
      preview: doc.content?.slice(0, 200) + (doc.content?.length > 200 ? '...' : ''),
      fileType: doc.path?.split('.').pop() || 'unknown',
      size: doc.metadata?.size || 0
    })) || []
  };

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        summary
      }, null, 2)
    }],
    structuredContent: summary
  };
}

/**
 * Get document by path - Direct file access
 */
export async function getDocumentByPath(
  args: { repository: string; path: string },
  vault: typeof vault,
  logger: Logger
): Promise<McpToolResult> {
  const { repository, path } = args;
  
  if (!repository || !path) {
    throw new Error('Repository and path parameters are required');
  }

  logger.info({ repository, path }, 'Fetching document by path');

  const { data, error } = await supabase
    .from('vault_documents')
    .select('*')
    .eq('repository', repository)
    .eq('path', path)
    .single();

  if (error || !data) {
    throw new Error(`Document not found: ${repository}/${path}`);
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        document: {
          id: data.id,
          repository: data.repository,
          path: data.path,
          content: data.content,
          sha: data.sha,
          lastUpdated: data.updated_at,
          metadata: data.metadata,
          githubUrl: `https://github.com/${data.repository}/blob/main/${data.path}`
        }
      }, null, 2)
    }],
    structuredContent: data
  };
}

/**
 * List repository files - Browse repository contents
 */
export async function listRepositoryFiles(
  args: { repository: string; pattern?: string; limit?: number },
  vault: typeof vault,
  logger: Logger
): Promise<McpToolResult> {
  const { repository, pattern = '', limit = 50 } = args;
  
  if (!repository) {
    throw new Error('Repository parameter is required');
  }

  logger.info({ repository, pattern, limit }, 'Listing repository files');

  let query = supabase
    .from('vault_documents')
    .select('id, path, updated_at, metadata')
    .eq('repository', repository)
    .order('path', { ascending: true })
    .limit(limit);

  // Apply pattern filter if provided
  if (pattern) {
    query = query.ilike('path', `%${pattern}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list repository files: ${error.message}`);
  }

  const files = data?.map(doc => ({
    id: doc.id,
    path: doc.path,
    lastUpdated: doc.updated_at,
    size: doc.metadata?.size || 0,
    extension: doc.path?.split('.').pop() || 'unknown'
  })) || [];

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        repository,
        pattern: pattern || 'all',
        files,
        count: files.length
      }, null, 2)
    }],
    structuredContent: files
  };
}

/**
 * Search by file type - Filter by extension
 */
export async function searchByFileType(
  args: { repository: string; fileType: string; limit?: number },
  vault: typeof vault,
  logger: Logger
): Promise<McpToolResult> {
  const { repository, fileType, limit = 50 } = args;
  
  if (!repository || !fileType) {
    throw new Error('Repository and fileType parameters are required');
  }

  logger.info({ repository, fileType, limit }, 'Searching by file type');

  const { data, error } = await supabase
    .from('vault_documents')
    .select('id, path, content, updated_at')
    .eq('repository', repository)
    .ilike('path', `%.${fileType}`)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search by file type: ${error.message}`);
  }

  const results = data?.map(doc => ({
    id: doc.id,
    path: doc.path,
    preview: doc.content?.slice(0, 150) + '...',
    lastUpdated: doc.updated_at
  })) || [];

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        repository,
        fileType,
        results,
        count: results.length
      }, null, 2)
    }],
    structuredContent: results
  };
}

/**
 * Get statistics - Repository analytics
 */
export async function getRepositoryStats(
  args: { repository?: string },
  vault: typeof vault,
  logger: Logger
): Promise<McpToolResult> {
  const { repository } = args;

  logger.info({ repository }, 'Fetching repository statistics');

  if (repository) {
    // Stats for specific repository
    const { count, error } = await supabase
      .from('vault_documents')
      .select('*', { count: 'exact', head: true })
      .eq('repository', repository);

    if (error) {
      throw new Error(`Failed to fetch stats: ${error.message}`);
    }

    // Get file types breakdown
    const { data: docs, error: docsError } = await supabase
      .from('vault_documents')
      .select('path')
      .eq('repository', repository);

    if (docsError) {
      throw new Error(`Failed to fetch documents: ${docsError.message}`);
    }

    const fileTypes: Record<string, number> = {};
    docs?.forEach(doc => {
      const ext = doc.path?.split('.').pop() || 'unknown';
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });

    const stats = {
      repository,
      totalDocuments: count || 0,
      fileTypeBreakdown: fileTypes
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ success: true, stats }, null, 2)
      }],
      structuredContent: stats
    };
  } else {
    // Global stats across all repositories
    const { count, error } = await supabase
      .from('vault_documents')
      .select('*', { count: 'exact', head: true });

    if (error) {
      throw new Error(`Failed to fetch global stats: ${error.message}`);
    }

    const { data: repos, error: reposError } = await supabase
      .from('vault_sync_status')
      .select('repository, status')
      .not('repository', 'is', null);

    if (reposError) {
      throw new Error(`Failed to fetch repositories: ${reposError.message}`);
    }

    const stats = {
      totalDocuments: count || 0,
      totalRepositories: repos?.length || 0,
      repositoriesByStatus: repos?.reduce((acc: Record<string, number>, repo) => {
        acc[repo.status] = (acc[repo.status] || 0) + 1;
        return acc;
      }, {})
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ success: true, stats }, null, 2)
      }],
      structuredContent: stats
    };
  }
}

/**
 * Tool definitions for MCP registry
 */
export const EXTENDED_TOOLS = {
  summarize_repository: {
    name: 'summarize_repository',
    description: 'Get an overview of recent documents in a repository with previews',
    inputSchema: {
      type: 'object',
      properties: {
        repository: { type: 'string', description: 'Repository identifier (owner/repo)' },
        limit: { type: 'number', description: 'Number of recent documents to include (default: 20)', default: 20 }
      },
      required: ['repository']
    },
    handler: summarizeRepository
  },
  get_document_by_path: {
    name: 'get_document_by_path',
    description: 'Get the full content of a document by its repository and file path',
    inputSchema: {
      type: 'object',
      properties: {
        repository: { type: 'string', description: 'Repository identifier (owner/repo)' },
        path: { type: 'string', description: 'File path within the repository' }
      },
      required: ['repository', 'path']
    },
    handler: getDocumentByPath
  },
  list_repository_files: {
    name: 'list_repository_files',
    description: 'List all files in a repository with optional pattern filtering',
    inputSchema: {
      type: 'object',
      properties: {
        repository: { type: 'string', description: 'Repository identifier (owner/repo)' },
        pattern: { type: 'string', description: 'Optional pattern to filter file paths (e.g., "src", ".ts")' },
        limit: { type: 'number', description: 'Maximum number of files to return (default: 50)', default: 50 }
      },
      required: ['repository']
    },
    handler: listRepositoryFiles
  },
  search_by_file_type: {
    name: 'search_by_file_type',
    description: 'Search for documents by file extension in a repository',
    inputSchema: {
      type: 'object',
      properties: {
        repository: { type: 'string', description: 'Repository identifier (owner/repo)' },
        fileType: { type: 'string', description: 'File extension (without dot, e.g., "ts", "md", "json")' },
        limit: { type: 'number', description: 'Maximum results (default: 50)', default: 50 }
      },
      required: ['repository', 'fileType']
    },
    handler: searchByFileType
  },
  get_repository_stats: {
    name: 'get_repository_stats',
    description: 'Get statistics and analytics for a repository or global stats across all repositories',
    inputSchema: {
      type: 'object',
      properties: {
        repository: { type: 'string', description: 'Repository identifier (owner/repo). Omit for global stats.' }
      },
      required: []
    },
    handler: getRepositoryStats
  }
};
