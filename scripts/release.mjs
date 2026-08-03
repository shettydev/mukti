#!/usr/bin/env node
/**
 * Release pipeline for the npx distribution: `muktiai`, `@muktiai/api`, `@muktiai/web`.
 *
 * @remarks
 * Follows paperclip's `generate-npm-package-json.mjs` pattern: the development
 * manifests are backed up, publishable ones written in their place, the
 * packages published, and the development manifests restored — even on
 * failure. The workspace stays in development shape at all times except for
 * the duration of the publish itself.
 *
 * Three rewrites make a development manifest publishable:
 *
 * - The CLI's `@muktiai/api` / `@muktiai/web` dependencies are pinned to the exact
 *   versions being published, sourced from those packages' own manifests — a
 *   single build, so the three cannot drift (npm caches each independently).
 * - The web app's `dependencies` become empty: its standalone tree vendors
 *   everything the server needs, and shipping the development list would make
 *   every `npx muktiai` install three.js, R3F and the rest a second time.
 * - `devDependencies` are dropped from the published manifests: the CLI is
 *   bundled by esbuild, and the other two ship only built output.
 *
 * The pipeline is gated: every package must build and type-check cleanly
 * before anything is published, the built artifacts must exist, and no
 * workspace-internal reference (`workspace:`, `file:`, `link:`, `portal:`)
 * may survive into a publishable manifest. `nest build` and `next build`
 * type-check as part of building; the CLI has an explicit `tsc --noEmit`.
 *
 * Publishing is in dependency order — api, web, then the CLI — so the CLI's
 * pinned dependencies always resolve by the time it is published.
 *
 * Usage:
 *   node scripts/release.mjs [--tag beta] [--dry-run] [--skip-build]
 *
 *   --tag         npm dist-tag to publish under (default `beta`). Nothing is
 *                 published under `latest`; promotion is a separate step.
 *   --dry-run     Run the full gate and manifest rewrite, then `npm pack
 *                 --dry-run` instead of publishing. No registry needed.
 *   --skip-build  Reuse existing build output (for iterating on this script).
 *                 The artifact checks still run, so stale output is caught.
 */
import { spawn, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Publish order is dependency order — do not reorder. */
const PACKAGES = [
  {
    dir: 'packages/mukti-api',
    build: ['run', 'build'],
    /** Artifacts that must exist before this package may be published. */
    artifacts: ['dist/start.js'],
  },
  {
    dir: 'packages/mukti-web',
    build: ['run', 'build:standalone'],
    artifacts: ['standalone/packages/mukti-web/server.js'],
  },
  {
    dir: 'packages/mukti-cli',
    build: ['run', 'build'],
    typecheck: ['run', 'typecheck'],
    artifacts: ['dist/index.mjs', 'dist/run-api.mjs', 'dist/embedded-mongo.mjs'],
  },
];

/** Dependency-value protocols that must never reach a published manifest. */
const FORBIDDEN_REF = /^(workspace|file|link|portal):/;

function fail(message) {
  process.stderr.write(`release: ${message}\n`);
  process.exit(1);
}

function run(command, args, cwd, what) {
  process.stdout.write(`\n▸ ${what}\n`);
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
  if (result.status !== 0) {
    fail(`${what} failed — nothing was published`);
  }
}

function readManifest(dir) {
  return JSON.parse(readFileSync(join(REPO_ROOT, dir, 'package.json'), 'utf8'));
}

function parseArgs(argv) {
  const options = { dryRun: false, skipBuild: false, tag: 'beta' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--skip-build') options.skipBuild = true;
    else if (arg === '--tag') {
      const tag = argv[++i];
      if (!tag) fail('--tag needs a value');
      if (tag === 'latest') {
        fail('publishing under `latest` is not this script\'s job — promote explicitly (task 9.8)');
      }
      options.tag = tag;
    } else {
      fail(`unknown option ${arg}`);
    }
  }
  return options;
}

/** Asserts a manifest carries no workspace-internal dependency references. */
function verifyNoInternalRefs(name, manifest) {
  const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  for (const section of sections) {
    for (const [dep, version] of Object.entries(manifest[section] ?? {})) {
      if (FORBIDDEN_REF.test(version) || version.includes('../')) {
        fail(`${name}: ${section}.${dep} is "${version}" — a workspace-internal reference`);
      }
    }
  }
}

const options = parseArgs(process.argv.slice(2));

// ── Preflight ──────────────────────────────────────────────────────────────

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 11)) {
  fail(`Node >= 20.11 required (running ${process.versions.node})`);
}

if (!options.dryRun) {
  const whoami = spawnSync('npm', ['whoami'], { encoding: 'utf8' });
  if (whoami.status !== 0) {
    fail('not logged in to npm — run `npm login` first');
  }
  process.stdout.write(`publishing as ${whoami.stdout.trim()} (tag: ${options.tag})\n`);
}

// ── Build and type-check gate (nothing publishes on failure) ───────────────

if (!options.skipBuild) {
  for (const pkg of PACKAGES) {
    run('bun', pkg.build, join(REPO_ROOT, pkg.dir), `build ${pkg.dir}`);
    if (pkg.typecheck) {
      run('bun', pkg.typecheck, join(REPO_ROOT, pkg.dir), `type-check ${pkg.dir}`);
    }
  }
}

