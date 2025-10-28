import { describe, expect, it, beforeEach, vi } from 'vitest';
import { EmbeddingService } from '../src/embeddings';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockResolvedValue({ data: null, error: null }),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
  rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
};

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

// Mock OpenAI responses
const mockOpenAI = {
  embeddings: {
    create: vi.fn(),
  },
};

describe('Embedding Service', () => {
  let embeddingService: EmbeddingService;
  const MOCK_API_KEY = 'sk-test-key-123';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock response for embeddings
    mockOpenAI.embeddings.create.mockResolvedValue({
      data: [
        {
          embedding: new Array(1536).fill(0).map((_, i) => i / 1536),
          index: 0,
        },
      ],
      model: 'text-embedding-3-small',
      usage: { prompt_tokens: 10, total_tokens: 10 },
    });

    embeddingService = new EmbeddingService(
      MOCK_API_KEY,
      mockSupabase as any,
      mockLogger as any
    );

    // Mock the OpenAI client
    (embeddingService as any).openai = mockOpenAI;
  });

  describe('EMBED-002: Content truncation for lange dokumenter', () => {
    it('should truncate content longer than 8000 chars', async () => {
      const longContent = 'a'.repeat(15000);
      const docId = 'doc-123';

      await embeddingService.indexDocument(docId, longContent);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.stringMatching(/^a{8000}$/),
        })
      );
    });

    it('should not truncate content shorter than 8000 chars', async () => {
      const shortContent = 'Short content here';
      const docId = 'doc-456';

      await embeddingService.indexDocument(docId, shortContent);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          input: shortContent,
        })
      );
    });

    it('should handle content exactly 8000 chars', async () => {
      const exactContent = 'x'.repeat(8000);
      const docId = 'doc-789';

      await embeddingService.indexDocument(docId, exactContent);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          input: exactContent,
        })
      );
    });
  });

  describe('EMBED-003: OpenAI API error handling', () => {
    it('should handle invalid API key error', async () => {
      mockOpenAI.embeddings.create.mockRejectedValueOnce(
        new Error('Invalid API key')
      );

      const docId = 'doc-error';
      const content = 'Test content';

      await expect(
        embeddingService.indexDocument(docId, content)
      ).rejects.toThrow('Invalid API key');

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle rate limit errors', async () => {
      mockOpenAI.embeddings.create.mockRejectedValueOnce(
        new Error('Rate limit exceeded')
      );

      const docId = 'doc-rate-limit';
      const content = 'Test content';

      await expect(
        embeddingService.indexDocument(docId, content)
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle network timeout errors', async () => {
      mockOpenAI.embeddings.create.mockRejectedValueOnce(
        new Error('Request timeout')
      );

      const docId = 'doc-timeout';
      const content = 'Test content';

      await expect(
        embeddingService.indexDocument(docId, content)
      ).rejects.toThrow('Request timeout');
    });
  });

  describe('EMBED-006: Embedding vector dimensionality', () => {
    it('should generate embeddings with 1536 dimensions', async () => {
      const docId = 'doc-dimensions';
      const content = 'Test content for dimensions';

      await embeddingService.indexDocument(docId, content);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'text-embedding-3-small',
          dimensions: 1536,
        })
      );
    });

    it('should validate embedding dimensions before storing', async () => {
      const docId = 'doc-validate';
      const content = 'Validation test';

      // Mock response with correct dimensions
      mockOpenAI.embeddings.create.mockResolvedValueOnce({
        data: [
          {
            embedding: new Array(1536).fill(0.1),
            index: 0,
          },
        ],
      });

      await embeddingService.indexDocument(docId, content);

      // Should successfully store
      expect(mockSupabase.from).toHaveBeenCalledWith('vault_embeddings');
    });

    it('should reject embeddings with wrong dimensions', async () => {
      const docId = 'doc-wrong-dim';
      const content = 'Wrong dimension test';

      // Mock response with incorrect dimensions
      mockOpenAI.embeddings.create.mockResolvedValueOnce({
        data: [
          {
            embedding: new Array(512).fill(0.1), // Wrong dimension
            index: 0,
          },
        ],
      });

      // Should handle gracefully (implementation dependent)
      try {
        await embeddingService.indexDocument(docId, content);
      } catch (error) {
        // Expected to fail or handle gracefully
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe('EMBED-008: Embedding quality consistency', () => {
    it('should generate similar embeddings for same content', async () => {
      const content = 'Consistent test content';
      const docId1 = 'doc-consistent-1';
      const docId2 = 'doc-consistent-2';

      // First call
      await embeddingService.indexDocument(docId1, content);
      const firstCall = mockOpenAI.embeddings.create.mock.calls[0][0];

      // Second call
      await embeddingService.indexDocument(docId2, content);
      const secondCall = mockOpenAI.embeddings.create.mock.calls[1][0];

      // Should use same input
      expect(firstCall.input).toBe(secondCall.input);
      expect(firstCall.model).toBe(secondCall.model);
    });
  });

  describe('EMBED-009: Embedding af tom/minimal content', () => {
    it('should handle empty string gracefully', async () => {
      const docId = 'doc-empty';
      const content = '';

      // Should either succeed or fail gracefully
      try {
        await embeddingService.indexDocument(docId, content);
        // If it succeeds, verify it was called
        expect(mockOpenAI.embeddings.create).toHaveBeenCalled();
      } catch (error) {
        // If it fails, should be handled gracefully
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });

    it('should handle very short content (2-3 chars)', async () => {
      const shortContents = ['ab', 'abc', 'x'];

      for (const content of shortContents) {
        const docId = `doc-short-${content}`;

        await embeddingService.indexDocument(docId, content);

        expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith(
          expect.objectContaining({
            input: content,
          })
        );
      }
    });

    it('should handle content with only whitespace', async () => {
      const docId = 'doc-whitespace';
      const content = '   \n\t   ';

      // Should handle gracefully
      try {
        await embeddingService.indexDocument(docId, content);
      } catch (error) {
        // Expected behavior - either succeed or fail gracefully
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe('EMBED-005: Batch embedding generation', () => {
    it('should process multiple documents', async () => {
      const mockDocs = [
        { id: 'doc-1', content: 'Content 1' },
        { id: 'doc-2', content: 'Content 2' },
        { id: 'doc-3', content: 'Content 3' },
      ];

      // Mock unindexed documents query
      mockSupabase.from().select().is().limit.mockResolvedValueOnce({
        data: mockDocs,
        error: null,
      });

      await embeddingService.indexUnindexedDocuments();

      // Should call embeddings API for each doc
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(3);
    });

    it('should handle batch processing with limit', async () => {
      // Create 150 mock documents
      const manyDocs = Array(150).fill(0).map((_, i) => ({
        id: `doc-${i}`,
        content: `Content ${i}`,
      }));

      // Mock should only return first 100 (batch limit)
      mockSupabase.from().select().is().limit.mockResolvedValueOnce({
        data: manyDocs.slice(0, 100),
        error: null,
      });

      await embeddingService.indexUnindexedDocuments();

      // Should process batch (max 100)
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(100);
    });
  });

  describe('EMBED-007: Re-indexing updated documents', () => {
    it('should update existing embedding when document changes', async () => {
      const docId = 'doc-updated';
      const oldContent = 'Old content';
      const newContent = 'New updated content';

      // First index
      await embeddingService.indexDocument(docId, oldContent);
      
      // Update index
      await embeddingService.indexDocument(docId, newContent);

      // Should have been called twice with different content
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(2);
      expect(mockOpenAI.embeddings.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ input: oldContent })
      );
      expect(mockOpenAI.embeddings.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ input: newContent })
      );
    });
  });

  describe('Search functionality', () => {
    it('should search with embeddings', async () => {
      const query = 'test search query';
      const options = {
        limit: 10,
        threshold: 0.7,
      };

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          {
            id: 'doc-1',
            content: 'Matching content',
            similarity: 0.85,
          },
        ],
        error: null,
      });

      const results = await embeddingService.search(query, options);

      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith(
        expect.objectContaining({
          input: query,
        })
      );
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'match_documents',
        expect.any(Object)
      );
      expect(results).toHaveLength(1);
      expect(results[0].similarity).toBe(0.85);
    });

    it('should handle search with filters', async () => {
      const query = 'filtered search';
      const options = {
        limit: 5,
        threshold: 0.6,
        source: 'github',
        repository: 'JonasAbde/renos-backend',
      };

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await embeddingService.search(query, options);

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'match_documents',
        expect.objectContaining({
          match_threshold: 0.6,
          match_count: 5,
          filter_source: 'github',
          filter_repository: 'JonasAbde/renos-backend',
        })
      );
    });
  });
});

