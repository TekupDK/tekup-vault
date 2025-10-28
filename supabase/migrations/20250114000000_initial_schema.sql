-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enum types
CREATE TYPE source_type AS ENUM ('github', 'supabase', 'render', 'copilot');
CREATE TYPE sync_status AS ENUM ('pending', 'in_progress', 'success', 'error');

-- Create vault_documents table
CREATE TABLE vault_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source source_type NOT NULL,
    repository VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    sha VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source, repository, path)
);

-- Create indexes for vault_documents
CREATE INDEX idx_vault_documents_source ON vault_documents(source);
CREATE INDEX idx_vault_documents_repository ON vault_documents(repository);
CREATE INDEX idx_vault_documents_updated_at ON vault_documents(updated_at DESC);
CREATE INDEX idx_vault_documents_metadata ON vault_documents USING GIN(metadata);

-- Create vault_embeddings table
CREATE TABLE vault_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES vault_documents(id) ON DELETE CASCADE,
    embedding VECTOR(1536) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (document_id)
);

-- Create IVFFlat index for vector similarity search
CREATE INDEX idx_vault_embeddings_vector 
ON vault_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create vault_sync_status table
CREATE TABLE vault_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source source_type NOT NULL,
    repository VARCHAR(255) NOT NULL,
    status sync_status NOT NULL DEFAULT 'pending',
    last_sync_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (source, repository)
);

-- Create indexes for vault_sync_status
CREATE INDEX idx_vault_sync_status_source ON vault_sync_status(source);
CREATE INDEX idx_vault_sync_status_status ON vault_sync_status(status);
CREATE INDEX idx_vault_sync_status_updated_at ON vault_sync_status(updated_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_vault_documents_updated_at
    BEFORE UPDATE ON vault_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vault_embeddings_updated_at
    BEFORE UPDATE ON vault_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vault_sync_status_updated_at
    BEFORE UPDATE ON vault_sync_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to search for similar documents
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding VECTOR(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10,
    filter_source source_type DEFAULT NULL,
    filter_repository VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    source source_type,
    repository VARCHAR,
    path TEXT,
    content TEXT,
    metadata JSONB,
    sha VARCHAR,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.source,
        d.repository,
        d.path,
        d.content,
        d.metadata,
        d.sha,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM vault_embeddings e
    JOIN vault_documents d ON e.document_id = d.id
    WHERE
        (filter_source IS NULL OR d.source = filter_source)
        AND (filter_repository IS NULL OR d.repository = filter_repository)
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE vault_documents IS 'Stores ingested documents from various sources';
COMMENT ON TABLE vault_embeddings IS 'Stores OpenAI embeddings for semantic search';
COMMENT ON TABLE vault_sync_status IS 'Tracks synchronization status for each source';
COMMENT ON FUNCTION match_documents IS 'Performs semantic search using cosine similarity';
