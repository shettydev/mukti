import type {
  ExportMessage,
  ExportReplyMetadata,
  Reported,
  SessionExport,
  TokenTotal,
} from './session-export.types';

import { NOT_REPORTED } from './session-export.types';

/**
 * Renders an export as the versioned JSON record. Pure and deterministic:
 * keys are written in a fixed order so two exports of the same dialogue
 * differ only in `exportId` and `exportedAt`.
 */
export function renderJson(model: SessionExport): string {
  return `${JSON.stringify(sortKeys(model), null, 2)}\n`;
}

/**
 * Renders an export as a readable Markdown transcript, for publishing.
 *
 * @remarks
 * Pure. User text is escaped so it cannot add headings, tables or links of
 * its own, and every unreported value reads "not reported", never 0.
 */
export function renderMarkdown(model: SessionExport): string {
  const { configuration: c, summary: s } = model;
  const lines: string[] = [];

  lines.push(`# Mukti session export`, '');
  if (c.dialogueTitle) {
    lines.push(`**Dialogue:** ${escapeInline(c.dialogueTitle)}`, '');
  }
  if (c.studyArm) {
    lines.push(
      `> Study arm: **${c.studyArm.name}**. Replies came from the published baseline prompt, not Mukti's Socratic engine.`,
      '',
    );
  }

  lines.push('## Configuration', '');
  lines.push('| Setting | Value |', '| --- | --- |');
  row(lines, 'Surface', surfaceLabel(c.surface));
  if (c.nodeType) {
    row(lines, 'Node type', escapeCell(c.nodeType));
  }
  if (c.nodeLabel) {
    row(lines, 'Node', escapeCell(c.nodeLabel));
  }
  row(
    lines,
    'Technique',
    c.technique ? escapeCell(c.technique) : 'not recorded',
  );
  row(lines, 'Mode', c.mode);
  row(lines, 'Providers', listOrNone(c.providers));
  row(lines, 'Models', listOrNone(c.models));
  row(lines, 'Mukti version', escapeCell(c.muktiVersion));
  if (c.studyArm) {
    row(lines, 'Study arm', c.studyArm.name);
    row(lines, 'Baseline prompt SHA-256', `\`${c.studyArm.promptSha256}\``);
  }
  row(lines, 'Export', exportLabel(model));
  row(lines, 'Export id', `\`${model.exportId}\``);
  row(lines, 'Exported at', model.exportedAt);
  row(lines, 'Schema version', String(model.schemaVersion));
  lines.push('');

  lines.push('## Summary', '');
  lines.push('| Measure | Value |', '| --- | --- |');
  row(lines, 'Started', s.startedAt ?? 'not recorded');
  row(lines, 'Ended', s.endedAt ?? 'not recorded');
  row(lines, 'Total duration', duration(s.totalDurationMs));
  row(lines, 'Time to first reply', duration(s.timeToFirstReplyMs));
  row(lines, 'Exchanges', String(s.exchanges));
  row(lines, 'Assistant replies', String(s.assistantReplies));
  row(lines, 'More help', String(s.turnKinds.more_help));
  row(lines, 'Explain', String(s.turnKinds.explain));
  row(lines, 'Wrap up', String(s.turnKinds.wrap_up));
  row(lines, 'Wrap-up reached', s.wrapUpReached ? 'yes' : 'no');
  row(lines, 'Prompt tokens', tokenLine(s.tokens.prompt));
  row(lines, 'Completion tokens', tokenLine(s.tokens.completion));
  row(lines, 'Total tokens', tokenLine(s.tokens.total));
  lines.push('');

  lines.push('## Transcript', '');
  if (!model.messages.length) {
    lines.push('_No messages._', '');
  }
  for (const message of model.messages) {
    lines.push(...renderMessage(message), '');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function duration(ms: null | number): string {
  if (ms === null) {
    return 'not recorded';
  }
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s (${ms} ms)`;
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s (${ms} ms)`;
}

/** Escapes text for a single table cell (no line breaks, no pipes). */
function escapeCell(text: string): string {
  return escapeInline(text).replace(/\r?\n/g, ' ');
}

/**
 * Escapes text so it renders literally inside a Markdown paragraph.
 *
 * @remarks
 * Inline syntax is escaped everywhere. Block markers (`-`, `+`, `>`, a
 * numbered list) only start a block at the beginning of a line, so they are
 * escaped there only, which keeps ordinary words like "claude-code" readable.
 */
function escapeInline(text: string): string {
  return text
    .replace(/([\\`*_{}[\]()#!|<~])/g, '\\$1')
    .replace(/^(\s*)([-+>])/, '$1\\$2')
    .replace(/^(\s*\d+)([.)])/, '$1\\$2');
}

function exportLabel(model: SessionExport): string {
  const mode =
    model.exportMode === 'metrics' ? 'metrics only (no message text)' : 'full';
  return model.redactions
    ? `${mode}, ${model.redactions} redaction term(s) applied`
    : mode;
}

function listOrNone(values: string[]): string {
  return values.length ? values.map(escapeCell).join(', ') : 'not reported';
}

/** A message body as a quoted block, every line escaped. */
function quote(content: string): string[] {
  return content.split(/\r?\n/).map((line) => `> ${escapeInline(line)}`);
}

function renderMessage(message: ExportMessage): string[] {
  const who = message.role === 'user' ? 'Learner' : 'Mukti';
  const out = [`### ${message.sequence}. ${who} · ${message.timestamp}`, ''];
  if (message.reply) {
    out.push(replyLine(message.reply), '');
  }
  if (message.content !== undefined) {
    out.push(...quote(message.content));
  } else {
    out.push('_Message text omitted (metrics only)._');
  }
  return out;
}

function replyLine(reply: ExportReplyMetadata): string {
  const parts = [
    `turn: ${reply.turnKind}`,
    `help level: ${show(reply.helpLevel)}`,
    `latency: ${show(reply.latencyMs, ' ms')}`,
    `provider: ${showText(reply.provider)}`,
    `model: ${showText(reply.model)}`,
    `tokens: ${show(reply.promptTokens)} in / ${show(reply.completionTokens)} out / ${show(reply.totalTokens)} total`,
  ];
  return `_${parts.join(' · ')}_`;
}

function row(lines: string[], label: string, value: string): void {
  lines.push(`| ${label} | ${value} |`);
}

function show(value: Reported<number>, unit = ''): string {
  return value === NOT_REPORTED ? 'not reported' : `${value}${unit}`;
}

function showText(value: Reported<string>): string {
  return value === NOT_REPORTED ? 'not reported' : escapeInline(value);
}

/** Recursively orders object keys so the JSON text is stable. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}

function surfaceLabel(surface: SessionExport['configuration']['surface']) {
  switch (surface) {
    case 'canvas_node':
      return 'Canvas node dialogue';
    case 'chat':
      return 'Chat';
    case 'thought_map_node':
      return 'Thought-map node dialogue';
  }
}

function tokenLine(total: TokenTotal): string {
  const replies = total.repliesIncluded + total.repliesNotReported;
  if (!replies) {
    return 'no replies';
  }
  if (!total.repliesIncluded) {
    return `not reported (0 of ${replies} replies)`;
  }
  return `${total.total} over ${total.repliesIncluded} of ${replies} replies${
    total.repliesNotReported
      ? ` (${total.repliesNotReported} not reported)`
      : ''
  }`;
}
