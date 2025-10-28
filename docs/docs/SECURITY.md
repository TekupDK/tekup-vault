# Security Policy

## Reporting a Vulnerability

If you discover a vulnerability, report it privately:
- Email: jonas@tekup.dk

We aim to triage within 48 hours.

## Operational Security

- Secrets via environment variables only
- `.env` files are gitignored
- HTTPS enforced by Render
- GitHub webhooks use HMAC-SHA256 verification
- `/api/search` requires `X-API-Key`
- Rate limiting on `/api/search` and `/webhook/*`

## Hardening Guidelines

- Restrict CORS via `ALLOWED_ORIGINS`
- Rotate API keys regularly
- Use strong, unique secrets
- Enable RLS in Supabase and write policies
- Monitor logs for anomalies

## Disclosure Policy

Do not publicly disclose vulnerabilities until a fix is deployed.
