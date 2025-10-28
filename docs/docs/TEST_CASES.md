# TekupVault - Test Cases Documentation

> **Sidst opdateret**: 2025-10-17  
> **Version**: 1.0.0  
> **Total Test Cases**: 150+  
> **Automatiserede Tests**: 77 unit tests + 6 integration scenarios

---

## 📋 Indholdsfortegnelse

1. [API Autentifikation & Sikkerhed](#1-api-autentifikation--sikkerhed)
2. [Semantisk Søgning](#2-semantisk-søgning)
3. [GitHub Webhook Håndtering](#3-github-webhook-håndtering)
4. [Rate Limiting](#4-rate-limiting)
5. [GitHub Synkronisering](#5-github-synkronisering)
6. [Embedding Generation](#6-embedding-generation)
7. [Database & Data Integritet](#7-database--data-integritet)
8. [System Status & Monitoring](#8-system-status--monitoring)
9. [CORS & Security Headers](#9-cors--security-headers)
10. [Performance & Skalérbarhed](#10-performance--skalérbarhed)
11. [Integration Tests](#11-integration-tests)
12. [Regression Tests](#12-regression-tests)
13. [Error Handling & Recovery](#13-error-handling--recovery)
14. [Test Data Management](#14-test-data-management)

---

## 🎯 Test Case Format

Alle test cases følger denne struktur:

| Felt | Beskrivelse |
|------|-------------|
| **ID** | Unikt test case ID (f.eks. AUTH-001) |
| **Use Case** | Kort beskrivelse af scenariet |
| **Testformål** | Hvad testen validerer |
| **Forudsætninger** | Nødvendige preconditions |
| **Testtrin** | Trin-for-trin instruktioner |
| **Forventet resultat** | Hvad skal der ske |
| **Input** | Variabel data (brugertyper, edge cases) |
| **Automatiserbar** | ✅ Ja / ❌ Nej (manuelt) |
| **Prioritet** | Kritisk / Høj / Medium / Lav |
| **Link** | Link til automatiseret test fil |

### Eksempel: Test Case Tabel

```markdown
| ID    | Use Case                        | Testformål                 | Forudsætninger          | Testtrin                            | Forventet resultat | Input   | Automatiserbar | Prioritet | Link        |
|-------|---------------------------------|----------------------------|-------------------------|--------------------------------------|--------------------|---------|----------------|-----------|-------------|
| TC-001| Login med API key               | Valider autentifikation    | Gyldigt API endpoint    | 1. Angiv gyldig key  2. Send request | 200 OK            | Key     | ✅ Ja          | Kritisk   | [api.test.ts](../apps/vault-api/__tests__/api.test.ts) |
```

---

## 1. API Autentifikation & Sikkerhed

**Dækker**: X-API-Key authentication, timing attacks, case sensitivity, malformed keys

**Implementeret i**: `apps/vault-api/__tests__/auth.test.ts` (24 tests)

| ID       | Use Case                          | Testformål                        | Forudsætninger               | Testtrin                                       | Forventet resultat      | Input                        | Automatiserbar | Prioritet | Link                                                                        |
|----------|-----------------------------------|-----------------------------------|------------------------------|------------------------------------------------|-------------------------|------------------------------|----------------|-----------|-----------------------------------------------------------------------------|
| AUTH-001 | Gyldig API key                    | Valider autentifikation           | Gyldigt API key sat i env    | 1. Send GET /api/search med X-API-Key         | 200 OK                  | Gyldig key                   | ✅ Ja          | Kritisk   | [auth.test.ts](../apps/vault-api/__tests__/auth.test.ts)                   |
| AUTH-002 | Manglende API key                 | Afvis uautoriserede requests      | Ingen X-API-Key header       | 1. Send request uden header                    | 401 Unauthorized        | Ingen key                    | ✅ Ja          | Kritisk   | [auth.test.ts](../apps/vault-api/__tests__/auth.test.ts)                   |
| AUTH-003 | Ugyldig API key                   | Afvis forkert key                 | Forkert key i header         | 1. Send request med forkert key                | 401 Unauthorized        | "wrong-key-123"              | ✅ Ja          | Kritisk   | [auth.test.ts](../apps/vault-api/__tests__/auth.test.ts)                   |
| AUTH-004 | Case sensitivity                  | Valider key er case-sensitive     | API key med stor/små bogstaver | 1. Send request med lowercase version        | 401 Unauthorized        | "APIKEY" vs "apikey"         | ✅ Ja          | Høj       | [auth.test.ts](../apps/vault-api/__tests__/auth.test.ts)                   |
| AUTH-005 | API key i query parameter         | Afvis API key i URL               | Key sendt som ?apikey=...    | 1. Send request med query param                | 401 Unauthorized        | Query string key             | ✅ Ja          | Høj       | [auth.test.ts](../apps/vault-api/__tests__/auth.test.ts)                   |
| AUTH-006 | Timing attack prevention          | Valider constant-time comparison  | Forskellige keys             | 1. Send requests med varierende keys           | Konsistent response tid | Multiple keys                | ✅ Ja          | Høj       | [auth.test.ts](../apps/vault-api/__tests__/auth.test.ts)                   |
| AUTH-007 | Empty API key                     | Afvis tom key                     | X-API-Key: ""                | 1. Send request med tom header                 | 401 Unauthorized        | ""                           | ✅ Ja          | Medium    | [auth.test.ts](../apps/vault-api/__tests__/auth.test.ts)                   |
| AUTH-008 | Whitespace in API key             | Valider trimming/rejection        | Key med spaces               | 1. Send request med " key " (spaces)           | 401 Unauthorized        | " key "                      | ✅ Ja          | Medium    | [auth.test.ts](../apps/vault-api/__tests__/auth.test.ts)                   |
| AUTH-009 | Special characters in API key     | Valider special char handling     | Key med $, %, &, etc.        | 1. Send request med special chars              | 401 Unauthorized        | "key$%&"                     | ✅ Ja          | Medium    | [auth.test.ts](../apps/vault-api/__tests__/auth.test.ts)                   |
| AUTH-010 | Very long API key (>1000 chars)   | Valider max length handling       | Key med 1001+ chars          | 1. Send request med lang key                   | 401 Unauthorized        | "a" * 1001                   | ✅ Ja          | Lav       | [auth.test.ts](../apps/vault-api/__tests__/auth.test.ts)                   |

---

## 2. Semantisk Søgning

**Dækker**: OpenAI embeddings, cosine similarity, SQL injection, XSS, performance

**Implementeret i**: `apps/vault-api/__tests__/api.test.ts` (3 tests), integration scenarios

| ID       | Use Case                          | Testformål                        | Forudsætninger               | Testtrin                                       | Forventet resultat      | Input                        | Automatiserbar | Prioritet | Link                                                                        |
|----------|-----------------------------------|-----------------------------------|------------------------------|------------------------------------------------|-------------------------|------------------------------|----------------|-----------|-----------------------------------------------------------------------------|
| SEARCH-001 | Normal search query             | Valider semantisk søgning         | Indexed documents i DB       | 1. POST /api/search med query                  | 200 OK med results      | "authentication"             | ✅ Ja          | Kritisk   | [api.test.ts](../apps/vault-api/__tests__/api.test.ts)                     |
| SEARCH-002 | Empty query                     | Afvis tom query                   | API key                      | 1. Send {"query": ""}                          | 400 Bad Request         | ""                           | ✅ Ja          | Kritisk   | [02-edge-cases-test.mjs](../test-scenarios/02-edge-cases-test.mjs)         |
| SEARCH-003 | SQL injection attempt           | Valider input sanitization        | API key                      | 1. Send {"query": "'; DROP TABLE--"}           | 200 OK, safe handling   | SQL injection strings        | ✅ Ja          | Kritisk   | [02-edge-cases-test.mjs](../test-scenarios/02-edge-cases-test.mjs)         |
| SEARCH-004 | XSS attempt                     | Valider XSS prevention            | API key                      | 1. Send {"query": "<script>alert(1)</script>"} | 200 OK, escaped content | XSS payloads                 | ✅ Ja          | Kritisk   | [02-edge-cases-test.mjs](../test-scenarios/02-edge-cases-test.mjs)         |
| SEARCH-005 | Very long query (>1000 chars)   | Valider max length handling       | API key                      | 1. Send query med 1001+ chars                  | 400 Bad Request         | "a" * 1001                   | ✅ Ja          | Høj       | [02-edge-cases-test.mjs](../test-scenarios/02-edge-cases-test.mjs)         |
| SEARCH-006 | Non-ASCII characters            | Valider Unicode support           | API key                      | 1. Send {"query": "æøå 中文"}                   | 200 OK                  | "æøå 中文 🚀"                 | ✅ Ja          | Høj       | [01-search-quality-test.mjs](../test-scenarios/01-search-quality-test.mjs) |
| SEARCH-007 | Limit parameter validation      | Valider limit bounds              | API key                      | 1. Send {"limit": 101}                         | 400 Bad Request         | limit > 100                  | ✅ Ja          | Medium    | [api.test.ts](../apps/vault-api/__tests__/api.test.ts)                     |
| SEARCH-008 | Threshold parameter validation  | Valider threshold bounds          | API key                      | 1. Send {"threshold": 1.5}                     | 400 Bad Request         | threshold > 1.0              | ✅ Ja          | Medium    | [api.test.ts](../apps/vault-api/__tests__/api.test.ts)                     |
| SEARCH-009 | Repository filter               | Valider repository filtering      | API key, multi-repo data     | 1. Send {"repository": "owner/repo"}           | 200 OK, filtered results| Specific repository          | ✅ Ja          | Høj       | [01-search-quality-test.mjs](../test-scenarios/01-search-quality-test.mjs) |
| SEARCH-010 | High similarity threshold       | Valider precision                 | API key                      | 1. Send {"threshold": 0.9}                     | 200 OK, few results     | threshold = 0.9              | ✅ Ja          | Medium    | [01-search-quality-test.mjs](../test-scenarios/01-search-quality-test.mjs) |
| SEARCH-011 | Performance under load          | Valider response time             | API key, 100+ concurrent req | 1. Send 100 concurrent searches                | Avg < 100ms             | Concurrent requests          | ✅ Ja          | Høj       | [03-performance-test.mjs](../test-scenarios/03-performance-test.mjs)       |
| SEARCH-012 | Semantic relevance              | Valider result quality            | API key, indexed docs        | 1. Search "how to login"                       | Top 3 results relevant  | Natural language queries     | ✅ Ja          | Kritisk   | [01-search-quality-test.mjs](../test-scenarios/01-search-quality-test.mjs) |

---

## 3. GitHub Webhook Håndtering

**Dækker**: HMAC-SHA256 verification, timing attacks, payload validation

**Implementeret i**: `apps/vault-api/__tests__/webhooks.test.ts` (10 tests)

| ID       | Use Case                          | Testformål                        | Forudsætninger               | Testtrin                                       | Forventet resultat      | Input                        | Automatiserbar | Prioritet | Link                                                                        |
|----------|-----------------------------------|-----------------------------------|------------------------------|------------------------------------------------|-------------------------|------------------------------|----------------|-----------|-----------------------------------------------------------------------------|
| WEBHOOK-001 | Valid GitHub signature         | Valider HMAC-SHA256               | GitHub secret sat            | 1. POST /webhook/github med gyldig signature   | 200 OK                  | Valid HMAC                   | ✅ Ja          | Kritisk   | [webhooks.test.ts](../apps/vault-api/__tests__/webhooks.test.ts)           |
| WEBHOOK-002 | Missing signature              | Afvis uden signature              | Ingen X-Hub-Signature-256    | 1. POST uden signature header                  | 401 Unauthorized        | Ingen header                 | ✅ Ja          | Kritisk   | [webhooks.test.ts](../apps/vault-api/__tests__/webhooks.test.ts)           |
| WEBHOOK-003 | Invalid signature              | Afvis forkert signature           | Forkert HMAC                 | 1. POST med forkert signature                  | 401 Unauthorized        | Wrong HMAC                   | ✅ Ja          | Kritisk   | [webhooks.test.ts](../apps/vault-api/__tests__/webhooks.test.ts)           |
| WEBHOOK-004 | Timing attack prevention       | Valider constant-time comparison  | Forskellige signatures       | 1. Send requests med varierende signatures     | Konsistent response tid | Multiple signatures          | ✅ Ja          | Høj       | [webhooks.test.ts](../apps/vault-api/__tests__/webhooks.test.ts)           |
| WEBHOOK-005 | Push event handling            | Valider push event processing     | Valid signature              | 1. POST push event payload                     | 200 OK, sync triggered  | GitHub push event            | ✅ Ja          | Kritisk   | [webhooks.test.ts](../apps/vault-api/__tests__/webhooks.test.ts)           |
| WEBHOOK-006 | Unsupported event type         | Log warning for unknown events    | Valid signature              | 1. POST "issues" event                         | 200 OK, logged          | Non-push event               | ✅ Ja          | Medium    | [webhooks.test.ts](../apps/vault-api/__tests__/webhooks.test.ts)           |
| WEBHOOK-007 | Malformed JSON payload         | Valider payload parsing           | Valid signature              | 1. POST invalid JSON                           | 400 Bad Request         | Invalid JSON                 | ✅ Ja          | Høj       | [webhooks.test.ts](../apps/vault-api/__tests__/webhooks.test.ts)           |
| WEBHOOK-008 | Missing secret configuration   | Valider server config             | GITHUB_WEBHOOK_SECRET unset  | 1. POST webhook request                        | 500 Internal Error      | Missing env var              | ✅ Ja          | Kritisk   | [webhooks.test.ts](../apps/vault-api/__tests__/webhooks.test.ts)           |
| WEBHOOK-009 | Large payload handling         | Valider max payload size          | Valid signature, 10MB payload| 1. POST large payload                          | 413 Payload Too Large   | Large JSON                   | ✅ Ja          | Medium    | TBD                                                                         |
| WEBHOOK-010 | Repository identification      | Valider repo extraction           | Valid push event             | 1. POST push event                             | Correct repo identified | Push event payload           | ✅ Ja          | Høj       | [webhooks.test.ts](../apps/vault-api/__tests__/webhooks.test.ts)           |

---

## 4. Rate Limiting

**Dækker**: Per-IP rate limiting, 429 responses, rate limit headers

**Implementeret i**: `apps/vault-api/__tests__/rateLimit.test.ts` (13 tests)

| ID       | Use Case                          | Testformål                        | Forudsætninger               | Testtrin                                       | Forventet resultat      | Input                        | Automatiserbar | Prioritet | Link                                                                        |
|----------|-----------------------------------|-----------------------------------|------------------------------|------------------------------------------------|-------------------------|------------------------------|----------------|-----------|-----------------------------------------------------------------------------|
| RATE-001 | Search endpoint rate limit        | Valider 100 req/15min limit       | API key                      | 1. Send 101 requests indenfor 15 min          | 101st returns 429       | 101 requests                 | ✅ Ja          | Kritisk   | [rateLimit.test.ts](../apps/vault-api/__tests__/rateLimit.test.ts)         |
| RATE-002 | Webhook endpoint rate limit       | Valider 10 req/min limit          | Valid webhook signature      | 1. Send 11 webhooks indenfor 1 min            | 11th returns 429        | 11 requests                  | ✅ Ja          | Kritisk   | [rateLimit.test.ts](../apps/vault-api/__tests__/rateLimit.test.ts)         |
| RATE-003 | Rate limit headers                | Valider X-RateLimit-* headers     | API key                      | 1. Send request, check response headers        | Headers present         | Single request               | ✅ Ja          | Høj       | [rateLimit.test.ts](../apps/vault-api/__tests__/rateLimit.test.ts)         |
| RATE-004 | Per-IP isolation                  | Valider rate limits er per-IP     | API key, 2 different IPs     | 1. IP1 sends 100, IP2 sends 1                  | IP2 not blocked         | Multiple IPs                 | ✅ Ja          | Høj       | [rateLimit.test.ts](../apps/vault-api/__tests__/rateLimit.test.ts)         |
| RATE-005 | Reset after window expires        | Valider auto-reset                | API key, wait 15+ min        | 1. Trigger rate limit, wait, retry             | New requests allowed    | Time-based test              | ✅ Ja          | Høj       | [rateLimit.test.ts](../apps/vault-api/__tests__/rateLimit.test.ts)         |
| RATE-006 | 429 error message                 | Valider error message format      | API key, trigger rate limit  | 1. Send 101st request                          | Error with retry-after  | Rate limited request         | ✅ Ja          | Medium    | [rateLimit.test.ts](../apps/vault-api/__tests__/rateLimit.test.test.ts)         |
| RATE-007 | MCP endpoint exemption            | Valider MCP ikke rate limited     | MCP session                  | 1. Send 200 MCP requests                       | All succeed             | MCP requests                 | ✅ Ja          | Høj       | [rateLimit.test.ts](../apps/vault-api/__tests__/rateLimit.test.ts)         |
| RATE-008 | Health check exemption            | Valider health ikke rate limited  | None                         | 1. Send 1000 health check requests             | All return 200          | Health checks                | ✅ Ja          | Medium    | [rateLimit.test.ts](../apps/vault-api/__tests__/rateLimit.test.ts)         |
| RATE-009 | Heavy load stress test            | Valider under ekstrem load        | API key, 500+ concurrent req | 1. Send 500 concurrent requests                | Rate limiting works     | Heavy load                   | ✅ Ja          | Høj       | [03-performance-test.mjs](../test-scenarios/03-performance-test.mjs)       |

---

## 5. GitHub Synkronisering

**Dækker**: Repository sync, binary file filtering, incremental updates, error recovery

**Implementeret i**: Integration scenarios, manual testing

| ID       | Use Case                          | Testformål                        | Forudsætninger               | Testtrin                                       | Forventet resultat      | Input                        | Automatiserbar | Prioritet | Link                                                                        |
|----------|-----------------------------------|-----------------------------------|------------------------------|------------------------------------------------|-------------------------|------------------------------|----------------|-----------|-----------------------------------------------------------------------------|
| SYNC-001 | Full repository sync              | Valider initial sync              | GitHub token, valid repo     | 1. Trigger sync for new repository             | All files synced        | New repository               | ✅ Ja          | Kritisk   | TBD                                                                         |
| SYNC-002 | Binary file filtering             | Valider binaries ikke synced      | Repo med .png, .jpg          | 1. Sync repository                             | Only text files synced  | Binary files                 | ✅ Ja          | Kritisk   | TBD                                                                         |
| SYNC-003 | Incremental sync                  | Valider kun nye/ændrede filer     | Already synced repo          | 1. Modify 1 file, trigger sync                 | Only 1 file updated     | Changed files                | ✅ Ja          | Høj       | TBD                                                                         |
| SYNC-004 | SHA comparison                    | Valider SHA-based change detection| Synced repo                  | 1. Re-sync without changes                     | No redundant updates    | Unchanged files              | ✅ Ja          | Høj       | TBD                                                                         |
| SYNC-005 | Invalid GitHub token              | Valider error handling            | Invalid/expired token        | 1. Trigger sync with bad token                 | Error logged, graceful  | Invalid token                | ✅ Ja          | Kritisk   | TBD                                                                         |
| SYNC-006 | Network timeout                   | Valider timeout handling          | Slow/unreliable connection   | 1. Sync during network issues                  | Retry + error log       | Network failure              | ❌ Nej         | Høj       | Manual testing                                                              |
| SYNC-007 | Large repository (1000+ files)    | Valider performance               | Large repo                   | 1. Sync large repository                       | Completes in <5 min     | Large repo                   | ✅ Ja          | Høj       | [03-performance-test.mjs](../test-scenarios/03-performance-test.mjs)       |
| SYNC-008 | Deleted file handling             | Valider file deletion sync        | Synced repo, delete 1 file   | 1. Delete file in GitHub, sync                 | File removed from DB    | Deleted files                | ✅ Ja          | Medium    | TBD                                                                         |
| SYNC-009 | UTF-8 encoding                    | Valider correct encoding          | Files med æøå, emoji         | 1. Sync files with special chars              | Correct encoding        | UTF-8 content                | ✅ Ja          | Høj       | TBD                                                                         |
| SYNC-010 | Sync status tracking              | Valider vault_sync_status opdatering | After sync                | 1. Check vault_sync_status table               | Correct status/timestamp| Sync metadata                | ✅ Ja          | Høj       | [04-data-integrity-test.mjs](../test-scenarios/04-data-integrity-test.mjs) |
| SYNC-011 | Concurrent sync prevention        | Valider ikke double-sync          | Trigger 2 syncs simultaneously | 1. Trigger 2 syncs for same repo             | Only 1 executes         | Concurrent triggers          | ❌ Nej         | Medium    | Manual testing                                                              |
| SYNC-012 | Error recovery                    | Valider partial failure handling  | Sync med 1 corrupted file    | 1. Sync with 1 bad file                        | Other files sync OK     | Partial failure              | ✅ Ja          | Høj       | TBD                                                                         |

---

## 6. Embedding Generation

**Dækker**: OpenAI API, vector storage, content truncation, batch processing

**Implementeret i**: Integration scenarios

| ID       | Use Case                          | Testformål                        | Forudsætninger               | Testtrin                                       | Forventet resultat      | Input                        | Automatiserbar | Prioritet | Link                                                                        |
|----------|-----------------------------------|-----------------------------------|------------------------------|------------------------------------------------|-------------------------|------------------------------|----------------|-----------|-----------------------------------------------------------------------------|
| EMB-001  | Generate embedding for document   | Valider OpenAI embedding          | OpenAI API key, document     | 1. Call indexDocument()                        | 1536-dim vector stored  | Text content                 | ✅ Ja          | Kritisk   | TBD                                                                         |
| EMB-002  | Content truncation                | Valider max length handling       | Document >8000 tokens        | 1. Index very long document                    | Content truncated       | Long text                    | ✅ Ja          | Høj       | TBD                                                                         |
| EMB-003  | OpenAI API error                  | Valider error handling            | Invalid API key              | 1. Attempt to generate embedding               | Error logged            | Invalid key                  | ✅ Ja          | Høj       | TBD                                                                         |
| EMB-004  | OpenAI rate limit                 | Valider retry logic               | Hit OpenAI rate limit        | 1. Generate many embeddings quickly            | Exponential backoff     | Rapid requests               | ✅ Ja          | Høj       | TBD                                                                         |
| EMB-005  | Batch embedding generation        | Valider bulk processing           | 100+ unindexed documents     | 1. Trigger batch indexing                      | All indexed efficiently | Batch processing             | ✅ Ja          | Høj       | TBD                                                                         |
| EMB-006  | Embedding vector dimensionality   | Valider correct dimensions        | Generated embedding          | 1. Check vector length                         | Exactly 1536 dimensions | Vector data                  | ✅ Ja          | Kritisk   | TBD                                                                         |
| EMB-007  | Re-indexing updated document      | Valider embedding update          | Existing embedding           | 1. Update document, re-index                   | Embedding updated       | Changed content              | ✅ Ja          | Medium    | TBD                                                                         |
| EMB-008  | Empty content handling            | Valider min length validation     | Document med ""              | 1. Attempt to index empty content              | Error or skip           | Empty string                 | ✅ Ja          | Medium    | TBD                                                                         |
| EMB-009  | Special characters in content     | Valider encoding handling         | Content med emoji, symbols   | 1. Index document with special chars           | Correct embedding       | Special chars                | ✅ Ja          | Medium    | TBD                                                                         |
| EMB-010  | Duplicate embedding prevention    | Valider upsert logic              | Same document indexed twice  | 1. Index document, then index again            | Single embedding in DB  | Duplicate requests           | ✅ Ja          | Høj       | [04-data-integrity-test.mjs](../test-scenarios/04-data-integrity-test.mjs) |

---

## 7. Database & Data Integritet

**Dækker**: Foreign keys, cascade delete, triggers, pgvector functions

**Implementeret i**: `packages/vault-core/__tests__/database.test.ts` (12 tests), integration scenarios

| ID       | Use Case                          | Testformål                        | Forudsætninger               | Testtrin                                       | Forventet resultat      | Input                        | Automatiserbar | Prioritet | Link                                                                        |
|----------|-----------------------------------|-----------------------------------|------------------------------|------------------------------------------------|-------------------------|------------------------------|----------------|-----------|-----------------------------------------------------------------------------|
| DB-001   | Foreign key constraint            | Valider FK integrity              | Database connection          | 1. Insert embedding without document           | Error: FK violation     | Invalid FK                   | ✅ Ja          | Kritisk   | [database.test.ts](../packages/vault-core/__tests__/database.test.ts)      |
| DB-002   | Cascade delete                    | Valider ON DELETE CASCADE         | Document med embedding       | 1. Delete document                             | Embedding auto-deleted  | Delete operation             | ✅ Ja          | Kritisk   | [database.test.ts](../packages/vault-core/__tests__/database.test.ts)      |
| DB-003   | Unique constraint violation       | Valider unique (source, repo, path)| Existing document           | 1. Insert duplicate document                   | Error: unique violation | Duplicate insert             | ✅ Ja          | Kritisk   | [database.test.ts](../packages/vault-core/__tests__/database.test.ts)      |
| DB-004   | updated_at trigger                | Valider auto-update timestamp     | Existing document            | 1. Update document content                     | updated_at changes      | Update operation             | ✅ Ja          | Høj       | [database.test.ts](../packages/vault-core/__tests__/database.test.ts)      |
| DB-005   | Cosine similarity calculation     | Valider pgvector distance         | 2 embeddings                 | 1. Call match_documents()                      | Correct similarity score| Vector comparison            | ✅ Ja          | Kritisk   | [database.test.ts](../packages/vault-core/__tests__/database.test.ts)      |
| DB-006   | match_documents function          | Valider search function           | Indexed documents            | 1. Call match_documents with query vector      | Relevant results        | Query vector                 | ✅ Ja          | Kritisk   | [database.test.ts](../packages/vault-core/__tests__/database.test.ts)      |
| DB-007   | Repository filter in search       | Valider filter parameter          | Multi-repo data              | 1. Call match_documents with filter_repository | Only filtered results   | Repository filter            | ✅ Ja          | Høj       | [database.test.ts](../packages/vault-core/__tests__/database.test.ts)      |
| DB-008   | Threshold filter in search        | Valider match_threshold           | Indexed documents            | 1. Call with threshold=0.9                     | Only high-similarity    | High threshold               | ✅ Ja          | Høj       | [database.test.ts](../packages/vault-core/__tests__/database.test.ts)      |
| DB-009   | NULL metadata handling            | Valider NULL metadata field       | Document uden metadata       | 1. Insert document with NULL metadata          | Accepts NULL            | NULL value                   | ✅ Ja          | Medium    | [database.test.ts](../packages/vault-core/__tests__/database.test.ts)      |
| DB-010   | Transaction rollback              | Valider rollback on error         | Failed operation             | 1. Start transaction, cause error              | Rollback successful     | Error scenario               | ✅ Ja          | Høj       | TBD                                                                         |
| DB-011   | Connection pool exhaustion        | Valider pool management           | 100+ concurrent queries      | 1. Execute many concurrent queries             | No connection errors    | High concurrency             | ✅ Ja          | Høj       | [03-performance-test.mjs](../test-scenarios/03-performance-test.mjs)       |
| DB-012   | Migration idempotency             | Valider re-run migrations         | Existing schema              | 1. Run migrations twice                        | No errors, idempotent   | Migration scripts            | ❌ Nej         | Høj       | Manual testing                                                              |

---

## 8. System Status & Monitoring

**Dækker**: Health check, sync status, metrics, logging

**Implementeret i**: `apps/vault-api/__tests__/api.test.ts` (3 tests), integration scenarios

| ID       | Use Case                          | Testformål                        | Forudsætninger               | Testtrin                                       | Forventet resultat      | Input                        | Automatiserbar | Prioritet | Link                                                                        |
|----------|-----------------------------------|-----------------------------------|------------------------------|------------------------------------------------|-------------------------|------------------------------|----------------|-----------|-----------------------------------------------------------------------------|
| MON-001  | Health check endpoint             | Valider /health response          | Running server               | 1. GET /health                                 | 200 OK with status      | None                         | ✅ Ja          | Kritisk   | [api.test.ts](../apps/vault-api/__tests__/api.test.ts)                     |
| MON-002  | Database connection in health     | Valider DB connectivity check     | DB connection                | 1. GET /health                                 | Includes DB status      | None                         | ✅ Ja          | Høj       | [api.test.ts](../apps/vault-api/__tests__/api.test.ts)                     |
| MON-003  | Sync status endpoint              | Valider GET /api/sync-status      | API key, synced repos        | 1. GET /api/sync-status                        | 200 OK with repo status | API key                      | ✅ Ja          | Høj       | [api.test.ts](../apps/vault-api/__tests__/api.test.ts)                     |
| MON-004  | Structured logging                | Valider Pino JSON logs            | Running server               | 1. Trigger action, check logs                  | JSON formatted logs     | Any action                   | ❌ Nej         | Medium    | Manual log inspection                                                       |
| MON-005  | Error logging                     | Valider error stack traces        | Cause error                  | 1. Trigger error, check logs                   | Full stack trace logged | Error scenario               | ❌ Nej         | Høj       | Manual testing                                                              |
| MON-006  | Performance metrics               | Valider response time tracking    | API key                      | 1. Send request, check logs                    | Response time logged    | Any request                  | ❌ Nej         | Medium    | Manual log inspection                                                       |
| MON-007  | Health check performance          | Valider <1ms response time        | Running server               | 1. GET /health 100 times                       | Avg <1ms                | Multiple requests            | ✅ Ja          | Høj       | [03-performance-test.mjs](../test-scenarios/03-performance-test.mjs)       |

---

## 9. CORS & Security Headers

**Dækker**: CORS policy, Helmet security headers, CSP

**Implementeret i**: `apps/vault-api/__tests__/cors.test.ts` (13 tests)

| ID       | Use Case                          | Testformål                        | Forudsætninger               | Testtrin                                       | Forventet resultat      | Input                        | Automatiserbar | Prioritet | Link                                                                        |
|----------|-----------------------------------|-----------------------------------|------------------------------|------------------------------------------------|-------------------------|------------------------------|----------------|-----------|-----------------------------------------------------------------------------|
| CORS-001 | Allowed origin access             | Valider CORS for allowed origins  | ALLOWED_ORIGINS configured   | 1. Send request with allowed origin            | 200 OK + CORS headers   | Allowed origin               | ✅ Ja          | Kritisk   | [cors.test.ts](../apps/vault-api/__tests__/cors.test.ts)                   |
| CORS-002 | Block unknown origin              | Afvis ukendte origins             | ALLOWED_ORIGINS configured   | 1. Send request with unknown origin            | CORS error              | Unknown origin               | ✅ Ja          | Kritisk   | [cors.test.ts](../apps/vault-api/__tests__/cors.test.ts)                   |
| CORS-003 | Preflight OPTIONS request         | Valider OPTIONS response          | API endpoint                 | 1. Send OPTIONS request                        | 200 OK + Access-Control | OPTIONS method               | ✅ Ja          | Høj       | [cors.test.ts](../apps/vault-api/__tests__/cors.test.ts)                   |
| CORS-004 | Exposed headers                   | Valider Mcp-Session-Id exposed    | MCP endpoint                 | 1. Check Access-Control-Expose-Headers         | Mcp-Session-Id exposed  | MCP request                  | ✅ Ja          | Høj       | [cors.test.ts](../apps/vault-api/__tests__/cors.test.ts)                   |
| CORS-005 | Helmet security headers           | Valider Helmet middleware         | Any endpoint                 | 1. Send request, check response headers        | Security headers present| Any request                  | ✅ Ja          | Høj       | [cors.test.ts](../apps/vault-api/__tests__/cors.test.ts)                   |
| CORS-006 | HSTS header                       | Valider Strict-Transport-Security | Any endpoint                 | 1. Check Strict-Transport-Security header      | max-age=15552000        | Any request                  | ✅ Ja          | Høj       | [cors.test.ts](../apps/vault-api/__tests__/cors.test.ts)                   |
| CORS-007 | Content-Security-Policy           | Valider CSP header                | Any endpoint                 | 1. Check Content-Security-Policy header        | default-src 'self'      | Any request                  | ✅ Ja          | Medium    | [cors.test.ts](../apps/vault-api/__tests__/cors.test.ts)                   |
| CORS-008 | X-Content-Type-Options            | Valider nosniff header            | Any endpoint                 | 1. Check X-Content-Type-Options                | nosniff                 | Any request                  | ✅ Ja          | Medium    | [cors.test.ts](../apps/vault-api/__tests__/cors.test.ts)                   |
| CORS-009 | X-Frame-Options                   | Valider clickjacking protection   | Any endpoint                 | 1. Check X-Frame-Options header                | SAMEORIGIN              | Any request                  | ✅ Ja          | Medium    | [cors.test.ts](../apps/vault-api/__tests__/cors.test.ts)                   |

---

## 10. Performance & Skalérbarhed

**Dækker**: Response times, concurrent users, memory usage, database performance

**Implementeret i**: `test-scenarios/03-performance-test.mjs`

| ID       | Use Case                          | Testformål                        | Forudsætninger               | Testtrin                                       | Forventet resultat      | Input                        | Automatiserbar | Prioritet | Link                                                                        |
|----------|-----------------------------------|-----------------------------------|------------------------------|------------------------------------------------|-------------------------|------------------------------|----------------|-----------|-----------------------------------------------------------------------------|
| PERF-001 | Search endpoint latency           | Valider <100ms avg response       | API key, indexed documents   | 1. Send 100 search requests                    | Avg <100ms              | 100 requests                 | ✅ Ja          | Kritisk   | [03-performance-test.mjs](../test-scenarios/03-performance-test.mjs)       |
| PERF-002 | Concurrent users (100)            | Valider concurrent handling       | API key                      | 1. Simulate 100 concurrent users               | All succeed, no errors  | 100 concurrent users         | ✅ Ja          | Høj       | [03-performance-test.mjs](../test-scenarios/03-performance-test.mjs)       |
| PERF-003 | Large result set                  | Valider pagination/limit          | API key, 1000+ documents     | 1. Search with limit=100                       | Returns 100, no timeout | Large dataset                | ✅ Ja          | Høj       | [03-performance-test.mjs](../test-scenarios/03-performance-test.mjs)       |
| PERF-004 | Memory leak test                  | Valider memory stability          | Running server               | 1. Run 10k requests, monitor memory            | Memory stable           | Sustained load               | ❌ Nej         | Høj       | Manual monitoring                                                           |
| PERF-005 | Database query optimization       | Valider index usage               | Indexed documents            | 1. EXPLAIN search query                        | Uses IVFFlat index      | Query plan analysis          | ❌ Nej         | Høj       | Manual SQL analysis                                                         |
| PERF-006 | Cold start performance            | Valider first request latency     | Server just started          | 1. Send first request after restart            | <500ms                  | Cold start                   | ❌ Nej         | Medium    | Manual testing                                                              |
| PERF-007 | Embedding generation throughput   | Valider batch indexing speed      | 1000 unindexed documents     | 1. Trigger batch indexing                      | >10 docs/sec            | Bulk indexing                | ✅ Ja          | Høj       | [03-performance-test.mjs](../test-scenarios/03-performance-test.mjs)       |
| PERF-008 | GitHub sync performance           | Valider sync time                 | Large repository (1000+ files)| 1. Full sync                                  | <5 minutes              | Large repo                   | ✅ Ja          | Høj       | [03-performance-test.mjs](../test-scenarios/03-performance-test.mjs)       |

---

## 11. Integration Tests

**Dækker**: End-to-end workflows, multi-component interactions

**Implementeret i**: `test-scenarios/*.mjs` (6 scenarios)

| ID       | Use Case                          | Testformål                        | Forudsætninger               | Testtrin                                       | Forventet resultat      | Input                        | Automatiserbar | Prioritet | Link                                                                        |
|----------|-----------------------------------|-----------------------------------|------------------------------|------------------------------------------------|-------------------------|------------------------------|----------------|-----------|-----------------------------------------------------------------------------|
| INT-001  | End-to-end search quality         | Valider search relevance          | Synced repos, API key        | 1. Run search quality test                     | High relevance scores   | Natural queries              | ✅ Ja          | Kritisk   | [01-search-quality-test.mjs](../test-scenarios/01-search-quality-test.mjs) |
| INT-002  | Edge cases coverage               | Valider edge case handling        | API key                      | 1. Run edge cases test                         | All handled gracefully  | Edge case inputs             | ✅ Ja          | Kritisk   | [02-edge-cases-test.mjs](../test-scenarios/02-edge-cases-test.mjs)         |
| INT-003  | Performance under load            | Valider system under stress       | API key                      | 1. Run performance test                        | Meets perf targets      | Heavy load                   | ✅ Ja          | Høj       | [03-performance-test.mjs](../test-scenarios/03-performance-test.mjs)       |
| INT-004  | Data integrity end-to-end         | Valider data consistency          | Synced repos                 | 1. Run data integrity test                     | No data corruption      | Full workflow                | ✅ Ja          | Kritisk   | [04-data-integrity-test.mjs](../test-scenarios/04-data-integrity-test.mjs) |
| INT-005  | MCP integration                   | Valider MCP protocol              | MCP endpoint                 | 1. Run MCP integration test                    | All MCP tools work      | MCP requests                 | ✅ Ja          | Høj       | [05-mcp-integration-test.mjs](../test-scenarios/05-mcp-integration-test.mjs)|
| INT-006  | Quick smoke test                  | Valider basic functionality       | API key                      | 1. Run quick test                              | All basic ops work      | Quick test                   | ✅ Ja          | Kritisk   | [quick-test.mjs](../test-scenarios/quick-test.mjs)                         |
| INT-007  | GitHub webhook → sync → search    | Valider full pipeline             | Webhook configured           | 1. Push to GitHub, wait, search new content    | New content searchable  | End-to-end flow              | ❌ Nej         | Høj       | Manual testing                                                              |
| INT-008  | ChatGPT MCP integration           | Valider ChatGPT kan søge          | ChatGPT configured           | 1. Ask ChatGPT to search TekupVault            | Relevant results        | ChatGPT query                | ❌ Nej         | Høj       | Manual testing                                                              |

---

## 12. Regression Tests

**Dækker**: Sikring af at nye ændringer ikke bryder eksisterende funktionalitet

**Implementeret i**: CI/CD pipeline (planned)

| ID       | Use Case                          | Testformål                        | Forudsætninger               | Testtrin                                       | Forventet resultat      | Input                        | Automatiserbar | Prioritet | Link                                                                        |
|----------|-----------------------------------|-----------------------------------|------------------------------|------------------------------------------------|-------------------------|------------------------------|----------------|-----------|-----------------------------------------------------------------------------|
| REG-001  | API backward compatibility        | Valider API ikke bryder           | Existing API contracts       | 1. Run all API tests                           | All tests pass          | Regression suite             | ✅ Ja          | Kritisk   | CI/CD pipeline                                                              |
| REG-002  | Database migration safety         | Valider migrations ikke bryder    | Existing data                | 1. Apply new migration, run tests              | Data intact             | Migration scripts            | ✅ Ja          | Kritisk   | CI/CD pipeline                                                              |
| REG-003  | Search result consistency         | Valider search results uændrede   | Known search queries         | 1. Run known queries, compare results          | Consistent results      | Baseline queries             | ✅ Ja          | Høj       | Regression test suite                                                       |
| REG-004  | Performance regression            | Valider performance ikke forværres| Performance baselines        | 1. Run perf tests, compare to baseline         | No degradation          | Perf benchmarks              | ✅ Ja          | Høj       | CI/CD pipeline                                                              |
| REG-005  | MCP protocol compliance           | Valider MCP spec ikke bryder      | MCP spec version             | 1. Run MCP integration tests                   | All tests pass          | MCP test suite               | ✅ Ja          | Høj       | CI/CD pipeline                                                              |

---

## 13. Error Handling & Recovery

**Dækker**: Graceful degradation, error messages, retry logic

**Implementeret in**: Various unit tests, integration scenarios

| ID       | Use Case                          | Testformål                        | Forudsætninger               | Testtrin                                       | Forventet resultat      | Input                        | Automatiserbar | Prioritet | Link                                                                        |
|----------|-----------------------------------|-----------------------------------|------------------------------|------------------------------------------------|-------------------------|------------------------------|----------------|-----------|-----------------------------------------------------------------------------|
| ERR-001  | Invalid JSON request              | Valider JSON parse error          | API endpoint                 | 1. POST invalid JSON                           | 400 Bad Request         | Malformed JSON               | ✅ Ja          | Høj       | [02-edge-cases-test.mjs](../test-scenarios/02-edge-cases-test.mjs)         |
| ERR-002  | Missing required fields           | Valider validation error          | API endpoint                 | 1. POST without required field                 | 400 Bad Request         | Missing "query"              | ✅ Ja          | Høj       | [02-edge-cases-test.mjs](../test-scenarios/02-edge-cases-test.mjs)         |
| ERR-003  | Database connection failure       | Valider graceful degradation      | DB offline                   | 1. Stop DB, send request                       | 500 with retry message  | DB unavailable               | ❌ Nej         | Kritisk   | Manual testing                                                              |
| ERR-004  | OpenAI API error                  | Valider OpenAI error handling     | Invalid OpenAI key           | 1. Trigger embedding generation                | Error logged, retries   | OpenAI error                 | ✅ Ja          | Høj       | TBD                                                                         |
| ERR-005  | GitHub API rate limit             | Valider retry with backoff        | Hit GitHub rate limit        | 1. Sync during rate limit                      | Exponential backoff     | Rate limit error             | ❌ Nej         | Høj       | Manual testing                                                              |
| ERR-006  | Partial sync failure              | Valider partial failure handling  | 1 file fails to sync         | 1. Sync with 1 corrupted file                  | Other files sync OK     | Partial failure              | ✅ Ja          | Høj       | TBD                                                                         |
| ERR-007  | Timeout handling                  | Valider request timeout           | Very slow query              | 1. Execute query that takes >30s               | 504 Gateway Timeout     | Slow query                   | ❌ Nej         | Medium    | Manual testing                                                              |
| ERR-008  | Error message clarity             | Valider error messages er klare   | Various error scenarios      | 1. Trigger errors, check messages              | Clear, actionable msgs  | Various errors               | ❌ Nej         | Medium    | Manual review                                                               |
| ERR-009  | Unhandled exception catching      | Valider global error handler      | Throw unexpected error       | 1. Trigger uncaught exception                  | 500, error logged       | Unexpected error             | ✅ Ja          | Kritisk   | TBD                                                                         |

---

## 14. Test Data Management

**Dækker**: Test fixtures, mocking, data cleanup, anonymization

**Implementeret in**: Test setup/teardown

| ID       | Use Case                          | Testformål                        | Forudsætninger               | Testtrin                                       | Forventet resultat      | Input                        | Automatiserbar | Prioritet | Link                                                                        |
|----------|-----------------------------------|-----------------------------------|------------------------------|------------------------------------------------|-------------------------|------------------------------|----------------|-----------|-----------------------------------------------------------------------------|
| DATA-001 | Test fixture setup                | Valider test data creation        | Test database                | 1. Run test suite                              | Fixtures created        | Test fixtures                | ✅ Ja          | Høj       | Vitest setup files                                                          |
| DATA-002 | Test data cleanup                 | Valider cleanup efter tests       | Test database                | 1. Run tests, check DB after                   | No leftover data        | Cleanup logic                | ✅ Ja          | Høj       | Vitest teardown                                                             |
| DATA-003 | Mock external APIs                | Valider mocking                   | OpenAI, GitHub API calls     | 1. Run tests without real API calls            | All tests use mocks     | Mock implementations         | ✅ Ja          | Kritisk   | Vitest vi.fn()                                                              |
| DATA-004 | Anonymized production data        | Valider data anonymization        | Production DB snapshot       | 1. Export, anonymize, import                   | PII removed             | Anonymization script         | ❌ Nej         | Medium    | Manual process                                                              |
| DATA-005 | Test database isolation           | Valider tests ikke påvirker prod  | Separate test DB             | 1. Run all tests                               | Prod DB unchanged       | Test DB config               | ✅ Ja          | Kritisk   | Environment config                                                          |
| DATA-006 | Seed data consistency             | Valider deterministiske seeds     | Seed script                  | 1. Run seed twice                              | Identical data          | Seed script                  | ✅ Ja          | Medium    | Database seeds                                                              |

---

## 🔄 Test Execution Workflow

### Lokal Udvikling

```bash
# Run unit tests
pnpm test

# Run specific test file
pnpm test apps/vault-api/__tests__/auth.test.ts

# Run integration tests
cd test-scenarios
node quick-test.mjs              # Quick smoke test
node run-all-tests.mjs           # Full integration suite
```

### CI/CD Pipeline (GitHub Actions)

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm lint

  unit-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: ankane/pgvector:latest
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test

  integration-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests]
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - run: cd test-scenarios && node run-all-tests.mjs

  performance-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests]
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - run: cd test-scenarios && node 03-performance-test.mjs

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit
```

---

## 📊 Success Criteria

### Per Kategori

| Kategori | Success Criteria |
|----------|------------------|
| **API Auth** | 100% of auth tests pass, no bypass possible |
| **Semantic Search** | Avg relevance score >0.8, <100ms response time |
| **Webhooks** | 100% signature validation, no false positives |
| **Rate Limiting** | 100% enforcement, no false 429s |
| **GitHub Sync** | 100% text files synced, 0% binary files |
| **Embeddings** | 100% valid 1536-dim vectors, <2s per doc |
| **Database** | 100% integrity constraints enforced |
| **Monitoring** | <1ms health check, <100ms sync status |
| **CORS** | 100% security headers present |
| **Performance** | <100ms search, <5min large repo sync |
| **Integration** | 100% end-to-end workflows successful |
| **Regression** | 0 broken tests after changes |
| **Error Handling** | 100% graceful error handling |
| **Test Data** | 100% cleanup, no data leaks |

---

## 🚀 CI/CD Integration

### Deployment Gating Criteria

**Block deployment if**:
- Any **Kritisk** priority test fails
- Code coverage drops below 80%
- Performance regression >20%
- Security vulnerabilities (HIGH/CRITICAL)
- Linter errors exist

**Warn but allow deployment if**:
- **Høj** priority test fails (manual review required)
- Code coverage drops <10%
- Performance regression <20%
- **Medium** priority manual tests not executed

### Badge/Status Indicators

Add to `README.md`:

```markdown
![Tests](https://img.shields.io/badge/Tests-77%20Passing-success)
![Coverage](https://img.shields.io/badge/Coverage-85%25-success)
![Integration](https://img.shields.io/badge/Integration-6%20Passing-success)
```

---

## 🔄 PR Flow for Test Updates

### When Adding New Features

1. **Write tests first** (TDD approach)
2. Add test cases to relevant category in this document
3. Implement feature
4. Ensure all new tests pass
5. Update success criteria if needed
6. Link test files in this document

### When Fixing Bugs

1. **Write failing test** that reproduces bug
2. Add test case to regression category
3. Fix bug
4. Ensure test now passes
5. Update this document with test case ID

### When Updating Tests

1. Update test case entry in this document
2. Update test file
3. Run full test suite
4. Update `Link` column if test moved
5. Commit both code and documentation together

---

## 📝 Test Rapporterings-Templates

### Daily Test Report

```markdown
# Test Report - 2025-10-17

## Summary
- **Unit Tests**: 77/77 passing ✅
- **Integration Tests**: 6/6 passing ✅
- **Manual Tests**: 5/12 executed
- **Coverage**: 85%

## Failed Tests
_None_

## Skipped Tests
- SYNC-006 (Network timeout - manual)
- SYNC-011 (Concurrent sync - manual)
- ...

## Performance Metrics
- Search latency: 87ms (target <100ms) ✅
- Health check: 0.8ms (target <1ms) ✅
- Large repo sync: 4m 23s (target <5min) ✅

## Action Items
_None_
```

### PR Test Report

```markdown
# PR #42 Test Report

## Changes
- Added new MCP tool: `fetch`
- Updated search response format

## Test Impact
- **New Tests**: 8
- **Modified Tests**: 3
- **Deleted Tests**: 0
- **Total Passing**: 85/85 ✅

## Regression Check
- All existing tests pass ✅
- Performance impact: +2ms (acceptable)
- Coverage change: +1.5%

## Manual Testing Required
- [ ] Test ChatGPT integration with new `fetch` tool
- [ ] Verify MCP discovery lists 6 tools

## Approval
✅ Ready to merge
```

---

## 📚 Nyttige Links

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Guide](https://github.com/ladjs/supertest)
- [GitHub Webhooks](https://docs.github.com/en/webhooks)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [pgvector Guide](https://github.com/pgvector/pgvector)
- [MCP Specification](https://modelcontextprotocol.io)

---

**Genereret**: 2025-10-17  
**Vedligeholdes af**: Tekup Portfolio  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
