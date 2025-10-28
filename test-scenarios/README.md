# 🧪 TekupVault Test Scenarios

Omfattende test suite til at verificere og validere TekupVault systemet.

## 📋 Oversigt

Denne test suite indeholder 4 forskellige test scenarier der dækker alle aspekter af TekupVault:

| Test | Beskrivelse | Type | Kritisk |
|------|-------------|------|---------|
| **01-search-quality-test** | Tester søgekvalitet og relevans | Funktionel | ✅ |
| **02-edge-cases-test** | Tester edge cases og fejlhåndtering | Sikkerhed | ✅ |
| **03-performance-test** | Tester performance og load | Performance | ⚪ |
| **04-data-integrity-test** | Verificerer data konsistens | Data Kvalitet | ✅ |

## 🚀 Hurtig Start

### Kør Alle Tests

```bash
cd test-scenarios
node run-all-tests.mjs
```

### Kør Individuelle Tests

```bash
# Search Quality Tests
node 01-search-quality-test.mjs

# Edge Cases & Error Handling
node 02-edge-cases-test.mjs

# Performance & Load Tests
node 03-performance-test.mjs

# Data Integrity Tests
node 04-data-integrity-test.mjs
```

## 📚 Test Beskrivelser

### 1️⃣ Search Quality Tests

**Fil:** `01-search-quality-test.mjs`  
**Varighed:** ~30-60 sekunder  
**Kritisk:** Ja

Tester kvaliteten af semantisk søgning med forskellige query typer:

- ✅ Authentication queries
- ✅ React component queries  
- ✅ API integration queries
- ✅ Database schema queries
- ✅ Configuration queries
- ✅ Error handling queries
- ✅ Deployment queries
- ✅ Testing queries

**Hvad testes:**
- Repository relevans
- Similarity scores
- Keyword matching
- Result ordering

**Success kriterier:**
- ≥75% tests bestået
- ≥66% checks per test
- Gennemsnitlig score >60%

---

### 2️⃣ Edge Cases & Error Handling

**Fil:** `02-edge-cases-test.mjs`  
**Varighed:** ~40-80 sekunder  
**Kritisk:** Ja

Tester systemets robusthed med grænsetilfælde:

**Sikkerhedstests:**
- SQL injection attempts
- XSS attempts  
- API key validation
- Malformed requests

**Validering:**
- Empty queries
- Very long queries (>1000 chars)
- Invalid parameters
- Missing fields
- Null values

**Unicode & Special Chars:**
- Dansk karakterer (æøå)
- Emojis
- Special characters

**Success kriterier:**
- ≥90% tests bestået
- Alle sikkerhedstests bestået
- Korrekt fejlhåndtering

---

### 3️⃣ Performance & Load Tests

**Fil:** `03-performance-test.mjs`  
**Varighed:** ~1-2 minutter  
**Kritisk:** Nej (men anbefalet)

Tester systemets ydeevne under forskellige belastninger:

**Test typer:**
- Sequential requests (enkeltforespørgsler)
- Concurrent requests (2, 5, 10, 20 parallelle)
- Large result sets (1, 5, 10, 50, 100 resultater)
- Cache performance (cold vs warm)
- Stress test (10 sekunder rapid-fire)

**Metrics:**
- Response times (avg, min, max)
- Requests per second
- Success rate
- Memory usage
- Cache effectiveness

**Performance grading:**
- A: <500ms average
- B: <1000ms average
- C: <2000ms average
- D: ≥2000ms average

---

### 4️⃣ Data Integrity Tests

**Fil:** `04-data-integrity-test.mjs`  
**Varighed:** ~30-50 sekunder  
**Kritisk:** Ja

Verificerer data kvalitet og konsistens:

**Checks:**
- Sync status for alle repos
- Repository consistency
- Data type validation
- File type distribution
- Content quality
- Similarity score ordering

**Data validering:**
- Required fields present
- Correct data types
- No binary files
- Content length reasonable
- Proper similarity scores

**Health score beregning:**
- 90-100%: Excellent
- 75-89%: Good
- 60-74%: Fair  
- <60%: Poor

---

## 📊 Output Eksempel

