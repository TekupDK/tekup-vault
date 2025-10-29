# GitHub Token Setup Guide

## Manual Step Required: Generate GitHub Personal Access Token

### 1. Go to GitHub Settings

https://github.com/settings/tokens/new

### 2. Token Configuration

- **Name:** TekupVault Auto-Sync
- **Expiration:** 90 days (or No expiration for production)
- **Scopes Required:**
  - ✅ `repo` (Full control of private repositories)
    - Needed to read code, documentation, and commits
  - ✅ `read:org` (Read org and team membership)
    - Needed if syncing org repos

### 3. After Token Generation

1. Copy the token (starts with `ghp_`)
2. Add to `.env` file:
   ```bash
   GITHUB_TOKEN=ghp_YOUR_NEW_TOKEN_HERE
   GITHUB_SYNC_ENABLED=true
   ```
3. Restart containers:
   ```bash
   docker-compose restart
   ```

### 4. Verify Sync

Check worker logs:

```bash
docker logs tekupvault-worker --tail 50
```

Look for:

- "GitHub sync enabled"
- "Syncing repository: TekupDK/renos-backend"
- "Syncing repository: TekupDK/renos-frontend"
- "Syncing repository: TekupDK/tekup-billy"

### 5. Repositories to Sync

Current configuration syncs these repos:

- `TekupDK/renos-backend` (JonasAbde/renos-backend)
- `TekupDK/renos-frontend` (JonasAbde/renos-frontend)
- `TekupDK/tekup-billy` (JonasAbde/Tekup-Billy)

Add more in `apps/vault-worker/src/jobs/sync-github.ts`

---

**Note:** Token generation requires manual step - cannot be automated for security reasons.
