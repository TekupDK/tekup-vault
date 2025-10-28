import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

describe('loadConfig', () => {
  it('throws when required env vars are missing', () => {
    const original = { ...process.env };
    try {
      process.env = {} as any;
      expect(() => loadConfig()).toThrowError();
    } finally {
      process.env = original;
    }
  });

  it('parses env when provided', () => {
    const original = { ...process.env };
    try {
      process.env = {
        DATABASE_URL: 'https://example.com',
        SUPABASE_URL: 'https://example.com',
        SUPABASE_ANON_KEY: 'anon',
        SUPABASE_SERVICE_KEY: 'service',
        GITHUB_TOKEN: 'ghp',
        OPENAI_API_KEY: 'sk',
        PORT: '3000',
        NODE_ENV: 'test',
        LOG_LEVEL: 'info'
      } as any;
      const cfg = loadConfig();
      expect(cfg.NODE_ENV).toBe('test');
      expect(cfg.PORT).toBe(3000);
    } finally {
      process.env = original;
    }
  });
});


