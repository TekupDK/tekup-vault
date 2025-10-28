# TekupVault Copilot Instructions

## Project Overview
TekupVault is Tekup Portfolio's central intelligent knowledge layer - a monorepo that automatically consolidates, indexes, and enables semantic search across all Tekup Portfolio documentation, code, logs, and AI outputs.

**Integration Points:**
- **renos-backend** (JonasAbde/renos-backend): TypeScript + Node 18, Prisma, PostgreSQL
- **renos-frontend** (JonasAbde/renos-frontend): React 18 + TypeScript, Vite, Tailwind  
- **tekup-billy** (JonasAbde/Tekup-Billy): MCP HTTP server for Billy.dk integration

## Monorepo Architecture

### Structure (Turborepo + pnpm)
```
apps/
├── vault-api/        # REST API + GitHub webhooks (Express, Helmet, CORS)
└── vault-worker/     # Background ingestion worker (6-hour sync cycles)

packages/
├── vault-core/       # Shared types, config, Zod schemas
├── vault-ingest/     # Source connectors (GitHub Octokit, batch processing)
└── vault-search/     # Semantic search (OpenAI embeddings, pgvector)

supabase/migrations/  # PostgreSQL + pgvector schema
```

**Key Files:**
- `turbo.json`: Build pipeline with dependency graph
- `pnpm-workspace.yaml`: Workspace package configuration
- `render.yaml`: Production deployment to Frankfurt region

## Technology Standards (Non-Negotiable)

**Runtime & Language:**
- Node.js 18+ (LTS only)
- TypeScript 5.3+ with strict mode enabled
- ESLint + Prettier for all code

**Monorepo Tools:**
- Turborepo 1.11+ for orchestration
- pnpm 8.15+ workspaces (never npm/yarn)
- Run commands: `pnpm dev`, `pnpm build`, `pnpm lint`

**Database & Vector Search:**
- PostgreSQL 15+ with pgvector 0.5+ extension
- Supabase for real-time APIs and managed PostgreSQL
- IVFFlat index with lists=100 (optimized for <100k documents)
- Cosine similarity for vector search

**APIs & Validation:**
- Express 4.18+ with Helmet (security), CORS
- Pino for structured JSON logging (HTTP + application logs)
- Zod 3.22+ for all runtime type validation
- OpenAI text-embedding-3-small (1536 dimensions)

**Deployment:**
- Render.com (Frankfurt region specified in render.yaml)
- docker-compose.yml for local PostgreSQL + pgvector

## Core Functionality

### GitHub Sync Worker
**Location:** `apps/vault-worker/src/jobs/sync-github.ts`

- Syncs 3 repos: renos-backend, renos-frontend, tekup-billy
- Scheduled every 6 hours via background worker
- Webhook endpoint: POST /webhook/github (HMAC-SHA256 verified)
- Filters binary files: png, jpg, pdf, zip, woff, etc.
- Batch processing: 10 files at a time to avoid rate limits
- Upserts to `vault_documents` (unique on source+repo+path)
- Updates `vault_sync_status` table

### Semantic Search Pipeline
**Location:** `packages/vault-search/src/`

1. Content ingested → truncate to 8000 chars (token limit)
2. OpenAI generates 1536-dim vector
3. Store in `vault_embeddings` table (VECTOR(1536))
4. Search via `match_documents()` PostgreSQL function
5. Return top-N results with similarity scores

**API Endpoint:** POST /api/search
```json
{
  "query": "string",
  "limit": 10,
  "threshold": 0.7
}
```

## Database Schema

**Tables (Supabase Migration):**
- `vault_documents`: source, repo, path, content, metadata, sha, timestamps
- `vault_embeddings`: document_id, embedding VECTOR(1536)
- `vault_sync_status`: source, repo, status, last_sync_at, error_message

**Indexes:**
- IVFFlat vector index on embeddings (lists=100)
- B-tree on source, repository, updated_at

