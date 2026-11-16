import type { HelpLevel, TurnKind } from '@muktiai/contracts';

import {
  type DeploymentMode,
  EXPORT_TURN_KINDS,
  type ExportConfiguration,
  type ExportMessage,
  type ExportReplyMetadata,
  type ExportSummary,
  type ExportSurface,
  NOT_REPORTED,
  type Reported,
  SESSION_EXPORT_SCHEMA_VERSION,
  type SessionExport,
  type StudyArm,
  type TokenTotal,
} from './session-export.types';

/** What a surface knows about the dialogue, besides its messages. */
export interface SourceDialogue {
  /** Canvas problem or map title; user text. */
  dialogueTitle?: string;
  messages: SourceMessage[];
  mode: DeploymentMode;
  muktiVersion: string;
  /** Node label; user text. */
  nodeLabel?: string;
  nodeType?: string;
  studyArm?: { name: StudyArm; promptSha256: string };
  surface: ExportSurface;
  technique: null | string;
}

/**
 * One stored message, from any surface, before it becomes an export message.
 * Every metadata field is optional: older messages predate most of them.
 */
export interface SourceMessage {
  content: string;
  meta?: {
    completionTokens?: number;
    latencyMs?: number;
    model?: string;
    promptTokens?: number;
    provider?: string;
    scaffoldLevel?: number;
    totalTokens?: number;
    turnKind?: TurnKind;
  };
  role: string;
  timestamp: Date | string | undefined;
}

/**
 * Builds the export model from a dialogue's stored messages.
 *
 * @remarks
 * Pure: the caller supplies the random export id and the clock. Messages get
 * 1-based sequence numbers in timestamp order (a stable sort, so a user
 * message and its reply that share a timestamp keep their stored order) and
 * no database id ever enters the model. A metadata value that was not
 * recorded becomes `not_reported`; nothing is estimated.
 */
export function assembleExport(
  dialogue: SourceDialogue,
  stamp: { exportedAt: Date; exportId: string },
): SessionExport {
  const ordered = dialogue.messages
    .filter(
      (m): m is SourceMessage & { role: 'assistant' | 'user' } =>
        m.role === 'assistant' || m.role === 'user',
    )
    .map((m, index) => ({ index, m, time: toTime(m.timestamp) }))
    .sort((a, b) => a.time - b.time || a.index - b.index);

  const messages: ExportMessage[] = ordered.map(({ m, time }, i) => ({
    content: m.content,
    ...(m.role === 'assistant' ? { reply: replyMetadata(m.meta) } : {}),
    role: m.role,
    sequence: i + 1,
    timestamp: Number.isNaN(time) ? '' : new Date(time).toISOString(),
  }));

  return {
    configuration: configuration(dialogue, messages),
    exportedAt: stamp.exportedAt.toISOString(),
    exportId: stamp.exportId,
    exportMode: 'full',
    messages,
    redactions: 0,
    schemaVersion: SESSION_EXPORT_SCHEMA_VERSION,
    summary: summarize(messages),
  };
}

/** The computed session summary over export messages. */
export function summarize(messages: ExportMessage[]): ExportSummary {
  const replies = messages.filter((m) => m.reply);
  const times = messages
    .map((m) => Date.parse(m.timestamp))
    .filter((t) => !Number.isNaN(t));
  const startedAt = times.length
    ? times.reduce((a, b) => Math.min(a, b))
    : null;
  const endedAt = times.length ? times.reduce((a, b) => Math.max(a, b)) : null;

  const turnKinds = Object.fromEntries(
    EXPORT_TURN_KINDS.map((kind) => [kind, 0]),
  ) as Record<TurnKind, number>;
  for (const reply of replies) {
    turnKinds[reply.reply!.turnKind] += 1;
  }

  return {
    assistantReplies: replies.length,
    endedAt: endedAt === null ? null : new Date(endedAt).toISOString(),
    exchanges: countExchanges(messages),
    startedAt: startedAt === null ? null : new Date(startedAt).toISOString(),
    timeToFirstReplyMs: timeToFirstReply(messages),
    tokens: {
      completion: tokenTotal(replies, 'completionTokens'),
      prompt: tokenTotal(replies, 'promptTokens'),
      total: tokenTotal(replies, 'totalTokens'),
    },
    totalDurationMs:
      startedAt === null || endedAt === null ? null : endedAt - startedAt,
    turnKinds,
    wrapUpReached: turnKinds.wrap_up > 0,
  };
}

