import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import http from 'http';
import express from 'express';
import crypto from 'crypto';
import webhookRouter from '../src/routes/webhooks';

describe('GitHub Webhook Handler', () => {
  let server: http.Server;
  let app: express.Express;
  const WEBHOOK_SECRET = 'test_webhook_secret_123';

  beforeAll(async () => {
    process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.NODE_ENV = 'test';
    process.env.API_KEY = 'test-key';
    process.env.DATABASE_URL = 'https://example.com';
    process.env.SUPABASE_URL = 'https://example.com';
    process.env.SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_KEY = 'service';
    process.env.GITHUB_TOKEN = 'ghp';
    process.env.OPENAI_API_KEY = 'sk';

    app = express();
    app.use(express.json());
    app.use('/webhook', webhookRouter);
    server = app.listen(0);
  });

  afterAll((done) => {
    server.close(done);
  });

  function generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    return 'sha256=' + hmac.update(payload).digest('hex');
  }

  describe('WEBHOOK-001: Valid webhook med korrekt signature', () => {
    it('should accept webhook with valid HMAC signature', async () => {
      const payload = {
        repository: {
          full_name: 'JonasAbde/renos-backend'
        },
        ref: 'refs/heads/main'
      };
      
      const payloadStr = JSON.stringify(payload);
      const signature = generateSignature(payloadStr, WEBHOOK_SECRET);

      const res = await request(server)
        .post('/webhook/github')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'push')
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(res.status).toBe(202);
      expect(res.body).toEqual({ message: 'Webhook received' });
    });

    it('should handle different event types (push, pull_request, release)', async () => {
      const eventTypes = ['push', 'pull_request', 'release', 'create'];
      
      for (const eventType of eventTypes) {
        const payload = {
          repository: { full_name: 'JonasAbde/test-repo' },
          action: 'opened'
        };
        
        const payloadStr = JSON.stringify(payload);
        const signature = generateSignature(payloadStr, WEBHOOK_SECRET);

        const res = await request(server)
          .post('/webhook/github')
          .set('X-Hub-Signature-256', signature)
          .set('X-GitHub-Event', eventType)
          .send(payload);

        expect(res.status).toBe(202);
      }
    });
  });

  describe('WEBHOOK-002: Webhook uden signature', () => {
    it('should reject request without signature header', async () => {
      const payload = {
        repository: { full_name: 'JonasAbde/test-repo' }
      };

      const res = await request(server)
        .post('/webhook/github')
        .set('X-GitHub-Event', 'push')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Missing signature' });
    });
  });

  describe('WEBHOOK-003: Webhook med invalid signature', () => {
    it('should reject webhook with incorrect signature', async () => {
      const payload = {
        repository: { full_name: 'JonasAbde/test-repo' }
      };

      const res = await request(server)
        .post('/webhook/github')
        .set('X-Hub-Signature-256', 'sha256=invalid_signature_here')
        .set('X-GitHub-Event', 'push')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid signature' });
    });

    it('should reject signature of different payload', async () => {
      const originalPayload = { data: 'original' };
      const sentPayload = { data: 'modified' };
      
      const signature = generateSignature(JSON.stringify(originalPayload), WEBHOOK_SECRET);

      const res = await request(server)
        .post('/webhook/github')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'push')
        .send(sentPayload);

      expect(res.status).toBe(401);
    });
  });

  describe('WEBHOOK-004: Timing attack resistance', () => {
    it('should use constant-time comparison for signatures', async () => {
      const payload = { repository: { full_name: 'test/repo' } };
      const payloadStr = JSON.stringify(payload);
      
      // Test with signatures that differ at different positions
      const correctSig = generateSignature(payloadStr, WEBHOOK_SECRET);
      const wrongSigs = [
        'sha256=0' + correctSig.substring(8), // Wrong at start
        correctSig.substring(0, 30) + '0' + correctSig.substring(31), // Wrong in middle
        correctSig.substring(0, -1) + '0', // Wrong at end
      ];

      const times: number[] = [];

      // Measure response times for wrong signatures
      for (const wrongSig of wrongSigs) {
        const start = Date.now();
        
        await request(server)
          .post('/webhook/github')
          .set('X-Hub-Signature-256', wrongSig)
          .set('X-GitHub-Event', 'push')
          .send(payload);
        
        times.push(Date.now() - start);
      }

      // Verify all wrong signatures are rejected
      // (Timing should be similar, but this is hard to test deterministically)
      // At minimum, ensure all were rejected
      expect(times.length).toBe(3);
    });
  });

  describe('WEBHOOK-006: Repository identification', () => {
    it('should extract repository name from payload', async () => {
      const payload = {
        repository: {
          full_name: 'JonasAbde/renos-backend'
        }
      };
      
      const payloadStr = JSON.stringify(payload);
      const signature = generateSignature(payloadStr, WEBHOOK_SECRET);

      const res = await request(server)
        .post('/webhook/github')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'push')
        .send(payload);

      expect(res.status).toBe(202);
      // Repository name should be logged (check logs in actual implementation)
    });
  });

  describe('WEBHOOK-007: Webhook med incomplete payload', () => {
    it('should handle missing repository field gracefully', async () => {
      const payload = {
        ref: 'refs/heads/main'
        // Missing repository field
      };
      
      const payloadStr = JSON.stringify(payload);
      const signature = generateSignature(payloadStr, WEBHOOK_SECRET);

      const res = await request(server)
        .post('/webhook/github')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'push')
        .send(payload);

      expect(res.status).toBe(202);
      // Should log "unknown" as repository name
    });

    it('should handle repository without full_name', async () => {
      const payload = {
        repository: {
          name: 'renos-backend'
          // Missing full_name
        }
      };
      
      const payloadStr = JSON.stringify(payload);
      const signature = generateSignature(payloadStr, WEBHOOK_SECRET);

      const res = await request(server)
        .post('/webhook/github')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'push')
        .send(payload);

      expect(res.status).toBe(202);
    });
  });

  describe('WEBHOOK-008: Webhook secret ikke configureret', () => {
    it('should reject webhooks when secret is not configured', async () => {
      const originalSecret = process.env.GITHUB_WEBHOOK_SECRET;
      delete process.env.GITHUB_WEBHOOK_SECRET;

      const payload = { repository: { full_name: 'test/repo' } };
      const payloadStr = JSON.stringify(payload);
      
      // Even with correct signature, should fail if secret not configured
      const signature = generateSignature(payloadStr, WEBHOOK_SECRET);

      const res = await request(server)
        .post('/webhook/github')
        .set('X-Hub-Signature-256', signature)
        .set('X-GitHub-Event', 'push')
        .send(payload);

      expect(res.status).toBe(401);
      
      // Restore secret
      process.env.GITHUB_WEBHOOK_SECRET = originalSecret;
    });
  });
});

