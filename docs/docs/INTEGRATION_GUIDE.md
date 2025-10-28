# TekupVault MCP Integration Guide

**Version:** 0.1.0  
**Protocol:** MCP 2025-03-26 (Streamable HTTP Transport)  
**Last Updated:** January 16, 2025

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Integration Methods](#integration-methods)
  - [ChatGPT Custom Actions](#chatgpt-custom-actions)
  - [Claude Desktop](#claude-desktop)
  - [Cursor IDE](#cursor-ide)
- [Available Tools](#available-tools)
- [Example Prompts](#example-prompts)
- [Troubleshooting](#troubleshooting)

---

## Overview

TekupVault exposes a **Model Context Protocol (MCP) HTTP server** that enables AI applications to search your consolidated documentation, code, and knowledge base using semantic search.

### What is MCP?

MCP (Model Context Protocol) is a standardized protocol that allows AI apps like ChatGPT, Claude, and Cursor to call external tools and access custom data sources. Think of it as an API designed specifically for AI assistants.

### Key Features

✅ **Semantic Search** - Natural language queries across all your docs  
✅ **Source Filtering** - Filter by repository, source type, or file path  
✅ **No Authentication Required** - MCP endpoint is public for easy AI integration  
✅ **Real-time Sync Status** - Check when repositories were last synced  
✅ **Metadata-Rich Results** - Get file paths, repositories, similarity scores

---

## Quick Start

### Prerequisites

1. **TekupVault API Running**
   ```bash
   # Development
   pnpm dev
   
   # Production
   pnpm start
   ```

2. **Verify MCP Endpoint**
   ```bash
   curl http://localhost:3001/.well-known/mcp.json
   ```

   Expected response:
   ```json
   {
     "version": "2025-03-26",
     "name": "TekupVault MCP Server",
     "endpoints": {
       "mcp": {
         "url": "/mcp",
         "transport": "streamable-http",
         "methods": ["POST", "GET", "DELETE"]
       }
     },
     "capabilities": {
       "tools": true
     }
   }
   ```

---

## Integration Methods

### ChatGPT Custom Actions

ChatGPT Plus/Pro users can add TekupVault as a custom action.

#### Setup Steps

1. **Open ChatGPT Settings**
   - Go to ChatGPT → Settings → Actions
   - Click "Create New Action"

2. **Configure Action**
   - **Name:** TekupVault Knowledge Search
   - **Description:** Search Tekup Portfolio documentation and code
   - **Schema Type:** OpenAPI 3.1.0
   - **Import Schema:** Use `integration-examples/chatgpt-action.json`

3. **Set Base URL**
   - **Development:** `http://localhost:3001`
   - **Production:** `https://tekupvault.onrender.com` (or your deployed URL)

4. **Authentication**
   - Select "None" (MCP endpoint is public)

5. **Test the Action**
   ```
   Search TekupVault for "how to deploy to Render.com"
   ```

#### Example ChatGPT Integration File

See `integration-examples/chatgpt-action.json` for the complete OpenAPI schema.

---

### Claude Desktop

Claude Desktop supports MCP servers via configuration file.

#### Setup Steps

1. **Locate Claude Config**
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux:** `~/.config/Claude/claude_desktop_config.json`

2. **Add TekupVault Server**
   ```json
   {
     "mcpServers": {
       "tekupvault": {
         "url": "http://localhost:3001/mcp",
         "transport": "streamable-http",
         "version": "2025-03-26"
       }
     }
   }
   ```

3. **Restart Claude Desktop**

4. **Verify Integration**
   - Open Claude Desktop
   - Type: "List available tools"
   - You should see `search_knowledge`, `get_sync_status`, etc.

5. **Test Search**
   ```
   Search my knowledge base for "GitHub sync configuration"
   ```

#### Example Claude Config File

See `integration-examples/claude-config.json` for the complete configuration.

---

### Cursor IDE

Cursor IDE can integrate with MCP servers as context providers.

#### Setup Steps

1. **Open Cursor Settings**
   - `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS)
   - Navigate to "MCP Servers"

2. **Add TekupVault**
   ```json
   {
     "tekupvault": {
       "url": "http://localhost:3001/mcp",
       "description": "TekupVault knowledge search",
       "enabled": true
     }
   }
   ```

3. **Use in Cursor Chat**
   ```
   @tekupvault search for "React component patterns in renos-frontend"
   ```

---

## Available Tools

### 1. `search_knowledge`

**Search TekupVault using semantic search**

**Parameters:**
- `query` (required): Natural language search query
- `limit` (optional): Max results (1-100, default: 10)
- `threshold` (optional): Similarity threshold (0-1, default: 0.7)
- `source` (optional): Filter by source (`github`, `supabase`, `render`, `copilot`)
- `repository` (optional): Filter by repo (`owner/repo` format)

**Example:**
```json
{
  "query": "How to setup PostgreSQL migrations",
  "limit": 5,
  "threshold": 0.75,
  "repository": "JonasAbde/renos-backend"
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "doc-123",
      "source": "github",
      "repository": "JonasAbde/renos-backend",
      "path": "prisma/migrations/README.md",
      "content": "# Database Migrations\n\nTo create a new migration...",
      "similarity": 0.89,
      "metadata": {
        "language": "markdown",
        "size": 1234
      }
    }
  ],
  "count": 1,
  "query": "How to setup PostgreSQL migrations"
}
```

---

### 2. `get_sync_status`

**Get synchronization status for all repositories**

**Parameters:** None

**Example:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "repositories": [
    {
      "repository": "JonasAbde/renos-backend",
      "source": "github",
      "lastSyncedAt": "2025-01-16T10:30:00Z",
      "documentCount": 245,
      "status": "synced"
    }
  ],
  "totalRepositories": 3,
  "totalDocuments": 687,
  "lastGlobalSync": "2025-01-16T10:30:00Z"
}
```

---

### 3. `list_repositories`

**List all configured repositories**

**Parameters:** None

**Example:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "repositories": [
    {
      "owner": "JonasAbde",
      "repo": "renos-backend",
      "fullName": "JonasAbde/renos-backend"
    },
    {
      "owner": "JonasAbde",
      "repo": "renos-frontend",
      "fullName": "JonasAbde/renos-frontend"
    }
  ],
  "count": 3
}
```

---

### 4. `get_repository_info`

**Get detailed repository information**

**Parameters:**
- `repository` (required): Repository identifier (`owner/repo`)

**Example:**
```json
{
  "repository": "JonasAbde/renos-backend"
}
```

**Response:**
```json
{
  "success": true,
  "repository": "JonasAbde/renos-backend",
  "info": {
    "documentCount": 245,
    "lastSyncedAt": "2025-01-16T10:30:00Z",
    "fileTypes": [
      { "extension": "ts", "count": 120 },
      { "extension": "md", "count": 45 },
      { "extension": "json", "count": 30 }
    ],
    "totalSize": 2456789
  }
}
```

---

## Example Prompts

### General Knowledge Search

```
"Search for documentation about deploying to Render.com"
"Find all TypeScript examples in renos-frontend"
"Show me how to configure Supabase authentication"
"What are the environment variables needed for the API?"
```

### Filtered Searches

```
"Search renos-backend for Prisma migration guides"
"Find all React components in renos-frontend"
"Show me Billy integration documentation"
```

### Repository Management

```
"What repositories are configured in TekupVault?"
"When was renos-backend last synced?"
"Get sync status for all repositories"
"Show me detailed info about Tekup-Billy repository"
```

### Code-Specific Queries

```
"Find examples of async/await usage in our backend"
"Show me how we handle authentication errors"
"What's the structure of our database schema?"
"Find all API routes related to billing"
```

---

## Troubleshooting

### Common Issues

#### 1. "Connection refused" or "Cannot reach server"

**Solution:**
- Verify TekupVault API is running: `curl http://localhost:3001/health`
- Check the port number (default: 3001, configurable via `PORT` env var)
- Ensure firewall allows connections on the port

#### 2. "No results found" for valid queries

**Possible causes:**
- Documents haven't been indexed yet (embeddings not generated)
- Sync hasn't run (repositories not yet synced)
- Threshold too high (try lowering to 0.5-0.6)

**Solution:**
```bash
# Check sync status
curl http://localhost:3001/api/sync-status

# Manually trigger sync (if worker isn't running)
# Start the worker:
pnpm --filter @tekupvault/vault-worker start
```

#### 3. "Tool not found" in AI app

**Solution:**
- Verify MCP discovery endpoint: `curl http://localhost:3001/.well-known/mcp.json`
- Restart the AI application (Claude Desktop, Cursor, etc.)
- Check AI app's MCP configuration file

#### 4. Search returns irrelevant results

**Solution:**
- Increase `threshold` parameter (e.g., 0.8 or 0.9)
- Use more specific queries
- Filter by `repository` or `source`
- Check that correct repositories are synced

#### 5. ChatGPT action shows "Schema validation error"

**Solution:**
- Ensure `chatgpt-action.json` is valid OpenAPI 3.1.0
- Check that base URL is correct and accessible
- Verify MCP endpoint returns valid JSON-RPC responses

---

## Advanced Usage

### Custom Queries with Filters

Combine multiple filters for precise results:

```json
{
  "query": "authentication middleware",
  "limit": 3,
  "threshold": 0.8,
  "source": "github",
  "repository": "JonasAbde/renos-backend"
}
```

### Chaining Tool Calls

Use multiple tools in sequence:

1. List repositories → Get specific repo info → Search within that repo
2. Check sync status → Search if recently synced
3. Search → Get repo info to understand context

### Performance Tips

- **Lower threshold** (0.5-0.6) for exploratory searches
- **Higher threshold** (0.8-0.9) for precise matches
- **Limit results** to 5-10 for faster responses
- **Filter by repository** when you know the source

---

## Support & Feedback

- **GitHub Issues:** [TekupVault Issues](https://github.com/JonasAbde/TekupVault/issues)
- **Documentation:** [TekupVault README](https://github.com/JonasAbde/TekupVault)
- **API Docs:** [API_DOCS.md](./API_DOCS.md)

---

**Built with ❤️ by Tekup Portfolio**  
**Powered by MCP Protocol 2025-03-26**

