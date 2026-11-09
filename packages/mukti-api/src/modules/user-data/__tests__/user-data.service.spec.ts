import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, createConnection, Types } from 'mongoose';
import { readdirSync } from 'fs';
import { join } from 'path';
import { ALL_SCHEMAS } from '../../../schemas';
import { UserDataService, DATA_PLAN, KEPT_SCHEMAS } from '../user-data.service';
import { TokenService } from '../../auth/services/token.service';
import { SessionService } from '../../auth/services/session.service';

describe('UserDataService Mongo integration', () => {
  jest.setTimeout(120000);
  let mongo: MongoMemoryServer;
  let connection: Connection;
  let service: UserDataService;
  const tokens = { revokeAllUserTokens: jest.fn().mockResolvedValue(1) };
  const sessions = { revokeAllSessions: jest.fn().mockResolvedValue(1) };
  const owner = new Types.ObjectId();
  const other = new Types.ObjectId();
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    connection = await createConnection(mongo.getUri()).asPromise();
    for (const entry of ALL_SCHEMAS) connection.model(entry.name, entry.schema);
    const module = await Test.createTestingModule({
      providers: [
        UserDataService,
        { provide: getConnectionToken(), useValue: connection },
        { provide: TokenService, useValue: tokens },
        { provide: SessionService, useValue: sessions },
      ],
    }).compile();
    service = module.get(UserDataService);
  });
  afterAll(async () => {
    await connection?.close();
    await mongo?.stop();
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    for (const entry of ALL_SCHEMAS)
      await connection.model(entry.name).deleteMany({});
  });
  async function seed(userId: Types.ObjectId) {
    const ids = Object.fromEntries(
      ALL_SCHEMAS.map((e) => [e.name, new Types.ObjectId()]),
    );
    for (const entry of ALL_SCHEMAS) {
      await connection.model(entry.name).collection.insertOne({
        _id: ids[entry.name],
        userId,
        createdBy: userId,
        conversationId: ids.Conversation,
        sessionId: ids.CanvasSession,
        mapId: ids.ThoughtMap,
        dialogueId: ids.NodeDialogue,
      });
    }
    return ids;
  }
  it('deletes every data collection, preserves account/settings and every other user', async () => {
    const own = await seed(owner);
    const theirs = await seed(other);
    const result = await service.deleteAll(owner.toString());
    expect(result.success).toBe(true);
    expect(result.failedCategories).toEqual([]);
    for (const step of DATA_PLAN) {
      expect(
        await connection.model(step.model).findById(own[step.model]),
      ).toBeNull();
      expect(
        await connection.model(step.model).findById(theirs[step.model]),
      ).not.toBeNull();
    }
    expect(await connection.model('User').findById(own.User)).not.toBeNull();
    expect((await service.deleteAll(owner.toString())).success).toBe(true);
  });
  it.each([
    'DialogueMessage',
    'ThoughtNode',
    'InsightNode',
    'ArchivedMessage',
    'SharedLink',
    'ThoughtMapShareLink',
  ])(
    'keeps dependent parents retryable when %s fails, continues independent categories',
    async (model) => {
      const ids = await seed(owner);
      const spy = jest
        .spyOn(connection.model(model), 'deleteMany')
        .mockRejectedValueOnce(new Error('database unavailable'));
      const partial = await service.deleteAll(owner.toString());
      expect(partial.success).toBe(false);
      expect(partial.failedCategories).toContain(
        DATA_PLAN.find((s) => s.model === model)!.category,
      );
      expect(await connection.model(model).findById(ids[model])).not.toBeNull();
      expect(
        await connection.model('UsageEvent').findById(ids.UsageEvent),
      ).toBeNull();
      spy.mockRestore();
      expect((await service.deleteAll(owner.toString())).success).toBe(true);
      expect(await connection.model(model).findById(ids[model])).toBeNull();
    },
  );
  it('retains account and auth when data deletion fails', async () => {
    const ids = await seed(owner);
    jest
      .spyOn(connection.model('ArchivedMessage'), 'deleteMany')
      .mockRejectedValueOnce(new Error('offline'));
    expect((await service.deleteAccount(owner.toString())).success).toBe(false);
    expect(await connection.model('User').findById(ids.User)).not.toBeNull();
    expect(tokens.revokeAllUserTokens).not.toHaveBeenCalled();
  });
  it('revokes all auth and deletes hosted account records after data succeeds', async () => {
    await seed(owner);
    expect((await service.deleteAccount(owner.toString())).success).toBe(true);
    expect(tokens.revokeAllUserTokens).toHaveBeenCalledWith(owner.toString());
    expect(sessions.revokeAllSessions).toHaveBeenCalledWith(owner.toString());
    for (const model of [
      'User',
      'Subscription',
      'RateLimit',
      'Session',
      'RefreshToken',
    ]) {
      expect(await connection.model(model).countDocuments({})).toBe(0);
    }
  });
});

describe('deletion schema coverage', () => {
  it('classifies every schema file and registered model, including queue content and votes', () => {
    const classified = [
      ...DATA_PLAN.map((s) => s.model),
      ...Object.keys(KEPT_SCHEMAS),
    ];
    expect(new Set(classified).size).toBe(classified.length);
    expect(classified.sort()).toEqual(ALL_SCHEMAS.map((s) => s.name).sort());
    expect(
      readdirSync(join(__dirname, '../../../schemas')).filter((f) =>
        f.endsWith('.schema.ts'),
      ),
    ).toHaveLength(classified.length);
    expect(DATA_PLAN.map((s) => s.model)).toEqual(
      expect.arrayContaining(['RequestQueue', 'Vote']),
    );
  });
});