**Functions:**
- `match_documents(query_embedding, threshold, count)`: Returns similar docs

## Development Workflow

### Local Setup
```bash
pnpm install
cp .env.example .env
# Add real secrets: GITHUB_TOKEN, OPENAI_API_KEY, SUPABASE_*
docker-compose up -d  # Starts PostgreSQL + pgvector
pnpm build
pnpm dev
```

### Package Development
- All packages use TypeScript strict mode
- Export types from `packages/vault-core/src/types.ts`
- Config validation via Zod in `packages/vault-core/src/config.ts`
- Never hardcode secrets - use environment variables

### Adding New Data Sources
1. Create connector in `packages/vault-ingest/src/`
2. Follow GitHub sync pattern: fetch → filter → batch → upsert
3. Update `vault_sync_status` table
4. Add job to `apps/vault-worker/src/jobs/`

## Security & Rate Limits

**GitHub Webhooks:**
- HMAC-SHA256 verification required (use GITHUB_WEBHOOK_SECRET)
- Async processing - acknowledge webhook immediately

**OpenAI API:**
- Rate limit: ~3000 req/min for text-embedding-3-small
- Implement exponential backoff on 429 errors

**API Security:**
- Helmet middleware for HTTP headers
- CORS configured for Tekup Portfolio domains
- Health check: GET /health (unauthenticated)

## Logging Standards

**Use Pino structured logging:**
```typescript
logger.info({ repo, filesProcessed }, 'GitHub sync completed');
logger.error({ error: err.message }, 'Embedding generation failed');
```

**Required fields:**
- HTTP requests: method, url, statusCode, responseTime
- Background jobs: jobName, duration, status
- Errors: error.message, error.stack

## Common Patterns

### Zod Validation
All API inputs and config must use Zod schemas from `packages/vault-core`:
```typescript
import { SearchQuerySchema } from '@tekupvault/vault-core';
const query = SearchQuerySchema.parse(req.body);
```

### Supabase Client
Use service key for worker, anon key for API:
```typescript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
```

### Error Handling
Structured errors with context:
```typescript
try {
  await syncRepo(owner, repo);
} catch (err) {
  await updateSyncStatus(repo, 'error', err.message);
  logger.error({ repo, error: err }, 'Sync failed');
}
```

## Phase 1 Scope (Current)
✅ GitHub sync (3 Tekup repos)  
✅ OpenAI embeddings + pgvector search  
✅ REST API + webhook endpoint  
✅ Background worker (6-hour sync)  
✅ Local dev (docker-compose) + production (render.yaml)

## Future Phases
🔜 MCP server for direct Copilot integration  
🔜 Supabase schema introspection  
🔜 Render log ingestion  
🔜 Web UI (React + Tailwind)

## Quick Reference

**Environment Variables:**
```bash
DATABASE_URL=postgresql://postgres:[pwd]@db.[ref].supabase.co:5432/postgres
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...
GITHUB_TOKEN=ghp_...
GITHUB_WEBHOOK_SECRET=your_secret
OPENAI_API_KEY=sk-proj-...
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

**Package Manager:**
- Always use `pnpm` (enforced via packageManager field)
- Internal dependencies use workspace protocol: `"@tekupvault/vault-core": "workspace:*"`

**Build Commands:**
- `pnpm dev`: Start all apps in watch mode
- `pnpm build`: Incremental Turborepo build
- `pnpm lint`: ESLint across all packages
- `pnpm clean`: Remove dist/ folders

## Critical Notes
- **Never use npm/yarn** - pnpm is required for workspace protocol
- **Frankfurt region** - hardcoded in render.yaml for compliance
- **Strict TypeScript** - no implicit any, strict null checks
- **Zod everywhere** - runtime validation for all external data
- **Pino logging** - structured JSON only, no console.log
- **Batch processing** - avoid rate limits with 10-file batches
- **Upsert pattern** - prevent duplicates with unique constraints
