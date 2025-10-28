# Vault API Tools

## test-supabase-connection.js

Verifies connectivity to the Supabase Postgres (direct 5432) and Session Pooler (6543).

Usage options:

- Using workspace script (loads tekup-secrets/.env.shared):
  pnpm --filter @tekupvault/vault-api run tools:test-db

- Pass a DB URL explicitly (if env doesn’t contain DATABASE_URL):
  pnpm --filter @tekupvault/vault-api exec node tools/test-supabase-connection.js db=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require

- Customize pooler host via env:
  SUPABASE_POOLER_HOST=aws-0-eu-central-1.pooler.supabase.com pnpm --filter @tekupvault/vault-api run tools:test-db

Environment variable fallbacks:
- DATABASE_URL (preferred)
- SUPABASE_DB_URL
- POSTGRES_URL
- VAULT_DATABASE_URL

Notes:
- Session Pooler requires user postgres and port 6543.
- SSL is enabled with rejectUnauthorized=false for convenience; use proper CA in production.
