import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'pino';
import { EMBEDDING_CONFIG } from '@tekupvault/vault-core';

export class EmbeddingService {
  private openai: OpenAI;
  private supabase: SupabaseClient;
  private logger: Logger;

  constructor(apiKey: string, supabase: SupabaseClient, logger: Logger) {
    this.openai = new OpenAI({ apiKey });
    this.supabase = supabase;
    this.logger = logger;
  }

  /**
   * Generate and store embedding for a document
   */
  async indexDocument(documentId: string, content: string): Promise<void> {
    try {
      // Truncate content if too long
      const truncatedContent = content.slice(0, EMBEDDING_CONFIG.maxCharsBeforeTruncation);

      // Generate embedding
      const embedding = await this.generateEmbedding(truncatedContent);

      // Store in database
      const { error } = await this.supabase
        .from('vault_embeddings')
        .upsert({
          document_id: documentId,
          embedding,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'document_id'
        });

      if (error) {
        throw error;
      }

      this.logger.debug({ documentId }, 'Document indexed successfully');
    } catch (error) {
      this.logger.error({ documentId, error }, 'Failed to index document');
      throw error;
    }
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: EMBEDDING_CONFIG.model,
        input: text,
        dimensions: EMBEDDING_CONFIG.dimensions
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error({ error }, 'Failed to generate embedding');
      throw error;
    }
  }

  /**
   * Search for similar documents
   */
  async search(
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      source?: string;
      repository?: string;
    } = {}
  ): Promise<Array<{
    id: string;
    source: string;
    repository: string;
    path: string;
    content: string;
    metadata: Record<string, unknown> | null;
    sha: string | null;
    similarity: number;
  }>> {
    const { limit = 10, threshold = 0.7, source, repository } = options;

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Call the match_documents function
      const rpcResponse = await this.supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
        filter_source: source,
        filter_repository: repository
      });

      if (rpcResponse.error) {
        throw rpcResponse.error;
      }

      const results = (rpcResponse.data ?? []) as Array<{
        id: string;
        source: string;
        repository: string;
        path: string;
        content: string;
        metadata: Record<string, unknown> | null;
        sha: string | null;
        similarity: number;
      }>;

      this.logger.info({
        query: query.slice(0, 50),
        resultsCount: results.length
      }, 'Search completed');

      return results;
    } catch (error) {
      this.logger.error({ query, error }, 'Search failed');
      throw error;
    }
  }

  /**
   * Index all unindexed documents
   */
  async indexUnindexedDocuments(): Promise<number> {
    try {
      // Get all document IDs that already have embeddings
      const { data: existingEmbeddings, error: embError } = await this.supabase
        .from('vault_embeddings')
        .select('document_id');

      if (embError) {
        throw embError;
      }

      const indexedIds = new Set((existingEmbeddings as Array<{ document_id: string }> | null)?.map(e => e.document_id) || []);

      // Get documents without embeddings (fetch batch and filter in code)
      const { data: allDocs, error } = await this.supabase
        .from('vault_documents')
        .select('id, content')
        .limit(1000); // Fetch larger batch to find unindexed ones

      if (error) {
        throw error;
      }

      // Filter out documents that already have embeddings
      const documents = (allDocs as Array<{ id: string; content: string }> | null)?.filter(doc => !indexedIds.has(doc.id)).slice(0, 100);

      if (!documents || documents.length === 0) {
        this.logger.info('No unindexed documents found');
        return 0;
      }

      this.logger.info({ count: documents.length }, 'Indexing unindexed documents');

      let indexed = 0;
      
      // Generate embeddings in parallel (batch of 10)
      const batchSize = 10;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        try {
          // Generate all embeddings in parallel
          const embeddingPromises = batch.map(async (doc) => {
            const truncatedContent = doc.content.slice(0, EMBEDDING_CONFIG.maxCharsBeforeTruncation);
            const embedding = await this.generateEmbedding(truncatedContent);
            return {
              document_id: doc.id,
              embedding,
              updated_at: new Date().toISOString()
            };
          });
          
          const embeddings = await Promise.all(embeddingPromises);
          
          // Batch upsert all embeddings at once
          const { error } = await this.supabase
            .from('vault_embeddings')
            .upsert(embeddings, { onConflict: 'document_id' });
          
          if (error) {
            throw error;
          }
          
          indexed += batch.length;
          this.logger.debug({ batchIndexed: batch.length, totalIndexed: indexed }, 'Batch indexed');
        } catch (error) {
          this.logger.error({ batchSize: batch.length, error }, 'Failed to index batch');
          // Continue with next batch even if this one fails
        }
      }

      this.logger.info({ indexed }, 'Finished indexing unindexed documents');
      return indexed;
    } catch (error) {
      this.logger.error({ error }, 'Failed to index unindexed documents');
      throw error;
    }
  }
}
