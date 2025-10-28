# TekupVault - ChatGPT Knowledge Base

> **Sidst opdateret**: 2025-10-17  
> **Version**: 1.0.0  
> **Production Status**: 🟢 LIVE (https://tekupvault.onrender.com)

---

## 📋 Project Overview

**TekupVault** er Tekup Portfolio's centrale intelligente knowledge layer - et TypeScript monorepo (pnpm + Turborepo) der automatisk konsoliderer, indekserer og enabler semantisk søgning på tværs af alle Tekup Portfolio repositories.

### Production URLs
- **API**: `https://tekupvault.onrender.com`
- **Health Check**: `https://tekupvault.onrender.com/health`
- **Region**: Frankfurt (Render.com)
- **Status**: Live med 31/31 kritiske tests passing

### Synkroniserede Repositories
1. `JonasAbde/renos-backend` (TypeScript backend, Prisma, PostgreSQL)
2. `JonasAbde/renos-frontend` (React 18 + TypeScript, Vite, Tailwind)
3. `JonasAbde/Tekup-Billy` (MCP HTTP server for Billy.dk)

---

## 🏗️ Architecture

```
TekupVault (Turborepo + pnpm workspaces)
│
├── apps/
│   ├── vault-api/          # REST API + GitHub webhooks (Express, Port 3000)
│   │   ├── GET  /health                    # Health check
│   │   ├── POST /api/search                # Semantic search (requires X-API-Key)
│   │   ├── GET  /api/sync-status           # Repository sync status
│   │   ├── POST /webhook/github            # GitHub webhook (HMAC-SHA256)
│   │   ├── POST /mcp                       # MCP HTTP transport
│   │   └── GET  /.well-known/mcp.json      # MCP discovery
│   │
│   └── vault-worker/       # Background worker (every 6 hours)
│       ├── Sync GitHub repos (3 repositories)
│       └── Index unindexed documents (OpenAI embeddings)
│
├── packages/
│   ├── vault-core/         # Shared types, Zod schemas, config validation
│   ├── vault-ingest/       # GitHub Octokit connector + sync logic
│   └── vault-search/       # OpenAI embeddings + pgvector search
│
└── supabase/
    └── migrations/         # PostgreSQL + pgvector schema
        ├── 20250114000000_initial_schema.sql
        └── 20250116000000_add_rls_policies.sql
```

---

## 🗄️ Database Schema

### Tables

**`vault_documents`** - Stores ingested content
```sql
CREATE TABLE vault_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,              -- 'github', 'render', etc.
  repository TEXT NOT NULL,          -- 'JonasAbde/renos-backend'
  path TEXT NOT NULL,                -- 'src/auth/login.ts'
  content TEXT NOT NULL,             -- File content (text only)
  metadata JSONB DEFAULT '{}'::jsonb,
  sha TEXT,                          -- Git SHA for version tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source, repository, path)
);
```

**`vault_embeddings`** - Stores OpenAI embeddings
```sql
CREATE TABLE vault_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES vault_documents(id) ON DELETE CASCADE,
  embedding VECTOR(1536) NOT NULL,   -- OpenAI text-embedding-ada-002
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id)
);

-- IVFFlat index for fast similarity search
CREATE INDEX ON vault_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**`vault_sync_status`** - Tracks sync health
```sql
CREATE TABLE vault_sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL,
  repository TEXT NOT NULL,
  status TEXT NOT NULL,              -- 'success', 'error', 'in_progress'
  last_sync_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source, repository)
);
```

### Functions

**`match_documents()`** - Semantic search using cosine similarity
```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_repository TEXT DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  source TEXT,
  repository TEXT,
  path TEXT,
  content TEXT,
  similarity FLOAT
)
```

---

## 🔌 API Reference

### Authentication
All `/api/*` endpoints require `X-API-Key` header (except `/health`).

### POST /api/search

**Semantic search** using OpenAI embeddings.

**Headers**:
```
X-API-Key: your_api_key
Content-Type: application/json
```

**Request Body**:
```json
{
  "query": "How do I authenticate users?",
  "limit": 10,
  "threshold": 0.7,
  "repository": "JonasAbde/renos-backend"  // Optional filter
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "results": [
    {
      "document": {
        "id": "uuid",
        "source": "github",
        "repository": "JonasAbde/renos-backend",
        "path": "src/auth/login.ts",
        "content": "// Authentication logic...",
        "similarity": 0.92
      }
    }
  ],
  "count": 10
}
```

**Rate Limit**: 100 requests per 15 minutes (per IP)

### GET /api/sync-status

**Check repository sync status**.

**Response** (200 OK):
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid",
      "source": "github",
      "repository": "JonasAbde/renos-backend",
      "status": "success",
      "last_sync_at": "2025-10-17T12:00:00Z",
      "error_message": null
    }
  ]
}
```

### POST /webhook/github

**GitHub webhook handler** for automatic sync on push events.

**Headers**:
```
X-Hub-Signature-256: sha256=...
Content-Type: application/json
```

**Verification**: HMAC-SHA256 with `GITHUB_WEBHOOK_SECRET`

**Rate Limit**: 10 requests per minute

### POST /mcp

**MCP HTTP Transport** for AI integration (ChatGPT, Claude, Cursor).

**Available Tools**:
- `search_knowledge`: Semantic search
- `get_sync_status`: Repository sync status
- `list_repositories`: List synced repositories
- `get_repository_info`: Get repository details

---

## 🔐 Security

### Authentication & Authorization
- **API Key**: Required for `/api/search` via `X-API-Key` header
- **Webhook HMAC**: SHA-256 signature verification for GitHub webhooks
- **RLS Policies**: Row Level Security in Supabase (Phase 2)

### Security Headers (Helmet)
```javascript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  xssFilter: true,
})
```

### CORS Configuration
```javascript
cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  exposedHeaders: ['Mcp-Session-Id'],
})
```

### Rate Limiting
- **Search Endpoint**: 100 requests / 15 minutes per IP
- **Webhook Endpoint**: 10 requests / minute per IP

### Input Validation (Zod)
```typescript
const SearchRequestSchema = z.object({
  query: z.string().min(1).max(1000),
  limit: z.number().int().min(1).max(100).optional(),
  threshold: z.number().min(0).max(1).optional(),
  repository: z.string().max(255).optional(),
});
```

---

## 🧪 Testing Strategy

### Test Coverage
**Total**: 150+ test cases across 14 categories  
**Unit Tests**: 125+ implemented (Vitest)  
**Integration Tests**: 5 scenarios  
**Critical Tests Passing**: 31/31 (100%)

### Unit Test Files
```
apps/vault-api/__tests__/
├── api.test.ts              # Core API tests (3 tests)
├── auth.test.ts             # Authentication (10 tests)
├── cors.test.ts             # CORS & security headers (7 tests)
├── rateLimit.test.ts        # Rate limiting (8 tests)
└── webhooks.test.ts         # GitHub webhooks (8 tests)

packages/vault-core/__tests__/
├── config.test.ts           # Config validation (2 tests)
└── database.test.ts         # Database integrity (25+ tests)

packages/vault-search/__tests__/
└── embeddings.test.ts       # Embedding service (30+ tests)

packages/vault-ingest/__tests__/
└── github-sync.test.ts      # GitHub sync (35+ tests)
```

### Integration Test Scenarios
```
test-scenarios/
├── 01-search-quality-test.mjs       # Search quality & relevance
├── 02-edge-cases-test.mjs           # Edge cases & security
├── 03-performance-test.mjs          # Performance & load
├── 04-data-integrity-test.mjs       # Data integrity
├── 05-mcp-integration-test.mjs      # MCP protocol
└── quick-test.mjs                   # Quick smoke test
```

### Running Tests
```bash
# Unit tests
pnpm test

# Integration tests
cd test-scenarios
node quick-test.mjs              # Quick smoke test
node run-all-tests.mjs           # Full test suite
```

---

## 🚀 Deployment

### Render.com Configuration (`render.yaml`)

**Web Service (vault-api)**:
```yaml
- type: web
  name: tekupvault-api
  env: node
  region: frankfurt
  plan: starter
  buildCommand: pnpm install --frozen-lockfile --prod=false && pnpm build
  startCommand: node apps/vault-api/dist/index.js
  healthCheckPath: /health
  envVars:
    - key: NODE_ENV
      value: production
    - key: PORT
      value: 3000
    - key: API_KEY
      sync: false
    - key: DATABASE_URL
      fromDatabase:
        name: tekupvault-db
        property: connectionString
```

**Worker Service (vault-worker)**:
```yaml
- type: worker
  name: tekupvault-worker
  env: node
  region: frankfurt
  plan: starter
  buildCommand: pnpm install --frozen-lockfile --prod=false && pnpm build
  startCommand: node apps/vault-worker/dist/index.js
```

### Environment Variables

**Required**:
```bash
# Database (Supabase)
DATABASE_URL=postgresql://user:pass@host:5432/db
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...

# GitHub
GITHUB_TOKEN=ghp_...
GITHUB_WEBHOOK_SECRET=your_secret_here

# OpenAI
OPENAI_API_KEY=sk-proj-...

# API Security
API_KEY=your_internal_api_key

# CORS (comma-separated origins)
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000

# Optional
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
SENTRY_DSN=https://...@sentry.io/...
```

---

## 📦 Tech Stack

### Backend
- **Runtime**: Node.js 18 (LTS)
- **Framework**: Express 4.18+
- **Language**: TypeScript 5.3+
- **Database**: PostgreSQL 15 + pgvector
- **ORM**: Supabase Client (PostgreSQL)

### AI & Search
- **Embeddings**: OpenAI text-embedding-ada-002 (1536 dimensions)
- **Vector Search**: pgvector with IVFFlat index (cosine similarity)
- **Similarity Threshold**: Default 0.7 (70%)

### External Integrations
- **GitHub**: Octokit (REST API v3)
- **Supabase**: PostgreSQL database + Row Level Security
- **OpenAI**: Embeddings API
- **Sentry**: Error tracking (optional)

### Build & Package Management
- **Monorepo**: Turborepo 1.11+
- **Package Manager**: pnpm 8.15+
- **Build Tool**: TypeScript Compiler (tsc)
- **Task Runner**: Turborepo pipelines

### Testing
- **Unit Tests**: Vitest 2.1+
- **API Tests**: Supertest
- **Mocking**: Vitest vi.fn()
- **Coverage**: Built-in Vitest coverage

### Security
- **Headers**: Helmet
- **CORS**: cors middleware
- **Rate Limiting**: express-rate-limit
- **Input Validation**: Zod
- **Logging**: Pino (structured JSON logs)

### Deployment
- **Platform**: Render.com
- **CI/CD**: GitHub Actions (recommended)
- **Health Checks**: 5-second intervals
- **Auto-Deploy**: Enabled on main branch

---

## 🔄 GitHub Sync Logic

### Synced File Types
**✅ Included**:
- `.ts`, `.tsx`, `.js`, `.jsx` (source code)
- `.md`, `.mdx` (documentation)
- `.json`, `.yaml`, `.yml` (configuration)
- `.txt`, `.log` (text files)
- `.sql` (database scripts)

**❌ Excluded** (binary files):
- Images: `.png`, `.jpg`, `.gif`, `.svg`, `.ico`
- Fonts: `.woff`, `.woff2`, `.ttf`, `.eot`
- Media: `.mp4`, `.mp3`, `.wav`
- Archives: `.zip`, `.tar`, `.gz`
- PDFs: `.pdf`

### Sync Frequency
- **Automatic**: Every 6 hours (vault-worker cron)
- **Manual**: GitHub webhook on push events
- **Incremental**: Only updates changed files (SHA comparison)

### Sync Process
1. Fetch repository tree from GitHub API
2. Filter out binary files
3. Compare SHA with existing documents
4. Fetch content for new/updated files
5. Upsert to `vault_documents`
6. Generate embeddings (vault-worker)
7. Update `vault_sync_status`

---

## 🎯 Development Workflow

### Local Setup
```bash
# Clone repository
git clone https://github.com/JonasAbde/TekupVault.git
cd TekupVault

# Install dependencies
pnpm install

# Copy environment variables
cp docs/ENV.example .env
# Edit .env with real secrets

# Start local PostgreSQL with pgvector
docker-compose up -d

# Run migrations
psql -h localhost -U postgres -d tekupvault -f supabase/migrations/20250114000000_initial_schema.sql
psql -h localhost -U postgres -d tekupvault -f supabase/migrations/20250116000000_add_rls_policies.sql

# Build all packages
pnpm build

# Start in development mode
pnpm dev
```

### Package Scripts
```bash
pnpm dev       # Start all apps in watch mode
pnpm build     # Build all packages incrementally
pnpm lint      # Lint all packages (ESLint)
pnpm test      # Run unit tests (Vitest)
pnpm clean     # Remove all dist/ folders
```

### Code Style
- **TypeScript Strict Mode**: Enabled
- **ESLint**: Configured with TypeScript rules
- **Prettier**: Not configured (use default formatting)
- **Naming**: camelCase for variables, PascalCase for types

### Git Workflow
1. Create feature branch: `feat/description` or `fix/description`
2. Make changes
3. Run `pnpm test` (ensure tests pass)
4. Commit with conventional commits: `feat:`, `fix:`, `docs:`, etc.
5. Push and create PR
6. Auto-deploy to Render.com on merge to `main`

---

## 📊 Performance Optimizations

### Phase 2 Improvements (Implemented)
- **Parallel Repository Syncing**: 3x faster (Promise.all)
- **Batch Embedding Upserts**: 10x faster (bulk inserts)
- **IVFFlat Index**: Fast similarity search on large datasets
- **Connection Pooling**: Supabase handles connection management

### Performance Targets
- **Health Check**: < 1ms response time ✅
- **Search Endpoint**: < 100ms average (excluding OpenAI API) ✅
- **Webhook Processing**: < 500ms (async queue) ✅
- **Sync Job**: < 5 minutes per repository ✅

---

## 🐛 Common Issues & Troubleshooting

### Issue: "Missing or invalid environment variables"
**Solution**: Ensure all required env vars are set in `.env` or Render dashboard.

### Issue: "Database connection failed"
**Solution**: 
- Check `DATABASE_URL` format
- Verify network access to Supabase
- Check Supabase project status

### Issue: "OpenAI API rate limit"
**Solution**:
- Upgrade OpenAI plan
- Implement exponential backoff (already in code)
- Reduce embedding generation frequency

### Issue: "GitHub webhook not triggering"
**Solution**:
- Verify webhook URL in GitHub settings
- Check `GITHUB_WEBHOOK_SECRET` matches
- Inspect webhook delivery logs in GitHub

### Issue: "Search returns no results"
**Solution**:
- Check if documents are synced: `GET /api/sync-status`
- Verify embeddings are generated (check `vault_embeddings` table)
- Lower similarity threshold (try 0.5 instead of 0.7)

---

## 📚 Important File Paths

### Configuration
- `render.yaml` - Render.com deployment config
- `package.json` - Root workspace config
- `turbo.json` - Turborepo pipeline config
- `tsconfig.json` - Root TypeScript config
- `.env.example` / `docs/ENV.example` - Environment variable template

### Source Code
- `apps/vault-api/src/index.ts` - API entry point
- `apps/vault-worker/src/index.ts` - Worker entry point
- `packages/vault-core/src/types.ts` - Shared types
- `packages/vault-core/src/config.ts` - Environment config validation
- `packages/vault-ingest/src/github-sync.ts` - GitHub sync logic
- `packages/vault-search/src/embeddings.ts` - Embedding service

### Documentation
- `README.md` - Project overview
- `docs/FINAL_STATUS_2025-10-17.md` - Latest status report
- `docs/API_DOCS.md` - Complete API documentation
- `docs/TEST_CASES.md` - 150+ test cases
- `docs/SECURITY.md` - Security best practices
- `docs/ARCHITECTURE.md` - System architecture
- `docs/INTEGRATION_GUIDE.md` - Integration examples

---

## 🎯 Project Status Summary

### ✅ Phase 1 - Security & Testing (Completed)
- API key authentication
- Rate limiting
- CORS restrictions
- Security headers (Helmet)
- Input validation (Zod)
- ESLint configuration
- Vitest test suite
- Comprehensive documentation

### ✅ Phase 2 - Performance & Validation (Completed)
- Row Level Security (RLS) policies
- Enhanced input validation
- Sentry error tracking
- Parallel repository syncing (3x faster)
- Batch embedding upserts (10x faster)

### ✅ Phase 3 - MCP Integration (Completed)
- MCP HTTP Transport (2025-03-26 spec)
- 4 MCP tools: search_knowledge, get_sync_status, list_repositories, get_repository_info
- /.well-known/mcp.json discovery endpoint
- Session management (30-minute timeout)
- Integration examples (ChatGPT, Claude, Cursor)

### 🔜 Phase 4 - Planned
- Supabase schema introspection
- Render deployment log ingestion
- Web UI (React + Tailwind)
- Real-time search with Supabase subscriptions

---

## 🤖 AI Integration (MCP)

TekupVault implements the **Model Context Protocol (MCP)** for direct integration with AI assistants.

### MCP Tools Available

**1. search_knowledge**
```json
{
  "name": "search_knowledge",
  "description": "Semantic search across all Tekup Portfolio documentation and code",
  "inputSchema": {
    "query": "string (required)",
    "limit": "number (optional, default: 10)",
    "threshold": "number (optional, default: 0.7)",
    "repository": "string (optional)"
  }
}
```

**2. get_sync_status**
```json
{
  "name": "get_sync_status",
  "description": "Get GitHub repository synchronization status"
}
```

**3. list_repositories**
```json
{
  "name": "list_repositories",
  "description": "List all synchronized repositories"
}
```

**4. get_repository_info**
```json
{
  "name": "get_repository_info",
  "description": "Get detailed information about a specific repository",
  "inputSchema": {
    "repository": "string (required)"
  }
}
```

### Integration Examples

**ChatGPT Custom Action**:
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "TekupVault API",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://tekupvault.onrender.com"
    }
  ],
  "paths": {
    "/mcp": {
      "post": {
        "operationId": "mcpRequest",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "method": { "type": "string" },
                  "params": { "type": "object" }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## 💡 Best Practices

### When Adding New Features
1. Define types in `packages/vault-core/src/types.ts`
2. Add Zod validation schemas in `packages/vault-core/src/config.ts`
3. Write unit tests first (TDD approach)
4. Update API documentation in `docs/API_DOCS.md`
5. Update test documentation in `docs/TEST_CASES.md`

### When Fixing Bugs
1. Write a failing test that reproduces the bug
2. Fix the bug
3. Ensure test passes
4. Update `docs/CHANGELOG.md`

### When Deploying
1. Run `pnpm test` locally
2. Ensure all tests pass
3. Push to `main` branch
4. Monitor Render.com deployment logs
5. Verify health check: `curl https://tekupvault.onrender.com/health`

---

## 📞 Contact & Support

**Project Owner**: Jonas Abde  
**Organization**: Tekup Portfolio (Private)  
**Repository**: `JonasAbde/TekupVault` (Private)

For questions or issues, contact project owner directly.

---

**Generated**: 2025-10-17  
**Last Updated**: 2025-10-17  
**Version**: 1.0.0  
**Status**: Production Ready ✅

