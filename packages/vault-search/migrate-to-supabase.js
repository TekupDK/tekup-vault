#!/usr/bin/env node
/**
 * TekupVault Data Migration Script
 * Migrates data from local Docker PostgreSQL to Supabase
 */

const { Pool } = require("pg");

// Prefer connection strings from env to avoid hardcoded credentials.
// Usage:
//   SOURCE_DB_URL=postgresql://user:pass@localhost:5432/tekupvault \
//   TARGET_DB_URL=postgresql://postgres:pass@db.<ref>.supabase.co:5432/postgres \
//   node packages/vault-search/migrate-to-supabase.js

function makePoolFromEnv(varName, fallback) {
  const url = process.env[varName] || fallback;
  if (!url) {
    throw new Error(`Missing required env var ${varName}`);
  }
  // Supabase requires SSL. pg enables it automatically for connectionString when ?sslmode=require
  // To be safe, pass ssl for non-local hosts.
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  return new Pool({
    connectionString: url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
}

// Source: Local Docker PostgreSQL (can be overridden via SOURCE_DB_URL)
const sourcePool = makePoolFromEnv(
  "SOURCE_DB_URL",
  "postgresql://postgres:postgres@localhost:5432/tekupvault"
);

// Target: Supabase "Tekup Database" Pro (provide TARGET_DB_URL)
const targetPool = makePoolFromEnv(
  "TARGET_DB_URL",
  process.env.DATABASE_URL || ""
);

async function migrate() {
  console.log("🚀 Starting TekupVault data migration...\n");

  try {
    // Step 1: Migrate vault_documents
    console.log("📄 Migrating vault_documents...");
    const { rows: documents } = await sourcePool.query(
      "SELECT * FROM vault_documents ORDER BY created_at"
    );
    console.log(`   Found ${documents.length} documents`);

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      await targetPool.query(
        `INSERT INTO vault_documents (id, source, repository, path, content, metadata, sha, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (source, repository, path) DO UPDATE SET
           content = EXCLUDED.content,
           metadata = EXCLUDED.metadata,
           sha = EXCLUDED.sha,
           updated_at = EXCLUDED.updated_at`,
        [
          doc.id,
          doc.source,
          doc.repository,
          doc.path,
          doc.content,
          doc.metadata,
          doc.sha,
          doc.created_at,
          doc.updated_at,
        ]
      );
      if ((i + 1) % 50 === 0) {
        console.log(
          `   Progress: ${i + 1}/${documents.length} documents migrated`
        );
      }
    }
    console.log(`   ✅ Migrated ${documents.length} documents\n`);

    // Step 2: Migrate vault_embeddings
    console.log("🧠 Migrating vault_embeddings...");
    const { rows: embeddings } = await sourcePool.query(
      "SELECT * FROM vault_embeddings ORDER BY created_at"
    );
    console.log(`   Found ${embeddings.length} embeddings`);

    for (let i = 0; i < embeddings.length; i++) {
      const emb = embeddings[i];
      await targetPool.query(
        `INSERT INTO vault_embeddings (id, document_id, embedding, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (document_id) DO UPDATE SET
           embedding = EXCLUDED.embedding,
           updated_at = EXCLUDED.updated_at`,
        [emb.id, emb.document_id, emb.embedding, emb.created_at, emb.updated_at]
      );
      if ((i + 1) % 50 === 0) {
        console.log(
          `   Progress: ${i + 1}/${embeddings.length} embeddings migrated`
        );
      }
    }
    console.log(`   ✅ Migrated ${embeddings.length} embeddings\n`);

    // Step 3: Migrate vault_sync_status
    console.log("📊 Migrating vault_sync_status...");
    const { rows: syncStatus } = await sourcePool.query(
      "SELECT * FROM vault_sync_status"
    );
    console.log(`   Found ${syncStatus.length} sync status records`);

    for (const sync of syncStatus) {
      await targetPool.query(
        `INSERT INTO vault_sync_status (id, source, repository, status, last_sync_at, error_message, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (source, repository) DO UPDATE SET
           status = EXCLUDED.status,
           last_sync_at = EXCLUDED.last_sync_at,
           error_message = EXCLUDED.error_message,
           updated_at = EXCLUDED.updated_at`,
        [
          sync.id,
          sync.source,
          sync.repository,
          sync.status,
          sync.last_sync_at,
          sync.error_message,
          sync.created_at,
          sync.updated_at,
        ]
      );
    }
    console.log(`   ✅ Migrated ${syncStatus.length} sync status records\n`);

    // Step 4: Verify migration
    console.log("🔍 Verifying migration...");
    const { rows: targetDocs } = await targetPool.query(
      "SELECT COUNT(*) as count FROM vault_documents"
    );
    const { rows: targetEmbs } = await targetPool.query(
      "SELECT COUNT(*) as count FROM vault_embeddings"
    );
    const { rows: targetSync } = await targetPool.query(
      "SELECT COUNT(*) as count FROM vault_sync_status"
    );

    console.log(`   Documents in Supabase: ${targetDocs[0].count}`);
    console.log(`   Embeddings in Supabase: ${targetEmbs[0].count}`);
    console.log(`   Sync status in Supabase: ${targetSync[0].count}`);

    if (
      targetDocs[0].count === documents.length &&
      targetEmbs[0].count === embeddings.length
    ) {
      console.log("\n✅ Migration completed successfully!");
      console.log("\n📝 Next steps:");
      console.log("   1. Create IVFFlat index in Supabase SQL Editor:");
      console.log(
        "      CREATE INDEX idx_vault_embeddings_vector ON vault_embeddings"
      );
      console.log(
        "      USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);"
      );
      console.log("   2. Update TekupVault .env to use Supabase");
      console.log("   3. Test search endpoint");
    } else {
      console.log(
        "\n⚠️  Warning: Row counts do not match. Please verify data integrity."
      );
    }
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

migrate();
