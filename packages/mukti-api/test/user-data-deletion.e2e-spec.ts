import type { INestApplication } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { type Connection, Types } from 'mongoose';
import * as request from 'supertest';

import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { AiRequestGate } from '../src/modules/ai/services/ai-request-gate.service';
import { AuthModule } from '../src/modules/auth/auth.module';
import { PasswordService } from '../src/modules/auth/services/password.service';
import { CanvasService } from '../src/modules/canvas/canvas.service';
import { BranchSuggestionService } from '../src/modules/thought-map/services/branch-suggestion.service';
import { MapExtractionService } from '../src/modules/thought-map/services/map-extraction.service';
import { ThoughtMapShareService } from '../src/modules/thought-map/services/thought-map-share.service';
import { ThoughtMapService } from '../src/modules/thought-map/services/thought-map.service';
import { ThoughtMapController } from '../src/modules/thought-map/thought-map.controller';
import { UserDataModule } from '../src/modules/user-data/user-data.module';
import { ALL_SCHEMAS } from '../src/schemas';

/** Real production auth controller, JWT guard, token/session services and MongoDB. */
describe('Hosted user data deletion (HTTP e2e)', () => {
  jest.setTimeout(120000);
  let mongo: MongoMemoryServer;
  let app: INestApplication;
  let db: Connection;
  const original = process.env.MUKTI_LOCAL;
  const password = 'ValidPass123!';
  beforeAll(async () => {
    delete process.env.MUKTI_LOCAL;
    mongo = await MongoMemoryServer.create();
    const module = await Test.createTestingModule({
      controllers: [ThoughtMapController],
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [
            () => ({
              FRONTEND_URL: 'http://localhost:3001',
              GOOGLE_CLIENT_ID: 'test-client',
              GOOGLE_CLIENT_SECRET: 'test-secret',
              JWT_REFRESH_SECRET: 'test-refresh-secret-user-deletion',
              JWT_SECRET: 'test-access-secret-user-deletion',
            }),
          ],
        }),
        MongooseModule.forRoot(mongo.getUri()),
        MongooseModule.forFeature(ALL_SCHEMAS),
        AuthModule,
        UserDataModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        ThoughtMapShareService,
        { provide: AiRequestGate, useValue: {} },
        ThoughtMapService,
        { provide: CanvasService, useValue: {} },
        { provide: MapExtractionService, useValue: {} },
        { provide: BranchSuggestionService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    await app.init();
    db = app.get(getConnectionToken());
  });
  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
    if (original === undefined) {
      delete process.env.MUKTI_LOCAL;
    } else {
      process.env.MUKTI_LOCAL = original;
    }
  });
  async function account(email: string) {
    return db.model('User').create({
      email,
      emailVerified: true,
      firstName: 'Delete',
      lastName: 'Me',
      openRouterApiKeyEncrypted: 'saved-secret',
      password: await app.get(PasswordService).hashPassword(password),
      preferences: { theme: 'dark' },
    });
  }
  it('requires authentication and explicit confirmation without deleting anything', async () => {
    await request(app.getHttpServer())
      .delete('/me/data')
      .send({ confirm: 'DELETE' })
      .expect(401);
    const user = await account('confirm@example.test');
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password })
      .expect(200);
    await request(app.getHttpServer())
      .delete('/me/data')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({})
      .expect(400);
    expect(await db.model('User').findById(user._id)).not.toBeNull();
  });
  it('data-only deletion preserves saved settings, active access, refresh token and sessions', async () => {
    const user = await account('data@example.test');
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password })
      .expect(200);
    const conversation = await db
      .model('Conversation')
      .collection.insertOne({ title: 'private', userId: user._id });
    // Conversation shares have a schema but no production public HTTP route yet.
    await db.model('SharedLink').create({
      conversationId: conversation.insertedId,
      createdBy: user._id,
      token: 'shared-conversation',
    });
    const mapId = new Types.ObjectId();
    await db.model('ThoughtMap').collection.insertOne({
      _id: mapId,
      title: 'Private map',
      userId: user._id,
    });
    await db.model('ThoughtMapShareLink').create({
      createdBy: user._id,
      thoughtMapId: mapId,
      token: 'shared-map',
    });
    await request(app.getHttpServer())
      .get('/thought-maps/share/shared-map')
      .expect(200);
    const result = await request(app.getHttpServer())
      .delete('/me/data')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ confirm: 'DELETE' })
      .expect(200);
    expect(result.body.success).toBe(true);
    expect(
      await db.model('SharedLink').findOne({ token: 'shared-conversation' }),
    ).toBeNull();
    await request(app.getHttpServer())
      .get('/thought-maps/share/shared-map')
      .expect(404);
    expect(
      await db.model('Conversation').countDocuments({ userId: user._id }),
    ).toBe(0);
    expect((await db.model('User').findById(user._id))?.preferences.theme).toBe(
      'dark',
    );
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', login.headers['set-cookie'])
      .expect(200);
    expect(
      await db
        .model('Session')
        .countDocuments({ isActive: true, userId: user._id }),
    ).toBe(1);
  });
  it('deletes account, signs out every device, rejects old access/refresh and subsequent sign-in', async () => {
    const user = await account('account@example.test');
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password })
      .expect(200);
    // A second independently issued token/session proves revocation is not limited to the current device.
    const secondToken = 'second-device-refresh';
    await db.model('RefreshToken').collection.insertOne({
      expiresAt: new Date(Date.now() + 86400000),
      isRevoked: false,
      token: secondToken,
      userId: user._id,
    });
    await db.model('Session').collection.insertOne({
      expiresAt: new Date(Date.now() + 86400000),
      isActive: true,
      refreshToken: secondToken,
      userId: user._id,
    });
    const result = await request(app.getHttpServer())
      .delete('/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ confirm: 'DELETE' })
      .expect(200);
    expect(result.body.success).toBe(true);
    expect(await db.model('User').findById(user._id)).toBeNull();
    for (const name of [
      'Session',
      'RefreshToken',
      'Subscription',
      'RateLimit',
    ]) {
      expect(await db.model(name).countDocuments({ userId: user._id })).toBe(0);
    }
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', login.headers['set-cookie'])
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password })
      .expect(401);
  });
  it('does not expose account deletion in local mode', async () => {
    process.env.MUKTI_LOCAL = '1';
    await request(app.getHttpServer())
      .delete('/me')
      .send({ confirm: 'DELETE' })
      .expect(404);
    delete process.env.MUKTI_LOCAL;
  });
});
