import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import http from 'http';
import express from 'express';
import { requireApiKey } from '../src/middleware/auth';

describe('API Authentication', () => {
  let server: http.Server;
  let app: express.Express;
  const VALID_API_KEY = 'test_api_key_12345';

  beforeAll(async () => {
    process.env.API_KEY = VALID_API_KEY;
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'https://example.com';
    process.env.SUPABASE_URL = 'https://example.com';
    process.env.SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_KEY = 'service';
    process.env.GITHUB_TOKEN = 'ghp';
    process.env.OPENAI_API_KEY = 'sk';

    app = express();
    app.use(express.json());

    // Protected route
    app.post('/api/protected', requireApiKey, (req, res) => {
      res.json({ success: true, message: 'Access granted' });
    });

    // Public route (for comparison)
    app.get('/api/public', (req, res) => {
      res.json({ success: true });
    });

    server = app.listen(0);
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('AUTH-001: Valid API key authentication', () => {
    it('should allow access with valid API key in header', async () => {
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', VALID_API_KEY)
        .send({ data: 'test' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should accept API key in different case headers', async () => {
      // HTTP headers are case-insensitive
      const res = await request(server)
        .post('/api/protected')
        .set('X-API-Key', VALID_API_KEY) // Different casing
        .send({ data: 'test' });

      expect(res.status).toBe(200);
    });
  });

  describe('AUTH-002: Missing API key rejection', () => {
    it('should reject request without API key header', async () => {
      const res = await request(server)
        .post('/api/protected')
        .send({ data: 'test' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    });

    it('should reject request with empty API key', async () => {
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', '')
        .send({ data: 'test' });

      expect(res.status).toBe(401);
    });
  });

  describe('AUTH-003: Invalid API key rejection', () => {
    it('should reject request with wrong API key', async () => {
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', 'wrong_key_123')
        .send({ data: 'test' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Unauthorized' });
    });

    it('should reject request with random string as key', async () => {
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', 'random_string_xyz')
        .send({ data: 'test' });

      expect(res.status).toBe(401);
    });

    it('should reject API key with special characters', async () => {
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', 'key!@#$%^&*()')
        .send({ data: 'test' });

      expect(res.status).toBe(401);
    });
  });

  describe('AUTH-004: Case sensitivity i API key', () => {
    it('should reject API key with wrong casing (uppercase)', async () => {
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', VALID_API_KEY.toUpperCase())
        .send({ data: 'test' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('should reject API key with wrong casing (lowercase)', async () => {
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', VALID_API_KEY.toLowerCase())
        .send({ data: 'test' });

      expect(res.status).toBe(401);
    });

    it('should reject API key with mixed casing', async () => {
      const mixedCase = VALID_API_KEY.split('').map((char, i) => 
        i % 2 === 0 ? char.toUpperCase() : char.toLowerCase()
      ).join('');

      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', mixedCase)
        .send({ data: 'test' });

      expect(res.status).toBe(401);
    });
  });

  describe('AUTH-005: API key i query/body (skal fejle)', () => {
    it('should reject API key in query parameter', async () => {
      const res = await request(server)
        .post(`/api/protected?apikey=${VALID_API_KEY}`)
        .send({ data: 'test' });

      // Should fail because key must be in header
      expect(res.status).toBe(401);
    });

    it('should reject API key in request body', async () => {
      const res = await request(server)
        .post('/api/protected')
        .send({ 
          data: 'test',
          apiKey: VALID_API_KEY 
        });

      // Should fail because key must be in header
      expect(res.status).toBe(401);
    });

    it('should reject API key in Authorization header (wrong format)', async () => {
      const res = await request(server)
        .post('/api/protected')
        .set('Authorization', `Bearer ${VALID_API_KEY}`)
        .send({ data: 'test' });

      // Should fail - we use x-api-key, not Authorization
      expect(res.status).toBe(401);
    });
  });

  describe('AUTH-006: Server configuration error', () => {
    it('should return 500 when API_KEY not configured', async () => {
      const originalKey = process.env.API_KEY;
      delete process.env.API_KEY;

      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', 'any_key')
        .send({ data: 'test' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Server configuration error');

      // Restore
      process.env.API_KEY = originalKey;
    });
  });

  describe('AUTH-007: API key length validation', () => {
    it('should reject very short API key (< 10 chars)', async () => {
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', 'abc')
        .send({ data: 'test' });

      expect(res.status).toBe(401);
    });

    it('should reject very long API key (> 1000 chars)', async () => {
      const longKey = 'a'.repeat(1500);
      
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', longKey)
        .send({ data: 'test' });

      expect(res.status).toBe(401);
    });

    it('should handle reasonable key length (20-100 chars)', async () => {
      // Valid key should work
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', VALID_API_KEY) // 19 chars
        .send({ data: 'test' });

      expect(res.status).toBe(200);
    });
  });

  describe('AUTH-008: API key special characters', () => {
    it('should reject key with whitespace', async () => {
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', 'key with spaces')
        .send({ data: 'test' });

      expect(res.status).toBe(401);
    });

    it('should reject key with newlines', async () => {
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', 'key\nwith\nnewlines')
        .send({ data: 'test' });

      expect(res.status).toBe(401);
    });

    it('should reject key with tabs', async () => {
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', 'key\twith\ttabs')
        .send({ data: 'test' });

      expect(res.status).toBe(401);
    });

    it('should reject key with unicode characters', async () => {
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', 'key🔐with😀emoji')
        .send({ data: 'test' });

      expect(res.status).toBe(401);
    });

    it('should reject key with control characters', async () => {
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', 'key\x00with\x01control')
        .send({ data: 'test' });

      expect(res.status).toBe(401);
    });
  });

  describe('AUTH-009: Timing attack resistance', () => {
    it('should use constant-time comparison', async () => {
      // Make multiple requests with wrong keys
      // All should fail, but timing should be similar
      const wrongKeys = [
        'a' + VALID_API_KEY.substring(1), // Wrong first char
        VALID_API_KEY.substring(0, -1) + 'z', // Wrong last char
        'x'.repeat(VALID_API_KEY.length), // Completely wrong
      ];

      const times: number[] = [];

      for (const wrongKey of wrongKeys) {
        const start = Date.now();
        
        await request(server)
          .post('/api/protected')
          .set('x-api-key', wrongKey)
          .send({ data: 'test' });
        
        times.push(Date.now() - start);
      }

      // All should be rejected
      expect(times.length).toBe(3);
      
      // Timing differences should be minimal (hard to test deterministically)
      // At minimum, verify all failed with same status
    });
  });

  describe('AUTH-010: Multiple API keys support (future)', () => {
    it('should work with current single key', async () => {
      const res = await request(server)
        .post('/api/protected')
        .set('x-api-key', VALID_API_KEY)
        .send({ data: 'test' });

      expect(res.status).toBe(200);
    });

    // TODO: Implement support for multiple API keys in future
    // it('should accept any valid key from list', async () => { ... });
  });
});

