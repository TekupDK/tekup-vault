-- Enable Row Level Security on all tables
ALTER TABLE vault_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_sync_status ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access to all tables
CREATE POLICY "Service role full access to documents"
  ON vault_documents FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to embeddings"
  ON vault_embeddings FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access to sync status"
  ON vault_sync_status FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Policy: Authenticated users can read documents (for future multi-tenant support)
CREATE POLICY "Authenticated users can read documents"
  ON vault_documents FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read embeddings"
  ON vault_embeddings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read sync status"
  ON vault_sync_status FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Anonymous users cannot access any tables
-- (implicitly denied by RLS when no matching policy)

-- Add comment for documentation
COMMENT ON TABLE vault_documents IS 'RLS enabled: service_role full access, authenticated read-only';
COMMENT ON TABLE vault_embeddings IS 'RLS enabled: service_role full access, authenticated read-only';
COMMENT ON TABLE vault_sync_status IS 'RLS enabled: service_role full access, authenticated read-only';

