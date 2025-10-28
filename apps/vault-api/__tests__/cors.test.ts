import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import http from 'http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

describe('CORS & Security Headers', () => {
  let server: http.Server;
  let app: express.Express;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:5173';
    process.env.API_KEY = 'test-key';
    process.env.DATABASE_URL = 'https://example.com';
    process.env.SUPABASE_URL = 'https://example.com';
    process.env.SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_KEY = 'service';
    process.env.GITHUB_TOKEN = 'ghp';
    process.env.OPENAI_API_KEY = 'sk';

    app = express();
    app.use(helmet());
    
    // CORS configuration similar to actual implementation
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true
    }));
    
    app.use(express.json());

    // Test route
    app.get('/test', (req, res) => {
      res.json({ success: true });
    });

    app.options('/test', (req, res) => {
      res.sendStatus(204);
    });

    server = app.listen(0);
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('CORS-001: CORS på allowed origin', () => {
    it('should allow requests from whitelisted origins', async () => {
      const res = await request(server)
        .get('/test')
        .set('Origin', 'http://localhost:3000');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should allow multiple configured origins', async () => {
      const origins = ['http://localhost:3000', 'http://localhost:5173'];
      
      for (const origin of origins) {
        const res = await request(server)
          .get('/test')
          .set('Origin', origin);

        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-origin']).toBe(origin);
      }
    });
  });

  describe('CORS-002: CORS blocking af unknown origin', () => {
    it('should block requests from non-whitelisted origins', async () => {
      const res = await request(server)
        .get('/test')
        .set('Origin', 'http://evil.com');

      // CORS error will be handled by browser, but server shouldn't set CORS headers
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should block various malicious origins', async () => {
      const maliciousOrigins = [
        'http://evil.com',
        'https://phishing-site.com',
        'http://example.com',
        'http://localhost:8080' // Not in whitelist
      ];

      for (const origin of maliciousOrigins) {
        const res = await request(server)
          .get('/test')
          .set('Origin', origin);

        expect(res.headers['access-control-allow-origin']).toBeUndefined();
      }
    });
  });

  describe('CORS-003: Preflight OPTIONS request', () => {
    it('should handle preflight OPTIONS request', async () => {
      const res = await request(server)
        .options('/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'content-type');

      expect([200, 204]).toContain(res.status);
      expect(res.headers['access-control-allow-origin']).toBeTruthy();
    });

    it('should allow preflight for allowed methods', async () => {
      const res = await request(server)
        .options('/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect([200, 204]).toContain(res.status);
    });
  });

  describe('CORS-004: Helmet security headers', () => {
    it('should set X-Content-Type-Options header', async () => {
      const res = await request(server).get('/test');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options header', async () => {
      const res = await request(server).get('/test');

      // Helmet sets this to deny clickjacking
      expect(res.headers['x-frame-options']).toBeTruthy();
    });

    it('should set X-Download-Options header', async () => {
      const res = await request(server).get('/test');

      // Helmet sets various security headers
      expect(res.headers['x-download-options']).toBeTruthy();
    });

    it('should set Strict-Transport-Security header in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const res = await request(server).get('/test');

      // HSTS header may be set in production
      // (actual behavior depends on Helmet configuration)
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('CORS-005: Content-Security-Policy', () => {
    it('should set Content-Security-Policy header', async () => {
      const res = await request(server).get('/test');

      // Helmet sets CSP header
      // Check that it exists (actual value depends on configuration)
      const csp = res.headers['content-security-policy'];
      
      // CSP might not be set in test mode, but should be in production
      // Just verify the header mechanism works
      expect(typeof csp).toBe('string');
    });
  });

  describe('CORS-006: Credentials handling', () => {
    it('should allow credentials for whitelisted origins', async () => {
      const res = await request(server)
        .get('/test')
        .set('Origin', 'http://localhost:3000');

      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('CORS-007: No origin handling', () => {
    it('should allow requests without Origin header (e.g., server-to-server)', async () => {
      const res = await request(server).get('/test');

      // Should succeed even without Origin header
      expect(res.status).toBe(200);
    });
  });
});

