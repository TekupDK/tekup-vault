# TekupVault Architecture

## System Overview

TekupVault is a monorepo-based intelligent knowledge layer that provides semantic search capabilities across the entire Tekup Portfolio ecosystem. It follows a microservices-inspired architecture with clear separation of concerns.

## Core Components

### 1. vault-api (Express REST API)

**Purpose**: Public-facing API for search queries and webhook handling

**Responsibilities**:
- Expose `/api/search` endpoint for semantic queries
- Handle GitHub webhook events at `/webhook/github`
- Validate requests using Zod schemas
- Log all HTTP activity with Pino

**Technology**:
- Express 4.18+ with TypeScript
- Helmet for security headers
- CORS for cross-origin requests
- Pino-HTTP for structured logging

**Port**: 3000 (configurable via PORT env var)

### 2. vault-worker (Background Service)

**Purpose**: Automated data ingestion and indexing

**Responsibilities**:
- Sync GitHub repositories every 6 hours
- Generate OpenAI embeddings for new documents
- Update sync status in database
- Handle errors gracefully with retries

**Technology**:
- Long-running Node.js process
- Scheduled with `setInterval`
- Graceful shutdown on SIGTERM/SIGINT

**Execution Flow**:
1. On startup: Sync all repos + index unindexed docs
2. Every 6 hours: Repeat sync and indexing
3. Log progress and errors

### 3. vault-core (Shared Package)

**Purpose**: Common types, schemas, and configuration

**Exports**:
- TypeScript types: `Document`, `SearchQuery`, `SearchResult`, `SyncStatusRecord`
- Zod schemas: `DocumentSchema`, `SearchQuerySchema`, etc.
- Config loader: `loadConfig()` with environment validation
- Constants: `GITHUB_REPOS`, `BINARY_FILE_EXTENSIONS`, `EMBEDDING_CONFIG`

**Why Separate**:
- Single source of truth for types
- Reusable across apps and packages
- Enforces TypeScript strict mode

### 4. vault-ingest (Ingestion Package)

**Purpose**: Connector for external data sources

**Current Implementation**:
- `GitHubSync` class with Octokit REST client
- Fetches repository tree recursively
- Filters binary files by extension
- Batch processing (10 files at a time)
- Upserts to `vault_documents` table

**Future Sources**:
- Supabase schema metadata
- Render deployment logs
- Copilot conversation history

### 5. vault-search (Search Package)

**Purpose**: Embedding generation and semantic search

**Implementation**:
- `EmbeddingService` class
- OpenAI `text-embedding-3-small` model (1536 dimensions)
- Stores vectors in `vault_embeddings` table
- Searches via `match_documents()` PostgreSQL function

**Key Methods**:
- `indexDocument(docId, content)`: Generate and store embedding
- `search(query, options)`: Find similar documents
- `indexUnindexedDocuments()`: Batch index unindexed docs

## Data Flow

### GitHub Sync Flow

```
1. Worker → GitHubSync.syncRepository()
2. Fetch repo tree from GitHub API (Octokit)
3. Filter out binary files
4. Process in batches of 10 files
5. For each file:
   - Fetch blob content (base64)
   - Decode to UTF-8
   - Upsert to vault_documents
6. Update vault_sync_status (success/error)
```

### Indexing Flow

```
1. Worker → EmbeddingService.indexUnindexedDocuments()
2. Query vault_documents where embedding is NULL
3. For each document (limit 100):
   - Truncate content to 8000 chars
   - Call OpenAI embeddings API
   - Store vector in vault_embeddings
4. Log indexed count
```

### Search Flow

```
1. Client → POST /api/search { query, limit, threshold }
2. Validate with SearchQuerySchema (Zod)
3. EmbeddingService.search():
   - Generate query embedding (OpenAI)
   - Call match_documents(embedding, threshold, limit)
   - PostgreSQL returns top-N similar docs (cosine similarity)
4. Return results as JSON
```

## Database Design

### Schema Philosophy

- **Normalized**: Separate tables for documents, embeddings, sync status
- **Referential Integrity**: Foreign keys with CASCADE delete
- **Indexes**: B-tree for filters, IVFFlat for vector search
- **Triggers**: Auto-update `updated_at` timestamps

### Vector Search Strategy

**IVFFlat Index** (Inverted File with Flat compression):
- `lists=100`: Optimized for <100k documents
- Trade-off: 10-20% recall loss for 10-100x speedup
- Cosine similarity (`<=>` operator)

**Why pgvector over dedicated vector DBs**:
- Supabase already uses PostgreSQL
- No additional infrastructure
- Transactional consistency with document data
- Mature ecosystem (backups, replication)

### Function: `match_documents()`

**Purpose**: Efficient semantic search with filters

**Parameters**:
- `query_embedding`: VECTOR(1536) from OpenAI
- `match_threshold`: Minimum similarity score (0.0-1.0)
- `match_count`: Max results to return
- `filter_source`: Optional source type filter
- `filter_repository`: Optional repo filter

**Returns**: Joined documents with similarity scores

