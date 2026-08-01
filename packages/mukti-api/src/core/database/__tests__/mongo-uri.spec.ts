import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import {
  ownsEmbeddedMongo,
  resolveMongoUri,
  stopEmbeddedMongoIfOwned,
} from '../mongo-uri';

const ENV_KEYS = [
  'MUKTI_LOCAL',
  'MUKTI_LOCAL_MONGO_URI',
  'MUKTI_LOCAL_DB_PATH',
  'MONGODB_URI',
];

const config = (values: Record<string, string | undefined>) => ({
  get: (key: string) => values[key],
});

describe('mongo-uri', () => {
  const snapshot = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      snapshot.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(async () => {
    // Never let an embedded server leak across tests.
    await stopEmbeddedMongoIfOwned();
    snapshot.forEach((value, key) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
    snapshot.clear();
  });

  describe('local mode with an injected URI', () => {
    it('connects to the supplied URI and starts no server of its own', async () => {
      process.env.MUKTI_LOCAL = '1';
      process.env.MUKTI_LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27018/mukti';

      const uri = await resolveMongoUri(config({}));

      expect(uri).toBe('mongodb://127.0.0.1:27018/mukti');
      expect(ownsEmbeddedMongo()).toBe(false);
    });

    it('does not stop the externally owned server on shutdown', async () => {
      process.env.MUKTI_LOCAL = '1';
      process.env.MUKTI_LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27018/mukti';

      await resolveMongoUri(config({}));

      await expect(stopEmbeddedMongoIfOwned()).resolves.toBe(false);
    });
  });

  describe('local mode without an injected URI', () => {
    jest.setTimeout(120_000);

    let dbPath: string;

    beforeEach(() => {
      dbPath = mkdtempSync(join(tmpdir(), 'mukti-mongo-uri-'));
    });

    afterEach(async () => {
      // The first test deliberately leaves its server running to assert
      // ownership. Stop it before the data files go, or mongod keeps running
      // over a deleted dbPath and the cleanup races it.
      await stopEmbeddedMongoIfOwned();
      rmSync(dbPath, { force: true, recursive: true });
    });

    it('starts its own embedded server and connects to it', async () => {
      process.env.MUKTI_LOCAL = '1';
      process.env.MUKTI_LOCAL_DB_PATH = dbPath;

      const uri = await resolveMongoUri(config({}));

      expect(uri).toMatch(/^mongodb:\/\//);
      expect(ownsEmbeddedMongo()).toBe(true);
    });

    it('stops the self-started server on shutdown', async () => {
      process.env.MUKTI_LOCAL = '1';
      process.env.MUKTI_LOCAL_DB_PATH = dbPath;

      await resolveMongoUri(config({}));

      await expect(stopEmbeddedMongoIfOwned()).resolves.toBe(true);
      expect(ownsEmbeddedMongo()).toBe(false);
      // Ownership is released: a second stop is a no-op.
      await expect(stopEmbeddedMongoIfOwned()).resolves.toBe(false);
    });
  });

  describe('hosted mode', () => {
    it('uses the configured URI and touches no embedded server', async () => {
      const uri = await resolveMongoUri(
        config({ MONGODB_URI: 'mongodb://mongo:27017/mukti' }),
      );

      expect(uri).toBe('mongodb://mongo:27017/mukti');
      expect(ownsEmbeddedMongo()).toBe(false);
      await expect(stopEmbeddedMongoIfOwned()).resolves.toBe(false);
    });

    it('falls back to the localhost default', async () => {
      const uri = await resolveMongoUri(config({}));

      expect(uri).toBe('mongodb://localhost:27017/mukti');
      expect(ownsEmbeddedMongo()).toBe(false);
    });

    it('ignores an injected local URI outside local mode', async () => {
      process.env.MUKTI_LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27018/mukti';

      const uri = await resolveMongoUri(
        config({ MONGODB_URI: 'mongodb://mongo:27017/mukti' }),
      );

      expect(uri).toBe('mongodb://mongo:27017/mukti');
      expect(ownsEmbeddedMongo()).toBe(false);
    });
  });
});
