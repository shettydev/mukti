#!/usr/bin/env bun
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { validateAgainstSchema } from '../../packages/mukti-api/src/modules/session-export/schema-validator';
import type { SessionExport } from '../../packages/mukti-api/src/modules/session-export/session-export.types';

type Metric = number | null;
type RecordRow = {
  arm: string;
  taskType: string;
  metrics: Record<string, Metric>;
  tokens: { provider: string; kind: string; value: Metric; missing: number }[];
};
const missing = (v: unknown) =>
  v === '' || v === null || v === undefined || v === 'not_reported' || v === 'not reported';
function number(v: unknown): Metric {
  if (missing(v)) return null;
  if (
    (typeof v !== 'number' && typeof v !== 'string') ||
    !/^\d+(\.\d+)?$/.test(String(v)) ||
    !Number.isFinite(Number(v))
  )
    throw Error(`Invalid nonnegative number: ${v}`);
  return Number(v);
}
/** RFC-style quoted CSV, including escaped quotes and embedded newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else field += c;
    } else if (c === '"' && !field && !closed) quoted = true;
    else if (c === ',' || c === '\n') {
      row.push(field);
      field = '';
      closed = false;
      if (c === '\n') {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else if (c !== '\r') {
      if (closed || c === '"') throw Error('Malformed CSV quoting');
      field += c;
    }
  }
  if (quoted) throw Error('Unterminated CSV quote');
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
const csvCell = (v: unknown) =>
  /[",\n\r]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v);
const mdCell = (v: unknown) =>
  String(v)
    .replaceAll('|', '\\|')
    .replace(/[\r\n]/g, ' ');
function stats(values: Metric[]) {
  const sorted = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return [
    n ? (n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2) : 'not reported',
    n ? sorted[0] : 'not reported',
    n ? sorted[n - 1] : 'not reported',
    values.length - n,
  ];
}
export function summarize(dir: string) {
  const config = JSON.parse(readFileSync(join(dir, 'session-map.json'), 'utf8'));
  if (!Array.isArray(config.sessions))
    throw Error('session-map.json requires sessions mapping array');
  const mapping = new Map<string, string>();
  for (const entry of config.sessions) {
    if (
      typeof entry.source !== 'string' ||
      !entry.source ||
      !['debugging', 'design-review', 'cs1'].includes(entry.taskType) ||
      mapping.has(entry.source)
    )
      throw Error('Invalid or duplicate session mapping');
    mapping.set(entry.source, entry.taskType);
  }
  const used = new Set<string>();
  function task(source: string) {
    if (!mapping.has(source) || used.has(source))
      throw Error(`Missing or duplicate mapping: ${source}`);
    used.add(source);
    return mapping.get(source)!;
  }
  const schema = JSON.parse(
    readFileSync(new URL('../../docs/research/session-export.schema.json', import.meta.url), 'utf8')
  );
  const records: RecordRow[] = [];
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'session-map.json')
    .sort()) {
    const data = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    const errors = validateAgainstSchema(data, schema);
    if (errors.length) throw Error(`${file}: ${errors.join('; ')}`);
    const e = data as SessionExport;
    const s = e.summary;
    const tokens: RecordRow['tokens'] = [];
    // Per-reply counts, never a mixed-provider summary total. Unknown providers stay missing.
    const replies = e.messages.filter((m) => m.role === 'assistant');
    for (const provider of [...new Set(replies.map((m) => m.reply?.provider ?? 'not_reported'))]) {
      const selected = replies.filter((m) => (m.reply?.provider ?? 'not_reported') === provider);
      for (const kind of ['promptTokens', 'completionTokens', 'totalTokens'] as const) {
        const values = selected.map((m) => number(m.reply?.[kind]));
        const absent = values.filter((v) => v === null).length;
        tokens.push({
          provider,
          kind,
          value:
            absent || provider === 'not_reported'
              ? null
              : values.reduce<number>((a, b) => a + (b ?? 0), 0),
          missing: absent,
        });
      }
    }
    records.push({
      arm: e.configuration.studyArm?.name ?? 'mukti',
      taskType: task(file),
      metrics: {
        timeToFirstReplyMs: s.timeToFirstReplyMs,
        totalDurationMs: s.totalDurationMs,
        exchanges: s.exchanges,
        assistantReplies: s.assistantReplies,
        ...s.turnKinds,
        wrapUpReached: Number(s.wrapUpReached),
      },
      tokens,
    });
  }
  const directPath = join(dir, 'direct-cli-log.csv');
  if (existsSync(directPath)) {
    const [headers, ...rows] = parseCsv(readFileSync(directPath, 'utf8'));
    const expected = readFileSync(
      new URL('../../docs/research/templates/direct-cli-log.csv', import.meta.url),
      'utf8'
    )
      .trim()
      .split(',');
    if (!headers || headers.join(',') !== expected.join(','))
      throw Error('Direct CLI CSV header must match template');
    for (const values of rows) {
      if (values.length !== headers.length) throw Error('Direct CLI CSV column count mismatch');
      const r = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
      if (!r.sessionId || !r.provider || !r.model)
        throw Error('Direct CLI sessionId/provider/model required');
      for (const key of ['startedAt', 'endedAt'])
        if (!missing(r[key]) && !Number.isFinite(Date.parse(r[key]))) throw Error(`Invalid ${key}`);
      const metrics: Record<string, Metric> = {};
      for (const key of [
        'timeToFirstReplyMs',
        'totalDurationMs',
        'exchanges',
        'assistantReplies',
        'ordinary',
        'more_help',
        'explain',
        'wrap_up',
      ])
        metrics[key] = number(r[key]);
      if (!missing(r.wrapUpReached) && !['true', 'false'].includes(r.wrapUpReached))
        throw Error('Invalid wrapUpReached');
      metrics.wrapUpReached = missing(r.wrapUpReached) ? null : Number(r.wrapUpReached === 'true');
      const tokens = ['prompt', 'completion', 'total'].map((part) => {
        const absent = number(r[`${part}RepliesNotReported`]);
        const included = number(r[`${part}RepliesIncluded`]);
        const value = number(r[`${part}Tokens`]);
        if (
          absent === null ||
          included === null ||
          !Number.isInteger(absent) ||
          !Number.isInteger(included)
        )
          throw Error('Token reply counts must be recorded integers');
        if (metrics.assistantReplies !== null && included + absent !== metrics.assistantReplies)
          throw Error('Token reply counts must sum to assistantReplies');
        return {
          provider: r.provider,
          kind: `${part}Tokens`,
          value: absent || !included || r.provider === 'not_reported' ? null : value,
          missing: absent,
        };
      });
      records.push({ arm: 'direct-cli', taskType: task(r.sessionId), metrics, tokens });
    }
  }
  if (!records.length) throw Error('No sessions to summarize');
  for (const source of mapping.keys())
    if (!used.has(source)) throw Error(`Unused mapping: ${source}`);
  const output: unknown[][] = [
    [
      'arm',
      'taskType',
      'n',
      'metric',
      'median',
      'min',
      'max',
      'notReported',
      'provider',
      'replyCountsNotReported',
    ],
  ];
  const groups = new Map<string, RecordRow[]>();
  for (const r of records) {
    const k = JSON.stringify([r.arm, r.taskType]);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  for (const group of groups.values()) {
    const { arm, taskType } = group[0];
    for (const metric of Object.keys(group[0].metrics))
      output.push([
        arm,
        taskType,
        group.length,
        metric,
        ...stats(group.map((r) => r.metrics[metric])),
        '',
        '',
      ]);
    const keys = new Set(
      group.flatMap((r) => r.tokens.map((t) => JSON.stringify([t.provider, t.kind])))
    );
    for (const key of keys) {
      const [provider, kind] = JSON.parse(key);
      const counts = group.map((r) =>
        r.tokens.find((t) => t.provider === provider && t.kind === kind)
      );
      output.push([
        arm,
        taskType,
        group.length,
        `token${kind[0].toUpperCase()}${kind.slice(1)}`,
        ...stats(counts.map((t) => t?.value ?? null)),
        provider,
        counts.reduce((a, t) => a + (t?.missing ?? 0), 0),
      ]);
    }
  }
  const csv = output.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
  const overview = [
    '| Arm | Task type | Sessions |',
    '| --- | --- | --- |',
    ...Array.from(
      groups.values(),
      (group) => `| ${mdCell(group[0].arm)} | ${mdCell(group[0].taskType)} | ${group.length} |`
    ),
  ].join('\n');
  const md =
    '# Session evaluation summary\n\nNo cross-provider token comparison. Token rows are provider-specific, not normalized or ranked. Partial totals are excluded from medians. Missing sessions and missing reply counts are explicit. n is sessions per arm × task type. Times are milliseconds. Wrap-up is 0/1, not a transfer score.\n\n' +
    '## Arm overview\n\n' +
    overview +
    '\n\n## Measures\n\n' +
    output
      .map(
        (row, i) =>
          '| ' +
          row.map(mdCell).join(' | ') +
          ' |' +
          (i === 0 ? '\n| ' + row.map(() => '---').join(' | ') + ' |' : '')
      )
      .join('\n') +
    '\n';
  writeFileSync(join(dir, 'summary.csv'), csv);
  writeFileSync(join(dir, 'summary.md'), md);
}
if (import.meta.main) {
  try {
    if (process.argv.length !== 3) throw Error('Usage: bun run eval:summarize <exports-dir>');
    summarize(resolve(process.argv[2]));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
