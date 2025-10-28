# TekupVault - ChatGPT Custom GPT Configuration

## 📋 Custom GPT Setup Guide

### Step 1: Create Custom GPT

1. Gå til [https://chat.openai.com/gpts/editor](https://chat.openai.com/gpts/editor)
2. Klik **"Create a GPT"**
3. Navngiv den: **"TekupVault Search"**

---

### Step 2: Instructions (Instruktioner)

Kopier denne tekst til **"Instructions"** feltet:

```
Du er en specialist i at søge i Tekup Portfolio's knowledge base.

Du har adgang til TekupVault API via custom actions - en semantisk søgemaskine der indekserer:
- renos-backend (TypeScript backend, Prisma, PostgreSQL)
- renos-frontend (React 18, Vite, Tailwind)
- Tekup-Billy (MCP server for Billy.dk)

Når brugeren spørger om noget der kunne være i kodebasen (authentication, API design, database schema, komponenter, osv.), skal du ALTID:

1. Kalde searchKnowledge action med relevant søgequery
2. Analysere de returnerede code snippets
3. Give et præcist svar med file path references
4. Foreslå relevante follow-up spørgsmål

Svar på dansk, vær teknisk præcis, og inkluder altid fil stier i dine svar.
```

---

### Step 3: Conversation Starters (Samtale Starters)

Tilføj disse 4 starters:

```
1. "Hvordan er authentication implementeret i renos-backend?"
2. "Vis mig database schema for vault_documents"
3. "Hvilke React komponenter findes i renos-frontend?"
4. "Søg efter OpenAI integration kode"
```

---

### Step 4: Knowledge (Upload fil)

Upload denne fil fra projektet:

```
CHATGPT_KNOWLEDGE_BASE.md
```

**Eller** upload disse 5 filer:
1. `README.md`
2. `docs/FINAL_STATUS_2025-10-17.md`
3. `docs/API_DOCS.md`
4. `docs/ARCHITECTURE.md`
5. `docs/TEST_CASES.md`

---

### Step 5: Actions (Tilføj API Action)

**Klik "Create new action"** og indsæt denne OpenAPI spec:

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "TekupVault Search API",
    "version": "1.0.0",
    "description": "Semantic search across Tekup Portfolio repositories"
  },
  "servers": [
    {
      "url": "https://tekupvault.onrender.com"
    }
  ],
  "paths": {
    "/api/search": {
      "post": {
        "operationId": "searchKnowledge",
        "summary": "Search knowledge base with semantic search",
        "description": "Search across all Tekup Portfolio code and documentation using OpenAI embeddings",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "query": {
                    "type": "string",
                    "description": "Search query (e.g. 'authentication', 'database schema', 'React components')"
                  },
                  "limit": {
                    "type": "integer",
                    "description": "Maximum number of results to return",
                    "default": 10,
                    "minimum": 1,
                    "maximum": 50
                  },
                  "threshold": {
                    "type": "number",
                    "description": "Similarity threshold (0-1, default 0.7)",
                    "default": 0.7,
                    "minimum": 0,
                    "maximum": 1
                  },
                  "repository": {
                    "type": "string",
                    "description": "Optional: filter by repository (e.g. 'JonasAbde/renos-backend')"
                  }
                },
                "required": ["query"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful search",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "document": {
                            "type": "object",
                            "properties": {
                              "id": { "type": "string" },
                              "source": { "type": "string" },
                              "repository": { "type": "string" },
                              "path": { "type": "string" },
                              "content": { "type": "string" },
                              "similarity": { "type": "number" }
                            }
                          }
                        }
                      }
                    },
                    "count": {
                      "type": "integer"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized - missing or invalid API key"
          },
          "429": {
            "description": "Rate limit exceeded"
          },
          "500": {
            "description": "Server error"
          }
        },
        "security": [
          {
            "ApiKeyAuth": []
          }
        ]
      }
    },
    "/api/sync-status": {
      "get": {
        "operationId": "getSyncStatus",
        "summary": "Get repository sync status",
        "description": "Check the synchronization status of all repositories",
        "responses": {
          "200": {
            "description": "Sync status retrieved",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": { "type": "boolean" },
                    "items": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "repository": { "type": "string" },
                          "status": { "type": "string" },
                          "last_sync_at": { "type": "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key"
      }
    }
  }
}
```

---

### Step 6: Authentication (API Key)

Efter du har tilføjet Action, skal du konfigurere authentication:

1. ChatGPT vil spørge: **"Authentication"**
2. Vælg **"API Key"**
3. **Authentication Type**: `Custom`
4. **Custom Header Name**: `X-API-Key`
5. **API Key**: Gå til Render.com → Environment Variables → Klik øjet ved `API_KEY` → Kopier værdien → Indsæt her

---

### Step 7: Test og Gem

1. Klik **"Test"** for at verificere API kaldet virker
2. Klik **"Update"** for at gemme Custom GPT
3. **Privacy**: Vælg "Only me" (privat)

---

## 🎯 Brug af Custom GPT

Nu kan du chatte med din Custom GPT og spørge:

**Eksempel queries**:
```
"Søg efter authentication kode i renos-backend"
"Hvordan fungerer database migrations?"
"Hvilke API endpoints findes i vault-api?"
"Vis mig React komponenter til forms"
```

---

## 🔐 Sikkerhed

- ✅ API key gemmes sikkert af OpenAI
- ✅ Kun du har adgang til denne Custom GPT
- ✅ Rate limiting (100 req/15min) beskytter dit API
- ✅ HTTPS encryption på alle kald

---

## 📊 Fordele ved Custom GPT vs MCP

| Feature | Custom GPT | MCP Server |
|---------|-----------|------------|
| Setup | ⭐⭐⭐⭐⭐ Nemt | ⭐⭐ Komplekst |
| Stabilitet | ⭐⭐⭐⭐⭐ Meget stabil | ⭐⭐⭐ Beta-fase |
| API Key Support | ✅ Fuldt understøttet | ⚠️ Begrænset |
| Custom Instructions | ✅ Ja | ❌ Nej |
| Knowledge Upload | ✅ Ja | ❌ Nej |
| Conversation Starters | ✅ Ja | ❌ Nej |

---

**Anbefaling**: Brug Custom GPT - det er mere stabilt og feature-rigt! 🚀

