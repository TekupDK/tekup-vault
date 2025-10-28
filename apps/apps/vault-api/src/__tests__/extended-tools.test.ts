/**
 * Tests for extended MCP tools
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  summarizeRepository,
  getDocumentByPath,
  listRepositoryFiles,
  searchByFileType,
  getRepositoryStats
} from '../mcp/extended-tools';
import { createClient } from '@supabase/supabase-js';
import pino from 'pino';

// Mock Supabase client
vi.mock('@supabase/supabase-js');

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    not: vi.fn().mockReturnThis()
  }))
};

const mockLogger = pino({ level: 'silent' });

describe('Extended MCP Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('summarizeRepository', () => {
    it('should return repository summary with recent files', async () => {
      const mockData = [
        {
          id: '1',
          path: 'src/index.ts',
          content: 'console.log("test")',
          updated_at: '2025-10-24T12:00:00Z',
          metadata: { size: 100 }
        },
        {
          id: '2',
          path: 'README.md',
          content: '# Test',
          updated_at: '2025-10-24T11:00:00Z',
          metadata: { size: 50 }
        }
      ];

      mockSupabase.from().select().eq().order().limit = vi.fn().mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await summarizeRepository(
        { repository: 'owner/repo', limit: 20 },
        mockSupabase as any,
        mockLogger
      );

      expect(result.structuredContent.repository).toBe('owner/repo');
      expect(result.structuredContent.totalDocuments).toBe(2);
      expect(result.structuredContent.recentFiles).toHaveLength(2);
      expect(result.structuredContent.recentFiles[0].fileType).toBe('ts');
    });

    it('should throw error if repository is missing', async () => {
      await expect(
        summarizeRepository({ repository: '' }, mockSupabase as any, mockLogger)
      ).rejects.toThrow('Repository parameter is required');
    });
  });

  describe('getDocumentByPath', () => {
    it('should return document by path', async () => {
      const mockDoc = {
        id: '1',
        repository: 'owner/repo',
        path: 'src/index.ts',
        content: 'console.log("test")',
        sha: 'abc123',
        updated_at: '2025-10-24T12:00:00Z',
        metadata: { size: 100 }
      };

      mockSupabase.from().select().eq().single = vi.fn().mockResolvedValue({
        data: mockDoc,
        error: null
      });

      const result = await getDocumentByPath(
        { repository: 'owner/repo', path: 'src/index.ts' },
        mockSupabase as any,
        mockLogger
      );

      expect(result.structuredContent.id).toBe('1');
      expect(result.structuredContent.path).toBe('src/index.ts');
      expect(result.content[0].text).toContain('github.com/owner/repo');
    });

    it('should throw error if document not found', async () => {
      mockSupabase.from().select().eq().single = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      await expect(
        getDocumentByPath(
          { repository: 'owner/repo', path: 'missing.ts' },
          mockSupabase as any,
          mockLogger
        )
      ).rejects.toThrow('Document not found');
    });
  });

  describe('listRepositoryFiles', () => {
    it('should list files in repository', async () => {
      const mockFiles = [
        { id: '1', path: 'src/index.ts', updated_at: '2025-10-24T12:00:00Z', metadata: { size: 100 } },
        { id: '2', path: 'src/utils.ts', updated_at: '2025-10-24T11:00:00Z', metadata: { size: 200 } }
      ];

      mockSupabase.from().select().eq().order().limit = vi.fn().mockResolvedValue({
        data: mockFiles,
        error: null
      });

      const result = await listRepositoryFiles(
        { repository: 'owner/repo', limit: 50 },
        mockSupabase as any,
        mockLogger
      );

      expect(result.structuredContent).toHaveLength(2);
      expect(result.structuredContent[0].extension).toBe('ts');
    });

    it('should filter by pattern', async () => {
      mockSupabase.from().select().eq().ilike = vi.fn().mockReturnThis();
      mockSupabase.from().select().eq().ilike().order().limit = vi.fn().mockResolvedValue({
        data: [],
        error: null
      });

      await listRepositoryFiles(
        { repository: 'owner/repo', pattern: 'src', limit: 50 },
        mockSupabase as any,
        mockLogger
      );

      expect(mockSupabase.from().select().eq().ilike).toHaveBeenCalledWith('path', '%src%');
    });
  });

  describe('searchByFileType', () => {
    it('should search by file extension', async () => {
      const mockDocs = [
        { id: '1', path: 'src/index.ts', content: 'test', updated_at: '2025-10-24T12:00:00Z' },
        { id: '2', path: 'src/utils.ts', content: 'utils', updated_at: '2025-10-24T11:00:00Z' }
      ];

      mockSupabase.from().select().eq().ilike().order().limit = vi.fn().mockResolvedValue({
        data: mockDocs,
        error: null
      });

      const result = await searchByFileType(
        { repository: 'owner/repo', fileType: 'ts', limit: 50 },
        mockSupabase as any,
        mockLogger
      );

      expect(result.structuredContent).toHaveLength(2);
      expect(result.structuredContent[0].preview).toContain('test');
    });

    it('should throw error if parameters missing', async () => {
      await expect(
        searchByFileType({ repository: '', fileType: 'ts' }, mockSupabase as any, mockLogger)
      ).rejects.toThrow('Repository and fileType parameters are required');
    });
  });

  describe('getRepositoryStats', () => {
    it('should return stats for specific repository', async () => {
      mockSupabase.from().select = vi.fn(() => ({
        eq: vi.fn().mockReturnValue({
          data: null,
          error: null,
          count: 42
        })
      }));

      mockSupabase.from = vi.fn((table) => {
        if (table === 'vault_documents') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { path: 'index.ts' },
                  { path: 'utils.ts' },
                  { path: 'README.md' }
                ],
                error: null
              })
            }))
          };
        }
        return mockSupabase.from();
      });

      const result = await getRepositoryStats(
        { repository: 'owner/repo' },
        mockSupabase as any,
        mockLogger
      );

      expect(result.structuredContent.repository).toBe('owner/repo');
      expect(result.structuredContent.fileTypeBreakdown).toBeDefined();
    });

    it('should return global stats if no repository specified', async () => {
      mockSupabase.from = vi.fn((table) => ({
        select: vi.fn(() => ({
          data: null,
          error: null,
          count: 100
        }))
      }));

      const result = await getRepositoryStats({}, mockSupabase as any, mockLogger);

      expect(result.structuredContent.totalDocuments).toBeDefined();
      expect(result.structuredContent.totalRepositories).toBeDefined();
    });
  });
});
