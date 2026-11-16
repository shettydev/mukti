import type { INestApplication } from '@nestjs/common';

import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import * as request from 'supertest';

jest.mock('@openrouter/sdk', () => ({ OpenRouter: jest.fn(() => ({})) }));

import {
  parseExportQuery,
  SessionExportController,
} from '../session-export.controller';
import { SessionExportService } from '../session-export.service';
import { FIXTURE_EXPORT } from './fixture-export';

const ID = '507f1f77bcf86cd799439011';
const USER = {
  _id: new Types.ObjectId(ID),
  email: 'priya@example.org',
  firstName: 'Priya',
  lastName: 'Shah',
};
const ROUTES = [
  [`/conversations/${ID}/export`, { conversationId: ID, surface: 'chat' }],
  [
    `/canvas/${ID}/nodes/seed/dialogue/export`,
    { nodeId: 'seed', sessionId: ID, surface: 'canvas_node' },
  ],
  [
    `/thought-maps/${ID}/nodes/thought-1/dialogue/export`,
    { mapId: ID, nodeId: 'thought-1', surface: 'thought_map_node' },
  ],
] as const;

describe('SessionExportController downloads', () => {
  let app: INestApplication;
  const buildModel = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [SessionExportController],
      providers: [
        { provide: SessionExportService, useValue: { buildModel } },
        {
          provide: APP_GUARD,
          useValue: {
            canActivate(context: any) {
              const req = context.switchToHttp().getRequest();
              if (req.headers.authorization !== 'test-session') {
                throw new UnauthorizedException();
              }
              req.user = USER;
              return true;
            },
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });
  afterAll(async () => app.close());
  beforeEach(() => {
    buildModel.mockReset();
    buildModel.mockResolvedValue(FIXTURE_EXPORT);
  });

  it.each(ROUTES)(
    'downloads JSON from %s with sanitized filename and private caching',
    async (path, target) => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1${path}`)
        .set('Authorization', 'test-session')
        .expect(200);
      expect(response.body).toEqual(FIXTURE_EXPORT);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['content-disposition']).toMatch(
        /^attachment; filename="mukti-.*\.json"$/,
      );
      expect(response.headers['content-disposition']).not.toContain(ID);
      expect(buildModel).toHaveBeenCalledWith(target, ID, {
        mode: 'full',
        privateValues: ['priya@example.org', 'Priya', 'Shah'],
        redact: [],
      });
    },
  );

  it.each(ROUTES)(
    'downloads Markdown from %s and forwards repeated literal terms',
    async (path) => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1${path}?format=md&mode=metrics&redact=Acme&redact=a%5Db`)
        .set('Authorization', 'test-session')
        .expect(200);
      expect(response.headers['content-type']).toMatch(/text\/markdown/);
      expect(response.headers['content-disposition']).toMatch(/-metrics\.md/);
      expect(response.text).toContain('# Mukti session export');
      expect(buildModel.mock.calls[0][2]).toMatchObject({
        mode: 'metrics',
        redact: ['Acme', 'a]b'],
      });
    },
  );

  it.each(ROUTES)('hides another owner at %s', async (path) => {
    buildModel.mockRejectedValue(new ForbiddenException('private'));
    const response = await request(app.getHttpServer())
      .get(`/api/v1${path}`)
      .set('Authorization', 'test-session')
      .expect(404);
    expect(response.text).not.toContain('private');
  });

  it.each(ROUTES)('requires authentication at %s', async (path) => {
    await request(app.getHttpServer()).get(`/api/v1${path}`).expect(401);
    expect(buildModel).not.toHaveBeenCalled();
  });

  it.each([
    'format=csv',
    'mode=summary',
    'format=json&format=md',
    'redact=',
    `redact=${'x'.repeat(201)}`,
    'unexpected=true',
    'mode=full&mode=metrics',
    Array.from({ length: 51 }, (_, i) => `redact=term${i}`).join('&'),
  ])('rejects invalid query %s', async (query) => {
    await request(app.getHttpServer())
      .get(`/api/v1/conversations/${ID}/export?${query}`)
      .set('Authorization', 'test-session')
      .expect(400);
    expect(buildModel).not.toHaveBeenCalled();
  });

  it('returns 404 for malformed database ids without querying storage', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/conversations/not-an-id/export')
      .set('Authorization', 'test-session')
      .expect(404);
    expect(buildModel).not.toHaveBeenCalled();
  });
});

describe('parseExportQuery', () => {
  it.each([
    { redact: {} },
    { redact: ['ok', {}] },
    { format: {} },
    { mode: [] },
  ])('rejects nonstring query values %p', (query) => {
    expect(() => parseExportQuery(query)).toThrow();
  });
  it('accepts the documented literal term boundaries', () => {
    expect(
      parseExportQuery({ redact: ['a', 'redacted', '[x]', 'x'.repeat(200)] })
        .redact,
    ).toHaveLength(4);
  });
});
