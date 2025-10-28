import { Request, Response } from 'express';
import { logger } from '../lib/logger';
import { EmbeddingService } from '@tekupvault/vault-search';
import { supabase } from '../lib/supabase';
import { loadConfig } from '@tekupvault/vault-core';

// Session management
const sessions = new Map<string, { lastActivity: Date; data: any }>();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Clean up expired sessions
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of sessions.entries()) {
    if (now.getTime() - session.lastActivity.getTime() > SESSION_TIMEOUT) {
      sessions.delete(sessionId);
      logger.debug({ sessionId }, 'Session expired and cleaned up');
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes

const config = loadConfig();
const embeddingService = new EmbeddingService(
  config.OPENAI_API_KEY || 'placeholder_key',
  supabase,
  logger
);

// MCP Tool implementations

// OpenAI-compatible search tool
async function search(args: any) {
  const { query } = args;
  
  if (!query) {
    throw new Error('Query parameter is required');
  }

  // Brug eksisterende embedding service
  const searchResults = await embeddingService.search(query, {
    limit: 20,
    threshold: 0.7
  });

  // Format som OpenAI kræver: array af {id, title, url}
  const results = searchResults.map((result) => ({
    id: result.id || '',
    title: `${result.repository}: ${result.path}`,
    url: `https://github.com/${result.repository}/blob/main/${result.path}`
  }));

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ results })
    }]
  };
}

// OpenAI-compatible fetch tool
async function fetch(args: any) {
  const { id } = args;
  
  if (!id) {
    throw new Error('ID parameter is required');
  }

  // Hent dokument fra database
  const { data, error } = await supabase
    .from('vault_documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new Error(`Document not found: ${id}`);
  }

  // Format som OpenAI kræver
  const document = {
    id: data.id,
    title: `${data.repository}: ${data.path}`,
    text: data.content,
    url: `https://github.com/${data.repository}/blob/main/${data.path}`,
    metadata: {
      source: data.source,
      repository: data.repository,
      sha: data.sha,
      updated_at: data.updated_at
    }
  };

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(document)
    }]
  };
}

// Original search_knowledge tool (advanced features)
async function searchKnowledge(args: any) {
  const { query, limit = 10, threshold = 0.7, source, repository } = args;
  
  if (!query) {
    throw new Error('Query parameter is required');
  }

  const results = await embeddingService.search(query, {
    limit: Math.min(limit, 100),
    threshold,
    source,
    repository
  });

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        results,
        count: results.length,
        query
      }, null, 2)
    }],
    structuredContent: results
  };
}

async function getSyncStatus(_args: any) {
  const { data, error } = await supabase
    .from('vault_sync_status')
    .select('id, source, repository, status, last_sync_at, error_message')
    .order('last_sync_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch sync status: ${error.message}`);
  }

  const repositories = (data || []).map(item => ({
    repository: item.repository,
    source: item.source,
    lastSyncedAt: item.last_sync_at,
    status: item.status,
    errorMessage: item.error_message
  }));

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        repositories,
        totalRepositories: repositories.length,
        lastGlobalSync: repositories[0]?.lastSyncedAt || null
      }, null, 2)
    }],
    structuredContent: repositories
  };
}

