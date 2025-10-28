import 'dotenv/config';
import * as Sentry from '@sentry/node';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { loadConfig } from '@tekupvault/vault-core';
import { logger } from './lib/logger';
import searchRouter from './routes/search';
import webhooksRouter from './routes/webhooks';
import syncRouter from './routes/sync';
import debugRouter from './routes/debug';
import { searchLimiter, webhookLimiter } from './middleware/rateLimit';
import { handleMcpPost, handleMcpGet, handleMcpDelete } from './mcp/mcp-transport';

const config = loadConfig();

// Initialize Sentry if DSN is configured
if (config.SENTRY_DSN) {
  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.NODE_ENV,
    tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
  logger.info('Sentry error tracking initialized');
}

const app = express();

// Trust proxy for Render.com (Cloudflare CDN)
app.set('trust proxy', 1);

// Sentry request handler must be the first middleware
if (config.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Security middleware
// Disable CSP for MCP endpoints and .well-known
app.use(helmet({
  contentSecurityPolicy: false
}));

// CORS with whitelist
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: (_origin, callback) => {
    if (!allowedOrigins.length) {
      // Default allow localhost in dev if not configured
      callback(null, true);
      return;
    }
    if (!_origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.includes(_origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'Mcp-Session-Id', 'Accept', 'Origin', 'User-Agent'],
  exposedHeaders: ['Mcp-Session-Id']
}));

// Logging middleware
app.use(pinoHttp({ logger }));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    service: 'TekupVault API',
    version: '0.1.0',
    status: 'ok',
    endpoints: {
      health: '/health',
      mcp: '/mcp',
      mcpDiscovery: '/.well-known/mcp.json',
      api: '/api',
      documentation: 'https://github.com/JonasAbde/TekupVault'
    }
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'vault-api'
  });
});

// MCP Discovery endpoint
app.get('/.well-known/mcp.json', (_req, res) => {
  res.json({
    version: '2025-03-26',
    name: 'TekupVault MCP Server',
    description: 'Model Context Protocol server for TekupVault - semantic search across documentation, code, logs, and AI outputs',
    vendor: {
      name: 'Tekup Portfolio',
      url: 'https://tekup.dk'
    },
    endpoints: {
      mcp: {
        url: '/mcp',
        transport: 'streamable-http',
        methods: ['POST', 'GET', 'DELETE'],
        authentication: {
          type: 'none',
          note: 'MCP endpoint is public. Use /api endpoints for authenticated REST API.'
        }
      },
      health: {
        url: '/health',
        method: 'GET'
      }
    },
    capabilities: {
      tools: true,
      resources: false,
      prompts: false,
      sampling: false
    },
    protocolVersions: ['2024-11-05', '2025-03-26', '2025-06-18'],
    contact: {
      url: 'https://github.com/JonasAbde/TekupVault'
    }
  });
});

// MCP Streamable HTTP Transport endpoints (NO authentication required)
app.post('/mcp', handleMcpPost);
app.get('/mcp', handleMcpGet);
app.delete('/mcp', handleMcpDelete);

// Rate limits
app.use('/api/search', searchLimiter);
app.use('/webhook', webhookLimiter);

// API routes
app.use('/api', searchRouter);
app.use('/api', syncRouter);
app.use('/api', debugRouter);
app.use('/webhook', webhooksRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Sentry error handler must be before other error handlers
if (config.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  
  // Capture error in Sentry if configured
  if (config.SENTRY_DSN) {
    Sentry.captureException(err);
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = config.PORT || 3000;
app.listen(PORT, () => {
  logger.info({ port: PORT, env: config.NODE_ENV }, 'Vault API server started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
