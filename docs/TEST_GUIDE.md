# TekupVault Test Guide

**Sidst opdateret:** 16. Oktober 2025

Dette dokument viser hvordan man tester alle TekupVault funktioner manuelt og automatisk.

---

## 📋 Forudsætninger

```bash
# 1. Start services
cd TekupVault
pnpm install
pnpm build
pnpm dev

# 2. Verificer at begge services kører
# - vault-api på port 3000
# - vault-worker i baggrunden
```

---

## 🧪 Test 1: Health Check

**Formål:** Verificer at API'et er oppe og kører.

### PowerShell (Windows)
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
```

### Curl (Linux/Mac)
```bash
curl http://localhost:3000/health
```

### Forventet Output
```json
{
  "status": "ok",
  "timestamp": "2025-10-16T10:30:00.000Z",
  "service": "vault-api",
  "version": "0.1.0"
}
```

**Status:** ✅ Hvis du får JSON tilbage  
**Status:** ❌ Hvis "connection refused" → Start API med `pnpm dev`

---

## 🔄 Test 2: Sync Status

**Formål:** Tjek status for GitHub repository synkronisering.

### PowerShell
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/sync-status" -Method Get
```

### Curl
```bash
curl http://localhost:3000/api/sync-status
```

### Forventet Output
```json
{
  "success": true,
  "items": [
    {
      "id": "uuid-1",
      "source": "github",
      "repository": "JonasAbde/renos-backend",
      "status": "success",
      "last_sync_at": "2025-10-16T08:00:00.000Z",
      "documents_count": 605,
      "error_message": null
    },
    {
      "id": "uuid-2",
      "source": "github",
      "repository": "JonasAbde/renos-frontend",
      "status": "success",
      "last_sync_at": "2025-10-16T08:00:00.000Z",
      "documents_count": 247,
      "error_message": null
    },
    {
      "id": "uuid-3",
      "source": "github",
      "repository": "JonasAbde/Tekup-Billy",
      "status": "success",
      "last_sync_at": "2025-10-16T08:00:00.000Z",
      "documents_count": 141,
      "error_message": null
    }
  ],
  "total_documents": 993
}
```

**Hvad skal du tjekke:**
- ✅ Alle 3 repositories har `status: "success"`
- ✅ `last_sync_at` er nylig (inden for 6 timer)
- ✅ `error_message` er `null`
- ✅ Total dokument count er ~1000

---

## 🔍 Test 3: Semantic Search - Authentication

**Formål:** Test intelligent søgning efter autentificerings-relateret kode.

### PowerShell
```powershell
$body = @{
    query = "How do I authenticate users with JWT tokens?"
    limit = 5
    threshold = 0.7
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/search" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### Curl
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How do I authenticate users with JWT tokens?",
    "limit": 5,
    "threshold": 0.7
  }'
```

### Forventet Output
```json
{
  "success": true,
  "results": [
    {
      "id": "uuid-abc123",
      "source": "github",
      "repository": "JonasAbde/renos-backend",
      "path": "src/middleware/authMiddleware.ts",
      "content": "import jwt from 'jsonwebtoken';\n\nexport const authenticateToken = (req, res, next) => {\n  const token = req.headers['authorization']?.split(' ')[1];\n  ...",
      "similarity": 0.89,
      "metadata": {
        "file_type": "typescript",
        "language": "ts"
      },
      "created_at": "2025-10-14T12:00:00.000Z"
    },
    {
      "id": "uuid-def456",
      "source": "github",
      "repository": "JonasAbde/renos-backend",
      "path": "src/routes/auth/login.ts",
      "content": "const token = jwt.sign(\n  { userId: user.id, email: user.email },\n  process.env.JWT_SECRET,\n  { expiresIn: '7d' }\n);",
      "similarity": 0.85,
      "metadata": {},
      "created_at": "2025-10-14T12:00:00.000Z"
    }
  ],
  "count": 2,
  "query_time_ms": 145
}
```

**Hvad skal du validere:**
- ✅ `success: true`
- ✅ `results` indeholder relevante kodestykker
- ✅ `similarity` score er >0.7
- ✅ `path` og `repository` er korrekte
- ✅ `content` viser faktisk kode om authentication

---

## 🔍 Test 4: Semantic Search - Frontend Komponenter

**Formål:** Find React komponenter i frontend.

### PowerShell
```powershell
$body = @{
    query = "React components for displaying user profiles"
    limit = 3
    threshold = 0.65
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/search" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### Curl
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "React components for displaying user profiles",
    "limit": 3,
    "threshold": 0.65
  }'
```

**Forventet:** Resultater fra `renos-frontend` repository med `.tsx` filer

---

## 🔍 Test 5: Semantic Search - Billy Integration

**Formål:** Find Billy.dk integration kode.

