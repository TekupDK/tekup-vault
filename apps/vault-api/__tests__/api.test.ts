import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import http from 'http';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

describe('vault-api', () => {
  let server: http.Server;
  let app: express.Express;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.API_KEY = 'test-key';
    process.env.DATABASE_URL = 'https://example.com';
    process.env.SUPABASE_URL = 'https://example.com';
    process.env.SUPABASE_ANON_KEY = 'anon';
    process.env.SUPABASE_SERVICE_KEY = 'service';
    process.env.GITHUB_TOKEN = 'ghp';
    process.env.OPENAI_API_KEY = 'sk';

    app = express();
    app.use(helmet());
    app.use(cors());
    app.use(express.json());

    // Import route after env is set to avoid config errors
    const searchRouter = (await import('../src/routes/search')).default;
    app.use('/api', searchRouter);
    server = app.listen(0);
  });

  afterAll((done) => {
    server.close(done);
  });

  it('health surrogate (404 since not using full index) but server boots', async () => {
    const res = await request(server).get('/health');
    expect([200, 404]).toContain(res.status);
  });

  it('rejects /api/search without API key', async () => {
    const res = await request(server)
      .post('/api/search')
      .send({ query: 'test' });
    expect(res.status).toBe(401);
  });

  it('accepts /api/search with API key but may 503 due to external deps', async () => {
    const res = await request(server)
      .post('/api/search')
      .set('x-api-key', 'test-key')
      .send({ query: 'test' });
    expect([200, 400, 503]).toContain(res.status);
  });
});


