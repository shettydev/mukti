import type { INestApplication } from '@nestjs/common';

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as request from 'supertest';

import { CODEX_SIGNED_IN_ENV } from './cli-stubs.global-setup';

/**
 * Switching the local AI CLI from Settings, over HTTP, against the real API.
 *
 * @remarks
 * Boots `startApi` in local mode with the stand-in CLIs from
 * `cli-stubs.global-setup.ts` first on PATH, so the real probe runner, the real
 * token-free probes and the real Codex preparation (its settings self-check and
 * `codex debug models`) all run, without a real CLI or a single model token:
 * Claude and Codex are ready, Antigravity is not installed.
 */
describe('Local AI provider switching (e2e, local mode)', () => {
  jest.setTimeout(120_000);

  const env = { ...process.env };
  let app: INestApplication;
  let root: string;
  let http: ReturnType<typeof request>;
  const codexSignedIn = (): string => process.env[CODEX_SIGNED_IN_ENV]!;

  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'mukti-switch-e2e-'));

    process.env.MUKTI_LOCAL = '1';
    process.env.MUKTI_LOCAL_DB_PATH = join(root, 'db');
    delete process.env.MUKTI_LOCAL_MONGO_URI;
    process.env.NODE_ENV = 'test';
    process.env.FRONTEND_URL = 'http://localhost:3001';
    process.env.AI_PROVIDER = 'claude';
    process.env.MUKTI_CLI_WORKSPACE = join(root, 'workspace');
    process.env.CODEX_HOME = join(root, 'codex-home');
    process.env.MUKTI_PROVIDER_SETTINGS = join(root, 'home', 'config.json');
    process.env.MUKTI_PROVIDER_SOURCE = 'option';
    delete process.env.CORS_ORIGINS;
    mkdirSync(process.env.MUKTI_LOCAL_DB_PATH);

    const { startApi } = await import('../src/start');
    app = await startApi({ host: '127.0.0.1', port: 0 });
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app?.close();
    rmSync(root, { force: true, recursive: true });
    process.env = env;
  });

  it('reports every CLI, the active one, and how the launch chose', async () => {
    const res = await http.get('/api/v1/ai/providers').expect(200);
    const status = res.body.data;

    expect(status.activeId).toBe('claude');
    expect(status.launchSource).toBe('option');
    expect(status.saveDefault).toEqual({ available: true, savedId: null });
    expect(
      status.providers.map((p: { id: string; readiness: string }) => [
        p.id,
        p.readiness,
      ]),
    ).toEqual([
      ['claude', 'ready'],
      ['codex', 'ready'],
      ['agy', 'missing'],
    ]);
  });

  it('refuses a CLI that is not installed, and keeps the current one', async () => {
    const res = await http
      .put('/api/v1/ai/provider')
      .send({ id: 'agy' })
      .expect(409);

    expect(res.body.error.code).toBe('PROVIDER_NOT_READY');
    expect(res.body.error.message).toContain('antigravity.google');

    const models = await http.get('/api/v1/ai/models').expect(200);
    expect(models.body.data.models.map((m: { id: string }) => m.id)).toEqual([
      'sonnet',
      'opus',
      'haiku',
    ]);
  });

  it('rejects an unsupported or malformed request', async () => {
    const unsupported = await http
      .put('/api/v1/ai/provider')
      .send({ id: 'openrouter' })
      .expect(400);
    expect(unsupported.body.error.code).toBe('UNSUPPORTED_PROVIDER');

    await http.put('/api/v1/ai/provider').send({}).expect(400);
  });

  it('switches to Codex, saves it, and serves its models from then on', async () => {
    const res = await http
      .put('/api/v1/ai/provider')
      .send({ id: 'codex', saveAsDefault: true })
      .expect(200);

    expect(res.body.data).toMatchObject({
      activeId: 'codex',
      activeModel: 'gpt-6.1-sol',
      changed: true,
      models: [{ id: 'gpt-6.1-sol', label: 'GPT-6.1-Sol' }],
      saved: true,
    });

    const models = await http.get('/api/v1/ai/models').expect(200);
    expect(models.body.data.models.map((m: { id: string }) => m.id)).toEqual([
      'gpt-6.1-sol',
    ]);

    const settings = await http.get('/api/v1/ai/settings').expect(200);
    expect(settings.body.data.activeModel).toBe('gpt-6.1-sol');

    expect(
      JSON.parse(readFileSync(process.env.MUKTI_PROVIDER_SETTINGS!, 'utf8')),
    ).toEqual({ provider: 'codex', version: 1 });
  });

  it('refuses a switch to a CLI that has signed out since, and stays put', async () => {
    await http.put('/api/v1/ai/provider').send({ id: 'claude' }).expect(200);
    rmSync(codexSignedIn());

    const res = await http
      .put('/api/v1/ai/provider')
      .send({ id: 'codex' })
      .expect(409);

    expect(res.body.error.message).toContain('codex login');
    const status = await http.get('/api/v1/ai/providers?refresh=1').expect(200);
    expect(status.body.data.activeId).toBe('claude');
    expect(
      status.body.data.providers.find((p: { id: string }) => p.id === 'codex')
        .readiness,
    ).toBe('signed-out');

    writeFileSync(codexSignedIn(), '');
  });
});
