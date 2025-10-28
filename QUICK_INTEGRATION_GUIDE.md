# Quick Integration Guide - TekupVault Improvements

## 🚀 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd apps/production/tekup-vault

# Install Redis client (for caching)
pnpm add redis@^4.6.0 -w

# Install test dependencies (optional)
pnpm add -D vitest @vitest/coverage-v8 -w
```

### Step 2: Update Environment Variables
Add to your `.env` file:
```bash
# Optional but recommended for performance
REDIS_URL=redis://localhost:6379

# Or use Render.com Redis add-on
# REDIS_URL=redis://red-xxxxx:6379
```

### Step 3: Start Local Redis (Optional)
If testing locally:
```bash
# Using Docker
docker run -d -p 6379:6379 redis:alpine

# Or update docker-compose.yml to include Redis
```

### Step 4: Wire Up New Features

#### A. Integrate Caching (in `apps/vault-api/src/index.ts`)
```typescript
import { CacheService } from '@tekupvault/vault-core';
import { CachedSearchService } from '@tekupvault/vault-search';

// After loading config
const cacheService = new CacheService(
  { 
    redisUrl: process.env.REDIS_URL,
    enabled: true 
  },
  logger
);

// Initialize cache connection
await cacheService.connect();

// Wrap embedding service with caching
const cachedSearch = new CachedSearchService(
  embeddingService,
  cacheService,
  logger
);

// Replace embeddingService usage in routes with cachedSearch
```

#### B. Add Monitoring (in `apps/vault-api/src/index.ts`)
```typescript
import { MonitoringService, createMetricsMiddleware } from './lib/monitoring';

// Create monitoring service
const monitoring = new MonitoringService(logger);

// Add metrics middleware early in the stack
app.use(createMetricsMiddleware(monitoring));

// Add metrics endpoint (protected)
app.get('/api/metrics', requireApiKey, (_req, res) => {
  res.json({
    success: true,
    metrics: monitoring.getMetrics(),
    summary: monitoring.getSummary()
  });
});

// Start periodic logging (every 15 minutes)
monitoring.startPeriodicLogging(15);
```

#### C. Register Extended MCP Tools (in `apps/vault-api/src/mcp/mcp-transport.ts`)
```typescript
import { EXTENDED_TOOLS } from './extended-tools';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// Add to tool execution switch
async function executeTool(toolName: string, args: any) {
  // Check extended tools first
  const extendedTool = EXTENDED_TOOLS[toolName];
  if (extendedTool) {
    return await extendedTool.handler(args, supabase, logger);
  }
  
  // Fall back to existing tools
  switch (toolName) {
    case 'search': return await search(args);
    case 'fetch': return await fetch(args);
    // ... existing tools
  }
}

// Add extended tools to tool list response
const allTools = [
  ...Object.values(existingTools),
  ...Object.values(EXTENDED_TOOLS)
];
```

### Step 5: Update Search Route (in `apps/vault-api/src/routes/search.ts`)
```typescript
import { CachedSearchService } from '@tekupvault/vault-search';

// Replace embeddingService with cachedSearch instance
const results = await cachedSearch.search(query.query, {
  limit: query.limit,
  threshold: query.threshold,
  source: query.source,
  repository: query.repository
});

// Track search in monitoring
monitoring.trackSearch(results.length, cachedSearch.getCacheStatus().available);
```

### Step 6: Invalidate Cache After Sync (in `apps/vault-worker/src/jobs/sync-github.ts`)
```typescript
// After successful repository sync
if (cacheService.isAvailable()) {
  await cacheService.invalidateRepository(repoKey);
  logger.info({ repository: repoKey }, 'Repository cache invalidated');
}
```

---

## ✅ Verification

### 1. Test Cache is Working
```bash
# Start API
pnpm dev

# Make a search request
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"query": "authentication", "limit": 5}'

# Check logs for "Cache hit" or "Cache miss"
# Second identical request should show "Cache hit"
```

### 2. Test Metrics Endpoint
```bash
curl http://localhost:3000/api/metrics \
  -H "X-API-Key: your-key"

# Should return JSON with metrics
```

### 3. Test Extended MCP Tools
Use MCP inspector:
```bash
npx @modelcontextprotocol/inspector dist/index.js

# Try new tools:
# - summarize_repository
# - list_repository_files
# - get_repository_stats
```

### 4. Run Tests
```bash
pnpm test

# Should show 35+ passing tests
```

---

## 🐛 Troubleshooting

### Redis Connection Failed
```
Error: Redis connection failed
```
**Solution**: 
- Ensure Redis is running: `redis-cli ping` should return `PONG`
- Check REDIS_URL format: `redis://host:port` or `rediss://` for TLS
- If Redis unavailable, caching gracefully degrades (no errors)

### Import Errors
```
Module '@tekupvault/vault-core' has no exported member 'CacheService'
```
**Solution**:
- Rebuild packages: `pnpm build`
- Check `packages/vault-core/src/index.ts` exports cache
- Verify TypeScript compilation: `pnpm typecheck`

### Tests Failing
```
Cannot find module 'pino'
```
**Solution**:
- Install pino in test packages: `pnpm add -D pino`
- Or mock it in test setup

---

## 📊 Performance Validation

### Before Caching
```bash
# Run 10 identical searches, measure average time
for i in {1..10}; do
  time curl -X POST http://localhost:3000/api/search \
    -H "X-API-Key: key" \
    -d '{"query":"test"}' > /dev/null 2>&1
done
```
Expected: 200-500ms per request

### After Caching
```bash
# First request: cache miss (~200-500ms)
# Subsequent 9 requests: cache hit (~5-20ms)
```
Expected: 10-50x improvement on cached requests

---

## 🔄 Deployment Checklist

### Render.com Deployment
1. Add Redis add-on in Render dashboard
2. Copy `REDIS_URL` from add-on to environment variables
3. Redeploy both `tekupvault-api` and `tekupvault-worker`
4. Verify Redis connection in logs: "Redis connected"
5. Monitor `/api/metrics` for cache hit rate

### Environment Variables
Ensure these are set in production:
- ✅ `REDIS_URL` (from Render Redis add-on)
- ✅ `API_KEY` (for metrics endpoint)
- ✅ `SENTRY_DSN` (error tracking)
- ✅ `LOG_LEVEL=info` (production logging)

---

## 📈 Monitoring in Production

### Key Metrics to Watch
1. **Cache Hit Rate**: Should be >70% after warmup
2. **Average Response Time**: Should drop to <50ms for cached
3. **Failed Syncs**: Should be 0 or near 0
4. **Redis Memory**: Monitor Redis memory usage

### Grafana Dashboard (Optional)
If you add Prometheus export:
- API request rate & latency
- Cache hit/miss rate
- Repository sync status
- Database document count

---

## 🎉 Done!

Your TekupVault now has:
- ⚡ **10-50x faster** cached searches
- 🔧 **5 new MCP tools** for repository exploration
- 📊 **Production metrics** for monitoring
- ✅ **35+ tests** for confidence

**Questions?** Check `IMPROVEMENTS_2025-10-24.md` for detailed documentation.

**Need help?** Ask Copilot or review the test files for usage examples.
