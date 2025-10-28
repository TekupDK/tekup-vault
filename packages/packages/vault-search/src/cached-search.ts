/**
 * Cached search service wrapper
 * Wraps EmbeddingService with Redis caching for improved performance
 */

import { EmbeddingService } from './embeddings';
import { CacheService, CacheKeys, CacheTTL } from '@tekupvault/vault-core';
import { Logger } from 'pino';

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  source?: string;
  repository?: string;
}

export interface SearchResult {
  id: string;
  source: string;
  repository: string;
  path: string;
  content: string;
  metadata: Record<string, unknown> | null;
  sha: string | null;
  similarity: number;
}

export class CachedSearchService {
  private embeddingService: EmbeddingService;
  private cacheService: CacheService;
  private logger: Logger;

  constructor(
    embeddingService: EmbeddingService,
    cacheService: CacheService,
    logger: Logger
  ) {
    this.embeddingService = embeddingService;
    this.cacheService = cacheService;
    this.logger = logger;
  }

  /**
   * Search with caching
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    // Generate cache key
    const cacheKey = CacheKeys.search(query, {
      limit: options.limit || 10,
      threshold: options.threshold || 0.7,
      source: options.source || '',
      repository: options.repository || ''
    });

    // Try cache first
    if (this.cacheService.isAvailable()) {
      const cached = await this.cacheService.get<SearchResult[]>(cacheKey);
      if (cached) {
        this.logger.info({ query, source: 'cache' }, 'Search served from cache');
        return cached;
      }
    }

    // Perform search
    this.logger.info({ query, source: 'database' }, 'Search executing against database');
    const results = await this.embeddingService.search(query, options);

    // Cache results
    if (this.cacheService.isAvailable() && results.length > 0) {
      await this.cacheService.set(cacheKey, results, CacheTTL.SEARCH);
    }

    return results;
  }

  /**
   * Index document and invalidate related caches
   */
  async indexDocument(documentId: string, content: string): Promise<void> {
    await this.embeddingService.indexDocument(documentId, content);
    
    // Invalidate search caches (they might now return different results)
    if (this.cacheService.isAvailable()) {
      await this.cacheService.delPattern('search:*');
      this.logger.debug('Search caches invalidated after document index');
    }
  }

  /**
   * Index unindexed documents and invalidate caches
   */
  async indexUnindexedDocuments(): Promise<number> {
    const count = await this.embeddingService.indexUnindexedDocuments();
    
    if (count > 0 && this.cacheService.isAvailable()) {
      await this.cacheService.delPattern('search:*');
      this.logger.info({ count }, 'Search caches invalidated after batch indexing');
    }

    return count;
  }

  /**
   * Get cache statistics
   */
  getCacheStatus(): { available: boolean } {
    return {
      available: this.cacheService.isAvailable()
    };
  }
}
