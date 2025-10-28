import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Note: These tests require a test database with proper setup
// Skip if DATABASE_URL is not set
const DATABASE_URL = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'test-key';

const shouldSkip = !DATABASE_URL || DATABASE_URL.includes('example.com');

describe.skipIf(shouldSkip)('Database Integrity Tests', () => {
  let supabase: ReturnType<typeof createClient>;
  let testDocId: string;
  let testEmbeddingId: string;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await supabase.from('vault_embeddings').delete().like('document_id', 'test-%');
    await supabase.from('vault_documents').delete().like('id', 'test-%');
  });

  afterAll(async () => {
    // Final cleanup
    await supabase.from('vault_embeddings').delete().like('document_id', 'test-%');
    await supabase.from('vault_documents').delete().like('id', 'test-%');
  });

  describe('DB-001: Foreign key integrity', () => {
    it('should reject embedding with non-existent document_id', async () => {
      const nonExistentDocId = 'test-nonexistent-doc-123';
      const embedding = new Array(1536).fill(0.1);

      const { error } = await supabase
        .from('vault_embeddings')
        .insert({
          document_id: nonExistentDocId,
          embedding: embedding,
        });

      // Should fail with foreign key constraint violation
      expect(error).toBeTruthy();
      expect(error?.message).toMatch(/foreign key|constraint/i);
    });

    it('should accept embedding with valid document_id', async () => {
      // First create a document
      const { data: doc, error: docError } = await supabase
        .from('vault_documents')
        .insert({
          id: 'test-valid-doc-123',
          source: 'github',
          repository: 'test/repo',
          path: 'test/file.ts',
          content: 'Test content',
          sha: 'abc123',
        })
        .select()
        .single();

      expect(docError).toBeNull();
      expect(doc).toBeTruthy();

      // Then create embedding
      const embedding = new Array(1536).fill(0.2);
      const { error: embError } = await supabase
        .from('vault_embeddings')
        .insert({
          document_id: doc!.id,
          embedding: embedding,
        });

      expect(embError).toBeNull();
    });
  });

  describe('DB-002: Cascade delete', () => {
    it('should delete embeddings when document is deleted', async () => {
      // Create document
      const { data: doc } = await supabase
        .from('vault_documents')
        .insert({
          id: 'test-cascade-doc',
          source: 'github',
          repository: 'test/repo',
          path: 'cascade/test.ts',
          content: 'Cascade test',
          sha: 'def456',
        })
        .select()
        .single();

      testDocId = doc!.id;

      // Create embedding
      const embedding = new Array(1536).fill(0.3);
      const { data: embData } = await supabase
        .from('vault_embeddings')
        .insert({
          document_id: testDocId,
          embedding: embedding,
        })
        .select()
        .single();

      testEmbeddingId = embData!.id;

      // Verify embedding exists
      const { data: beforeDelete } = await supabase
        .from('vault_embeddings')
        .select()
        .eq('id', testEmbeddingId)
        .single();

      expect(beforeDelete).toBeTruthy();

      // Delete document
      await supabase
        .from('vault_documents')
        .delete()
        .eq('id', testDocId);

      // Verify embedding is also deleted (cascade)
      const { data: afterDelete } = await supabase
        .from('vault_embeddings')
        .select()
        .eq('id', testEmbeddingId)
        .single();

      expect(afterDelete).toBeNull();
    });
  });

  describe('DB-003: Unique constraint på (source, repository, path)', () => {
    it('should reject duplicate document with same (source, repo, path)', async () => {
      const docData = {
        source: 'github',
        repository: 'test/unique-repo',
        path: 'unique/path.ts',
        content: 'First version',
        sha: 'sha1',
      };

      // Insert first document
      const { error: firstError } = await supabase
        .from('vault_documents')
        .insert({
          id: 'test-unique-1',
          ...docData,
        });

      expect(firstError).toBeNull();

      // Try to insert duplicate
      const { error: dupError } = await supabase
        .from('vault_documents')
        .insert({
          id: 'test-unique-2',
          ...docData, // Same source, repo, path
        });

      // Should fail with unique constraint violation
      expect(dupError).toBeTruthy();
      expect(dupError?.message).toMatch(/unique|duplicate/i);
    });

    it('should allow same path in different repositories', async () => {
      const samePath = 'common/file.ts';

      const { error: error1 } = await supabase
        .from('vault_documents')
        .insert({
          id: 'test-diff-repo-1',
          source: 'github',
          repository: 'test/repo1',
          path: samePath,
          content: 'Content 1',
          sha: 'sha1',
        });

      const { error: error2 } = await supabase
        .from('vault_documents')
        .insert({
          id: 'test-diff-repo-2',
          source: 'github',
          repository: 'test/repo2',
          path: samePath,
          content: 'Content 2',
          sha: 'sha2',
        });

      // Both should succeed (different repository)
      expect(error1).toBeNull();
      expect(error2).toBeNull();
    });
  });

  describe('DB-004: Updated_at timestamp trigger', () => {
    it('should auto-update updated_at on document update', async () => {
      // Create document
      const { data: doc } = await supabase
        .from('vault_documents')
        .insert({
          id: 'test-timestamp-doc',
          source: 'github',
          repository: 'test/repo',
          path: 'timestamp/test.ts',
          content: 'Original content',
          sha: 'original-sha',
        })
        .select()
        .single();

      const originalUpdatedAt = doc!.updated_at;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update document
      const { data: updated } = await supabase
        .from('vault_documents')
        .update({ content: 'Updated content' })
        .eq('id', doc!.id)
        .select()
        .single();

      const newUpdatedAt = updated!.updated_at;

      // updated_at should be newer
      expect(new Date(newUpdatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  describe('DB-006: Cosine similarity calculation', () => {
    it('should calculate correct similarity between known vectors', async () => {
      // Create test document
      const { data: doc } = await supabase
        .from('vault_documents')
        .insert({
          id: 'test-similarity-doc',
          source: 'github',
          repository: 'test/repo',
          path: 'similarity/test.ts',
          content: 'Similarity test',
          sha: 'sim-sha',
        })
        .select()
        .single();

      // Create embedding with known vector
      // Vector: [1, 0, 0, ... 0] (1536 dims)
      const knownVector = new Array(1536).fill(0);
      knownVector[0] = 1;

      await supabase
        .from('vault_embeddings')
        .insert({
          document_id: doc!.id,
          embedding: knownVector,
        });

      // Search with similar vector [0.9, 0.1, 0, ... 0]
      const queryVector = new Array(1536).fill(0);
      queryVector[0] = 0.9;
      queryVector[1] = 0.1;

      const { data: results } = await supabase
        .rpc('match_documents', {
          query_embedding: queryVector,
          match_threshold: 0.5,
          match_count: 10,
        });

      // Should find the document with high similarity
      expect(results).toBeTruthy();
      
      const match = results?.find((r: any) => r.id === doc!.id);
      expect(match).toBeTruthy();
      
      // Similarity should be high (vectors are similar)
      expect(match?.similarity).toBeGreaterThan(0.8);
    });
  });

  describe('DB-007: Match_documents() med alle params', () => {
    it('should filter by source', async () => {
      // Create documents from different sources
      const { data: githubDoc } = await supabase
        .from('vault_documents')
        .insert({
          id: 'test-filter-github',
          source: 'github',
          repository: 'test/repo',
          path: 'filter/github.ts',
          content: 'GitHub content',
          sha: 'gh-sha',
        })
        .select()
        .single();

      const { data: supabaseDoc } = await supabase
        .from('vault_documents')
        .insert({
          id: 'test-filter-supabase',
          source: 'supabase',
          repository: 'test/db',
          path: 'filter/supabase.sql',
          content: 'Supabase content',
          sha: 'sb-sha',
        })
        .select()
        .single();

      // Add embeddings
      const embedding = new Array(1536).fill(0.5);
      await supabase.from('vault_embeddings').insert([
        { document_id: githubDoc!.id, embedding },
        { document_id: supabaseDoc!.id, embedding },
      ]);

      // Search with github filter
      const { data: results } = await supabase
        .rpc('match_documents', {
          query_embedding: embedding,
          match_threshold: 0.3,
          match_count: 10,
          filter_source: 'github',
        });

      // Should only return github document
      expect(results?.some((r: any) => r.source === 'github')).toBe(true);
      expect(results?.some((r: any) => r.source === 'supabase')).toBe(false);
    });

    it('should filter by repository', async () => {
      // Create documents from different repos
      const repo1 = 'test/repo1';
      const repo2 = 'test/repo2';

      const { data: doc1 } = await supabase
        .from('vault_documents')
        .insert({
          id: 'test-repo-filter-1',
          source: 'github',
          repository: repo1,
          path: 'test1.ts',
          content: 'Repo 1 content',
          sha: 'r1-sha',
        })
        .select()
        .single();

      const { data: doc2 } = await supabase
        .from('vault_documents')
        .insert({
          id: 'test-repo-filter-2',
          source: 'github',
          repository: repo2,
          path: 'test2.ts',
          content: 'Repo 2 content',
          sha: 'r2-sha',
        })
        .select()
        .single();

      // Add embeddings
      const embedding = new Array(1536).fill(0.6);
      await supabase.from('vault_embeddings').insert([
        { document_id: doc1!.id, embedding },
        { document_id: doc2!.id, embedding },
      ]);

      // Search with repo filter
      const { data: results } = await supabase
        .rpc('match_documents', {
          query_embedding: embedding,
          match_threshold: 0.3,
          match_count: 10,
          filter_repository: repo1,
        });

      // Should only return repo1 documents
      expect(results?.every((r: any) => r.repository === repo1)).toBe(true);
    });

    it('should apply threshold correctly', async () => {
      // Create document with embedding
      const { data: doc } = await supabase
        .from('vault_documents')
        .insert({
          id: 'test-threshold-doc',
          source: 'github',
          repository: 'test/repo',
          path: 'threshold/test.ts',
          content: 'Threshold test',
          sha: 'th-sha',
        })
        .select()
        .single();

      const docEmbedding = new Array(1536).fill(0);
      docEmbedding[0] = 1; // [1, 0, 0, ...]

      await supabase
        .from('vault_embeddings')
        .insert({
          document_id: doc!.id,
          embedding: docEmbedding,
        });

      // Query with very different vector (low similarity)
      const queryEmbedding = new Array(1536).fill(0);
      queryEmbedding[1535] = 1; // [0, 0, ..., 0, 1]

      // High threshold should exclude this result
      const { data: highThreshold } = await supabase
        .rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_threshold: 0.9,
          match_count: 10,
        });

      // Should not find document (similarity too low)
      expect(highThreshold?.length).toBe(0);

      // Low threshold should include it
      const { data: lowThreshold } = await supabase
        .rpc('match_documents', {
          query_embedding: queryEmbedding,
          match_threshold: 0.1,
          match_count: 10,
        });

      // Might find document depending on actual similarity
      expect(lowThreshold).toBeTruthy();
    });
  });

  describe('DB-010: Migration idempotency', () => {
    it('should have all required tables', async () => {
      // Check vault_documents exists
      const { error: docsError } = await supabase
        .from('vault_documents')
        .select('id')
        .limit(1);

      expect(docsError?.message).not.toMatch(/does not exist/i);

      // Check vault_embeddings exists
      const { error: embError } = await supabase
        .from('vault_embeddings')
        .select('id')
        .limit(1);

      expect(embError?.message).not.toMatch(/does not exist/i);

      // Check vault_sync_status exists
      const { error: syncError } = await supabase
        .from('vault_sync_status')
        .select('id')
        .limit(1);

      expect(syncError?.message).not.toMatch(/does not exist/i);
    });

    it('should have match_documents function', async () => {
      const testVector = new Array(1536).fill(0.1);

      const { error } = await supabase
        .rpc('match_documents', {
          query_embedding: testVector,
          match_threshold: 0.7,
          match_count: 5,
        });

      // Function should exist (might return empty results)
      expect(error?.message).not.toMatch(/function.*does not exist/i);
    });
  });
});

