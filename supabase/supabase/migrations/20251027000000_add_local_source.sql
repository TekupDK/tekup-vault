-- Add 'local' source type to enum
-- Note: PostgreSQL doesn't support adding enum values in a transaction,
-- so we use a workaround with ALTER TYPE

DO $$ 
BEGIN
  -- Check if 'local' doesn't already exist in source_type enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'local' 
    AND enumtypid = 'source_type'::regtype
  ) THEN
    ALTER TYPE source_type ADD VALUE 'local';
  END IF;
END $$;

-- Add index for local source documents
CREATE INDEX IF NOT EXISTS idx_vault_documents_local 
ON vault_documents(source) 
WHERE source = 'local';

-- Add comment for documentation
COMMENT ON INDEX idx_vault_documents_local IS 
  'Index for fast retrieval of local filesystem documents';

-- Update sync_status table comment
COMMENT ON TABLE vault_sync_status IS 
  'Tracks sync status for all sources: github, local, supabase, render, copilot';
