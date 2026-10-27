/**
 * The saved default AI provider, `<mukti home>/config.json`.
 *
 * @remarks
 * Written by the launcher (a kept pick, or `--provider … --save`) and by the
 * API (a switch from Settings with "use as default" chosen); read by the
 * launcher before every start. The file is the user's to edit, so no way of
 * being wrong may stop Mukti from starting. Every failure resolves to "no
 * default saved", with a warning naming the file so the user can go and look.
 *
 * Validating the provider name is the caller's job — the supported names are
 * passed in — so this module stays file handling only.
 *
 * Part of the shared `local-cli` folder: Node built-ins only at runtime (see
 * `provider-catalog.ts` for why).
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Format version this code writes, and the only one it reads. */
const SETTINGS_VERSION = 1;

const SETTINGS_FILE = 'config.json';

export interface StoredProvider {
  /** The saved provider, when one could be read. */
  provider?: string;
  /** Why nothing was read, naming the file, for the caller to show. */
  warning?: string;
}

export function providerSettingsPath(root: string): string {
  return join(root, SETTINGS_FILE);
}

/** Reads the saved default from the Mukti home, or explains why there is none. */
export function readStoredProvider(
  root: string,
  supported: readonly string[],
): StoredProvider {
  return readStoredProviderFile(providerSettingsPath(root), supported);
}

/** Reads the saved default from a settings file, or explains why there is none. */
export function readStoredProviderFile(
  file: string,
  supported: readonly string[],
): StoredProvider {
  const settings = readSettings(file);

  if (settings === 'missing') {
    return {};
  }
  if (settings === 'unreadable') {
    return {
      warning: `Could not read ${file}, so no saved AI provider is being used.`,
    };
  }
  if (settings === 'malformed') {
    return {
      warning: `${file} is not valid JSON, so no saved AI provider is being used.`,
    };
  }
  if (settings.version !== SETTINGS_VERSION) {
    return {
      warning: `${file} is version ${JSON.stringify(settings.version)}, which this version of Mukti does not understand, so no saved AI provider is being used.`,
    };
  }
  if (settings.provider === undefined) {
    return {};
  }
  if (
    typeof settings.provider !== 'string' ||
    !supported.includes(settings.provider)
  ) {
    return {
      warning: `${file} names the AI provider ${JSON.stringify(settings.provider)}, which this version of Mukti does not support, so it is being ignored.`,
    };
  }
  return { provider: settings.provider };
}

/**
 * Saves the default provider in the Mukti home, keeping any settings this code
 * does not know about, and replacing the file atomically so an interrupted
 * write cannot leave a half-written one behind.
 */
export function writeStoredProvider(root: string, provider: string): void {
  writeStoredProviderFile(providerSettingsPath(root), provider);
}

/** {@link writeStoredProvider}, given the settings file itself. */
export function writeStoredProviderFile(file: string, provider: string): void {
  mkdirSync(dirname(file), { recursive: true });

  const settings = readSettings(file);
  const kept = typeof settings === 'object' ? settings : {};
  const next = { ...kept, provider, version: SETTINGS_VERSION };

  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`);
  renameSync(temporary, file);
}

/** The file's contents, or why they could not be used. */
function readSettings(
  file: string,
): 'malformed' | 'missing' | 'unreadable' | Record<string, unknown> {
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch (error) {
    // Nothing saved yet is the ordinary case, and not worth a word.
    return (error as NodeJS.ErrnoException).code === 'ENOENT'
      ? 'missing'
      : 'unreadable';
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
