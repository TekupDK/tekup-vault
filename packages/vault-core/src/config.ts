import { z } from 'zod';

/**
 * Environment configuration schema
 */
const ConfigSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Supabase
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_KEY: z.string().min(1).optional(),
  
  // GitHub
  GITHUB_TOKEN: z.string().min(1).optional(),
  GITHUB_WEBHOOK_SECRET: z.string().min(1).optional(),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1).optional(),
  
  // Server
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // API Security
  // Optional here so non-API services (e.g., worker) don't fail to boot if not set
  API_KEY: z.string().min(1).optional(),

  // CORS
  // Comma-separated whitelist of allowed origins
  ALLOWED_ORIGINS: z.string().optional(),

  // Error Tracking
  SENTRY_DSN: z.string().url().optional()
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  try {
    return ConfigSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(e => e.path.join('.')).join(', ');
      throw new Error(`Missing or invalid environment variables: ${missingVars}`);
    }
    throw error;
  }
}

/**
 * GitHub sync configuration
 * Active Tekup Portfolio repositories (updated 2025-10-18)
 */
export const GITHUB_REPOS: Array<{ owner: string; repo: string }> = [
  // Core Production Systems (High Priority)
  { owner: 'JonasAbde', repo: 'Tekup-Billy' },          // Billy.dk MCP Server - Pushed 2025-10-18
  { owner: 'JonasAbde', repo: 'renos-backend' },        // RenOS Backend API - Pushed 2025-10-15
  { owner: 'JonasAbde', repo: 'renos-frontend' },       // RenOS Frontend - Pushed 2025-10-17
  { owner: 'JonasAbde', repo: 'TekupVault' },           // Central Knowledge Layer - Pushed 2025-10-17
  
  // Documentation & Configuration
  { owner: 'JonasAbde', repo: 'tekup-unified-docs' },   // Unified Documentation - Pushed 2025-10-17
  { owner: 'JonasAbde', repo: 'tekup-ai-assistant' },   // AI Assistant Integration - Pushed 2025-10-16
  
  // Active Development
  { owner: 'JonasAbde', repo: 'tekup-cloud-dashboard' }, // Cloud Dashboard - Pushed 2025-10-16
  { owner: 'JonasAbde', repo: 'tekup-renos' },          // RenOS Main System - Pushed 2025-10-08
  { owner: 'JonasAbde', repo: 'tekup-renos-dashboard' }, // RenOS Dashboard - Pushed 2025-09-30
  { owner: 'JonasAbde', repo: 'Tekup-org' },            // Tekup Organization Monorepo - Pushed 2025-09-19
  { owner: 'JonasAbde', repo: 'Cleaning-og-Service' },  // Cleaning & Service System - Pushed 2025-09-18
  { owner: 'JonasAbde', repo: 'tekup-nexus-dashboard' }, // Nexus Dashboard - Pushed 2025-09-12
  
  // Public/Open Source Projects
  { owner: 'JonasAbde', repo: 'rendetalje-os' },        // Professional Cleaning Management System
  { owner: 'JonasAbde', repo: 'Jarvis-lite' },          // AI Assistant Educational Project
];

/**
 * File filtering configuration
 */
export const BINARY_FILE_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'svg',
  'pdf', 'zip', 'tar', 'gz', 'rar', '7z',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'mp3', 'mp4', 'avi', 'mov', 'wmv',
  'exe', 'dll', 'so', 'dylib',
  'bin', 'dat', 'db', 'sqlite'
];

/**
 * OpenAI embedding configuration
 */
export const EMBEDDING_CONFIG = {
  model: 'text-embedding-3-small',
  dimensions: 1536,
  maxTokens: 8000,
  maxCharsBeforeTruncation: 8000
};

/**
 * Sync configuration
 */
export const SYNC_CONFIG = {
  intervalHours: 6,
  batchSize: 10,
  maxRetries: 3,
  retryDelayMs: 1000
};
