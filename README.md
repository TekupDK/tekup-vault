# TekupVault

**Tekup Portfolio's Central Intelligent Knowledge Layer**

TekupVault is a monorepo that automatically consolidates, indexes, and enables semantic search across all Tekup Portfolio documentation, code, logs, and AI outputs.

## 🚀 Production Status

[![Deploy Status](https://img.shields.io/badge/Render.com-Live-success)](https://tekupvault.onrender.com)
[![Tests](https://img.shields.io/badge/Tests-31%20Passing-success)](#-testing)
[![Documentation](https://img.shields.io/badge/Docs-Complete-success)](docs/)

**Production URL**: [`https://tekupvault.onrender.com`](https://tekupvault.onrender.com)  
**Status**: 🟢 **LIVE AND RUNNING**  
**Last Updated**: 2025-10-18

📋 **[→ View Full Status Report](docs/FINAL_STATUS_2025-10-17.md)**  
🚀 **[→ GitHub Sync Expansion Report](GITHUB_SYNC_EXPANSION_2025-10-18.md)** (4 → 14 repos)  
🇩🇰 **[→ Danish Quick Start Guide](QUICK_START_DANSK.md)**

## 🎯 Overview

TekupVault integrates with **14 active Tekup Portfolio repositories**, organized in 3 priority tiers:

### 🎯 **Tier 1: Core Production Systems** (4 repos)
- **[Tekup-Billy](https://github.com/JonasAbde/Tekup-Billy)**: Billy.dk MCP Server - HTTP REST API for AI agents
- **[renos-backend](https://github.com/JonasAbde/renos-backend)**: RenOS Backend API - TypeScript + Node 18 + Prisma
- **[renos-frontend](https://github.com/JonasAbde/renos-frontend)**: RenOS Frontend - React 18 + TypeScript + Vite
- **[TekupVault](https://github.com/JonasAbde/TekupVault)**: Central Knowledge Layer (self-indexing)

### 📚 **Tier 2: Documentation & Configuration** (2 repos)
- **[tekup-unified-docs](https://github.com/JonasAbde/tekup-unified-docs)**: Unified documentation across all Tekup projects
- **[tekup-ai-assistant](https://github.com/JonasAbde/tekup-ai-assistant)**: AI assistant integration - docs, configs & guides

### 🚧 **Tier 3: Active Development** (8 repos)
- **[tekup-cloud-dashboard](https://github.com/JonasAbde/tekup-cloud-dashboard)**: Cloud dashboard (Vue/React)
- **[tekup-renos](https://github.com/JonasAbde/tekup-renos)**: RenOS main system - Gmail/Calendar AI automation
- **[tekup-renos-dashboard](https://github.com/JonasAbde/tekup-renos-dashboard)**: RenOS dashboard - Glassmorphism UI/UX
- **[Tekup-org](https://github.com/JonasAbde/Tekup-org)**: Tekup organization monorepo (30+ apps, 18+ packages)
- **[Cleaning-og-Service](https://github.com/JonasAbde/Cleaning-og-Service)**: Cleaning & service management system
- **[tekup-nexus-dashboard](https://github.com/JonasAbde/tekup-nexus-dashboard)**: Nexus dashboard
- **[rendetalje-os](https://github.com/JonasAbde/rendetalje-os)**: Professional cleaning company management (Public)
- **[Jarvis-lite](https://github.com/JonasAbde/Jarvis-lite)**: AI assistant educational project (Public)

## 🏗️ Architecture

```
TekupVault (Turborepo + pnpm)
│
├── apps/
│   ├── vault-api/          # REST API + GitHub webhooks
│   │   ├── GET  /health              # Health check
│   │   ├── POST /api/search          # Semantic search
│   │   ├── GET  /api/sync-status     # Repository sync status
│   │   └── POST /webhook/github      # GitHub webhook
│   │
│   └── vault-worker/       # Background sync (every 6 hours)
│       ├── Sync GitHub repos (14 repos)
│       └── Index unindexed documents
│
├── packages/
│   ├── vault-core/         # Shared types, Zod schemas, config
│   ├── vault-ingest/       # GitHub Octokit connector
│   └── vault-search/       # OpenAI embeddings + pgvector
│
└── supabase/
    └── migrations/         # PostgreSQL + pgvector schema
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (LTS)
- pnpm 8.15+
- Docker (for local PostgreSQL)
- Supabase account
- GitHub Personal Access Token
- OpenAI API Key

### Installation

```bash
# Clone the repository
git clone https://github.com/JonasAbde/TekupVault.git
cd TekupVault

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# If .env.example is missing, copy docs/ENV.example to .env instead
# Edit .env with your real secrets

# Start local PostgreSQL with pgvector
docker-compose up -d

# Build all packages
pnpm build

# Run in development mode
pnpm dev
```

### Environment Variables

See `.env.example` (or `docs/ENV.example`) for all required variables:

```bash
# Database (Supabase or local)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tekupvault
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

# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# CORS whitelist (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## 📚 API Usage

### Semantic Search (requires API key)

```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "query": "How do I authenticate users?",
    "limit": 10,
    "threshold": 0.7
  }'
```

Response:
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
        "content": "...",
        "similarity": 0.92
      }
    }
  ],
  "count": 10
}
```

### Health Check

```bash
curl http://localhost:3000/health
```

## 🔄 GitHub Sync

The worker automatically syncs these repositories every 6 hours:
- `JonasAbde/renos-backend`
- `JonasAbde/renos-frontend`
- `JonasAbde/Tekup-Billy`

**What gets synced:**
- ✅ All text files (`.ts`, `.tsx`, `.js`, `.jsx`, `.md`, `.json`, etc.)
- ❌ Binary files (images, PDFs, fonts, videos, etc.)

## 🗄️ Database Schema

### Tables

**vault_documents**: Stores ingested content
- `id`, `source`, `repository`, `path`, `content`, `metadata`, `sha`
- Unique constraint: `(source, repository, path)`

**vault_embeddings**: Stores OpenAI embeddings
- `id`, `document_id`, `embedding` (VECTOR(1536))
- IVFFlat index for fast similarity search

**vault_sync_status**: Tracks sync health
- `id`, `source`, `repository`, `status`, `last_sync_at`, `error_message`

### Functions

**match_documents()**: Semantic search using cosine similarity

## 🛠️ Development

### Monorepo Commands

```bash
pnpm dev       # Start all apps in watch mode
pnpm build     # Build all packages incrementally
pnpm lint      # Lint all packages
pnpm test      # Run unit tests
pnpm clean     # Remove all dist/ folders
```

### Testing

TekupVault has comprehensive test coverage with 150+ test cases:

```bash
# Unit tests (Vitest)
pnpm test

# Integration tests
cd test-scenarios
node quick-test.mjs              # Quick smoke test
node run-all-tests.mjs           # Full test suite

# Individual test suites
node 01-search-quality-test.mjs  # Search quality & relevance
node 02-edge-cases-test.mjs      # Edge cases & security
node 03-performance-test.mjs     # Performance & load
node 04-data-integrity-test.mjs  # Data integrity
node 05-mcp-integration-test.mjs # MCP protocol
```

📚 **[Full Test Documentation](docs/TEST_CASES.md)** - Comprehensive test case documentation with 150+ test cases across 14 categories

### Package Development

```bash
# Work on a specific package
cd packages/vault-core
pnpm build

# Work on a specific app
cd apps/vault-api
pnpm dev
```

### Database Migrations

```bash
# Run migrations locally (using docker-compose)
docker-compose up -d
psql -h localhost -U postgres -d tekupvault -f supabase/migrations/20250114000000_initial_schema.sql

# Run migrations on Supabase
# Upload migration file via Supabase Dashboard > SQL Editor
```

## 🚢 Deployment

### Render.com (Production)

1. **Connect Repository**: Link GitHub repo to Render
2. **Configure Environment Variables**: Add all secrets from `.env.example`
3. **Deploy**: Render will use `render.yaml` configuration
   - API: `https://tekupvault.onrender.com`
   - Worker: Background service (no public URL)
   - Database: PostgreSQL 15 with pgvector (Frankfurt region)

### Manual Deployment

```bash
# Build for production
NODE_ENV=production pnpm build

# Start API
cd apps/vault-api
node dist/index.js

# Start Worker
cd apps/vault-worker
node dist/index.js
```

## 🔐 Security

- **Helmet** security headers
- **CORS** restricted via `ALLOWED_ORIGINS`
- **API key authentication** on `/api/search` (`X-API-Key` header)
- **Rate limiting** on `/api/search` and `/webhook/*`
- **HMAC-SHA256 verification** for GitHub webhooks
- **Pino structured logging** (no sensitive data in logs)

## 📊 Monitoring

### Check Sync Status
```bash
curl http://localhost:3000/api/sync-status
```

Response:
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid",
      "source": "github",
      "repository": "JonasAbde/renos-backend",
      "status": "success",
      "last_sync_at": "2025-10-14T...",
      "error_message": null
    }
  ]
}
```

View logs:
```bash
# API logs
docker logs tekupvault-api -f

# Worker logs
docker logs tekupvault-worker -f
```

## 🗺️ Roadmap

### Phase 1 ✅ Completed
- [x] GitHub sync (3 Tekup repos)
- [x] OpenAI embeddings + pgvector search
- [x] REST API + webhook endpoint
- [x] Background worker (6-hour sync)
- [x] Local dev (docker-compose) + production (render.yaml)
- [x] API key authentication
- [x] Rate limiting (search + webhooks)
- [x] CORS restrictions
- [x] ESLint configuration
- [x] Vitest test suite

### Phase 2 ✅ Completed
- [x] Row Level Security (RLS) policies in Supabase
- [x] Enhanced input validation with Zod
- [x] Sentry error tracking integration
- [x] Parallel repository syncing (3x faster)
- [x] Batch embedding upserts (10x faster)

### Phase 3 ✅ Completed
- [x] MCP server for direct Copilot integration
  - MCP HTTP Transport (2025-03-26 spec)
  - **6 MCP tools total**:
    - `search` + `fetch` (OpenAI-compatible for ChatGPT deep research)
    - `search_knowledge`, `get_sync_status`, `list_repositories`, `get_repository_info` (advanced features)
  - /.well-known/mcp.json discovery endpoint
  - Session management (30-minute timeout)
  - Integration examples (ChatGPT, Claude, Cursor)

### Phase 4 (Planned) 🔜
- [ ] Supabase schema introspection
- [ ] Render deployment log ingestion
- [ ] Web UI (React + Tailwind)
- [ ] Real-time search with Supabase subscriptions

## 📝 Contributing

This is a private Tekup Portfolio project. For questions or issues, contact Jonas Abde.

## License

Private - All rights reserved by Tekup Portfolio.

## Database Consolidation Initiative

**Status:** Already on Supabase - Ready for central consolidation

TekupVault is already migrated to Supabase and ready to be part of a central database project. See database consolidation plans:

**[→ Database Consolidation Analysis](../DATABASE_CONSOLIDATION_ANALYSE.md)** - Complete analysis of all Tekup databases  
**[→ Migration Quick Start](../MIGRATION_QUICK_START.md)** - 30-minute guide to migration  
**[→ GitHub Migration Resources](../GITHUB_MIGRATION_RESOURCES.md)** - Tools and best practices

**TekupVault's role:**
- Already on Supabase PostgreSQL + pgvector
- Production-ready schema and migrations
- Reference implementation for other apps
- Ready for `vault` schema in central project

## Related Projects

- [renos-backend](https://github.com/JonasAbde/renos-backend): TypeScript backend with Prisma 
- [renos-frontend](https://github.com/JonasAbde/renos-frontend): React frontend with Vite
- [Tekup-Billy](https://github.com/JonasAbde/Tekup-Billy): MCP HTTP server integration Already on Supabase

---

**Built with** TypeScript, Node.js, PostgreSQL, pgvector, OpenAI, Supabase, Turborepo, and pnpm