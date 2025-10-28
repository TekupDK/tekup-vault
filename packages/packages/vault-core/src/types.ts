import { z } from 'zod';

/**
 * Data source types
 */
export enum SourceType {
  GITHUB = 'github',
  SUPABASE = 'supabase',
  RENDER = 'render',
  COPILOT = 'copilot',
  LOCAL = 'local'
}

/**
 * Sync status types
 */
export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  ERROR = 'error'
}

/**
 * Document schema
 */
export const DocumentSchema = z.object({
  id: z.string().uuid().optional(),
  source: z.nativeEnum(SourceType),
  repository: z.string(),
  path: z.string(),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
  sha: z.string().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional()
});

export type Document = z.infer<typeof DocumentSchema>;

/**
 * Search query schema with enhanced validation
 */
export const SearchQuerySchema = z.object({
  query: z.string()
    .min(1, 'Query cannot be empty')
    .max(500, 'Query too long (max 500 characters)')
    .regex(/^[a-zA-Z0-9\s\-_.,?!'"()]+$/, 'Invalid characters in query'),
  limit: z.number().int().positive().min(1).max(100).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
  source: z.nativeEnum(SourceType).optional(),
  repository: z.string()
    .regex(/^[a-zA-Z0-9\-_]+\/[a-zA-Z0-9\-_]+$/, 'Invalid repository format (expected: owner/repo)')
    .optional()
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

/**
 * Search result schema
 */
export const SearchResultSchema = z.object({
  document: DocumentSchema,
  similarity: z.number().min(0).max(1)
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * Sync status schema
 */
export const SyncStatusSchema = z.object({
  id: z.string().uuid().optional(),
  source: z.nativeEnum(SourceType),
  repository: z.string(),
  status: z.nativeEnum(SyncStatus),
  last_sync_at: z.date().optional(),
  error_message: z.string().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional()
});

export type SyncStatusRecord = z.infer<typeof SyncStatusSchema>;

/**
 * GitHub repository info
 */
export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  branch?: string;
}

/**
 * Embedding metadata
 */
export interface EmbeddingMetadata {
  model: string;
  dimensions: number;
  tokenCount?: number;
}
