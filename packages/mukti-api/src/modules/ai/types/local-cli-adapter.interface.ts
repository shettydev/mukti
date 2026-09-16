/**
 * Contract for AI providers backed by a locally installed, user-authenticated
 * agent CLI (Claude Code, Antigravity).
 *
 * @remarks
 * Every such provider does the same thing mechanically — spawn a binary in
 * headless/print mode, write a transcript to stdin, parse a JSON envelope off
 * stdout — while differing in flags, envelope field names, and model catalogue.
 * {@link LocalCliClientFactory} owns the shared mechanics; an adapter supplies
 * only the differences, so adding a CLI is one file plus a registry entry rather
 * than a change to policy, controllers, or the launcher.
 *
 * Launch-time availability and authentication checks are deliberately absent:
 * they belong to the launcher, which runs before the API exists. The API
 * discovers an unauthenticated CLI at request time, as a {@link LocalCliError}.
 */
import type { AiChatSendRequest } from './ai-chat-client.interface';
import type { AllowedModel } from './ai-model.interface';

export interface LocalCliAdapter {
  /** Executable name, resolved from `PATH`. */
  readonly binary: string;

  /** Flags for one completion. The API key is never among them. */
  buildArgs(request: AiChatSendRequest): string[];

  /** Distinguishes this CLI's failures on {@link LocalCliError.code}. */
  readonly errorCode: string;

  /**
   * Models offered for this provider. Synchronous by design: nine production
   * call sites read it through `AiPolicyService`, so adapters whose catalogue is
   * discovered at runtime populate it in {@link LocalCliAdapter.warm} and serve
   * it from memory here (design.md Decision 11).
   */
  getModels(): AllowedModel[];

  /** Shown when the binary is absent from `PATH`. */
  readonly installHint: string;

  /**
   * Maps the CLI's JSON result envelope into a completion.
   *
   * @throws {LocalCliError} when the envelope reports failure, cannot be
   * parsed, or carries no content — an empty Socratic question is worse than a
   * visible error.
   */
  parseEnvelope(stdout: string): LocalCliCompletion;

  readonly providerId: LocalCliProviderId;

  /**
   * Renders the request into the CLI's stdin payload. Defaults to a
   * `Role: content` transcript of the non-system turns when omitted.
   */
  renderInput?(request: AiChatSendRequest): string;

  /** Shown when the CLI is installed but appears unauthenticated. */
  readonly signInHint: string;

  /**
   * Extra `spawn` options. Used to confine a CLI that resolves customization
   * from its working directory to a Mukti-owned one.
   */
  spawnOptions?(): { cwd?: string };

  /**
   * One-time async setup at module init — catalogue discovery, workspace
   * preparation. Omitted by adapters whose model list is static.
   */
  warm?(): Promise<void>;
}

/** Normalized completion, before it is shaped into the OpenAI-style payload. */
export interface LocalCliCompletion {
  completionTokens: number;
  content: string;
  promptTokens: number;
}

/** `AI_PROVIDER` values served by a local CLI rather than an HTTP API. */
export type LocalCliProviderId = 'antigravity' | 'claude-code';

/**
 * Raised when a local CLI is missing, unauthenticated, or fails.
 *
 * @remarks
 * Always non-retriable: a missing binary or an expired session is not fixed by
 * trying again, and the queue must surface it to the user rather than retrying.
 * `code` is supplied per-adapter so the failing CLI is identifiable downstream.
 */
export class LocalCliError extends Error {
  readonly retriable = false;

  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'LocalCliError';
  }
}