```
🧪 TekupVault - Complete Test Suite
======================================================================

🚀 Running: Search Quality Tests
📝 Tests query relevance and result quality
⚠️  Critical: Yes

🔍 Testing: Authentication Query
   Query: "How does user authentication work in the backend?"

   ✅ Found 5 results
   ✅ Found results from expected repos: renos-backend
   📊 Average similarity: 0.785
   📊 High quality results (≥0.6): 4/5
   ✅ Found keywords: auth, login, jwt

   📄 Top 3 Results:
      1. renos-backend/src/auth/login.ts (0.892)
      2. renos-backend/docs/authentication.md (0.834)
      3. renos-backend/src/middleware/auth.ts (0.756)

   🎯 Score: 100% (3/3 checks passed)
   ✅ PASSED

...

📊 FINAL TEST SUMMARY
======================================================================

📈 Overall Results:
   Total Tests: 4
   ✅ Passed: 4 (100%)
   ❌ Failed: 0 (0%)

🔴 Critical Tests:
   Total: 3
   ✅ Passed: 3
   ❌ Failed: 0

🎯 Overall Status: EXCELLENT
   ✅ All tests passed! System is production ready.
```

## 🔧 Konfiguration

Alle tests bruger følgende miljøvariabler:

```javascript
const API_URL = 'http://localhost:3001';
const API_KEY = 'tekup_vault_api_key_2025_secure';
```

For at ændre disse, rediger konstanterne i hver test fil.

## ⚙️ Præ-requisites

**For at køre tests skal:**
1. ✅ TekupVault API køre på `localhost:3001`
2. ✅ Database være synkroniseret med dokumenter
3. ✅ Embeddings være genereret
4. ✅ API key være korrekt konfigureret

**Start systemet:**
```bash
# Terminal 1: Start API
cd c:\Users\empir\TekupVault
node apps/vault-api/dist/index.js

# Terminal 2 (optional): Start worker for baggrunds-sync
node apps/vault-worker/dist/index.js
```

## 📈 Fortolkning af Resultater

### ✅ Alle Tests Bestået

Systemet er production-ready. Fortsæt med:
- Regular monitoring
- Periodisk test kørsel
- Performance tracking

### ⚠️ Nogle Tests Fejlede

**Hvis kritiske tests fejler:**
1. Undersøg log output
2. Check database forbindelse
3. Verificer API konfiguration
4. Kør individuelle tests for detaljer

**Hvis kun performance tests fejler:**
- System er stadig funktionelt
- Overvej optimering
- Check server resources
- Undersøg database performance

### ❌ Mange Tests Fejlede

Kritiske problemer kræver øjeblikkelig handling:
1. Stop deployment
2. Check systemstatus (`/health` endpoint)
3. Verificer miljøvariabler
4. Undersøg database migrations
5. Review seneste kodeændringer

## 🎯 Best Practices

### Hvornår køre tests

- **Før deployment:** Kør alle tests
- **Efter kodeændringer:** Kør relaterede tests
- **Dagligt:** Kør i CI/CD pipeline
- **Efter data updates:** Kør data integrity tests
- **Performance tuning:** Kør performance tests

### Test i CI/CD

```yaml
# Eksempel GitHub Actions workflow
name: TekupVault Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: pnpm install
      - run: pnpm build
      - run: node apps/vault-api/dist/index.js &
      - run: sleep 5
      - run: cd test-scenarios && node run-all-tests.mjs
```

## 🐛 Troubleshooting

### Test forbindelse fejler

```
❌ API Error: ECONNREFUSED
```

**Løsning:** Verificer at API serveren kører på port 3001

```bash
netstat -ano | findstr "3001"
```

### Authentication fejler

```
❌ Expected status 200, got 401
```

**Løsning:** Check at API_KEY matcher `.env` filen

### No results returned

```
⚠️  No results found
```

**Løsning:**
1. Check at embeddings er genereret
2. Verificer sync status: `GET /api/sync-status`
3. Kør worker igen: `node apps/vault-worker/dist/index.js`

### Performance tests timeout

**Løsning:**
- Reducer concurrency levels
- Increase timeout values
- Check server resources (CPU, memory)

## 📊 Metrics & Monitoring

Tests genererer følgende metrics:

- **Response times:** Average, Min, Max
- **Success rates:** Percentage af succesfulde requests
- **Error rates:** Antal fejl per test type
- **Data quality scores:** Health score for data integritet
- **Performance grades:** A-D baseret på response times

## 🔮 Fremtidige Forbedringer

Potentielle udvidelser til test suiten:

- [ ] Automated regression testing
- [ ] Visual regression tests
- [ ] API contract testing
- [ ] Database performance benchmarks
- [ ] Memory leak detection
- [ ] Long-running stability tests
- [ ] Multi-user concurrent testing
- [ ] Cross-repository search accuracy
- [ ] Embedding quality metrics
- [ ] Search result relevance scoring

## 📞 Support

Hvis du støder på problemer:

1. Check denne README
2. Review test output logs
3. Verificer system status
4. Check `API_DOCS.md` for API detaljer

---

**Lavet med ❤️ for TekupVault**  
**Version:** 1.0.0  
**Opdateret:** Oktober 2025