async function listRepositories(_args: any) {
  const { data, error } = await supabase
    .from('vault_sync_status')
    .select('repository')
    .not('repository', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch repositories: ${error.message}`);
  }

  const repos = (data || [])
    .map(item => item.repository)
    .filter(Boolean)
    .map(repo => {
      const [owner, name] = repo.split('/');
      return { owner, repo: name, fullName: repo };
    });

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        repositories: repos,
        count: repos.length
      }, null, 2)
    }],
    structuredContent: repos
  };
}

async function getRepositoryInfo(args: any) {
  const { repository } = args;
  
  if (!repository) {
    throw new Error('Repository parameter is required');
  }

  // Get document count
  const { count: docCount, error: docError } = await supabase
    .from('vault_documents')
    .select('*', { count: 'exact', head: true })
    .eq('repository', repository);

  if (docError) {
    throw new Error(`Failed to fetch document count: ${docError.message}`);
  }

  // Get sync status
  const { data: syncData, error: syncError } = await supabase
    .from('vault_sync_status')
    .select('last_sync_at, status')
    .eq('repository', repository)
    .single();

  if (syncError && syncError.code !== 'PGRST116') {
    throw new Error(`Failed to fetch sync status: ${syncError.message}`);
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        repository,
        info: {
          documentCount: docCount || 0,
          lastSyncedAt: syncData?.last_sync_at || null,
          status: syncData?.status || 'unknown'
        }
      }, null, 2)
    }],
    structuredContent: {
      repository,
      documentCount: docCount || 0,
      lastSyncedAt: syncData?.last_sync_at || null,
      status: syncData?.status || 'unknown'
    }
  };
}

/* TODO: Uncomment when extended-tools are migrated to Prisma
// New: Summarize repository tool
async function summarizeRepository(args: any) {
  const { repository, limit = 20 } = args;
  
  if (!repository) {
    throw new Error('Repository parameter is required');
  }

  // Get recent documents from repository
  const { data, error } = await supabase
    .from('vault_documents')
    .select('id, path, content, updated_at')
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
      preview: doc.content?.slice(0, 200) + (doc.content?.length > 200 ? '...' : '')
    })) || []
  };

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        summary
      }, null, 2)
    }],
    structuredContent: summary
  };
}

// New: Get document by path tool
async function getDocumentByPath(args: any) {
  const { repository, path } = args;
  
  if (!repository || !path) {
    throw new Error('Repository and path parameters are required');
  }

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
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        document: {
          id: data.id,
          repository: data.repository,
          path: data.path,
          content: data.content,
          sha: data.sha,
          lastUpdated: data.updated_at,
          metadata: data.metadata
        }
      }, null, 2)
    }],
    structuredContent: data
  };
}

// New: List repository files tool
async function listRepositoryFiles(args: any) {
  const { repository, pattern = '', limit = 50 } = args;
  
  if (!repository) {
    throw new Error('Repository parameter is required');
  }

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
    size: doc.metadata?.size || 0
  })) || [];

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        success: true,
        repository,
        files,
        count: files.length
      }, null, 2)
    }],
    structuredContent: files
  };
}
*/

// Tool registry
const tools = {
  // OpenAI-compatible tools for ChatGPT deep research
  search: {
    name: 'search',
    description: 'Search across repository documentation and code (OpenAI compatible)',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query string' }
      },
      required: ['query']
    }
  },
  fetch: {
    name: 'fetch',
    description: 'Fetch full content of a document by ID (OpenAI compatible)',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Unique document ID' }
      },
      required: ['id']
    }
  },
  // Advanced tools with additional features
  search_knowledge: {
    name: 'search_knowledge',
    description: 'Semantic search across TekupVault documentation and code with advanced filters',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query' },
        limit: { type: 'number', description: 'Maximum results (1-100)', default: 10, minimum: 1, maximum: 100 },
        threshold: { type: 'number', description: 'Similarity threshold (0-1)', default: 0.7, minimum: 0, maximum: 1 },
        source: { type: 'string', description: 'Filter by source type', enum: ['github', 'supabase', 'render', 'copilot'] },
        repository: { type: 'string', description: 'Filter by repository (owner/repo format)' }
      },
      required: ['query']
    }
  },
  get_sync_status: {
    name: 'get_sync_status',
    description: 'Get synchronization status for all repositories',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  list_repositories: {
    name: 'list_repositories',
    description: 'List all configured repositories',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  get_repository_info: {
    name: 'get_repository_info',
    description: 'Get detailed information about a specific repository',
    inputSchema: {
      type: 'object',
      properties: {
        repository: { type: 'string', description: 'Repository identifier (owner/repo)' }
      },
      required: ['repository']
    }
  }
};

// MCP Protocol handlers
export async function handleMcpPost(req: Request, res: Response) {
  try {
    const sessionId = req.headers['mcp-session-id'] as string || generateSessionId();
    const acceptHeader = req.headers.accept || 'application/json';
    
    // Update session activity
    if (sessions.has(sessionId)) {
      sessions.get(sessionId)!.lastActivity = new Date();
    } else {
      sessions.set(sessionId, { lastActivity: new Date(), data: {} });
    }

    const body = req.body;
    logger.debug({ sessionId, method: body.method }, 'MCP request received');

    let response: any;

    switch (body.method) {
      case 'initialize':
        response = {
          jsonrpc: '2.0',
          id: body.id,
          result: {
            protocolVersion: '2025-03-26',
            capabilities: {
              tools: { listChanged: true },
              resources: { subscribe: false, listChanged: false },
              prompts: { listChanged: false },
              sampling: {}
            },
            serverInfo: {
              name: 'TekupVault MCP Server',
              version: '0.1.0'
            }
          }
        };
        break;

      case 'tools/list':
        response = {
          jsonrpc: '2.0',
          id: body.id,
          result: {
            tools: Object.values(tools)
          }
        };
        break;

      case 'tools/call':
        const { name, arguments: args } = body.params;
        
        let result;
        switch (name) {
          case 'search':
            result = await search(args);
            break;
          case 'fetch':
            result = await fetch(args);
            break;
          case 'search_knowledge':
            result = await searchKnowledge(args);
            break;
          case 'get_sync_status':
            result = await getSyncStatus(args);
            break;
          case 'list_repositories':
            result = await listRepositories(args);
            break;
          case 'get_repository_info':
            result = await getRepositoryInfo(args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        response = {
          jsonrpc: '2.0',
          id: body.id,
          result
        };
        break;

      default:
        throw new Error(`Unknown method: ${body.method}`);
    }

    // Set session header
    res.setHeader('Mcp-Session-Id', sessionId);

    // Handle SSE vs JSON response
    if (acceptHeader.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      res.write(`data: ${JSON.stringify(response)}\n\n`);
      res.end();
    } else {
      res.json(response);
    }

  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'MCP request failed');
    
    const errorResponse = {
      jsonrpc: '2.0',
      id: req.body?.id || null,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error'
      }
    };

    res.status(500).json(errorResponse);
  }
}

export async function handleMcpGet(req: Request, res: Response) {
  const sessionId = req.headers['mcp-session-id'] as string;
  
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).json({ error: 'Invalid or missing session ID' });
    return;
  }

  // Update session activity
  sessions.get(sessionId)!.lastActivity = new Date();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Mcp-Session-Id', sessionId);

  // Send heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
}

export async function handleMcpDelete(req: Request, res: Response) {
  const sessionId = req.headers['mcp-session-id'] as string;
  
  if (sessionId && sessions.has(sessionId)) {
    sessions.delete(sessionId);
    logger.debug({ sessionId }, 'Session terminated');
  }

  res.status(200).json({ success: true });
}

function generateSessionId(): string {
  return 'mcp_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}
