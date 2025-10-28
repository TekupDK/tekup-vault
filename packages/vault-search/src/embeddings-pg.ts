import { EMBEDDING_CONFIG } from "@tekupvault/vault-core";
import OpenAI from "openai";
import { Pool } from "pg";
import { Logger } from "pino";

export class PostgresEmbeddingService {
  private openai: OpenAI;
  private pool: Pool;
  private logger: Logger;

  constructor(apiKey: string, databaseUrl: string, logger: Logger) {
    this.openai = new OpenAI({ apiKey });
    this.pool = new Pool({ connectionString: databaseUrl });
    this.logger = logger;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Generate and store embedding for a document
   */
  async indexDocument(documentId: string, content: string): Promise<void> {
    try {
      const truncated = content.slice(
        0,
        EMBEDDING_CONFIG.maxCharsBeforeTruncation
      );
      const embedding = await this.generateEmbedding(truncated);

      const query = `
        INSERT INTO vault_embeddings (document_id, embedding, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (document_id)
        DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = EXCLUDED.updated_at;
      `;

      await this.pool.query(query, [documentId, embedding]);
      this.logger.debug({ documentId }, "Document indexed successfully (pg)");
    } catch (error) {
      this.logger.error({ documentId, error }, "Failed to index document (pg)");
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: EMBEDDING_CONFIG.model,
      input: text,
      dimensions: EMBEDDING_CONFIG.dimensions,
    });
    return response.data[0].embedding;
  }

  /**
   * Format embedding array as Postgres vector literal
   */
  private formatVectorLiteral(embedding: number[]): string {
    return `[${embedding.join(",")}]`;
  }

  async search(
    query: string,
    options: {
      limit?: number;
      threshold?: number;
      source?: string;
      repository?: string;
    } = {}
  ): Promise<
    Array<{
      id: string;
      source: string;
      repository: string;
      path: string;
      content: string;
      metadata: Record<string, unknown> | null;
      sha: string | null;
      similarity: number;
    }>
  > {
    const { limit = 10, threshold = 0.7, source, repository } = options;
    const queryEmbedding = await this.generateEmbedding(query);

    // Call Postgres function match_documents if available
    const sql = `
      SELECT * FROM match_documents($1, $2::float, $3::int, $4::source_type, $5::varchar);
    `;
    type SearchRow = {
      id: string;
      source: string;
      repository: string;
      path: string;
      content: string;
      metadata: Record<string, unknown> | null;
      sha: string | null;
      similarity: number | string;
    };
    const { rows } = await this.pool.query<SearchRow>(sql, [
      `[${queryEmbedding.join(",")}]`,
      threshold,
      limit,
      source ?? null,
      repository ?? null,
    ]);
    this.logger.info(
      { query: query.slice(0, 50), resultsCount: rows.length },
      "Search completed (pg)"
    );
    return rows.map((r: SearchRow) => ({
      id: r.id,
      source: r.source,
      repository: r.repository,
      path: r.path,
      content: r.content,
      metadata: r.metadata,
      sha: r.sha,
      similarity: Number(r.similarity),
    }));
  }

  /**
   * Index all unindexed documents
   */
  async indexUnindexedDocuments(): Promise<number> {
    // Select documents with no embedding yet
    const selectSql = `
      SELECT d.id, d.content
      FROM vault_documents d
      LEFT JOIN vault_embeddings e ON e.document_id = d.id
      WHERE e.document_id IS NULL
      LIMIT 100;
    `;

    const { rows } = await this.pool.query<{ id: string; content: string }>(
      selectSql
    );
    if (rows.length === 0) {
      this.logger.info("No unindexed documents found (pg)");
      return 0;
    }

    this.logger.info(
      { count: rows.length },
      "Indexing unindexed documents (pg)"
    );
    let indexed = 0;
    const batchSize = 10;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      try {
        const embeddings = await Promise.all(
          batch.map(async (doc: { id: string; content: string }) => ({
            id: doc.id,
            embedding: await this.generateEmbedding(
              doc.content.slice(0, EMBEDDING_CONFIG.maxCharsBeforeTruncation)
            ),
          }))
        );

        // Insert each embedding individually (Postgres VECTOR type needs special handling)
        for (const emb of embeddings) {
          const insertSql = `
            INSERT INTO vault_embeddings (document_id, embedding, updated_at)
            VALUES ($1, $2::vector(1536), NOW())
            ON CONFLICT (document_id) DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = EXCLUDED.updated_at;
          `;
          await this.pool.query(insertSql, [
            emb.id,
            this.formatVectorLiteral(emb.embedding),
          ]);
        }

        indexed += batch.length;
        this.logger.debug(
          { batchIndexed: batch.length, totalIndexed: indexed },
          "Batch indexed (pg)"
        );
      } catch (error) {
        this.logger.error({ error }, "Failed to index batch (pg)");
      }
    }

    this.logger.info({ indexed }, "Finished indexing unindexed documents (pg)");
    return indexed;
  }
}
