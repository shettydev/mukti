#!/usr/bin/env bun
/**
 * One-command local runtime for Mukti, from a workspace checkout.
 *
 * Boots the embedded database, the API (in MUKTI_LOCAL mode, Claude Code
 * provider) and the web app with zero external services — no Docker, no Redis,
 * no OpenRouter key. Runs preflight checks first and refuses to start a partial
 * stack on failure.
 *
 * This is the *contributor* half of the launcher: it spawns dev servers
 * (`nest start --watch`, `next dev`) so edits reload. The published CLI
 * (`packages/mukti-cli`) spawns prebuilt artifacts instead. Everything else —
 * preflight, phase rendering, log teeing, shutdown — is shared from
 * `packages/mukti-cli/src/launcher/`, so the two modes cannot drift apart.
 *
 * The dev servers are spawned directly rather than through nx, so the task
 * runner's graph/daemon cost stays off the launcher's critical path.
 *
 * The launcher owns the database rather than letting the API start one: it
 * picks the mongod port up front, so the API can be handed a connection URI at
 * spawn time and start compiling immediately while the database boots
 * alongside it — instead of the database's cost landing after the compile has
 * already finished.
 *
 * Entered through `scripts/start-local.mjs`, which picks the runtime (Bun, or
 * Node's own type stripping) — hence the explicit `.ts` extensions on the local
 * imports below, which Node's ESM resolver requires.
 *
 * Usage: bun run start:local (or npm run start:local)
 */
import { intro } from '@clack/prompts';
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join, relative, resolve } from 'path';
import pc from 'picocolors';

import { boot } from '../packages/mukti-cli/src/launcher/boot.ts';
import { createDatabaseSpec, mongoUri } from '../packages/mukti-cli/src/launcher/database.ts';
import { isPortInUse, reserveFreePort } from '../packages/mukti-cli/src/launcher/net.ts';
import { runPreflight } from '../packages/mukti-cli/src/launcher/preflight.ts';

const API_PORT = 3000;
const WEB_PORT = 3001;
const WEB_URL = `http://localhost:${WEB_PORT}`;
const REPO_ROOT = process.cwd();
const BIN_DIR = resolve(REPO_ROOT, 'node_modules/.bin');
const LOG_DIR = resolve(REPO_ROOT, '.mukti/logs');
const DB_PATH = resolve(REPO_ROOT, '.mukti/local-db');
const LAUNCHER_DIR = resolve(REPO_ROOT, 'packages/mukti-cli/src/launcher');

/** True when this launcher is itself running under Bun rather than Node. */
const UNDER_BUN = 'bun' in process.versions;

/**
 * The database daemon must run under Node: `mongodb-memory-server`'s driver
 * cannot load under Bun. When the launcher is already Node, reuse the exact
 * binary running us; under Bun, fall back to PATH (preflight verifies it).
 */
const NODE_BIN = UNDER_BUN ? 'node' : process.execPath;

/**
 * Resolves a workspace binary without assuming a shell or a particular hoisting
 * layout. Falls back to the runtime's own package runner (`bun x` / `npx`),
 * which resolves the local install itself — `bun x` is only reachable when Bun
 * is what's running us, so the Node path must not assume Bun exists.
 */
function resolveBin(bin: string): { args: string[]; command: string; shell: boolean } {
  const isWindows = process.platform === 'win32';
  for (const candidate of isWindows ? [`${bin}.cmd`, `${bin}.exe`, bin] : [bin]) {
    const full = join(BIN_DIR, candidate);
    if (!existsSync(full)) continue;
    // `.cmd` shims are only executable through a shell on Windows.
    const needsShell = isWindows && candidate.endsWith('.cmd');
    return { args: [], command: needsShell ? `"${full}"` : full, shell: needsShell };
  }
  return UNDER_BUN
    ? { args: ['x', bin], command: 'bun', shell: false }
    : // `npx` is a `.cmd` shim on Windows, so it needs a shell there.
      { args: ['--no-install', bin], command: 'npx', shell: isWindows };
}

// ── Preflight ──────────────────────────────────────────────────────────────

intro(pc.inverse(pc.cyan(' mukti ')));

await runPreflight([
  {
    message: 'Checking Node for the database daemon',
    run: () => {
      // The daemon runs under Node even when the launcher itself is Bun, so a
      // missing Node would otherwise surface only as a database phase failure.
      if (!UNDER_BUN) return undefined;
      const node = spawnSync(NODE_BIN, ['--version'], { encoding: 'utf8' });
      if (!node.error && node.status === 0) return undefined;
      return {
        headline: 'Node was not found on PATH',
        remediation:
          'The embedded database runs under Node (its MongoDB driver cannot load under Bun).\n' +
          'Install Node 20+ and try again: https://nodejs.org/en/download',
      };
    },
  },
  {
    message: 'Checking ports',
    run: async () => {
      // Repo mode refuses rather than falling forward: a contributor wants to
      // know what is already holding their port, not to be quietly moved.
      for (const port of [API_PORT, WEB_PORT]) {
        if (await isPortInUse(port)) {
          return {
            headline: `port ${port} is already in use`,
            remediation: `Stop the process using port ${port} (or free the port) and retry.`,
          };
        }
      }
      return undefined;
    },
  },
]);

// ── Boot ───────────────────────────────────────────────────────────────────

// Chosen before anything starts: the URI has to be known at API spawn time for
// the database to boot alongside the compile rather than after it.
const MONGO_PORT = await reserveFreePort();

const env = {
  ...process.env,
  AI_PROVIDER: 'claude-code',
  MUKTI_LOCAL: '1',
  // The launcher owns the database; the API connects to this rather than
  // starting one of its own (see core/database/mongo-uri.ts).
  MUKTI_LOCAL_MONGO_URI: mongoUri(MONGO_PORT),
  // Client-visible local-mode signal for the Next.js web process (read by
  // middleware.ts and client components via isLocalMode()).
  NEXT_PUBLIC_MUKTI_LOCAL: '1',
};

const api = resolveBin('nest');
const web = resolveBin('next');

await boot({
  api: {
    args: [...api.args, 'start', '--watch'],
    command: api.command,
    cwd: resolve(REPO_ROOT, 'packages/mukti-api'),
    env,
    name: 'api',
    readyPattern: /Nest application successfully started|API listening at/i,
    shell: api.shell,
    tint: pc.cyan,
  },
  apiPort: API_PORT,
  apiWork: 'compiling the API',
  db: createDatabaseSpec({
    cwd: REPO_ROOT,
    daemon: join(LAUNCHER_DIR, 'embedded-mongo.mjs'),
    dbPath: DB_PATH,
    env,
    nodeBin: NODE_BIN,
    port: MONGO_PORT,
  }),
  dbPort: MONGO_PORT,
  logDir: LOG_DIR,
  logHint: `${relative(REPO_ROOT, LOG_DIR)}/db.log · api.log · web.log`,
  web: {
    args: [...web.args, 'dev', '-p', String(WEB_PORT)],
    command: web.command,
    cwd: resolve(REPO_ROOT, 'packages/mukti-web'),
    env,
    name: 'web',
    readyPattern: /Ready in|started server on/i,
    shell: web.shell,
    tint: pc.magenta,
  },
  webPort: WEB_PORT,
  webUrl: WEB_URL,
});