for (const pkg of PACKAGES) {
  for (const artifact of pkg.artifacts) {
    if (!existsSync(join(REPO_ROOT, pkg.dir, artifact))) {
      fail(`${pkg.dir}: expected build artifact ${artifact} is missing — run without --skip-build`);
    }
  }
}

// ── Isolated smoke test ────────────────────────────────────────────────────
//
// Boots the assembled web standalone from a sandbox with no parent
// node_modules, so the resolver cannot walk up into the repo and mask a
// pruned runtime dependency. (Learned the hard way: pruning `@swc/helpers`
// passed every repo check and crashed the published bundle on first require.)
{
  const sandbox = mkdtempSync(join(tmpdir(), 'mukti-web-smoke-'));
  cpSync(join(REPO_ROOT, 'packages/mukti-web', 'standalone'), sandbox, { recursive: true });
  const port = 4300 + Math.floor(Math.random() * 500);
  const server = spawn(process.execPath, ['server.js'], {
    cwd: join(sandbox, 'packages', 'mukti-web'),
    env: { ...process.env, HOSTNAME: '127.0.0.1', PORT: String(port) },
    stdio: 'ignore',
  });
  try {
    const deadline = Date.now() + 30_000;
    let up = false;
    while (!up && Date.now() < deadline && server.exitCode === null) {
      try {
        // Any rendered route proves the module graph loaded and middleware ran.
        up = (await fetch(`http://127.0.0.1:${port}/chat`, { redirect: 'manual' })).status === 200;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    if (!up) {
      fail(
        'web standalone does not boot in isolation — a runtime dependency was likely pruned from the assembled tree'
      );
    }
    process.stdout.write('\n▸ smoke test: web standalone boots in isolation\n');
  } finally {
    server.kill('SIGTERM');
    rmSync(sandbox, { force: true, recursive: true });
  }
}

// ── Compute publishable manifests ──────────────────────────────────────────

const [api, web, cli] = PACKAGES.map((pkg) => readManifest(pkg.dir));

// Exact pins from this single build — the three packages cannot drift.
const publishableCli = JSON.parse(JSON.stringify(cli));
publishableCli.dependencies['@muktiai/api'] = api.version;
publishableCli.dependencies['@muktiai/web'] = web.version;
delete publishableCli.devDependencies;

// The standalone tree vendors everything; shipping the development
// dependencies would install them a second time on every `npx muktiai`.
const publishableWeb = JSON.parse(JSON.stringify(web));
publishableWeb.dependencies = {};
delete publishableWeb.devDependencies;

const publishableApi = JSON.parse(JSON.stringify(api));

const publishable = [
  { dir: PACKAGES[0].dir, manifest: publishableApi },
  { dir: PACKAGES[1].dir, manifest: publishableWeb },
  { dir: PACKAGES[2].dir, manifest: publishableCli },
];

// ── Verification ───────────────────────────────────────────────────────────

for (const { manifest } of publishable) {
  verifyNoInternalRefs(manifest.name, manifest);
}

if (
  publishableCli.dependencies['@muktiai/api'] !== api.version ||
  publishableCli.dependencies['@muktiai/web'] !== web.version
) {
  fail('CLI pins do not match the API/web versions being published');
}

process.stdout.write(
  `\nverified: no workspace-internal references; pins ` +
    `@muktiai/api@${api.version}, @muktiai/web@${web.version}\n`
);

// ── Publish (or pack) with manifest backup and restore ─────────────────────

const backups = new Map(
  publishable.map(({ dir }) => [dir, readFileSync(join(REPO_ROOT, dir, 'package.json'), 'utf8')])
);

function restoreManifests() {
  for (const [dir, content] of backups) {
    writeFileSync(join(REPO_ROOT, dir, 'package.json'), content);
  }
}

// Failures here must NOT process.exit inside the try — that would skip the
// finally and leave the rewritten manifests behind. Record, restore, then exit.
let publishFailure;
try {
  for (const { dir, manifest } of publishable) {
    writeFileSync(
      join(REPO_ROOT, dir, 'package.json'),
      `${JSON.stringify(manifest, null, 2)}\n`
    );
  }

  for (const { dir, manifest } of publishable) {
    const cwd = join(REPO_ROOT, dir);
    const what = options.dryRun
      ? `pack --dry-run ${manifest.name}`
      : `publish ${manifest.name}@${manifest.version}`;
    const args = options.dryRun ? ['pack', '--dry-run'] : ['publish', '--tag', options.tag];
    process.stdout.write(`\n▸ ${what}\n`);
    const result = spawnSync('npm', args, { cwd, stdio: 'inherit' });
    if (result.status !== 0) {
      publishFailure =
        `${what} failed — aborting. Development manifests were restored; ` +
        `any package published before the failure remains published — check the registry before re-running.`;
      break;
    }
  }
} finally {
  restoreManifests();
}

if (publishFailure) {
  fail(publishFailure);
}

// ── Summary ────────────────────────────────────────────────────────────────

const names = publishable.map(({ manifest }) => `${manifest.name}@${manifest.version}`);
if (options.dryRun) {
  process.stdout.write(`\ndry run complete: ${names.join(', ')}\n`);
  process.stdout.write('publish for real with: node scripts/release.mjs\n');
} else {
  process.stdout.write(`\npublished under tag \`${options.tag}\`: ${names.join(', ')}\n`);
  process.stdout.write(`verify on a clean machine with: npx muktiai@${options.tag}\n`);
}
