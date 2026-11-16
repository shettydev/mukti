import type { HelpLevel, TurnKind } from '@muktiai/contracts';

/**
 * The session-export record (session-export spec). Defined once here; the
 * published JSON Schema at `docs/research/session-export.schema.json` mirrors
 * it, and a test fails if the two drift or the shape changes without a
 * version bump.
 */

/** Bump on any change to the shape below, and update the published schema. */
export const SESSION_EXPORT_SCHEMA_VERSION = 1;

/** A value the provider or an older message did not record. */
export const NOT_REPORTED = 'not_reported';
export type DeploymentMode = 'hosted' | 'local';

export type ExportFormat = 'json' | 'md';

export type ExportMode = 'full' | 'metrics';
export type ExportSurface = 'canvas_node' | 'chat' | 'thought_map_node';
export type NotReported = typeof NOT_REPORTED;
/** A recorded value, or an explicit marker that it was not reported. */
export type Reported<T> = NotReported | T;

/** Study arms (study-arms spec); absent outside a study. */
export const STUDY_ARMS = ['baseline-socratic', 'baseline-direct'] as const;
export type StudyArm = (typeof STUDY_ARMS)[number];

export const EXPORT_TURN_KINDS = [
  'ordinary',
  'more_help',
  'explain',
  'wrap_up',
] as const satisfies readonly TurnKind[];

export interface ExportConfiguration {
  /** The canvas or map title; omitted in metrics-only mode. */
  dialogueTitle?: string;
  mode: DeploymentMode;
  /** Distinct models across replies, in order of first use. */
  models: string[];
  muktiVersion: string;
  /** The node label; omitted in metrics-only mode and for chat. */
  nodeLabel?: string;
  /** Node kind on canvas and map surfaces. */
  nodeType?: string;
  /** Distinct providers across replies, in order of first use. */
  providers: string[];
  /** Present only for a conversation created under a study arm. */
  studyArm?: {
    name: StudyArm;
    /** SHA-256 of the baseline prompt text the conversation used. */
    promptSha256: string;
  };
  surface: ExportSurface;
  technique: null | string;
}

export interface ExportMessage {
  /** Omitted in metrics-only mode. */
  content?: string;
  /** Set on assistant replies only. */
  reply?: ExportReplyMetadata;
  role: 'assistant' | 'user';
  /** 1-based position in the dialogue; replaces any database id. */
  sequence: number;
  timestamp: string;
}

/** Options a user chooses when exporting. */
export interface ExportOptions {
  format: ExportFormat;
  mode: ExportMode;
  redact: string[];
}

/** Per-reply metadata, as recorded when the reply was written. */
export interface ExportReplyMetadata {
  completionTokens: Reported<number>;
  /** The help level the reply was written at. */
  helpLevel: Reported<HelpLevel>;
  latencyMs: Reported<number>;
  model: Reported<string>;
  promptTokens: Reported<number>;
  provider: Reported<string>;
  totalTokens: Reported<number>;
  /** Unrecorded on older replies, which were ordinary. */
  turnKind: TurnKind;
}

export interface ExportSummary {
  assistantReplies: number;
  endedAt: null | string;
  /** Exchanges answered: user messages followed by a reply. */
  exchanges: number;
  startedAt: null | string;
  /** From the first user message to the first reply after it. */
  timeToFirstReplyMs: null | number;
  tokens: {
    completion: TokenTotal;
    prompt: TokenTotal;
    total: TokenTotal;
  };
  /** From the first message to the last, in milliseconds. */
  totalDurationMs: null | number;
  turnKinds: Record<TurnKind, number>;
  /** At least one reply was a wrap-up summary. */
  wrapUpReached: boolean;
}

export interface SessionExport {
  configuration: ExportConfiguration;
  exportedAt: string;
  /** Random per export; never a database id. */
  exportId: string;
  exportMode: ExportMode;
  messages: ExportMessage[];
  /** How many redaction strings were applied (never the strings). */
  redactions: number;
  schemaVersion: typeof SESSION_EXPORT_SCHEMA_VERSION;
  summary: ExportSummary;
}

/** A token total over the replies that reported it. */
export interface TokenTotal {
  /** Replies with this count. */
  repliesIncluded: number;
  /** Replies without it, which are not in `total`. */
  repliesNotReported: number;
  total: number;
}
