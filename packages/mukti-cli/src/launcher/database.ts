/**
 * The embedded database as a supervised service, shared by both launcher modes.
 *
 * @remarks
 * The launcher owns the database rather than the API, and picks its port up
 * front so the API can be handed a connection URI at spawn time. That is what
 * takes database startup off the serial path: in repo mode it overlaps an ~11s
 * compile, and in prebuilt mode — where there is no compile left to hide
 * behind — it overlaps API and web startup.
 *
 * It runs as its own Node process (`embedded-mongo.mjs`) rather than inside
 * the launcher, because the repo launcher runs under Bun, where
 * `mongodb-memory-server` cannot be imported at all: its MongoDB driver's
 * `bson` calls `v8.startupSnapshot.isBuildingSnapshot()`, which Bun does not
 * implement. A separate process is needed regardless, and it slots into the
 * existing service supervision unchanged.
 */
import { readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import pc from 'picocolors';

// Type-only: importing the value module would pull the whole service/banner
// chain into anything that just wants a spec.
import type { ServiceSpec } from './services.ts';

/** `mongodb-memory-server`'s own progress output during a first-run download. */
export const MONGO_DOWNLOAD_PROGRESS = /Downloading MongoDB[^:]*:\s*([\d.]+)\s*%/i;

export interface DatabaseSpecOptions {
  readonly cwd: string;
  /** Absolute path to `embedded-mongo.mjs`, which differs per mode. */
  readonly daemon: string;
  /** Where the data files live. Persisted, so conversations survive restarts. */
  readonly dbPath: string;
  readonly env: NodeJS.ProcessEnv;
  /** Node binary — the daemon cannot run under Bun. */
  readonly nodeBin: string;
  readonly port: number;
}

export function createDatabaseSpec(options: DatabaseSpecOptions): ServiceSpec {
  return {
    args: [options.daemon],
    command: options.nodeBin,
    cwd: options.cwd,
    env: {
      ...options.env,
      MUKTI_LOCAL_DB_PATH: options.dbPath,
      MUKTI_LOCAL_MONGO_PORT: String(options.port),
    },
    name: 'db',
    readyPattern: /embedded MongoDB listening at/i,
    tint: pc.yellow,
  };
}

/**
 * Whether the mongod binary is already downloaded, so the database phase can
 * say which of the two very different waits (about a second, or 141 MB) is
 * ahead rather than presenting both as the same stall.
 *
 * @remarks
 * `mongodb-memory-server` looks in several places, not just one, and will use
 * a binary from the home cache even when `MONGOMS_DOWNLOAD_DIR` points
 * somewhere empty. Checking only the configured directory therefore announces
 * a download that never happens, so every candidate is checked.
 */
export function isMongoBinaryCached(): boolean {
  const candidates = [
    process.env.MONGOMS_DOWNLOAD_DIR,
    join(homedir(), '.cache/mongodb-binaries'),
    join(process.cwd(), 'node_modules/.cache/mongodb-memory-server'),
  ].filter((dir): dir is string => Boolean(dir));

  return candidates.some((dir) => {
    try {
      return readdirSync(dir).some((entry) => entry.startsWith('mongod'));
    } catch {
      return false;
    }
  });
}

/** The connection URI for a database the launcher will start on `port`. */
export function mongoUri(port: number): string {
  return `mongodb://127.0.0.1:${port}/mukti`;
}
