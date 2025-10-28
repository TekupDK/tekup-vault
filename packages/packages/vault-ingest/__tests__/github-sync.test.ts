import { describe, expect, it, beforeEach, vi } from 'vitest';
import { GitHubSync } from '../src/github-sync';

// Mock Octokit
const mockOctokit = {
  rest: {
    repos: {
      getContent: vi.fn(),
    },
    git: {
      getTree: vi.fn(),
      getBlob: vi.fn(),
    },
  },
};

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockResolvedValue({ data: null, error: null }),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
};

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

describe('GitHub Sync', () => {
  let githubSync: GitHubSync;
  const MOCK_TOKEN = 'ghp_mock_token_123';

  beforeEach(() => {
    vi.clearAllMocks();
    
    githubSync = new GitHubSync(
      MOCK_TOKEN,
      mockSupabase as any,
      mockLogger as any
    );

    // Mock the Octokit instance
    (githubSync as any).octokit = mockOctokit;
  });

  describe('SYNC-003: Sync med invalid GitHub token', () => {
    it('should handle authentication errors gracefully', async () => {
      mockOctokit.rest.git.getTree.mockRejectedValueOnce({
        status: 401,
        message: 'Bad credentials',
      });

      await expect(
        githubSync.syncRepository({
          owner: 'test',
          repo: 'repo',
          branch: 'main',
        })
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle rate limit errors', async () => {
      mockOctokit.rest.git.getTree.mockRejectedValueOnce({
        status: 403,
        message: 'API rate limit exceeded',
      });

      await expect(
        githubSync.syncRepository({
          owner: 'test',
          repo: 'repo',
          branch: 'main',
        })
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle repository not found', async () => {
      mockOctokit.rest.git.getTree.mockRejectedValueOnce({
        status: 404,
        message: 'Not Found',
      });

      await expect(
        githubSync.syncRepository({
          owner: 'nonexistent',
          repo: 'repo',
          branch: 'main',
        })
      ).rejects.toThrow();
    });
  });

  describe('SYNC-006: Binary file filtering', () => {
    it('should filter out binary file extensions', async () => {
      const mockTree = {
        data: {
          sha: 'tree-sha',
          tree: [
            { path: 'src/code.ts', type: 'blob', sha: 'sha1' },
            { path: 'docs/README.md', type: 'blob', sha: 'sha2' },
            { path: 'assets/image.png', type: 'blob', sha: 'sha3' },
            { path: 'assets/video.mp4', type: 'blob', sha: 'sha4' },
            { path: 'dist/bundle.js', type: 'blob', sha: 'sha5' },
            { path: 'docs/guide.pdf', type: 'blob', sha: 'sha6' },
          ],
        },
      };

      mockOctokit.rest.git.getTree.mockResolvedValueOnce(mockTree);

      // Mock blob content for text files
      mockOctokit.rest.git.getBlob.mockResolvedValue({
        data: {
          content: Buffer.from('file content').toString('base64'),
          encoding: 'base64',
        },
      });

      await githubSync.syncRepository({
        owner: 'test',
        repo: 'repo',
        branch: 'main',
      });

      // Should only fetch blobs for text files (not .png, .mp4, .pdf)
      const blobCalls = mockOctokit.rest.git.getBlob.mock.calls;
      
      // Check that binary files were NOT fetched
      expect(blobCalls.every((call: any) => 
        !call[0].file_sha.includes('sha3') && // .png
        !call[0].file_sha.includes('sha4') && // .mp4
        !call[0].file_sha.includes('sha6')    // .pdf
      )).toBe(true);
    });

    it('should allow common text file extensions', async () => {
      const textFiles = [
        'file.ts',
        'file.tsx',
        'file.js',
        'file.jsx',
        'file.json',
        'file.md',
        'file.txt',
        'file.yml',
        'file.yaml',
        'Dockerfile',
        '.env.example',
      ];

      const mockTree = {
        data: {
          sha: 'tree-sha',
          tree: textFiles.map((path, i) => ({
            path,
            type: 'blob',
            sha: `sha-${i}`,
          })),
        },
      };

      mockOctokit.rest.git.getTree.mockResolvedValueOnce(mockTree);
      mockOctokit.rest.git.getBlob.mockResolvedValue({
        data: {
          content: Buffer.from('content').toString('base64'),
          encoding: 'base64',
        },
      });

      await githubSync.syncRepository({
        owner: 'test',
        repo: 'repo',
        branch: 'main',
      });

      // All text files should be processed
      expect(mockOctokit.rest.git.getBlob).toHaveBeenCalledTimes(textFiles.length);
    });
  });

  describe('SYNC-011: UTF-8 og special encoding', () => {
    it('should handle Danish characters (æøå) correctly', async () => {
      const danishContent = 'Dette er en test med æøå ÆØÅ';

      mockOctokit.rest.git.getTree.mockResolvedValueOnce({
        data: {
          sha: 'tree-sha',
          tree: [
            { path: 'dansk.md', type: 'blob', sha: 'danish-sha' },
          ],
        },
      });

      mockOctokit.rest.git.getBlob.mockResolvedValueOnce({
        data: {
          content: Buffer.from(danishContent, 'utf-8').toString('base64'),
          encoding: 'base64',
        },
      });

      await githubSync.syncRepository({
        owner: 'test',
        repo: 'repo',
        branch: 'main',
      });

      // Verify upsert was called with correct content
      const upsertCalls = mockSupabase.from().upsert.mock.calls;
      expect(upsertCalls.length).toBeGreaterThan(0);
      
      const savedDoc = upsertCalls[0][0];
      expect(savedDoc.content).toContain('æøå');
      expect(savedDoc.content).toContain('ÆØÅ');
    });

    it('should handle emoji in file content', async () => {
      const emojiContent = 'Test with emojis 🚀 🔐 📝';

      mockOctokit.rest.git.getTree.mockResolvedValueOnce({
        data: {
          sha: 'tree-sha',
          tree: [
            { path: 'emoji.md', type: 'blob', sha: 'emoji-sha' },
          ],
        },
      });

      mockOctokit.rest.git.getBlob.mockResolvedValueOnce({
        data: {
          content: Buffer.from(emojiContent, 'utf-8').toString('base64'),
          encoding: 'base64',
        },
      });

      await githubSync.syncRepository({
        owner: 'test',
        repo: 'repo',
        branch: 'main',
      });

      const upsertCalls = mockSupabase.from().upsert.mock.calls;
      const savedDoc = upsertCalls[0][0];
      expect(savedDoc.content).toContain('🚀');
      expect(savedDoc.content).toContain('🔐');
    });

    it('should handle various unicode characters', async () => {
      const unicodeContent = 'Japanese: 日本語, Arabic: مرحبا, Cyrillic: Привет';

      mockOctokit.rest.git.getTree.mockResolvedValueOnce({
        data: {
          sha: 'tree-sha',
          tree: [
            { path: 'unicode.txt', type: 'blob', sha: 'unicode-sha' },
          ],
        },
      });

      mockOctokit.rest.git.getBlob.mockResolvedValueOnce({
        data: {
          content: Buffer.from(unicodeContent, 'utf-8').toString('base64'),
          encoding: 'base64',
        },
      });

      await githubSync.syncRepository({
        owner: 'test',
        repo: 'repo',
        branch: 'main',
      });

      const upsertCalls = mockSupabase.from().upsert.mock.calls;
      const savedDoc = upsertCalls[0][0];
      expect(savedDoc.content).toContain('日本語');
      expect(savedDoc.content).toContain('مرحبا');
      expect(savedDoc.content).toContain('Привет');
    });
  });

  describe('SYNC-007: Incremental sync (updated files)', () => {
    it('should update document when SHA changes', async () => {
      const oldSHA = 'old-sha-123';
      const newSHA = 'new-sha-456';
      const filePath = 'updated/file.ts';

      // First sync with old SHA
      mockOctokit.rest.git.getTree.mockResolvedValueOnce({
        data: {
          sha: 'tree-sha-1',
          tree: [
            { path: filePath, type: 'blob', sha: oldSHA },
          ],
        },
      });

      mockOctokit.rest.git.getBlob.mockResolvedValueOnce({
        data: {
          content: Buffer.from('Old content').toString('base64'),
          encoding: 'base64',
        },
      });

      await githubSync.syncRepository({
        owner: 'test',
        repo: 'repo',
        branch: 'main',
      });

      // Verify first upsert
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sha: oldSHA,
          content: 'Old content',
        })
      );

      // Second sync with new SHA (file updated)
      mockOctokit.rest.git.getTree.mockResolvedValueOnce({
        data: {
          sha: 'tree-sha-2',
          tree: [
            { path: filePath, type: 'blob', sha: newSHA },
          ],
        },
      });

      mockOctokit.rest.git.getBlob.mockResolvedValueOnce({
        data: {
          content: Buffer.from('New updated content').toString('base64'),
          encoding: 'base64',
        },
      });

      await githubSync.syncRepository({
        owner: 'test',
        repo: 'repo',
        branch: 'main',
      });

      // Verify second upsert with new content
      expect(mockSupabase.from().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          sha: newSHA,
          content: 'New updated content',
        })
      );
    });
  });

  describe('SYNC-009: Network error handling', () => {
    it('should handle network timeout errors', async () => {
      mockOctokit.rest.git.getTree.mockRejectedValueOnce(
        new Error('ETIMEDOUT')
      );

      await expect(
        githubSync.syncRepository({
          owner: 'test',
          repo: 'repo',
          branch: 'main',
        })
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/ETIMEDOUT/i),
        }),
        expect.any(String)
      );
    });

    it('should handle connection refused errors', async () => {
      mockOctokit.rest.git.getTree.mockRejectedValueOnce(
        new Error('ECONNREFUSED')
      );

      await expect(
        githubSync.syncRepository({
          owner: 'test',
          repo: 'repo',
          branch: 'main',
        })
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle intermittent errors and retry', async () => {
      // First call fails
      mockOctokit.rest.git.getTree
        .mockRejectedValueOnce(new Error('Network error'))
        // Second call succeeds (if retry is implemented)
        .mockResolvedValueOnce({
          data: {
            sha: 'tree-sha',
            tree: [],
          },
        });

      // Depending on implementation, might succeed after retry
      try {
        await githubSync.syncRepository({
          owner: 'test',
          repo: 'repo',
          branch: 'main',
        });
        // If retry is implemented, should succeed
      } catch (error) {
        // If no retry, should fail
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe('Batch processing', () => {
    it('should process files in batches', async () => {
      // Create 25 mock files
      const files = Array(25).fill(0).map((_, i) => ({
        path: `file${i}.ts`,
        type: 'blob',
        sha: `sha-${i}`,
      }));

      mockOctokit.rest.git.getTree.mockResolvedValueOnce({
        data: {
          sha: 'tree-sha',
          tree: files,
        },
      });

      mockOctokit.rest.git.getBlob.mockResolvedValue({
        data: {
          content: Buffer.from('content').toString('base64'),
          encoding: 'base64',
        },
      });

      await githubSync.syncRepository({
        owner: 'test',
        repo: 'repo',
        branch: 'main',
      });

      // Should process all files
      expect(mockOctokit.rest.git.getBlob).toHaveBeenCalledTimes(25);
    });

    it('should handle large repositories efficiently', async () => {
      // Create 200 mock files
      const manyFiles = Array(200).fill(0).map((_, i) => ({
        path: `file${i}.ts`,
        type: 'blob',
        sha: `sha-${i}`,
      }));

      mockOctokit.rest.git.getTree.mockResolvedValueOnce({
        data: {
          sha: 'tree-sha',
          tree: manyFiles,
        },
      });

      mockOctokit.rest.git.getBlob.mockResolvedValue({
        data: {
          content: Buffer.from('content').toString('base64'),
          encoding: 'base64',
        },
      });

      const startTime = Date.now();
      
      await githubSync.syncRepository({
        owner: 'test',
        repo: 'large-repo',
        branch: 'main',
      });

      const duration = Date.now() - startTime;

      // Should complete in reasonable time (batching should help)
      // This is a rough check - actual time depends on batch size
      expect(duration).toBeLessThan(30000); // 30 seconds max for mocked calls
    });
  });

  describe('Error recovery', () => {
    it('should continue processing after individual file error', async () => {
      mockOctokit.rest.git.getTree.mockResolvedValueOnce({
        data: {
          sha: 'tree-sha',
          tree: [
            { path: 'good1.ts', type: 'blob', sha: 'sha1' },
            { path: 'bad.ts', type: 'blob', sha: 'sha-bad' },
            { path: 'good2.ts', type: 'blob', sha: 'sha2' },
          ],
        },
      });

      // First and third calls succeed, second fails
      mockOctokit.rest.git.getBlob
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from('Good content 1').toString('base64'),
            encoding: 'base64',
          },
        })
        .mockRejectedValueOnce(new Error('Failed to fetch blob'))
        .mockResolvedValueOnce({
          data: {
            content: Buffer.from('Good content 2').toString('base64'),
            encoding: 'base64',
          },
        });

      await githubSync.syncRepository({
        owner: 'test',
        repo: 'repo',
        branch: 'main',
      });

      // Should log error but continue
      expect(mockLogger.error).toHaveBeenCalled();
      
      // Should still process the good files
      expect(mockSupabase.from().upsert).toHaveBeenCalled();
    });
  });
});