### PowerShell
```powershell
$body = @{
    query = "How to fetch invoices from Billy API?"
    limit = 5
    threshold = 0.7
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/search" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

### Curl
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How to fetch invoices from Billy API?",
    "limit": 5,
    "threshold": 0.7
  }'
```

**Forventet:** Resultater fra `Tekup-Billy` repository

---

## 🔍 Test 6: Search Edge Cases

### Test 6a: Ingen resultater (høj threshold)
```powershell
$body = @{
    query = "quantum entanglement in React hooks"
    limit = 5
    threshold = 0.95
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/search" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

**Forventet:**
```json
{
  "success": true,
  "results": [],
  "count": 0,
  "query_time_ms": 89
}
```

### Test 6b: Lav threshold (mange resultater)
```powershell
$body = @{
    query = "function"
    limit = 10
    threshold = 0.3
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/search" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

**Forventet:** 10 resultater med varierende similarity scores

### Test 6c: Limit parameteren
```powershell
$body = @{
    query = "database queries"
    limit = 1
    threshold = 0.6
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/search" `
    -Method Post `
    -Body $body `
    -ContentType "application/json"
```

**Forventet:** Præcis 1 resultat

---

## 🔐 Test 7: GitHub Webhook (Lokal Test)

**Formål:** Verificer at webhook endpoint håndterer push events.

### Setup Mock Webhook
```powershell
# 1. Generer HMAC signature
$secret = "your_webhook_secret"
$payload = '{"repository":{"full_name":"JonasAbde/renos-backend"},"ref":"refs/heads/main"}'
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = [Text.Encoding]::UTF8.GetBytes($secret)
$hash = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($payload))
$signature = "sha256=" + [BitConverter]::ToString($hash).Replace("-", "").ToLower()

# 2. Send webhook
$headers = @{
    "X-Hub-Signature-256" = $signature
    "X-GitHub-Event" = "push"
}

Invoke-RestMethod -Uri "http://localhost:3000/webhook/github" `
    -Method Post `
    -Body $payload `
    -Headers $headers `
    -ContentType "application/json"
```

### Forventet Output
```json
{
  "success": true,
  "message": "Webhook received and processing started"
}
```

**Note:** Tjek worker logs for at se sync job startet:
```bash
# Check logs (hvis worker logger til fil)
Get-Content -Path "logs/vault-worker.log" -Tail 20 -Wait
```

---

## 📊 Test 8: Database Direkte Queries

**Formål:** Verificer data i Supabase direkte.

### Count Dokumenter
```powershell
$headers = @{
    "apikey" = $env:SUPABASE_ANON_KEY
    "Authorization" = "Bearer $env:SUPABASE_ANON_KEY"
    "Prefer" = "count=exact"
}

Invoke-RestMethod `
    -Uri "$env:SUPABASE_URL/rest/v1/vault_documents?select=id&limit=1" `
    -Headers $headers
```

### Count Embeddings
```powershell
Invoke-RestMethod `
    -Uri "$env:SUPABASE_URL/rest/v1/vault_embeddings?select=id&limit=1" `
    -Headers $headers
```

### Hent Sample Document
```powershell
Invoke-RestMethod `
    -Uri "$env:SUPABASE_URL/rest/v1/vault_documents?limit=1" `
    -Headers $headers
```

---

## 🧪 Test 9: Performance Benchmark

**Formål:** Mål søge-performance.

### PowerShell Benchmark Script
```powershell
# test-performance.ps1
$queries = @(
    "authentication",
    "database connection",
    "React components",
    "API endpoints",
    "error handling"
)

$results = @()

foreach ($query in $queries) {
    $body = @{query=$query;limit=10;threshold=0.7} | ConvertTo-Json
    $start = Get-Date
    
    $response = Invoke-RestMethod `
        -Uri "http://localhost:3000/api/search" `
        -Method Post `
        -Body $body `
        -ContentType "application/json"
    
    $duration = ((Get-Date) - $start).TotalMilliseconds
    
    $results += [PSCustomObject]@{
        Query = $query
        ResultCount = $response.count
        DurationMs = [math]::Round($duration, 2)
        AvgSimilarity = ($response.results | Measure-Object -Property similarity -Average).Average
    }
}

$results | Format-Table -AutoSize

# Forventet output:
# Query              ResultCount DurationMs AvgSimilarity
# -----              ----------- ---------- -------------
# authentication              5      145.32          0.82
# database connection         8      132.67          0.75
# React components            6      151.23          0.79
# API endpoints              10      168.45          0.73
# error handling              7      139.88          0.77
```

**Performance Targets:**
- ✅ Query latency: <200ms (median)
- ✅ Similarity scores: >0.7 (average)
- ✅ Results per query: >0 (hvis relevant content findes)

---

## ⚡ Test 10: Stress Test

**Formål:** Test concurrent requests.

### PowerShell Concurrent Test
```powershell
# stress-test.ps1
$jobs = @()
$iterations = 20