**Performance**:
- Uses IVFFlat index for fast approximate search
- Filters applied before similarity calculation
- Orders by distance (ASC), limits results

## Technology Choices

### Monorepo: Turborepo + pnpm

**Why Turborepo**:
- Incremental builds with caching
- Task orchestration (build order)
- Remote caching for CI/CD (future)

**Why pnpm**:
- Workspace protocol for internal packages
- Faster installs (content-addressable storage)
- Strict dependency resolution

### TypeScript Strict Mode

**Benefits**:
- Catch errors at compile time
- Better IDE autocomplete
- Self-documenting code

**Enabled Rules**:
- `noImplicitAny`, `strictNullChecks`
- `noUnusedLocals`, `noUnusedParameters`
- `noImplicitReturns`, `noFallthroughCasesInSwitch`

### Pino Structured Logging

**Why Pino**:
- JSON output (machine-readable)
- Low overhead (fast)
- Child loggers for context

**Log Format**:
```json
{
  "level": 30,
  "time": 1705234567890,
  "msg": "GitHub sync completed",
  "repo": "JonasAbde/renos-backend",
  "filesProcessed": 142
}
```

### Zod Runtime Validation

**Why Zod**:
- Type-safe runtime checks
- Inferrable TypeScript types
- Composable schemas

**Usage**:
- All API inputs validated
- Environment variables parsed
- Database query results validated (future)

## Security Model

### GitHub Webhooks

**HMAC-SHA256 Verification**:
```typescript
const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
const digest = 'sha256=' + hmac.update(payload).digest('hex');
crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
```

**Why HMAC**:
- Prevents webhook spoofing
- Ensures payload integrity
- Standard GitHub security practice

### API Security

**Helmet Middleware**:
- Sets secure HTTP headers
- Mitigates XSS, clickjacking, MIME sniffing

**CORS**:
- Configured for Tekup Portfolio domains only
- Prevents unauthorized cross-origin requests

**Secrets Management**:
- Never hardcoded in source
- Environment variables only
- `.env` in `.gitignore`

## Scaling Considerations

### Current Limitations

- **OpenAI Rate Limit**: ~3000 req/min for embeddings
  - Mitigation: Batch processing (10 files), exponential backoff
  
- **pgvector Index**: IVFFlat lists=100 for <100k docs
  - Solution for >100k: Increase lists to 200-500, or use HNSW index

- **Sync Interval**: 6 hours (hardcoded)
  - Future: Configurable via env var, webhook-triggered sync

### Horizontal Scaling

**vault-api**:
- Stateless, can run multiple instances
- Load balancer distributes requests (Render handles this)

**vault-worker**:
- Single instance only (scheduled jobs)
- Could use distributed job queue (Bull, BullMQ) for multi-worker

**Database**:
- Supabase handles scaling automatically
- Read replicas for search-heavy workloads

### Optimization Strategies

1. **Embedding Caching**: Store embeddings for queries (Redis)
2. **Incremental Sync**: Only fetch changed files (GitHub ETags)
3. **Parallel Processing**: Use worker threads for batch indexing
4. **CDN Caching**: Cache search results for common queries

## Deployment Architecture

### Local Development

```
Developer Machine
├── Docker: PostgreSQL 15 + pgvector
├── pnpm dev: vault-api (port 3000)
└── pnpm dev: vault-worker (background)
```

### Production (Render.com, Frankfurt)

```
Render.com (Frankfurt Region)
├── Web Service: vault-api
│   ├── Dockerfile: Node 18, pnpm build
│   ├── Health check: /health
│   └── Auto-scaling: Based on CPU/memory
│
├── Worker Service: vault-worker
│   ├── Dockerfile: Node 18, pnpm build
│   └── Single instance (no scaling)
│
└── PostgreSQL 15: tekupvault-db
    ├── Managed by Render
    ├── Automatic backups
    └── pgvector extension enabled
```

### Environment Isolation

- **Development**: `.env` with local PostgreSQL
- **Staging**: Separate Supabase project (future)
- **Production**: Render environment variables

## Future Enhancements

### MCP Server Integration

**Goal**: Direct Copilot integration via Model Context Protocol

**Implementation**:
- New package: `vault-mcp`
- Expose `search()` as MCP tool
- Register with VS Code Copilot

**Benefit**: Copilot can search TekupVault directly in chat

### Supabase Schema Sync

**Goal**: Index Supabase table/column metadata

**Implementation**:
- Query `information_schema` tables
- Store as structured documents
- Enable natural language schema queries

**Example Query**: "Which table stores user sessions?"

### Render Log Ingestion

**Goal**: Index deployment logs for debugging

**Implementation**:
- Render API integration
- Log parsing and chunking
- Time-series metadata

**Use Case**: "Why did the last deployment fail?"

### Web UI

**Goal**: User-friendly search interface

**Tech Stack**:
- React 18 + TypeScript
- Tailwind CSS (matches renos-frontend)
- Vite for bundling

**Features**:
- Live search with autocomplete
- Filter by source/repo
- Syntax highlighting for code results

---

**Last Updated**: October 14, 2025  
**Author**: Jonas Abde (Tekup Portfolio)
