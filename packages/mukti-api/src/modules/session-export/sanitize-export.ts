import type {
  ExportMessage,
  ExportMode,
  SessionExport,
} from './session-export.types';

/** What replaces each redacted string. */
export const REDACTED = '[redacted]';

/** Limits on the redaction list (design D2). */
export const MAX_REDACTIONS = 50;
export const MAX_REDACTION_LENGTH = 200;

/**
 * Why a redaction term cannot be used, or null when it can.
 *
 * @remarks
 * Literal terms are accepted without interpreting them as regular expressions.
 * A term can occur in the fixed replacement marker or schema vocabulary. These
 * are not user data, and the caller must not treat redaction as anonymization.
 */
export function redactionTermProblem(term: string): null | string {
  const trimmed = term.trim();
  if (!trimmed) {
    return 'is empty';
  }
  if (trimmed.length > MAX_REDACTION_LENGTH) {
    return `is longer than ${MAX_REDACTION_LENGTH} characters`;
  }
  return null;
}

/**
 * Applies metrics-only mode and the redaction list to an export model.
 *
 * @remarks
 * Runs on the model, before rendering (design D3): Markdown escaping and JSON
 * string encoding could otherwise split a term and leak it. Metrics-only drops
 * every message's text and the user-written title and node label.
 *
 * Redaction replaces each term case-insensitively, as a literal, in every
 * free-text value that remains: message content, title, node label, node
 * type, technique, and model and provider ids. Enumerated values (roles,
 * surfaces, modes, turn kinds, study-arm names) and timestamps are the
 * export's own vocabulary, not user data, and are left intact so the file
 * stays valid against its schema. Longer terms go first so a term inside
 * another is not left half replaced. Pure: returns a new model.
 *
 * @throws {Error} on a term {@link redactionTermProblem} rejects; the
 *   controller validates first, so this only guards direct callers.
 */
export function sanitizeExport(
  model: SessionExport,
  options: { mode: ExportMode; privateValues?: string[]; redact: string[] },
): SessionExport {
  const terms = [
    ...new Set(options.redact.map((t) => t.trim()).filter(Boolean)),
  ].sort((a, b) => b.length - a.length);
  for (const term of terms) {
    const problem = redactionTermProblem(term);
    if (problem) {
      throw new Error(`Redaction term ${problem}`);
    }
  }

  const redactTerms = makeRedactor(terms);
  const privateValues = (options.privateValues ?? []).filter((v) => v.trim());
  const redactIdentity = makeRedactor(privateValues);
  const redact = (text: string) =>
    redactTerms(redactIdentity(removeRecognizableIdentifiers(text)));
  const metricsOnly = options.mode === 'metrics';

  const configuration = {
    ...model.configuration,
    models: model.configuration.models.map(redact),
    providers: model.configuration.providers.map(redact),
    technique:
      model.configuration.technique === null
        ? null
        : redact(model.configuration.technique),
  };
  if (configuration.nodeType !== undefined) {
    configuration.nodeType = redact(configuration.nodeType);
  }
  if (metricsOnly) {
    delete configuration.dialogueTitle;
    delete configuration.nodeLabel;
  } else {
    if (configuration.dialogueTitle !== undefined) {
      configuration.dialogueTitle = redact(configuration.dialogueTitle);
    }
    if (configuration.nodeLabel !== undefined) {
      configuration.nodeLabel = redact(configuration.nodeLabel);
    }
  }

  const messages: ExportMessage[] = model.messages.map((message) => {
    const { content, ...rest } = message;
    const reply = rest.reply && {
      ...rest.reply,
      model: redact(rest.reply.model),
      provider: redact(rest.reply.provider),
    };
    const kept = reply ? { ...rest, reply } : rest;
    return metricsOnly || content === undefined
      ? kept
      : { ...kept, content: redact(content) };
  });

  return {
    ...model,
    configuration,
    exportMode: options.mode,
    messages,
    redactions: terms.length,
  };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeRedactor(terms: string[]): (text: string) => string {
  if (!terms.length) {
    return (text) => text;
  }
  // `u` makes case-insensitive matching work for every script, including
  // characters outside the Basic Multilingual Plane.
  const pattern = new RegExp(terms.map(escapeRegExp).join('|'), 'giu');
  return (text) => text.replace(pattern, REDACTED);
}

/** Defense in depth, not a substitute for reviewing a transcript before sharing. */
function removeRecognizableIdentifiers(text: string): string {
  return text
    .replace(
      /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g,
      REDACTED,
    )
    .replace(
      /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+/gi,
      REDACTED,
    )
    .replace(/\b[0-9a-f]{24}\b/gi, REDACTED)
    .replace(/\b(?:sk-|AIza|ghp_|github_pat_)[A-Za-z0-9_-]{12,}\b/g, REDACTED)
    .replace(/\b(?:Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, REDACTED)
    .replace(
      /\b((?:api[_ -]?key|access[_ -]?token|secret)\s*[:=]\s*)["']?[^\s"',;]+["']?/gi,
      `$1${REDACTED}`,
    );
}
