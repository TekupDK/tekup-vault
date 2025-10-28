# Render Build Fix - October 14, 2025

## Problem Summary
The Render deployment was failing with TypeScript compilation errors:
1. **Missing type definitions** - `@types/node`, `@types/express`, `@types/cors` not found
2. **Module resolution errors** - Could not find `@tekupvault/*` workspace packages
3. **TypeScript composite mode errors** - TS2742: Inferred type cannot be named without reference

## Root Causes

### 1. devDependencies Not Installed in Production
- Render sets `NODE_ENV=production` which causes pnpm to skip devDependencies
- TypeScript `@types/*` packages are typically in devDependencies
- Build command didn't override this behavior

### 2. Missing `composite: true` in App tsconfig.json
- `packages/vault-core`, `vault-ingest`, and `vault-search` had `composite: true`
- `apps/vault-api` and `vault-worker` were missing it
- When using TypeScript project references, all projects in the chain need `composite: true`

### 3. Implicit Type Inference in Composite Mode
- TypeScript composite mode requires explicit type annotations for exports
- `const router = Router()` couldn't infer the type portably
- Needed explicit `Router` type annotation

## Solutions Applied

### 1. Updated render.yaml Build Commands
**Before:**
```yaml
buildCommand: corepack enable && pnpm install && pnpm build --filter=vault-api
```

**After:**
```yaml
buildCommand: corepack enable && pnpm install --frozen-lockfile --prod=false && pnpm build --filter=vault-api
```

The `--prod=false` flag ensures devDependencies are installed even in production environment.

### 2. Added `composite: true` to App tsconfig.json
Updated both:
- `apps/vault-api/tsconfig.json`
- `apps/vault-worker/tsconfig.json`

```jsonc
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true  // ← Added this
  }
}
```

### 3. Added Explicit Router Type Annotations
Updated:
- `apps/vault-api/src/routes/search.ts`
- `apps/vault-api/src/routes/webhooks.ts`

```typescript
import { Router } from 'express';
import type { Router as RouterType } from 'express';

const router: RouterType = Router();  // ← Added explicit type
```

## Verification

### Local Build Test
```bash
pnpm install
pnpm build
```

**Result:** ✅ All 5 packages built successfully

### Files Changed
1. `render.yaml` - Updated build commands with `--prod=false`
2. `apps/vault-api/tsconfig.json` - Added `composite: true`
3. `apps/vault-worker/tsconfig.json` - Added `composite: true`
4. `apps/vault-api/src/routes/search.ts` - Added Router type annotation
5. `apps/vault-api/src/routes/webhooks.ts` - Added Router type annotation

## Next Steps

1. ✅ Changes pushed to GitHub (commit: 60f58ca)
2. ⏳ Monitor Render dashboard for deployment status
3. ✅ Once deployed, verify health endpoint: https://tekupvault.onrender.com/health
4. 🧪 Test search API endpoint
5. 🔍 Check Render logs for any runtime issues

## Alternative Solutions Considered

### Option A: Move @types to dependencies (NOT RECOMMENDED)
```json
{
  "dependencies": {
    "@types/node": "^18.19.0",
    "@types/express": "^4.17.21"
  }
}
```
**Why not:** Violates best practices - type definitions should stay in devDependencies.

### Option B: Set NODE_ENV=development in Render (NOT RECOMMENDED)
```yaml
envVars:
  - key: NODE_ENV
    value: development
```
**Why not:** Could affect runtime behavior of libraries that check NODE_ENV.

### Option C: Remove composite mode (NOT RECOMMENDED)
**Why not:** Composite mode enables incremental builds and proper project references, improving build performance in monorepo.

## Best Practices Going Forward

1. **Always test builds locally** before pushing
2. **Use `--prod=false`** in CI/CD build commands for TypeScript projects
3. **Enable `composite: true`** for all TypeScript projects using references
4. **Add explicit type annotations** for exported values in composite projects
5. **Keep `@types/*` in devDependencies** and override install behavior at build time

## References

- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [pnpm install --prod flag](https://pnpm.io/cli/install#--prod--p)
- [Render Node.js Build Documentation](https://render.com/docs/node-version)
- [TekupVault Architecture](/docs/architecture.md)
