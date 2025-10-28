# Changelog

Alle væsentlige ændringer til TekupVault dokumenteres i denne fil.

Formatet er baseret på [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
og projektet følger [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- MCP server for direct GitHub Copilot integration
- Web UI med React 18 + Tailwind CSS
- Supabase schema introspection
- Render.com deployment log ingestion
- Real-time search med Supabase subscriptions
- API key authentication
- Rate limiting på endpoints
- Automated test suite (Jest/Vitest)

---

## [0.1.0] - 2025-10-14

### 🎉 Initial Release - MVP

#### Added
- **Monorepo Setup**
  - Turborepo configuration with incremental builds
  - pnpm workspaces for internal packages
  - TypeScript 5.3+ strict mode across all packages
  - Shared build configuration with tsconfig.json

- **Core Packages**
  - `vault-core`: Shared types, Zod schemas, config loader
  - `vault-ingest`: GitHub Octokit connector with batch processing
  - `vault-search`: OpenAI embeddings + pgvector integration
  
- **Applications**
  - `vault-api`: Express REST API with security middleware
    - `GET /health` - Health check endpoint
    - `POST /api/search` - Semantic search endpoint
    - `GET /api/sync-status` - Repository sync status
    - `POST /webhook/github` - GitHub webhook handler
  - `vault-worker`: Background sync worker
    - Scheduled GitHub sync (6-hour intervals)
    - Automatic embedding generation for new documents
    - Error handling with retry logic

- **Database Infrastructure**
  - PostgreSQL 15 + pgvector 0.5 schema
  - `vault_documents` table with JSONB metadata
  - `vault_embeddings` table with VECTOR(1536) for OpenAI embeddings
  - `vault_sync_status` table for monitoring
  - IVFFlat index for fast vector similarity search (lists=100)
  - `match_documents()` function for semantic search
  - Automatic timestamp triggers

- **GitHub Integration**
  - Octokit REST client for GitHub API v3
  - Repository tree traversal with binary file filtering
  - SHA-based duplicate detection for efficient syncing
  - Batch processing (10 files at a time)
  - Support for 3 repositories:
    - `JonasAbde/renos-backend` (TypeScript backend)
    - `JonasAbde/renos-frontend` (React frontend)
    - `JonasAbde/Tekup-Billy` (MCP server)

- **OpenAI Integration**
  - `text-embedding-3-small` model (1536 dimensions)
  - Batch embedding generation (100 documents per batch)
  - Content truncation to 8000 chars
  - Cost-effective embedding ($0.00002/1K tokens)

- **Security Features**
  - HMAC-SHA256 webhook verification
  - Helmet middleware for HTTP security headers
  - CORS configuration for Tekup domains
  - Environment variable validation with Zod
  - Secrets never hardcoded (.env in .gitignore)

- **Logging & Monitoring**
  - Pino structured JSON logging
  - HTTP request logging with pino-http
  - Child loggers for context tracking
  - Log levels: trace, debug, info, warn, error, fatal
  - Detailed metrics for sync jobs and embeddings

- **Documentation**
  - Comprehensive README with quickstart guide
  - Detailed architecture documentation
  - Copilot instructions for AI context
  - Complete status document (STATUS.md)
  - Environment variable examples

- **Deployment Configuration**
  - Docker Compose for local PostgreSQL + pgvector
  - Render.yaml for production deployment
  - Health check endpoints for monitoring
  - Graceful shutdown handlers (SIGTERM/SIGINT)

#### Performance
- GitHub sync: ~12 files/second
- Embedding generation: ~3 embeddings/second
- Vector search: <100ms query latency (estimated)
- 991 documents successfully synced from 3 repositories

#### Technical Stack
- **Runtime:** Node.js 18+
- **Language:** TypeScript 5.3+ (strict mode)
- **Package Manager:** pnpm 8.15+
- **Monorepo Tool:** Turborepo 1.11+
- **API Framework:** Express 4.18+
- **Database:** PostgreSQL 15 + pgvector 0.5 (Supabase)
- **Vector Search:** OpenAI text-embedding-3-small
- **Validation:** Zod 3.22+
- **Logging:** Pino 8.17+
- **Security:** Helmet 7.1+, CORS 2.8+

---

## [0.0.1] - 2025-10-14

### Project Inception

#### Added
- Initial project structure
- Git repository initialization
- .gitignore configuration
- Basic package.json with workspace setup

---

## Version History Summary

| Version | Date | Status | Description |
|---------|------|--------|-------------|
| 0.1.0 | 2025-10-14 | ✅ Released | MVP with core functionality |
| 0.0.1 | 2025-10-14 | 🏗️ Started | Project setup |

---

## Migration Notes

### From Nothing to v0.1.0

This is the first release. To set up:

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run database migrations**
   ```bash
   # Apply to Supabase via SQL Editor:
   supabase/migrations/20250114000000_initial_schema.sql
   ```

4. **Build packages**
   ```bash
   pnpm build
   ```

5. **Start services**
   ```bash
   pnpm dev
   ```

---

## Known Issues

### v0.1.0

#### Major
- None identified

#### Minor
- Worker logs to stdout only (no file rotation yet)
- No automated tests (manual testing only)
- Embedding generation can take 10-15 minutes for 1000+ documents
- GitHub webhooks need manual configuration

#### Won't Fix (By Design)
- Binary files not indexed (intentional filter)
- 8000 character limit per document (OpenAI constraint)
- 6-hour sync interval hardcoded (configurable in future)

---

## Breaking Changes

### v0.1.0
- N/A (initial release)

---

## Deprecations

### v0.1.0
- None

---

## Security Updates

### v0.1.0
- Initial security implementation:
  - HMAC-SHA256 webhook verification
  - Helmet security headers
  - CORS restrictions
  - Environment variable isolation

---

## Performance Improvements

### v0.1.0
- Batch processing (10 files) for GitHub sync
- IVFFlat index for pgvector (10-100x speedup)
- Lazy embedding generation (only unindexed documents)
- Connection pooling via Supabase

---

## Contributors

### Core Team
- **Jonas Abde** (@JonasAbde) - Creator & Lead Developer

### AI Assistants
- GitHub Copilot - Code generation & pair programming
- Claude (Anthropic) - Architecture review & documentation

### Special Thanks
- Supabase team for pgvector support
- Vercel team for Turborepo
- OpenAI for affordable embeddings
- pnpm maintainers for fast workspaces

---

## Release Process

### Versioning Strategy

- **Major (X.0.0)**: Breaking API changes, architecture redesign
- **Minor (0.X.0)**: New features, backward-compatible
- **Patch (0.0.X)**: Bug fixes, documentation updates

### Release Checklist

- [ ] Update CHANGELOG.md with all changes
- [ ] Bump version in all package.json files
- [ ] Run full test suite (when implemented)
- [ ] Update documentation (README, architecture.md)
- [ ] Create git tag: `git tag -a vX.Y.Z -m "Release X.Y.Z"`
- [ ] Push tag: `git push origin vX.Y.Z`
- [ ] Deploy to Render.com
- [ ] Verify production health checks
- [ ] Announce release (if public)

---

## Roadmap

### v0.2.0 (Planned - Q4 2025)
- MCP server for GitHub Copilot
- Production deployment on Render.com
- GitHub webhooks fully configured
- Sentry error tracking integration
- Basic automated tests (Jest)

### v0.3.0 (Planned - Q1 2026)
- Web UI (React 18 + Tailwind)
- Supabase schema introspection
- Render log ingestion
- Real-time search updates
- API key authentication

### v1.0.0 (Planned - Q2 2026)
- Complete test coverage (>80%)
- Performance optimizations
- Advanced monitoring dashboard
- Multi-tenancy support
- Documentation versioning
- Public API documentation

---

## Support

### Reporting Issues
- GitHub Issues: https://github.com/JonasAbde/TekupVault/issues
- Email: jonas@tekup.dk (for private repos)

### Getting Help
- Documentation: See README.md and docs/architecture.md
- Status: Check STATUS.md for current state
- Tests: See TEST_GUIDE.md for manual testing

---

**Maintained by:** Tekup Portfolio  
**License:** Private - All rights reserved  
**Last Updated:** October 16, 2025

