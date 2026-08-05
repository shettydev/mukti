#!/usr/bin/env node
/**
 * Assembles the publishable web tree from a completed `next build`.
 *
 * `output: 'standalone'` gets most of the way there, but what Next emits is not
 * directly publishable:
 *
 * - It omits `.next/static` and `public`, which the standalone server serves at
 *   runtime but expects to be copied in.
 * - It copies the developer's `.env` into the tree. That file is local, is
 *   gitignored, and has no business being uploaded to npm.
 * - Its traced `node_modules` includes build tooling the standalone server
 *   never executes (see `PRUNE`), which is the bulk of the tree's size.
 * - `public/demo/` is 387 MB of video that nothing references — the landing
 *   page streams its demos from GitHub release URLs.
 *
 * Output layout mirrors the standalone layout exactly, because `server.js`
 * resolves its dependencies by walking up from its own directory:
 *
 *   standalone/
 *     node_modules/…
 *     packages/mukti-web/
 *       server.js  .next/…  .next/static/…  public/…
 *
 * Usage: node scripts/assemble-standalone.mjs   (after `next build`)
 */
import { cpSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = join(PACKAGE_ROOT, '.next');
const SOURCE_STANDALONE = join(BUILD, 'standalone');
const OUT = join(PACKAGE_ROOT, 'standalone');
/** Where this package's own files sit inside the standalone tree. */
const APP_SUBPATH = join('packages', 'mukti-web');

/**
 * Build tooling that Next's dependency tracer pulls in but the standalone
 * production server never runs — it compiles nothing at runtime. Removing
 * these is the difference between a ~160 MB and a ~90 MB package.
 *
 * `@img/*` (sharp's platform binaries) is deliberately NOT here: image
 * optimization genuinely uses it at runtime.
 */
const PRUNE = ['@rspack', '@esbuild', 'esbuild', 'terser', 'uglify-js'];

/**
 * Scopes pruned selectively — everything inside except the listed keeps.
 *
 * `@swc` cannot be pruned or kept wholesale. It holds the compiler (`core`
 * plus a `core-<platform>` native binary, 22 MB, which the standalone server
 * never runs — and which is built for the *publishing* machine's platform, so
 * shipping it sends a macOS binary to Linux users) alongside `helpers`, a
 * RUNTIME dependency of Next's compiled server: it is required by
 * `next/dist/shared/lib/constants.js` on first import.
 *
 * Dropping the whole scope ships a server that crashes immediately — masked
 * inside the repo, where the resolver walks up into the workspace root
 * node_modules, and fatal in an isolated install. The release pipeline's
 * isolation smoke test exists because of exactly that failure.
 *
 * Listing keeps rather than removals is deliberate: the platform binary is
 * named for whichever machine ran the build, so it cannot be enumerated ahead
 * of time, while the runtime requirement is a fixed, known name.
 */
const PRUNE_SCOPE_EXCEPT = {
  '@swc': ['helpers'],
};

/** Directories under `public/` that are not referenced by the app. */
const PRUNE_PUBLIC = ['demo'];

function fail(message) {
  process.stderr.write(`assemble-standalone: ${message}\n`);
  process.exit(1);
}

function megabytes(path) {
  let total = 0;
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) total += statSync(full).size;
    }
  };
  walk(path);
  return (total / 1024 / 1024).toFixed(1);
}

if (!existsSync(SOURCE_STANDALONE)) {
  fail(`no standalone build at ${SOURCE_STANDALONE} — run \`next build\` first`);
}

rmSync(OUT, { force: true, recursive: true });
cpSync(SOURCE_STANDALONE, OUT, { recursive: true });

const app = join(OUT, APP_SUBPATH);

// Local env files: never publish a developer's environment.
for (const entry of readdirSync(app)) {
  if (entry.startsWith('.env')) rmSync(join(app, entry), { force: true });
}

// Client assets and public files, which the standalone output leaves out.
cpSync(join(BUILD, 'static'), join(app, '.next', 'static'), { recursive: true });
cpSync(join(PACKAGE_ROOT, 'public'), join(app, 'public'), {
  filter: (source) => !PRUNE_PUBLIC.some((name) => source.endsWith(join('public', name))),
  recursive: true,
});

for (const name of PRUNE) {
  rmSync(join(OUT, 'node_modules', name), { force: true, recursive: true });
}

for (const [scope, keep] of Object.entries(PRUNE_SCOPE_EXCEPT)) {
  const scopeDir = join(OUT, 'node_modules', scope);
  if (!existsSync(scopeDir)) {
    continue;
  }
  for (const entry of readdirSync(scopeDir)) {
    if (keep.includes(entry)) {
      continue;
    }
    rmSync(join(scopeDir, entry), { force: true, recursive: true });
  }
  // A keep that is not there means the dependency moved or was renamed —
  // which would otherwise ship a tree that only fails once installed.
  for (const name of keep) {
    if (!existsSync(join(scopeDir, name))) {
      fail(`${scope}/${name} is missing — it is required at runtime; check the prune rules`);
    }
  }
}

if (!existsSync(join(app, 'server.js'))) {
  fail('assembled tree has no server.js — the standalone layout has changed');
}

process.stdout.write(`assembled ${OUT} (${megabytes(OUT)} MB)\n`);
