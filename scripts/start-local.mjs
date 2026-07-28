#!/usr/bin/env node
/**
 * Runtime shim for `start:local`.
 *
 * The launcher itself (`start-local.ts`) is TypeScript with top-level await.
 * Bun runs it as-is, but `npm run start:local` on a machine without Bun used to
 * die with a bare `'bun' is not recognized`. This shim picks a runtime instead:
 * Bun when it's on PATH, otherwise the user's own Node via its built-in type
 * stripping (unflagged in 22.18+ / 23.6+, behind a flag in 22.6+). Only when
 * neither is usable does it fail — with instructions rather than a shell error.
 *
 * Written in plain JS on purpose: it has to run on whatever Node is present,
 * before any of the workspace's own tooling is in play.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WINDOWS = process.platform === 'win32';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const LAUNCHER = join(SCRIPT_DIR, 'start-local.ts');

/** Node's TS type stripping: unflagged, flagged, or absent on this version. */
function nodeTypeStripping() {
  const [major = 0, minor = 0] = process.versions.node.split('.').map(Number);
  if (major > 23) return 'native';
  if (major === 23) return minor >= 6 ? 'native' : 'flag';
  if (major === 22) return minor >= 18 ? 'native' : minor >= 6 ? 'flag' : 'none';
  return 'none';
}

function hasBun() {
  // `shell` on Windows so a `bun.cmd` shim (npm-installed Bun) is found too.
  const probe = spawnSync('bun', ['--version'], { shell: WINDOWS, stdio: 'ignore' });
  return !probe.error && probe.status === 0;
}

function abort(lines) {
  process.stderr.write(`\n${lines.join('\n')}\n\n`);
  process.exit(1);
}

if (!existsSync(join(REPO_ROOT, 'node_modules'))) {
  abort([
    'Dependencies are not installed.',
    '',
    '  Run `bun install` (or `npm install`) first, then try again.',
  ]);
}

const stripping = hasBun() ? null : nodeTypeStripping();

if (stripping === 'none') {
  abort([
    "Mukti's local launcher needs Bun, or Node 22.6+ to run TypeScript directly.",
    `You are on Node ${process.versions.node}.`,
    '',
    '  Install Bun (recommended — it is what the rest of the workspace uses):',
    WINDOWS
      ? '    powershell -c "irm bun.sh/install.ps1 | iex"'
      : '    curl -fsSL https://bun.sh/install | bash',
    '',
    '  Or upgrade Node to 22.18 or newer, then re-run `npm run start:local`.',
  ]);
}

const [command, args] =
  stripping === null
    ? ['bun', [LAUNCHER]]
    : [
        process.execPath,
        [
          // Node infers ESM from the file's syntax; silence the note about the
          // workspace package.json having no "type" (it is CommonJS for
          // commitlint.config.js).
          '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
          ...(stripping === 'flag' ? ['--experimental-strip-types'] : []),
          LAUNCHER,
        ],
      ];

const child = spawn(command, args, {
  // Anchored to the repo root: the launcher resolves workspace paths from cwd.
  cwd: REPO_ROOT,
  env: process.env,
  shell: command === 'bun' && WINDOWS,
  stdio: 'inherit',
});

// The launcher owns shutdown (it has to stop the API and web servers it
// spawned), so signals are forwarded and its exit decides ours.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

child.on('error', (error) => {
  abort([`Failed to start the local launcher via \`${command}\`:`, `  ${error.message}`]);
});

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
