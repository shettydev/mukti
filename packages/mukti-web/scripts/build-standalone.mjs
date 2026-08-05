#!/usr/bin/env node
/**
 * Produces the publishable web tree: a local-mode production build, assembled.
 *
 * @remarks
 * The build runs with `NEXT_PUBLIC_MUKTI_LOCAL=1` because the published
 * package exists only to serve `npx muktiai`, which is always local mode —
 * and `NEXT_PUBLIC_*` is inlined by `next build`, so this cannot be decided at
 * runtime the way the API origin can. Without it the published app would show
 * an auth gate for a backend that has no auth.
 *
 * Setting it here rather than in `.env.production` keeps it off the hosted
 * Docker build, which runs a plain `next build` and must stay unaffected.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Finds a workspace binary by walking up, the way Node's own resolver does —
 * in this monorepo `next` is hoisted to the root, not installed per package.
 */
function resolveBin(name) {
  for (let dir = PACKAGE_ROOT; ; ) {
    const candidate = join(dir, 'node_modules', '.bin', name);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) {
      process.stderr.write(`build-standalone: could not find \`${name}\` — run \`bun install\`\n`);
      process.exit(1);
    }
    dir = parent;
  }
}

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: PACKAGE_ROOT,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.stderr.write(`build-standalone: \`${command} ${args.join(' ')}\` failed\n`);
    process.exit(result.status ?? 1);
  }
}

run(resolveBin('next'), ['build'], { NEXT_PUBLIC_MUKTI_LOCAL: '1' });

run(process.execPath, [join(PACKAGE_ROOT, 'scripts/assemble-standalone.mjs')], {});
