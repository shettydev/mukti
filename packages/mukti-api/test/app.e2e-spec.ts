import type { INestApplication } from '@nestjs/common';

import { getConnectionToken } from '@nestjs/mongoose';
import { mkdtempSync, rmSync } from 'fs';
import { type Connection } from 'mongoose';
import { tmpdir } from 'os';
import { join } from 'path';
import * as request from 'supertest';

/**
 * Boots the real API the way `npx muktiai` does (`startApi`, local mode, an
 * embedded MongoDB, no Redis) and drives it over HTTP. These checks cover the
 * whole wiring: module graph, global guard and interceptor, bootstrap
 * middleware, and the architecture fixes that cross module boundaries.
 */
describe('API (e2e, local mode)', () => {
  jest.setTimeout(120_000);

  const env = { ...process.env };
  let app: INestApplication;
  let dbPath: string;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    dbPath = mkdtempSync(join(tmpdir(), 'mukti-e2e-'));
    process.env.MUKTI_LOCAL = '1';
    process.env.MUKTI_LOCAL_DB_PATH = dbPath;
    delete process.env.MUKTI_LOCAL_MONGO_URI;
    process.env.NODE_ENV = 'test';
    process.env.FRONTEND_URL = 'http://localhost:3001';
    delete process.env.CORS_ORIGINS;
    // Import after the env is set: module decorators (e.g. AuthModule's
    // isLocalMode() provider list) are evaluated at import time.
    const { startApi } = await import('../src/start');

    app = await startApi({ host: '127.0.0.1', port: 0 });
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app?.close();
    rmSync(dbPath, { force: true, recursive: true });
    process.env = env;
  });

  describe('bootstrap', () => {
    it('serves liveness under the versioned prefix', async () => {
      // Health routes skip the envelope so probes get a plain body.
      const res = await http.get('/api/v1/health/live').expect(200);
      expect(res.body).toEqual({ status: 'ok' });
    });

    it('reports MongoDB as up on readiness', async () => {
      const res = await http.get('/api/v1/health/ready').expect(200);
      expect(JSON.stringify(res.body)).toContain('"up"');
    });

    it('sends helmet security headers', async () => {
      const res = await http.get('/api/v1/health/live');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
      expect(res.headers['x-dns-prefetch-control']).toBeDefined();
    });

    it('allows the configured web origin with credentials and exposes the CSRF header', async () => {
      const res = await http
        .options('/api/v1/health/live')
        .set('Origin', 'http://localhost:3001')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect(res.headers['access-control-allow-origin']).toBe(
        'http://localhost:3001',
      );
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['access-control-allow-headers']).toContain(
        'Authorization',
      );
    });

    it('does not echo an unknown origin', async () => {
      const res = await http
        .get('/api/v1/health/live')
        .set('Origin', 'https://evil.example');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('wraps errors in the standard envelope', async () => {
      const res = await http.get('/api/v1/does-not-exist').expect(404);
      expect(res.body).toMatchObject({ success: false });
      expect(res.body.error).toBeDefined();
    });
  });

  describe('knowledge tracing (KnowledgeStateStore)', () => {
    const conceptId = 'e2e-recursion';

    it('creates on first observation and keeps the stored parameters after', async () => {
      const first = await http
        .post('/api/v1/knowledge-tracing/update')
        .send({ conceptId, correct: true, pInit: 0.5 })
        .expect(201);
      expect(first.body.data.state.attempts).toBe(1);
      expect(first.body.data.state.parameters.pInit).toBe(0.5);

      // Parameters only apply on creation; this pInit must be ignored.
      const second = await http
        .post('/api/v1/knowledge-tracing/update')
        .send({ conceptId, correct: true, pInit: 0.1 })
        .expect(201);
      expect(second.body.data.state.attempts).toBe(2);
      expect(second.body.data.state.parameters.pInit).toBe(0.5);
    });

    it('records every one of many concurrent observations on one concept', async () => {
      const concept = 'e2e-concurrent';
      const n = 12;

      const responses = await Promise.all(
        Array.from({ length: n }, (_, i) =>
          http
            .post('/api/v1/knowledge-tracing/update')
            .send({ conceptId: concept, correct: i % 2 === 0 }),
        ),
      );
      // Every writer must succeed, not just the ones that won a race.
      expect(responses.map((r) => r.status)).toEqual(Array(n).fill(201));

      // Read the record directly: no observation may be lost to a race,
      // including the race to create it.
      const connection = app.get<Connection>(getConnectionToken());
      const docs = await connection
        .collection('knowledge_states')
        .find({ conceptId: concept })
        .toArray();

      expect(docs).toHaveLength(1);
      expect(docs[0].attempts).toBe(n);
      expect(docs[0].correctAttempts).toBe(n / 2);
    });

    it('no longer exposes the removed cache-stats endpoint', async () => {
      await http.get('/api/v1/knowledge-tracing/admin/cache-stats').expect(404);
    });
  });

  describe('thought maps read other domains through their services', () => {
    it('reports a missing canvas session through the canvas domain', async () => {
      const res = await http
        .post(
          '/api/v1/thought-maps/convert-from-canvas/507f1f77bcf86cd799439011',
        )
        .send({})
        .expect(404);
      expect(JSON.stringify(res.body)).toContain('Canvas session');
    });
  });
});
