import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const daemon = fileURLToPath(new URL('../embedded-mongo.mjs', import.meta.url));

function runWithLock(contents?: string) {
  const dir = mkdtempSync(join(tmpdir(), 'mukti-db-lock-'));
  const lockPath = join(dir, 'mongod.lock');
  if (contents !== undefined) {
    writeFileSync(lockPath, contents);
  }
  try {
    const result = spawnSync(process.execPath, [daemon], {
      encoding: 'utf8',
      env: {
        ...process.env,
        MONGOMS_RUNTIME_DOWNLOAD: 'false',
        MONGOMS_SYSTEM_BINARY: join(dir, 'missing-mongod'),
        MUKTI_LOCAL_DB_PATH: dir,
        MUKTI_LOCAL_MONGO_PORT: '60702',
      },
      timeout: 10_000,
    });
    return {
      ...result,
      lock: contents === undefined ? undefined : readFileSync(lockPath, 'utf8'),
    };
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
}

test('reports a live database lock owner before loading or starting MongoDB', () => {
  const contents = `${process.pid}\n`;
  const result = runWithLock(contents);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /database.*already in use/i);
  assert.match(result.stderr, new RegExp(`PID ${process.pid}\\b`));
  assert.match(result.stderr, /stop the previous Mukti launcher/i);
  assert.doesNotMatch(result.stderr, /SyntaxError|BinaryNotFoundError/);
  assert.equal(result.lock, contents, 'must not remove or rewrite another process lock');
});

for (const contents of ['', 'not-a-pid', '0', '-1']) {
  test(`does not treat ${JSON.stringify(contents)} as a live database owner`, () => {
    const result = runWithLock(contents);
    assert.equal(result.status, 1);
    assert.doesNotMatch(result.stderr, /database.*already in use/i);
    assert.match(result.stderr, /missing-mongod/);
    assert.equal(result.lock, contents);
  });
}

test('allows a stale positive PID to reach normal MongoDB startup', () => {
  const exited = spawnSync(process.execPath, ['-e', 'process.exit(0)']);
  assert.equal(exited.status, 0);
  assert.ok(exited.pid > 0);
  const contents = `${exited.pid}\n`;
  const result = runWithLock(contents);
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stderr, /database.*already in use/i);
  assert.match(result.stderr, /missing-mongod/);
  assert.equal(result.lock, contents);
});

test('starts normal binary resolution when there is no lock file', () => {
  const result = runWithLock();
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stderr, /database.*already in use/i);
  assert.match(result.stderr, /missing-mongod/);
});
