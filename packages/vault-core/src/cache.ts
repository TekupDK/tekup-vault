/**
 * Redis caching layer for TekupVault
 * Caches search results, repository info, and frequently accessed documents
 */

import { createClient, RedisClientType } from 'redis';
import { Logger } from 'pino';

export interface CacheConfig {
  redisUrl?: string;
  defaultTTL?: number; // seconds
  enabled?: boolean;
}

export class CacheService {
  private client: RedisClientType | null = null;
  private logger: Logger;
  private config: CacheConfig;
  private isConnected = false;

  constructor(config: CacheConfig, logger: Logger) {
    this.config = {
      defaultTTL: 300, // 5 minutes default
      enabled: true,
      ...config
    };
    this.logger = logger;
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (!this.config.enabled || !this.config.redisUrl) {
      this.logger.info('Redis caching disabled (no REDIS_URL)');
      return;
    }

    try {
      this.client = createClient({
        url: this.config.redisUrl,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              this.logger.error('Redis max retries exceeded');
              return new Error('Redis unavailable');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        this.logger.error({ error: err.message }, 'Redis error');
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.logger.info('Redis connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        this.logger.warn('Redis disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      this.logger.info('Redis cache initialized successfully');
    } catch (error) {
      this.logger.error({ error }, 'Failed to connect to Redis');
      this.client = null;
    }
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }

      const parsed = JSON.parse(value) as T;
      this.logger.debug({ key }, 'Cache hit');
      return parsed;
    } catch (error) {
      this.logger.error({ key, error }, 'Cache get failed');
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.config.defaultTTL || 300;
      
      await this.client.setEx(key, expiry, serialized);
      this.logger.debug({ key, ttl: expiry }, 'Cache set');
    } catch (error) {
      this.logger.error({ key, error }, 'Cache set failed');
    }
  }

  /**
   * Delete cached value
   */
  async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      await this.client.del(key);
      this.logger.debug({ key }, 'Cache deleted');
    } catch (error) {
      this.logger.error({ key, error }, 'Cache delete failed');
    }
  }

  /**
   * Delete all keys matching pattern
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        this.logger.debug({ pattern, count: keys.length }, 'Cache pattern deleted');
      }
    } catch (error) {
      this.logger.error({ pattern, error }, 'Cache pattern delete failed');
    }
  }

  /**
   * Invalidate repository cache after sync
   */
  async invalidateRepository(repository: string): Promise<void> {
    await this.delPattern(`repo:${repository}:*`);
    await this.delPattern(`search:*:${repository}:*`);
    this.logger.info({ repository }, 'Repository cache invalidated');
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.info('Redis disconnected');
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }
}

/**
 * Cache key generators
 */
export const CacheKeys = {
  search: (query: string, filters: Record<string, any> = {}) => {
    const filterStr = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(':');
    return `search:${query}:${filterStr}`;
  },
  
  document: (documentId: string) => `doc:${documentId}`,
  
  repoInfo: (repository: string) => `repo:${repository}:info`,
  
  repoFiles: (repository: string, pattern?: string) => 
    `repo:${repository}:files:${pattern || 'all'}`,
  
  repoStats: (repository: string) => `repo:${repository}:stats`,
  
  syncStatus: () => 'sync:status:all',
  
  repositories: () => 'repos:list'
};

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  SEARCH: 300,        // 5 minutes
  DOCUMENT: 3600,     // 1 hour
  REPO_INFO: 600,     // 10 minutes
  REPO_FILES: 600,    // 10 minutes
  REPO_STATS: 1800,   // 30 minutes
  SYNC_STATUS: 60,    // 1 minute
  REPOSITORIES: 1800  // 30 minutes
};
