/**
 * Tests for cache service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CacheService, CacheKeys, CacheTTL } from '../cache';
import pino from 'pino';

// Mock Redis
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    quit: vi.fn(),
    on: vi.fn()
  }))
}));

const mockLogger = pino({ level: 'silent' });

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (cacheService) {
      await cacheService.disconnect();
    }
  });

  describe('initialization', () => {
    it('should initialize without Redis when disabled', async () => {
      cacheService = new CacheService({ enabled: false }, mockLogger);
      await cacheService.connect();
      expect(cacheService.isAvailable()).toBe(false);
    });

    it('should initialize without Redis when URL missing', async () => {
      cacheService = new CacheService({ enabled: true }, mockLogger);
      await cacheService.connect();
      expect(cacheService.isAvailable()).toBe(false);
    });
  });

  describe('cache operations', () => {
    it('should return null when cache unavailable', async () => {
      cacheService = new CacheService({ enabled: false }, mockLogger);
      const result = await cacheService.get('test-key');
      expect(result).toBeNull();
    });

    it('should not throw when setting value on unavailable cache', async () => {
      cacheService = new CacheService({ enabled: false }, mockLogger);
      await expect(cacheService.set('test-key', { data: 'test' })).resolves.not.toThrow();
    });

    it('should not throw when deleting value on unavailable cache', async () => {
      cacheService = new CacheService({ enabled: false }, mockLogger);
      await expect(cacheService.del('test-key')).resolves.not.toThrow();
    });
  });

  describe('invalidation', () => {
    it('should invalidate repository cache', async () => {
      cacheService = new CacheService({ enabled: false }, mockLogger);
      await expect(cacheService.invalidateRepository('owner/repo')).resolves.not.toThrow();
    });
  });
});

describe('CacheKeys', () => {
  it('should generate search key with filters', () => {
    const key = CacheKeys.search('test query', { limit: 10, threshold: 0.7 });
    expect(key).toContain('search:test query');
    expect(key).toContain('limit:10');
    expect(key).toContain('threshold:0.7');
  });

  it('should generate document key', () => {
    const key = CacheKeys.document('doc-123');
    expect(key).toBe('doc:doc-123');
  });

  it('should generate repo info key', () => {
    const key = CacheKeys.repoInfo('owner/repo');
    expect(key).toBe('repo:owner/repo:info');
  });

  it('should generate repo files key with pattern', () => {
    const key = CacheKeys.repoFiles('owner/repo', 'src');
    expect(key).toBe('repo:owner/repo:files:src');
  });

  it('should generate repo files key without pattern', () => {
    const key = CacheKeys.repoFiles('owner/repo');
    expect(key).toBe('repo:owner/repo:files:all');
  });

  it('should generate repo stats key', () => {
    const key = CacheKeys.repoStats('owner/repo');
    expect(key).toBe('repo:owner/repo:stats');
  });

  it('should generate sync status key', () => {
    const key = CacheKeys.syncStatus();
    expect(key).toBe('sync:status:all');
  });

  it('should generate repositories list key', () => {
    const key = CacheKeys.repositories();
    expect(key).toBe('repos:list');
  });
});

describe('CacheTTL', () => {
  it('should have reasonable TTL values', () => {
    expect(CacheTTL.SEARCH).toBeGreaterThan(0);
    expect(CacheTTL.DOCUMENT).toBeGreaterThan(CacheTTL.SEARCH);
    expect(CacheTTL.REPO_INFO).toBeGreaterThan(0);
    expect(CacheTTL.SYNC_STATUS).toBeLessThan(CacheTTL.SEARCH);
  });
});
