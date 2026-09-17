/**
 * Adapter for the local Antigravity CLI (`agy --print`).
 *
 * @remarks
 * agy is a coding agent, not a text producer, and offers none of the levers the
 * Claude adapter relies on: no system-prompt flag, no tool denial, no auth
 * status. Everything below compensates for that, and each choice is measured
 * against agy v1.1.22 rather than assumed (design.md Decisions 2a, 3, 4, 9, 12):
 *
 * - The Socratic instruction travels *in* the prompt, and a declared response
 *   shape is enforced with `--json-schema` — instruction alone is outranked by
 *   agy's own coding prompt; a schema with no field for prose is not.
 * - The prompt is the `--print` value. agy never reads it from stdin.
 * - The model is told to call agy's `finish` tool immediately and no other
 *   tool. Without that, agy injects a second turn (twice the tokens), and the
 *   agent may wander the filesystem: its file tools accept absolute paths and
 *   `--sandbox` does not stop them.
 * - agy runs from a Mukti-owned directory, never a repository, and each run is
 *   filed under a Mukti project rather than the user's default one.
 *
 * What this cannot do is lower agy's ~15k-token prompt floor or its ~30s turn;
 * both are disclosed to the user instead.
 */
import { Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import { mkdirSync, readdirSync, readFileSync, realpathSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';

import type { AiChatSendRequest } from '../../types/ai-chat-client.interface';
import type { AllowedModel } from '../../types/ai-model.interface';
import type { AiJsonSchemaResponseFormat } from '../../types/ai-response-format.interface';
import type {
  LocalCliAdapter,
  LocalCliCompletion,
  LocalCliProviderId,
} from '../../types/local-cli-adapter.interface';

import { LocalCliError } from '../../types/local-cli-adapter.interface';
import {
  EMPTY_CONVERSATION_KICKOFF,
  renderTranscript,
} from '../local-cli-transcript';

export const ANTIGRAVITY_CLI_ERROR_CODE = 'ANTIGRAVITY_CLI_ERROR';

/**
 * agy's own print deadline. About three times the measured 33–42s turn: long
 * enough for a slow backend, short enough that a looping agent fails visibly.
 */
const PRINT_TIMEOUT = '120s';

/** Kill backstop: the print deadline plus startup and hook time. */
const HARD_TIMEOUT_MS = 150_000;

/**
 * Largest prompt passed as a single argument. Linux caps one argument at
 * 128 KB; staying well under it turns an obscure spawn failure into a clear one.
 */
const MAX_PROMPT_BYTES = 100_000;

const MODEL_LISTING_TIMEOUT_MS = 30_000;

const TRANSCRIPT_HEADING =
  'Conversation so far. You are "Assistant"; reply to the latest "User" turn.';

/** For a declared shape, which agy delivers through its `finish` tool. */
const FINISH_INSTRUCTION =
  'Respond by calling the finish tool exactly once, immediately, with your answer. ' +
  'Do not call any other tool: do not search, list, read or open any files or directories. ' +
  'Everything you need is in this message.';

/** For free text, where a plain reply ends the turn. */
const DIRECT_INSTRUCTION =
  'Reply immediately with only the requested output. ' +
  'Do not call any tools: do not search, list, read or open any files or directories. ' +
  'Everything you need is in this message.';

export interface AntigravityCliAdapterOptions {
  /** agy's project records. Defaults to `~/.gemini/config/projects`. */
  projectsDir?: string;
  /** Runs `agy models`. Replaced in tests. */
  runModelListing?: () => Promise<ModelListingResult>;
  /**
   * Mukti-owned working directory, and the folder agy names Mukti's project
   * after. Defaults to `~/.mukti/mukti-socratic`.
   */
  workspaceDir?: string;
}

export interface ModelListingResult {
  /** `null` when the process never ran (e.g. agy is not installed). */
  exitCode: null | number;
  stderr: string;
  stdout: string;
}

/** Shape of the `agy --print --output-format json` envelope we rely on. */
interface AntigravityEnvelope {
  error?: string;
  response?: string;
  status?: string;
  structured_output?: unknown;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

/** A project record under `~/.gemini/config/projects`, as far as we read it. */
interface AntigravityProjectRecord {
  id?: unknown;
  projectResources?: { resources?: { folderUri?: unknown }[] };
}

export class AntigravityCliAdapter implements LocalCliAdapter {
  readonly binary = 'agy';
  readonly errorCode = ANTIGRAVITY_CLI_ERROR_CODE;
  readonly inputChannel = 'argument';
  readonly installHint =
    'Install the Antigravity CLI (`agy`) to use the antigravity provider: https://antigravity.google/docs/cli/reference';
  readonly providerId: LocalCliProviderId = 'antigravity';
  readonly signInHint =
    'If it is not signed in, run `agy` once and follow the prompts to sign in.';
  readonly timeoutMs = HARD_TIMEOUT_MS;

  private readonly logger = new Logger(AntigravityCliAdapter.name);
  private models?: AllowedModel[];
  private projectCreationRequested = false;
  /** Set once found; project ids do not change. */
  private projectId?: string;
  private readonly projectsDir: string;
  private readonly runModelListing: () => Promise<ModelListingResult>;
  private unreadableProjectsWarned = false;
  private readonly workspaceDir: string;

  constructor(options: AntigravityCliAdapterOptions = {}) {
    this.projectsDir =
      options.projectsDir ?? join(homedir(), '.gemini', 'config', 'projects');
    this.runModelListing = options.runModelListing ?? listModelsWithAgy;
    this.workspaceDir =
      options.workspaceDir ?? join(homedir(), '.mukti', 'mukti-socratic');
  }

  buildArgs(request: AiChatSendRequest, input: string): string[] {
    const bytes = Buffer.byteLength(input, 'utf8');
    if (bytes > MAX_PROMPT_BYTES) {
      throw new LocalCliError(
        `This conversation is too long to send to the agy CLI (${Math.ceil(bytes / 1000)} KB; ` +
          `the limit is ${MAX_PROMPT_BYTES / 1000} KB). Start a new conversation to continue.`,
        this.errorCode,
      );
    }

    const args = [
      '--output-format',
      'json',
      '--sandbox',
      '--disable-slash-commands',
      '--print-timeout',
      PRINT_TIMEOUT,
    ];

    // Only the caller decides whether a shape applies; never substitute one.
    if (request.responseFormat) {
      args.push(
        '--json-schema',
        JSON.stringify(request.responseFormat.jsonSchema.schema ?? {}),
      );
    }

    // Omitted deliberately when unset, so the CLI applies its own default.
    if (request.model?.trim()) {
      args.push('--model', request.model);
    }

    args.push(...this.projectArgs());

    // Attached with `=` so input beginning with `-` can never become a flag.
    args.push(`--print=${input}`);
    return args;
  }

  describeFailure(stdout: string): string | undefined {
    try {
      const { error } = JSON.parse(stdout) as AntigravityEnvelope;
      return typeof error === 'string' && error.trim()
        ? error.trim()
        : undefined;
    } catch {
      return undefined;
    }
  }

  getModels(): AllowedModel[] {
    if (!this.models) {
      throw new LocalCliError(
        'The Antigravity model list has not been loaded; the API must finish starting first.',
        this.errorCode,
      );
    }
    return this.models;
  }

  parseEnvelope(
    stdout: string,
    request: AiChatSendRequest,
  ): LocalCliCompletion {
    let envelope: AntigravityEnvelope;

    try {
      envelope = JSON.parse(stdout) as AntigravityEnvelope;
    } catch {
      throw new LocalCliError(
        `Could not parse agy CLI JSON output: ${stdout.slice(0, 200)}`,
        this.errorCode,
      );
    }

    // There is no error flag to check, only a status: anything but success,
    // including a value we have never seen, is a failure.
    if (envelope.status !== 'SUCCESS') {
      const reason = this.describeFailure(stdout) ?? 'no detail';
      throw new LocalCliError(
        `agy CLI reported ${envelope.status ?? 'no status'}: ${reason}`,
        this.errorCode,
      );
    }

    const content = request.responseFormat
      ? this.unwrap(envelope.structured_output, request.responseFormat)
      : (envelope.response ?? '').trim();

    return {
      // thinking_tokens is a subset of output_tokens; adding it would
      // double-count (design.md Decision 5).
      completionTokens: envelope.usage?.output_tokens ?? 0,
      content,
      promptTokens: envelope.usage?.input_tokens ?? 0,
    };
  }

  renderInput(request: AiChatSendRequest): string {
    const system = request.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content.trim())
      .filter(Boolean)
      .join('\n\n');
    const instruction = request.responseFormat
      ? FINISH_INSTRUCTION
      : DIRECT_INSTRUCTION;
    const transcript =
      renderTranscript(request.messages).trim() ||
      `User: ${EMPTY_CONVERSATION_KICKOFF}`;

    const preamble = [system, instruction].filter(Boolean).join('\n\n');
    return `${preamble}\n\n---\n\n${TRANSCRIPT_HEADING}\n\n${transcript}`;
  }

  spawnOptions(): { cwd: string } {
    // Recreated on demand: a missing cwd makes spawn fail with ENOENT, which
    // would be misreported as agy not being installed.
    mkdirSync(this.workspaceDir, { recursive: true });
    return { cwd: realpathSync(this.workspaceDir) };
  }

  async warm(): Promise<void> {
    mkdirSync(this.workspaceDir, { recursive: true });
    if (this.models) {
      return;
    }

    const result = await this.runModelListing();
    if (result.exitCode !== 0) {
      const detail =
        result.stderr.trim() || result.stdout.trim() || 'no output';
      throw new LocalCliError(
        result.exitCode === null
          ? `Could not run \`agy models\` (${detail}). ${this.installHint}`
          : `Could not list Antigravity models: \`agy models\` exited with code ${result.exitCode}. ${this.signInHint} Detail: ${detail}`,
        this.errorCode,
      );
    }

    const models = parseModelListing(result.stdout);
    if (models.length === 0) {
      throw new LocalCliError(
        '`agy models` listed no models, so there is nothing to offer. Check that agy is signed in and up to date.',
        this.errorCode,
      );
    }

    this.models = models;
  }

  /**
   * The id of the project whose folder is the workspace; `null` when the
   * records were read and none matches; `undefined` when they cannot be read.
   */
  private findProjectId(): null | string | undefined {
    let files: string[];
    try {
      files = readdirSync(this.projectsDir).filter((f) => f.endsWith('.json'));
    } catch {
      if (!this.unreadableProjectsWarned) {
        this.unreadableProjectsWarned = true;
        this.logger.warn(
          `Cannot read agy project records at ${this.projectsDir}; Mukti turns will be filed under agy's default project.`,
        );
      }
      return undefined;
    }

    const workspace = this.workspacePaths();
    for (const file of files) {
      let record: AntigravityProjectRecord;
      try {
        record = JSON.parse(
          readFileSync(join(this.projectsDir, file), 'utf8'),
        ) as AntigravityProjectRecord;
      } catch {
        continue;
      }
      const matches = (record.projectResources?.resources ?? []).some(
        ({ folderUri }) =>
          typeof folderUri === 'string' &&
          workspace.has(folderUriToPath(folderUri)),
      );
      if (matches && typeof record.id === 'string' && record.id) {
        return record.id;
      }
    }
    return null;
  }

  /**
   * The flags that file this run under Mukti's own agy project.
   *
   * @remarks
   * agy ignores an unknown `--project` name without a word, and a flagless run
   * lands in the user's default project even from a folder that owns one. So
   * the project is identified by the id agy recorded for this workspace, and
   * created with `--new-project` only when the records positively show it is
   * missing — at most once per process, so a changed record format cannot turn
   * into a new project every turn. When the records cannot be read at all, the
   * run falls back to the default project rather than guessing.
   */
  private projectArgs(): string[] {
    if (this.projectId) {
      return ['--project', this.projectId];
    }

    const found = this.findProjectId();
    if (found === undefined) {
      return [];
    }
    if (found) {
      this.projectId = found;
      return ['--project', found];
    }
    if (this.projectCreationRequested) {
      return [];
    }
    this.projectCreationRequested = true;
    return ['--new-project'];
  }

  /**
   * Maps a declared structure back to text: the value itself when the schema is
   * a single string field (a question), otherwise the object as JSON.
   */
  private unwrap(
    structured: unknown,
    format: AiJsonSchemaResponseFormat,
  ): string {
    if (!isPlainObject(structured)) {
      throw new LocalCliError(
        'agy CLI returned no structured output for a declared response shape.',
        this.errorCode,
      );
    }

    const field = singleStringField(format.jsonSchema.schema);
    if (!field) {
      return JSON.stringify(structured);
    }

    const value = structured[field];
    if (typeof value !== 'string') {
      throw new LocalCliError(
        `agy CLI returned structured output without a text "${field}" field.`,
        this.errorCode,
      );
    }
    return value;
  }

  /** The workspace as given and as resolved, since agy records the latter. */
  private workspacePaths(): Set<string> {
    const paths = new Set([this.workspaceDir]);
    try {
      paths.add(realpathSync(this.workspaceDir));
    } catch {
      // Not created yet; the given path is all there is to match.
    }
    return paths;
  }
}

function folderUriToPath(folderUri: string): string {
  try {
    return fileURLToPath(folderUri);
  } catch {
    return '';
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Runs `agy models`. stdin is closed deliberately: agy waits on an open stdin,
 * so with a pipe attached the listing hangs until it is killed.
 */
function listModelsWithAgy(): Promise<ModelListingResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let child: ReturnType<typeof spawn>;

    try {
      child = spawn('agy', ['models'], { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (error) {
      resolve({ exitCode: null, stderr: (error as Error).message, stdout });
      return;
    }

    const timer = setTimeout(() => {
      stderr += `\nagy models did not finish within ${MODEL_LISTING_TIMEOUT_MS / 1000}s`;
      child.kill('SIGTERM');
    }, MODEL_LISTING_TIMEOUT_MS);

    child.stdout?.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr?.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    // A number is agy's own exit status; `null` means it never ran to
    // completion (not installed, or killed).
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ exitCode: null, stderr: error.message, stdout });
    });
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, stderr, stdout });
    });
  });
}

/** Parses `agy models` output: one `id<TAB>label` per line. */
function parseModelListing(stdout: string): AllowedModel[] {
  const models: AllowedModel[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const [rawId, ...rest] = line.split('\t');
    const id = rawId.trim();
    if (!id || /\s/.test(id)) {
      continue;
    }
    models.push({ id, label: rest.join('\t').trim() || id });
  }
  return models;
}

/** The name of the schema's only property, when that property is a string. */
function singleStringField(schema: unknown): string | undefined {
  if (!isPlainObject(schema) || !isPlainObject(schema.properties)) {
    return undefined;
  }
  const names = Object.keys(schema.properties);
  if (names.length !== 1) {
    return undefined;
  }
  const property = schema.properties[names[0]];
  return isPlainObject(property) && property.type === 'string'
    ? names[0]
    : undefined;
}
