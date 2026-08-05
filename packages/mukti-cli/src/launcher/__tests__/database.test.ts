/**
 * The first-run download must be visible.
 *
 * @remarks
 * On a machine with no cached mongod, the launcher waits on a 141 MB download
 * — by far the largest remaining cost once compilation is off the user's
 * machine. Rendering its progress depends on matching
 * `mongodb-memory-server`'s own output, which the launcher does not control:
 * if that wording drifts, the download silently becomes an unexplained
 * multi-minute stall with a spinner and no numbers.
 *
 * The strings below are the exact format emitted by
 * `MongoBinaryDownload.printDownloadProgress` (mongodb-memory-server 11.x),
 * including the trailing carriage return it uses to overwrite its own line.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MONGO_DOWNLOAD_PROGRESS, mongoUri } from '../database.ts';

test('matches mongodb-memory-server download progress and captures the percentage', () => {
  const cases: readonly (readonly [string, string])[] = [
    ['Downloading MongoDB "8.2.6": 0.4% (0.6mb / 141mb)\r', '0.4'],
    ['Downloading MongoDB "8.2.6": 57.3% (80.8mb / 141mb)\r', '57.3'],
    ['Downloading MongoDB "8.2.6": 100% (141mb / 141mb)\r', '100'],
    // Windows uses an escape sequence instead of a carriage return.
    ['Downloading MongoDB "8.2.6": 12% (17mb / 141mb)[0G', '12'],
  ];

  for (const [line, expected] of cases) {
    const match = MONGO_DOWNLOAD_PROGRESS.exec(line);
    assert.ok(match, `no match for: ${JSON.stringify(line)}`);
    assert.equal(match[1], expected);
  }
});

test('does not match unrelated database output', () => {
  for (const line of [
    'embedded MongoDB listening at mongodb://127.0.0.1:51555/',
    'Starting the MongoMemoryServer Instance failed',
  ]) {
    assert.equal(MONGO_DOWNLOAD_PROGRESS.exec(line), null);
  }
});

test('builds a connection URI the API can be given before the database exists', () => {
  assert.equal(mongoUri(51555), 'mongodb://127.0.0.1:51555/mukti');
});
