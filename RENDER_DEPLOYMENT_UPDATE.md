# TekupVault - Render Deployment Update Guide

**Dato**: 27. Oktober 2025  
**Status**: Migration til TekupDK/tekup monorepo

---

## 🎯 Formål

Opdater TekupVault deployment på Render.com til at pege på det nye TekupDK/tekup monorepo i stedet for det gamle separate repository.

---

## 📋 Før Migration

**Gammelt setup:**
- Repository: `https://github.com/JonasAbde/TekupVault` (separat repo)
- Root directory: `/`
- Status: Deprecated ❌

**Nyt setup:**
- Repository: `https://github.com/TekupDK/tekup` (monorepo)
- Root directory: `apps/production/tekup-vault`
- Status: Active ✅

---

## 🚀 Migration Steps

### Step 1: Login til Render Dashboard

1. Gå til **https://dashboard.render.com**
2. Log ind med din konto
3. Find eksisterende services:
   - `tekupvault-api` (Web Service)
   - `tekupvault-worker` (Background Worker)

---

### Step 2: Opdater Repository Connection

#### For `tekupvault-api`:

1. **Klik på service** → Settings
2. **Repository Section:**
   - Klik "Disconnect" (hvis der er et gammelt repo connected)
   - Klik "Connect Repository"
   - Vælg `TekupDK/tekup` fra listen
   - Klik "Connect"

3. **Root Directory:**
   ```
   apps/production/tekup-vault
   ```
   ⚠️ **VIGTIGT**: Angiv denne sti, ellers kan Render ikke finde filerne!

4. **Branch:**
   ```
   master
   ```

5. **Build Command:**
   ```bash
   pnpm install --frozen-lockfile --prod=false && pnpm build
   ```

6. **Start Command:**
   ```bash
   node apps/vault-api/dist/index.js
   ```

7. **Environment Variables** (behold eksisterende):
   - `NODE_ENV=production`
   - `LOG_LEVEL=info`
   - `PORT=3000`
   - `API_KEY=<secret>`
   - `DATABASE_URL=<from database>`
   - `GITHUB_TOKEN=<secret>`
   - `OPENAI_API_KEY=<secret>`
   - osv.

8. Klik **Save Changes**

---

#### For `tekupvault-worker`:

1. **Klik på service** → Settings
2. **Repository Section:**
   - Klik "Disconnect" (hvis gammelt repo)
   - Klik "Connect Repository"
   - Vælg `TekupDK/tekup`
   - Klik "Connect"

3. **Root Directory:**
   ```
   apps/production/tekup-vault
   ```

4. **Branch:**
   ```
   master
   ```

5. **Build Command:**
   ```bash
   pnpm install --frozen-lockfile --prod=false && pnpm build
   ```

6. **Start Command:**
   ```bash
   node apps/vault-worker/dist/index.js
   ```

7. **Environment Variables** (behold eksisterende):
   - `NODE_ENV=production`
   - `DATABASE_URL=<from database>`
   - `GITHUB_TOKEN=<secret>`
   - `OPENAI_API_KEY=<secret>`
   - osv.

8. Klik **Save Changes**

---

### Step 3: Trigger Manual Deploy

Efter du har opdateret begge services:

1. Gå til hver service
2. Klik **"Manual Deploy"** → "Deploy latest commit"
3. Vent på build at færdiggøre (~3-5 min)
4. Tjek logs for errors

---

## ✅ Verification

### 1. Health Check

```bash
curl https://tekupvault.onrender.com/health
```

**Forventet output:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-27T...",
  "uptime": 123.45
}
```

---

### 2. Test Search Endpoint

```bash
curl -X POST https://tekupvault.onrender.com/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"query": "MCP server implementation", "limit": 3}'
```

**Forventet:** JSON response med search results

---

### 3. Check Worker Logs

1. Gå til `tekupvault-worker` service
2. Klik "Logs" tab
3. Se efter:
   ```
   [INFO] GitHub sync started...
   [INFO] Synced X files from Y repositories
   [INFO] Indexing completed
   ```

---

## 🔧 Troubleshooting

### Problem: "pnpm: command not found"

**Fix:**
Render skal installere pnpm først. Opdater Build Command:

```bash
npm install -g pnpm@8.15.0 && pnpm install --frozen-lockfile --prod=false && pnpm build
```

---

### Problem: "Cannot find module './index.js'"

**Fix:**
Tjek at Root Directory er korrekt sat:
```
apps/production/tekup-vault
```

Tjek også at build kommandoen er kørt succesfuldt i logs.

---

### Problem: Database connection fejler

**Fix:**
1. Tjek at `tekupvault-db` database stadig eksisterer
2. Tjek at `DATABASE_URL` environment variable er sat
3. Alternativt: Brug central Tekup database:
   ```
   DATABASE_URL=postgresql://user:pass@host/tekup_db?schema=vault
   ```

---

## 📊 Post-Migration Status

Efter succesfuld migration:

- ✅ TekupVault kører fra TekupDK/tekup monorepo
- ✅ Auto-deploy ved push til `master` branch
- ✅ Samme functionality som før
- ✅ Lettere at vedligeholde (én codebase)

---

## 🔐 Alternativ: Migration til Docker + Central Infrastructure

Hvis Render deployment er problematisk, overvej at køre TekupVault lokalt/self-hosted:

### Option 1: Docker Compose (Anbefalet)

1. Tilføj til `docker-compose.yml` i root:

```yaml
  tekupvault-api:
    build:
      context: ./apps/production/tekup-vault
      dockerfile: apps/vault-api/Dockerfile
    ports:
      - "8054:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres

  tekupvault-worker:
    build:
      context: ./apps/production/tekup-vault
      dockerfile: apps/vault-worker/Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
```

2. Start services:
```bash
docker-compose up -d tekupvault-api tekupvault-worker
```

---

### Option 2: Deploy til TekupDK Infrastructure

Hvis du har egen server/VPS:

1. Clone repo på server
2. Setup systemd services
3. Configure nginx reverse proxy
4. Enable SSL med Let's Encrypt

---

## 📝 Next Steps

Efter migration:

1. ✅ Opdater README.md med nye deployment info
2. ✅ Test alle endpoints grundigt
3. ✅ Monitor logs i 24-48 timer
4. ✅ Opdater integrations (Rendetalje, AI Chat) hvis endpoint ændres
5. ✅ Overvej Redis caching activation (se IMPROVEMENTS_2025-10-24.md)

---

## 🆘 Support

**Problem?**
- Check Render logs først
- Verificer environment variables
- Test lokalt med samme config
- Kontakt Render support hvis build fejler

**Repository Issues:**
- Verificer GitHub access tokens
- Tjek branch permissions
- Confirm monorepo structure

---

**Status**: 📋 Ready to execute  
**Estimated Time**: 15-20 minutter  
**Risk**: Lav (kan rollback til gammelt repo hvis nødvendigt)