1..$iterations | ForEach-Object {
    $jobs += Start-Job -ScriptBlock {
        $body = @{query="test query $_";limit=5;threshold=0.7} | ConvertTo-Json
        Invoke-RestMethod `
            -Uri "http://localhost:3000/api/search" `
            -Method Post `
            -Body $body `
            -ContentType "application/json"
    }
}

# Wait for all jobs
$jobs | Wait-Job | Receive-Job

# Cleanup
$jobs | Remove-Job

Write-Host "✅ Completed $iterations concurrent requests"
```

**Success Criteria:**
- ✅ Alle requests returnerer 200 OK
- ✅ Ingen timeout errors
- ✅ Gennemsnitlig latency <500ms

---

## 🔍 Test 11: Data Integrity

**Formål:** Verificer at synced data er korrekt.

### Check for Binary Files (should be 0)
```powershell
$headers = @{
    "apikey" = $env:SUPABASE_ANON_KEY
    "Authorization" = "Bearer $env:SUPABASE_ANON_KEY"
}

# Check for .png files (should not exist)
$result = Invoke-RestMethod `
    -Uri "$env:SUPABASE_URL/rest/v1/vault_documents?path=ilike.*.png" `
    -Headers $headers

if ($result.Count -eq 0) {
    Write-Host "✅ No binary files found (correct)"
} else {
    Write-Host "❌ Found $($result.Count) binary files (should be filtered)"
}
```

### Verify Unique Documents
```powershell
# Check for duplicates (same source + repository + path)
Invoke-RestMethod `
    -Uri "$env:SUPABASE_URL/rest/v1/rpc/check_duplicates" `
    -Method Post `
    -Headers $headers
```

---

## 📋 Test Checklist

Før deployment til production:

- [ ] **Test 1:** Health check returnerer 200 OK
- [ ] **Test 2:** Sync status viser 3 success repositories
- [ ] **Test 3:** Search returnerer relevante resultater (>0.7 similarity)
- [ ] **Test 4:** Frontend komponenter findes korrekt
- [ ] **Test 5:** Billy integration kode findes
- [ ] **Test 6:** Edge cases håndteres korrekt
- [ ] **Test 7:** Webhook endpoint virker med HMAC verification
- [ ] **Test 8:** Database har ~1000 dokumenter og embeddings
- [ ] **Test 9:** Performance <200ms per query (median)
- [ ] **Test 10:** Stress test med 20+ concurrent requests succeeds
- [ ] **Test 11:** Ingen binary files, ingen duplicates

---

## 🐛 Troubleshooting

### Issue: "Connection refused"
**Solution:** Start API'et:
```bash
cd apps/vault-api
pnpm dev
```

### Issue: "0 search results"
**Possible causes:**
1. Embeddings ikke genereret endnu → Vent på worker
2. Threshold for høj → Sænk til 0.3-0.5
3. Query irrelevant → Prøv mere specifik query

**Debug:**
```powershell
# Check embedding count
$headers = @{"apikey"=$env:SUPABASE_ANON_KEY}
Invoke-RestMethod `
    -Uri "$env:SUPABASE_URL/rest/v1/vault_embeddings?select=count" `
    -Headers $headers
```

### Issue: "Webhook fails verification"
**Solution:** Tjek at `GITHUB_WEBHOOK_SECRET` i .env matcher GitHub webhook secret

### Issue: "Slow queries (>1s)"
**Possible causes:**
1. pgvector index ikke oprettet → Check migration
2. For mange dokumenter (>100k) → Øg IVFFlat lists parameter
3. OpenAI API slow → Check network/API status

---

## 📝 Test Log Template

```markdown
## Test Session: [Date]

### Environment
- Branch: main
- Commit: [hash]
- Node version: 18.x
- Database: Supabase (Frankfurt)

### Test Results
| Test # | Name | Status | Notes |
|--------|------|--------|-------|
| 1 | Health Check | ✅ | 200 OK |
| 2 | Sync Status | ✅ | 3/3 repos synced |
| 3 | Search Auth | ✅ | 5 results, avg similarity 0.82 |
| 4 | Search Frontend | ✅ | 3 results from renos-frontend |
| 5 | Search Billy | ✅ | 4 results from Tekup-Billy |
| 6 | Edge Cases | ✅ | All handled correctly |
| 7 | Webhook | ⚠️ | Not configured in GitHub yet |
| 8 | Database | ✅ | 991 docs, 991 embeddings |
| 9 | Performance | ✅ | Avg 152ms per query |
| 10 | Stress Test | ✅ | 20 concurrent OK |
| 11 | Data Integrity | ✅ | No issues |

### Issues Found
- None

### Recommendations
- Deploy to production ✅
```

---

**Sidst opdateret:** 16. Oktober 2025  
**Maintained by:** Jonas Abde (Tekup Portfolio)

