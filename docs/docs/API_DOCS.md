# TekupVault API Documentation (Brief)

## Authentication

- Header: `X-API-Key: <your_api_key>` required for protected endpoints

## Endpoints

### GET /health
- Description: Health check
- Auth: Not required
- Response: `{ status, timestamp, service }`

### POST /api/search
- Description: Semantic search over indexed documents
- Auth: Required (`X-API-Key`)
- Request (JSON):
  - `query` (string, required)
  - `limit` (number, optional, default 10, max 100)
  - `threshold` (number, optional, 0..1, default 0.7)
  - `source` (enum: github|supabase|render|copilot, optional)
  - `repository` (string `owner/repo`, optional)
- Responses:
  - 200: `{ success: true, results: [...], count }`
  - 400: `{ success: false, error }`
  - 401: `{ error: 'Unauthorized' }`
  - 503: `{ success: false, error: 'Service temporarily unavailable' }`

### GET /api/sync-status
- Description: Returns sync status for repositories
- Auth: Not required (read-only)
- Responses:
  - 200: `{ success: true, items: [...] }`
  - 503: `{ success: false, error: 'Service temporarily unavailable' }`

### POST /webhook/github
- Description: GitHub webhook receiver
- Auth: HMAC-SHA256 signature (`X-Hub-Signature-256`)
- Responses:
  - 202: `{ message: 'Webhook received' }`
  - 401: `{ error: 'Missing signature' | 'Invalid signature' }`

## Rate Limits
- `/api/search`: 100 requests per 15 minutes per IP
- `/webhook/*`: 10 requests per minute per IP

## CORS
- Allowed origins controlled by `ALLOWED_ORIGINS`

## Notes
- All responses are JSON
- Errors in production hide internal details
