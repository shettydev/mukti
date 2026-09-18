/**
 * The launcher's own settings file, `<mukti home>/config.json`.
 *
 * @remarks
 * It currently holds one thing: the AI CLI the user chose to use by default.
 * The file is the user's to edit, and it is read before every launch, so no way
 * of being wrong may stop Mukti from starting. Every failure resolves to "no
 * default saved", with a warning naming the file so the user can go and look.
 *
 * Validating the provider name is the caller's job — the supported names are
 * passed in — so that this module stays file handling only and the provider
 * registry does not have to import it back.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Format version this launcher writes, and the only one it reads. */
const SETTINGS_VERSION = 1;

const SETTINGS_FILE = 'config.json';

export interface StoredProvider {
  /** The saved provider, when one could be read. */
  provider?: string;
  /** Why nothing was read, naming the file, for the launcher to show. */
  warning?: string;
}

export function providerSettingsPath(root: string): string {
  return join(root, SETTINGS_FILE);
}

/** Reads the saved default, or explains why there is none. */
export function readStoredProvider(root: string, supported: readonly string[]): StoredProvider {
  const file = providerSettingsPath(root);
  const settings = readSettings(file);

  if (settings === 'missing') {
    return {};
  }
  if (settings === 'unreadable') {
    return { warning: `Could not read ${file}, so no saved AI provider is being used.` };
  }
  if (settings === 'malformed') {
    return { warning: `${file} is not valid JSON, so no saved AI provider is being used.` };
  }
  if (settings.version !== SETTINGS_VERSION) {
    return {
      warning: `${file} is version ${JSON.stringify(settings.version)}, which this version of Mukti does not understand, so no saved AI provider is being used.`,
    };
  }
  if (settings.provider === undefined) {
    return {};
  }
  if (typeof settings.provider !== 'string' || !supported.includes(settings.provider)) {
    return {
      warning: `${file} names the AI provider ${JSON.stringify(settings.provider)}, which this version of Mukti does not support, so it is being ignored.`,
    };
  }
  return { provider: settings.provider };
}

/**
 * Saves the default provider, keeping any settings this launcher does not know
 * about, and replacing the file atomically so an interrupted write cannot leave
 * a half-written one behind.
 */
export function writeStoredProvider(root: string, provider: string): void {
  mkdirSync(root, { recursive: true });

  const file = providerSettingsPath(root);
  const settings = readSettings(file);
  const kept = typeof settings === 'object' ? settings : {};
  const next = { ...kept, provider, version: SETTINGS_VERSION };

  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`);
  renameSync(temporary, file);
}

/** The file's contents, or why they could not be used. */
function readSettings(
  file: string
): 'malformed' | 'missing' | 'unreadable' | Record<string, unknown> {
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch (error) {
    // Nothing saved yet is the ordinary case, and not worth a word.
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'unreadable';
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return 'malformed';
  }
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : 'malformed';
}
