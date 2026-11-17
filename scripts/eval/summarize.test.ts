import { test, expect } from 'bun:test';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FIXTURE_EXPORT } from '../../packages/mukti-api/src/modules/session-export/__tests__/fixture-export';

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'eval-test-'));
  const a = structuredClone(FIXTURE_EXPORT);
  a.exportMode = 'metrics';
  a.messages.forEach((m) => delete m.content);
  const b = structuredClone(a);
  b.configuration.studyArm = { name: 'baseline-socratic', promptSha256: 'a'.repeat(64) };
  writeFileSync(join(dir, 'a.json'), JSON.stringify(a));
  writeFileSync(join(dir, 'b.json'), JSON.stringify(b));
  writeFileSync(
    join(dir, 'session-map.json'),
    JSON.stringify({
      sessions: [
        { source: 'a.json', taskType: 'debugging' },
        { source: 'b.json', taskType: 'debugging' },
        { source: 'direct-1', taskType: 'debugging' },
      ],
    })
  );
  const header = readFileSync('docs/research/templates/direct-cli-log.csv', 'utf8').trim();
  writeFileSync(
    join(dir, 'direct-cli-log.csv'),
    header +
      '\n' +
      'direct-1,codex,"model,quoted",2026-11-16T09:00:00Z,2026-11-16T09:01:00Z,not_reported,60000,1,1,1,0,0,0,false,not_reported,0,1,not_reported,0,1,not_reported,0,1\n'
  );
  return dir;
}
test('aggregates medians and ranges without combining provider token counts', () => {
  const dir = setup();
  try {
    const a = JSON.parse(readFileSync(join(dir, 'a.json'), 'utf8'));
    a.summary.timeToFirstReplyMs = 6000;
    a.messages[1].reply.provider = 'codex';
    a.messages[1].reply.totalTokens = 900;
    writeFileSync(join(dir, 'c.json'), JSON.stringify(a));
    const map = JSON.parse(readFileSync(join(dir, 'session-map.json'), 'utf8'));
    map.sessions.push({ source: 'c.json', taskType: 'debugging' });
    writeFileSync(join(dir, 'session-map.json'), JSON.stringify(map));
    expect(run(dir).exitCode).toBe(0);
    const csv = readFileSync(join(dir, 'summary.csv'), 'utf8');
    expect(csv).toContain('mukti,debugging,2,timeToFirstReplyMs,4000,2000,6000,0');
    expect(csv).toContain('mukti,debugging,2,tokenTotalTokens,900,900,900,1,codex,0');
    expect(csv).toContain(
      'mukti,debugging,2,tokenTotalTokens,not reported,not reported,not reported,2,claude-code,2'
    );
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test('rejects malformed direct CSV and duplicate mappings', () => {
  const dir = setup();
  try {
    writeFileSync(join(dir, 'direct-cli-log.csv'), 'wrong,header\n');
    expect(run(dir).stderr.toString()).toContain('header');
    writeFileSync(
      join(dir, 'session-map.json'),
      JSON.stringify({
        sessions: [
          { source: 'a.json', taskType: 'cs1' },
          { source: 'a.json', taskType: 'cs1' },
        ],
      })
    );
    expect(run(dir).stderr.toString()).toContain('duplicate');
  } finally {
    rmSync(dir, { recursive: true });
  }
});

function run(dir: string) {
  return Bun.spawnSync(['bun', 'scripts/eval/summarize.ts', dir], { cwd: process.cwd() });
}
test('real CLI summarizes two export arms and direct CSV with missing counts and isolated tokens', () => {
  const dir = setup();
  try {
    const result = run(dir);
    expect(result.exitCode).toBe(0);
    const md = readFileSync(join(dir, 'summary.md'), 'utf8');
    const csv = readFileSync(join(dir, 'summary.csv'), 'utf8');
    expect(md).toContain('baseline-socratic');
    expect(md).toContain('direct-cli');
    expect(md).toContain('mukti');
    expect(csv).toContain('mukti,debugging,1,timeToFirstReplyMs,2000,2000,2000,0');
    expect(csv).toContain(
      'direct-cli,debugging,1,timeToFirstReplyMs,not reported,not reported,not reported,1'
    );
    expect(md).toContain('## Arm overview');
    expect(md).toContain('| mukti | debugging | 1 |');
    expect(md).toContain('| baseline-socratic | debugging | 1 |');
    expect(md).toContain('| direct-cli | debugging | 1 |');
    expect(md).toContain('No cross-provider token comparison');
    expect(md).toContain('claude-code');
    expect(md).toContain('codex');
    expect(csv).toContain('tokenTotal');
  } finally {
    rmSync(dir, { recursive: true });
  }
});
test('rejects actual schema violations before writing output', () => {
  const dir = setup();
  try {
    const a = JSON.parse(readFileSync(join(dir, 'a.json'), 'utf8'));
    a.summary.exchanges = 'two';
    writeFileSync(join(dir, 'a.json'), JSON.stringify(a));
    const result = run(dir);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain('summary.exchanges');
  } finally {
    rmSync(dir, { recursive: true });
  }
});
test('requires sidecar task mapping rather than inferring from transcript', () => {
  const dir = setup();
  try {
    writeFileSync(join(dir, 'session-map.json'), '{"sessions":[]}');
    const result = run(dir);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain('mapping');
  } finally {
    rmSync(dir, { recursive: true });
  }
});
