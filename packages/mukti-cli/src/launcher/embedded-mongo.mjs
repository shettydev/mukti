#!/usr/bin/env node
/**
 * The embedded MongoDB the launcher owns, as a standalone process.
 *
 * The launcher starts this alongside the API and web app rather than letting
 * the API start a database of its own — that is what takes database startup
 * (and, on a first run, a 141 MB binary download) off the serial path behind
 * API compilation.
 *
 * It runs as a separate process rather than inside the launcher because the
 * launcher may be running under Bun, where `mongodb-memory-server`'s MongoDB
 * driver fails to load (`bson` calls `v8.startupSnapshot.isBuildingSnapshot`,
 * which Bun does not implement). Node runs it fine, so the launcher spawns
 * this under Node and supervises it like any other service.
 *
 * Written in plain JS for the same reason as `start-local.mjs`: the launcher
 * can pick Bun for itself while the Node on PATH is too old to strip types.
 *
 * Contract with the launcher, all via environment:
 * - `MUKTI_LOCAL_DB_PATH` — where the data files live (created if absent).
 * - `MUKTI_LOCAL_MONGO_PORT` — the port to bind, chosen by the launcher so it
 *   can hand the API a connection URI before this process is even listening.
 *
 * Prints a ready line on stdout once listening, then stays alive until it is
 * signalled, stopping the server cleanly so no mongod is orphaned.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dbPath = process.env.MUKTI_LOCAL_DB_PATH;
const port = Number(process.env.MUKTI_LOCAL_MONGO_PORT);

if (!dbPath || !Number.isInteger(port) || port <= 0) {
  process.stderr.write(
    'embedded-mongo: MUKTI_LOCAL_DB_PATH and MUKTI_LOCAL_MONGO_PORT must both be set\n'
  );
  process.exit(1);
}

mkdirSync(dbPath, { recursive: true });

// A second launch must not hide a live owner's lock behind the driver's
// multiline-JSON parsing error. Never remove the lock or signal its owner.
let owner;
try {
  const contents = readFileSync(join(dbPath, 'mongod.lock'), 'utf8').trim();
  if (/^\d+$/.test(contents) && Number.isSafeInteger(Number(contents)) && Number(contents) > 0) {
    owner = Number(contents);
  }
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error;
  }
}
if (owner !== undefined) {
  let alive = true;
  try {
    process.kill(owner, 0);
  } catch (error) {
    if (error.code === 'ESRCH') {
      alive = false;
    } else if (error.code !== 'EPERM') {
      throw error;
    }
  }
  if (alive) {
    process.stderr.write(
      `embedded-mongo: database appears already in use at ${dbPath} (PID ${owner}).\n` +
        'Stop the previous Mukti launcher before starting another. Data and lock files were left untouched.\n'
    );
    process.exit(1);
  }
}

// Dynamic import so the argument check above can fail before paying the (~380ms)
// cost of loading the driver.
const { MongoMemoryServer } = await import('mongodb-memory-server');

const server = await MongoMemoryServer.create({
  instance: { dbName: 'mukti', dbPath, port, storageEngine: 'wiredTiger' },
});

// The launcher matches this line to end its database phase.
process.stdout.write(`embedded MongoDB listening at ${server.getUri()}\n`);

let stopping = false;

async function stop() {
  if (stopping) {
    return;
  }
  stopping = true;
  try {
    await server.stop();
  } catch {
    // Already down — the launcher's SIGKILL fallback covers anything left.
  }
  process.exit(0);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => void stop());
}

// mongod runs as a detached child of the driver, so nothing here holds the
// event loop open on its own. Without this the process would exit immediately
// and take the database with it. The empty body is the point: the timer exists
// only to keep the process alive until it is signalled.
// eslint-disable-next-line @typescript-eslint/no-empty-function
setInterval(() => {}, 1 << 30);
