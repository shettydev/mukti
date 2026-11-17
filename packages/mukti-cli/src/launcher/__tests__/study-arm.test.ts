import { build } from 'esbuild';
/** Exercise both real launch entrypoints without starting services or probing AI CLIs. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'mukti-study-arm-'));
const modes = [
  { entry: 'packages/mukti-cli/src/index.ts', name: 'published' },
  { entry: 'scripts/start-local.ts', name: 'repo' },
] as const;

before(async () => {
  for (const mode of modes) {
    await build({
      bundle: true,
      entryPoints: [join(root, mode.entry)],
      format: 'esm',
      outfile: join(directory, `${mode.name}.mjs`),
      platform: 'node',
      plugins: [
        {
          name: 'no-services',
          setup(builder) {
            const stubs: Record<string, string> = {
              '@muktiai/web': `export const webServerEntry = () => '/fake/web/server.js';
                export const webServerEnv = () => ({});`,
              'boot.ts': `export async function boot(plan) {
                console.log('BOOT:' + JSON.stringify({
                  apiArm: plan.api.env.MUKTI_STUDY_ARM ?? null,
                  provider: plan.api.env.AI_PROVIDER,
                  studyArm: plan.studyArm ?? null
                }));
              }`,
              'database.ts': `export const mongoUri = () => 'mongodb://localhost:27017/mukti';
                export const createDatabaseSpec = () => ({});`,
              'net.ts': `export const isPortInUse = async () => false;
                export const findFreePort = async (port) => port;
                export const reserveFreePort = async () => 27017;`,
              'preflight.ts': 'export const runPreflight = async () => {};',
              'providers.ts': `export const SUPPORTED_PROVIDERS = [{ id: 'codex' }];
                export async function selectProviderOrExit(options) {
                  console.log('SELECT');
                  return { provider: { id: options.explicit ?? 'codex' },
                    source: 'option', remember: options.save };
                }`,
            };
            builder.onResolve(
              {
                filter:
                  /(?:launcher\/(?:boot|database|net|preflight|providers)\.ts$|^@muktiai\/web$)/,
              },
              (args) => ({
                namespace: 'stub',
                path:
                  args.path.split('/').pop() === 'web'
                    ? '@muktiai/web'
                    : args.path.split('/').pop()!,
              })
            );
            builder.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
              contents: stubs[args.path],
              loader: 'js',
            }));
          },
        },
      ],
    });
  }
});

after(() => rmSync(directory, { force: true, recursive: true }));

for (const mode of modes) {
  function launch(args: string[], home: string, inheritedArm = 'baseline-direct') {
    return spawnSync(process.execPath, [join(directory, `${mode.name}.mjs`), ...args], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, MUKTI_HOME: home, MUKTI_STUDY_ARM: inheritedArm },
      timeout: 15_000,
    });
  }

  for (const arm of ['baseline-socratic', 'baseline-direct']) {
    test(`${mode.name}: passes explicit ${arm} to the API and launch summary`, () => {
      const home = join(directory, `${mode.name}-${arm}`);
      const result = launch(['--study-arm', arm, '--provider', 'codex', '--save'], home);
      assert.equal(result.status, 0, result.stderr);
      assert.match(
        result.stdout,
        new RegExp(`BOOT:.*"apiArm":"${arm}".*"provider":"codex".*"studyArm":"${arm}"`)
      );
      const saved = readFileSync(join(home, 'config.json'), 'utf8');
      assert.deepEqual(JSON.parse(saved), { provider: 'codex', version: 1 });
      assert.doesNotMatch(saved, /study|baseline/);

      const ordinary = launch([], home);
      assert.equal(ordinary.status, 0, ordinary.stderr);
      assert.match(ordinary.stdout, /BOOT:.*"apiArm":null.*"studyArm":null/);
    });
  }

  for (const args of [['--study-arm', 'control'], ['--study-arm'], ['--study-arm', '--save']]) {
    test(`${mode.name}: rejects ${args.join(' ')} before provider selection or services`, () => {
      const result = launch(args, join(directory, `${mode.name}-invalid`));
      assert.equal(result.status, 1, result.stderr);
      const output = result.stdout + result.stderr;
      assert.match(output, /baseline-socratic/);
      assert.match(output, /baseline-direct/);
      assert.doesNotMatch(output, /SELECT|BOOT:/);
    });
  }
}
