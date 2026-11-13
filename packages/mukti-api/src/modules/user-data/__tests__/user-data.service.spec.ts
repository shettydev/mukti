import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { readdirSync } from 'fs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { type Connection, createConnection, Types } from 'mongoose';
import { join } from 'path';

import { ALL_SCHEMAS } from '../../../schemas';
import { SessionService } from '../../auth/services/session.service';
import { TokenService } from '../../auth/services/token.service';
import { DATA_PLAN, KEPT_SCHEMAS, UserDataService } from '../user-data.service';

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
    // This suite exercises deletion, not index migrations. Several existing schemas
    // declare conflicting TTL/non-TTL indexes, so do not race index creation with fixtures.
    connection = await createConnection(mongo.getUri(), {
      autoIndex: false,
    }).asPromise();
    for (const entry of ALL_SCHEMAS) {
      connection.model(entry.name, entry.schema);
    }
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
    for (const entry of ALL_SCHEMAS) {
      await connection.model(entry.name).deleteMany({});
    }
  });
  async function seed(userId: Types.ObjectId) {
    const ids = Object.fromEntries(
      ALL_SCHEMAS.map((e) => [e.name, new Types.ObjectId()]),
    );
    ids.User = userId;
    for (const entry of ALL_SCHEMAS) {
      await connection.model(entry.name).collection.insertOne({
        _id: ids[entry.name],
        conceptId: userId.toString(),
        conversationId: ids.Conversation,
        createdBy: userId,
        dialogueId: ids.NodeDialogue,
        email: `${userId.toString()}@example.test`,
        mapId: ids.ThoughtMap,
        name: userId.toString(),
        nodeId: userId.toString(),
        refreshToken: userId.toString(),
        sessionId: ids.CanvasSession,
        shareToken: userId.toString(),
        thoughtMapId: ids.ThoughtMap,
        token: userId.toString(),
        userId,
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
  it('deletes own orphan dialogues and ownerless legacy dialogues through either parent, not other users', async () => {
    const own = await seed(owner);
    const theirs = await seed(other);
    const dialogues = [
      { userId: owner },
      { sessionId: own.CanvasSession },
      { mapId: own.ThoughtMap },
      { userId: other },
      { sessionId: theirs.CanvasSession },
      { mapId: theirs.ThoughtMap },
      {},
    ].map((fields, index) => ({
      _id: new Types.ObjectId(),
      nodeId: `legacy-${index}`,
      ...fields,
    }));
    const messages = dialogues.map((dialogue) => ({
      _id: new Types.ObjectId(),
      dialogueId: dialogue._id,
    }));
    await connection.model('NodeDialogue').collection.insertMany(dialogues);
    await connection.model('DialogueMessage').collection.insertMany(messages);
    expect((await service.deleteAll(owner.toString())).success).toBe(true);
    for (let index = 0; index < dialogues.length; index++) {
      const dialogue = await connection
        .model('NodeDialogue')
        .findById(dialogues[index]._id);
      const message = await connection
        .model('DialogueMessage')
        .findById(messages[index]._id);
      if (index < 3) {
        expect(dialogue).toBeNull();
        expect(message).toBeNull();
      } else {
        expect(dialogue).not.toBeNull();
        expect(message).not.toBeNull();
      }
    }
  });
  it.each(DATA_PLAN.map((step) => step.model))(
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
      // Every transitively dependent parent must survive so the retry can rediscover children.
      const blocked = new Set([model]);
      for (const step of DATA_PLAN) {
        if (step.dependencies?.some((dependency) => blocked.has(dependency))) {
          blocked.add(step.model);
          expect(
            await connection.model(step.model).findById(ids[step.model]),
          ).not.toBeNull();
          expect(partial.failedCategories).toContain(step.category);
        }
      }
      const independent =
        model === 'UsageEvent' ? 'KnowledgeState' : 'UsageEvent';
      expect(
        await connection.model(independent).findById(ids[independent]),
      ).toBeNull();
      spy.mockRestore();
      expect((await service.deleteAll(owner.toString())).success).toBe(true);
      expect(await connection.model(model).findById(ids[model])).toBeNull();
      for (const step of DATA_PLAN) {
        expect(
          await connection.model(step.model).findById(ids[step.model]),
        ).toBeNull();
      }
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
  it.each(['RefreshToken', 'Session', 'Subscription', 'RateLimit', 'User'])(
    'retains identity for a retry when account cleanup of %s fails',
    async (model) => {
      await seed(owner);
      const spy = jest
        .spyOn(connection.model(model), 'deleteMany')
        .mockRejectedValueOnce(new Error('database unavailable'));
      const partial = await service.deleteAccount(owner.toString());
      expect(partial.success).toBe(false);
      expect(partial.failedCategories).toContain('account');
      expect(await connection.model('User').findById(owner)).not.toBeNull();
      spy.mockRestore();
      expect((await service.deleteAccount(owner.toString())).success).toBe(
        true,
      );
      for (const name of [
        'RefreshToken',
        'Session',
        'Subscription',
        'RateLimit',
        'User',
      ]) {
        expect(await connection.model(name).countDocuments({})).toBe(0);
      }
    },
  );
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
