#!/usr/bin/env bun
/**
 * One-command local runtime for Mukti.
 *
 * Boots the API (in MUKTI_LOCAL mode, Claude Code provider) and the web app with
 * zero external services — no Docker, no Redis, no OpenRouter key. Runs preflight
 * checks first and refuses to start a partial stack on failure.
 *
 * Usage: bun run start:local
 */
import { type ChildProcess, spawn, spawnSync } from 'child_process';
import { createConnection } from 'net';
import { resolve } from 'path';

const API_PORT = 3000;
const WEB_PORT = 3001;
const REPO_ROOT = process.cwd();

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** Resolves true if something is already listening on the port. */
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolvePort) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.on('connect', () => {
      socket.destroy();
      resolvePort(true);
    });
    socket.on('error', () => resolvePort(false));
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForPort(port: number, timeoutMs = 120_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortInUse(port)) return true;
    await sleep(500);
  }
  return false;
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(cmd, [url], {
    detached: true,
    shell: process.platform === 'win32',
    stdio: 'ignore',
  }).unref();
}

// ── Preflight ──────────────────────────────────────────────────────────────

console.log('Running preflight checks…');

// 1. Claude CLI installed
const version = spawnSync('claude', ['--version'], { encoding: 'utf8' });
if (version.error || version.status !== 0) {
  fail(
    'The `claude` CLI was not found on PATH.\n' +
      '  Install Claude Code: https://docs.claude.com/en/docs/claude-code/overview'
  );
}
console.log(`  ✓ Claude CLI: ${version.stdout.trim()}`);

// 2. Claude CLI authenticated
const status = spawnSync('claude', ['auth', 'status'], { encoding: 'utf8' });
let loggedIn = false;
try {
  loggedIn = (JSON.parse(status.stdout) as { loggedIn?: boolean }).loggedIn === true;
} catch {
  loggedIn = false;
}
if (!loggedIn) {
  fail('The `claude` CLI is not authenticated.\n  Run `claude login` and try again.');
}
console.log('  ✓ Claude CLI authenticated');

// 3. Ports free
for (const port of [API_PORT, WEB_PORT]) {
  if (await isPortInUse(port)) {
    fail(
      `Port ${port} is already in use.\n` +
        '  Stop the process using it (or free the port) and retry.'
    );
  }
}
console.log(`  ✓ Ports ${API_PORT} and ${WEB_PORT} are free\n`);

// ── Boot ───────────────────────────────────────────────────────────────────

console.log('Starting Mukti locally (Claude Code provider, no external services)…');
console.log('First run downloads a one-time embedded MongoDB binary — please wait.\n');

const env = {
  ...process.env,
  AI_PROVIDER: 'claude-code',
  MUKTI_LOCAL: '1',
  // Keep the embedded DB at the repo root regardless of each child's cwd.
  MUKTI_LOCAL_DB_PATH: resolve(REPO_ROOT, '.mukti/local-db'),
};

const children: ChildProcess[] = [
  spawn('bun', ['nx', 'run', '@mukti/api:serve'], { env, stdio: 'inherit' }),
  spawn('bun', ['nx', 'run', '@mukti/web:dev'], { env, stdio: 'inherit' }),
];

void waitForPort(WEB_PORT).then((up) => {
  if (up) {
    console.log(`\n✓ Mukti is ready at http://localhost:${WEB_PORT}\n`);
    openBrowser(`http://localhost:${WEB_PORT}`);
  }
});

let shuttingDown = false;
function shutdown(): void {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill('SIGINT');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// If either process exits, tear the whole stack down.
for (const child of children) {
  child.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`\nA process exited (code ${code ?? 'unknown'}); shutting down.`);
      shutdown();
    }
  });
}
