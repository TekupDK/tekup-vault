/**
 * Redis caching layer for TekupVault
 * Caches search results, repository info, and frequently accessed documents
 */

import { Logger } from "pino";
import { createClient } from "redis";

// Narrow client type to the small surface we use to avoid `any` propagation from redis typings
interface RedisClientLike {
  on(event: "error", listener: (err: Error) => void): this;
  on(event: "connect", listener: () => void): this;
  on(event: "disconnect", listener: () => void): this;
  connect(): Promise<void>;
  get(key: string): Promise<string | null>;
  setEx(key: string, ttl: number, value: string): Promise<void>;
  del(key: string | string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  quit(): Promise<void>;
}

export interface CacheConfig {
  redisUrl?: string;
  defaultTTL?: number; // seconds
  enabled?: boolean;
}

export class CacheService {
  private client: RedisClientLike | null = null;
  private logger: Logger;
  private config: CacheConfig;
  private isConnected = false;

  constructor(config: CacheConfig, logger: Logger) {
    this.config = {
      defaultTTL: 300, // 5 minutes default
      enabled: true,
      ...config,
    };
    this.logger = logger;
  }

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (!this.config.enabled || !this.config.redisUrl) {
      this.logger.info("Redis caching disabled (no REDIS_URL)");
      return;
    }

    try {
      // The redis client factory has loose typings in this environment; accept unknown and narrow below.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const rawClient: unknown = createClient({
        url: this.config.redisUrl,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              this.logger.error("Redis max retries exceeded");
              return new Error("Redis unavailable");
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      // Narrow the surface we rely on to avoid `any` propagation from redis typings
      this.client = rawClient as RedisClientLike;

      this.client.on("error", (err: Error) => {
        this.logger.error(
          { error: { message: err.message, stack: err.stack } },
          "Redis error"
        );
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        this.logger.info("Redis connected");
        this.isConnected = true;
      });

      this.client.on("disconnect", () => {
        this.logger.warn("Redis disconnected");
        this.isConnected = false;
      });

      await this.client.connect();
      this.logger.info("Redis cache initialized successfully");
    } catch (error: unknown) {
      const err =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : { message: String(error) };
      this.logger.error({ error: err }, "Failed to connect to Redis");
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
      this.logger.debug({ key }, "Cache hit");
      return parsed;
    } catch (error: unknown) {
      const err =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : { message: String(error) };
      this.logger.error({ key, error: err }, "Cache get failed");
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      const expiry = ttl || this.config.defaultTTL || 300;

      await this.client.setEx(key, expiry, serialized);
      this.logger.debug({ key, ttl: expiry }, "Cache set");
    } catch (error: unknown) {
      const err =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : { message: String(error) };
      this.logger.error({ key, error: err }, "Cache set failed");
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
      this.logger.debug({ key }, "Cache deleted");
    } catch (error: unknown) {
      const err =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : { message: String(error) };
      this.logger.error({ key, error: err }, "Cache delete failed");
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
        this.logger.debug(
          { pattern, count: keys.length },
          "Cache pattern deleted"
        );
      }
    } catch (error: unknown) {
      const err =
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : { message: String(error) };
      this.logger.error({ pattern, error: err }, "Cache pattern delete failed");
    }
  }

  /**
   * Invalidate repository cache after sync
   */
  async invalidateRepository(repository: string): Promise<void> {
    await this.delPattern(`repo:${repository}:*`);
    await this.delPattern(`search:*:${repository}:*`);
    this.logger.info({ repository }, "Repository cache invalidated");
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.info("Redis disconnected");
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
type FilterValue = string | number | boolean | null | undefined;

export const CacheKeys = {
  search: (
    query: string,
    filters: Record<string, FilterValue> = {}
  ): string => {
    const filterStr = Object.entries(filters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(":");
    return `search:${query}:${filterStr}`;
  },

  document: (documentId: string): string => `doc:${documentId}`,

  repoInfo: (repository: string): string => `repo:${repository}:info`,

  repoFiles: (repository: string, pattern?: string): string =>
    `repo:${repository}:files:${pattern || "all"}`,

  repoStats: (repository: string): string => `repo:${repository}:stats`,

  syncStatus: (): string => "sync:status:all",

  repositories: (): string => "repos:list",
};

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  SEARCH: 300, // 5 minutes
  DOCUMENT: 3600, // 1 hour
  REPO_INFO: 600, // 10 minutes
  REPO_FILES: 600, // 10 minutes
  REPO_STATS: 1800, // 30 minutes
  SYNC_STATUS: 60, // 1 minute
  REPOSITORIES: 1800, // 30 minutes
};
