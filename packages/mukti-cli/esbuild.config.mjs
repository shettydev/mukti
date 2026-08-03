/**
 * Bundles the CLI into a single file, keeping the runtime packages external.
 *
 * @remarks
 * `@muktiai/api` and `@muktiai/web` stay external and are resolved at runtime:
 * they are large and change on their own cadence, so npm should cache them
 * independently of the CLI, which is small and changes often. Bundling them
 * would force a full re-download on every CLI patch release — the whole reason
 * for publishing three packages instead of one.
 *
 * `mongodb-memory-server` is external too: it resolves and downloads a mongod
 * binary at runtime and is loaded only by the database daemon, which runs as
 * its own process.
 *
 * Everything else (the prompt UI, colours, the launcher itself) is inlined, so
 * CLI startup costs one file read.
 */
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'dist');

rmSync(OUT, { force: true, recursive: true });
mkdirSync(OUT, { recursive: true });

await build({
  // No `banner` shebang: esbuild preserves the one on `src/index.ts`, and a
  // second would land on line 2 as a syntax error.
  bundle: true,
  entryPoints: [join(ROOT, 'src/index.ts')],
  external: ['@muktiai/api', '@muktiai/web', 'mongodb-memory-server'],
  format: 'esm',
  logLevel: 'info',
  minify: false, // a readable stack trace is worth more than the kilobytes
  outfile: join(OUT, 'index.mjs'),
  platform: 'node',
  target: 'node20',
});

// Spawned as separate processes, so they ship as files rather than being
// bundled into the entry.
for (const file of ['src/run-api.mjs', 'src/launcher/embedded-mongo.mjs']) {
  copyFileSync(join(ROOT, file), join(OUT, file.split('/').pop()));
}

process.stdout.write('built dist/index.mjs + run-api.mjs + embedded-mongo.mjs\n');