function configuration(
  dialogue: SourceDialogue,
  messages: ExportMessage[],
): ExportConfiguration {
  const distinct = (field: 'model' | 'provider') => [
    ...new Set(
      messages
        .map((m) => m.reply?.[field])
        .filter((v): v is string => !!v && v !== NOT_REPORTED),
    ),
  ];

  return {
    ...(dialogue.dialogueTitle
      ? { dialogueTitle: dialogue.dialogueTitle }
      : {}),
    mode: dialogue.mode,
    models: distinct('model'),
    muktiVersion: dialogue.muktiVersion,
    ...(dialogue.nodeLabel ? { nodeLabel: dialogue.nodeLabel } : {}),
    ...(dialogue.nodeType ? { nodeType: dialogue.nodeType } : {}),
    providers: distinct('provider'),
    ...(dialogue.studyArm ? { studyArm: { ...dialogue.studyArm } } : {}),
    surface: dialogue.surface,
    technique: dialogue.technique,
  };
}

/** User messages answered by a reply before the next user message. */
function countExchanges(messages: ExportMessage[]): number {
  let exchanges = 0;
  let awaitingReply = false;
  for (const message of messages) {
    if (message.role === 'user') {
      awaitingReply = true;
    } else if (awaitingReply) {
      exchanges += 1;
      awaitingReply = false;
    }
  }
  return exchanges;
}

function isHelpLevel(value: unknown): value is HelpLevel {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 4
  );
}

function replyMetadata(meta: SourceMessage['meta']): ExportReplyMetadata {
  const count = (v: number) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0;
  const text = (v: string) => typeof v === 'string' && v.length > 0;
  const totalTokens =
    meta?.totalTokens ??
    (meta?.promptTokens !== undefined && meta?.completionTokens !== undefined
      ? meta.promptTokens + meta.completionTokens
      : undefined);

  return {
    completionTokens: reported(meta?.completionTokens, count),
    helpLevel: (isHelpLevel(meta?.scaffoldLevel)
      ? meta.scaffoldLevel
      : NOT_REPORTED) as Reported<HelpLevel>,
    latencyMs: reported(meta?.latencyMs, count),
    model: reported(meta?.model, text),
    promptTokens: reported(meta?.promptTokens, count),
    provider: reported(meta?.provider, text),
    totalTokens: reported(totalTokens, count),
    // Replies stored before help controls were all ordinary.
    turnKind:
      meta?.turnKind && EXPORT_TURN_KINDS.includes(meta.turnKind)
        ? meta.turnKind
        : 'ordinary',
  };
}

function reported<T>(value: T | undefined, valid: (v: T) => boolean) {
  return value !== undefined && value !== null && valid(value)
    ? value
    : NOT_REPORTED;
}

/** From the first user message to the first reply after it. */
function timeToFirstReply(messages: ExportMessage[]): null | number {
  const firstUser = messages.findIndex((m) => m.role === 'user');
  if (firstUser < 0) {
    return null;
  }
  const reply = messages
    .slice(firstUser + 1)
    .find((m) => m.role === 'assistant');
  if (!reply) {
    return null;
  }
  const elapsed =
    Date.parse(reply.timestamp) - Date.parse(messages[firstUser].timestamp);
  return Number.isNaN(elapsed) ? null : elapsed;
}

function tokenTotal(
  replies: ExportMessage[],
  field: 'completionTokens' | 'promptTokens' | 'totalTokens',
): TokenTotal {
  let total = 0;
  let repliesIncluded = 0;
  for (const message of replies) {
    const value = message.reply![field];
    if (typeof value === 'number') {
      total += value;
      repliesIncluded += 1;
    }
  }
  return {
    repliesIncluded,
    repliesNotReported: replies.length - repliesIncluded,
    total,
  };
}

function toTime(value: Date | string | undefined): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  return value ? Date.parse(value) : Number.NaN;
}
