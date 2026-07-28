import { randomBytes } from 'crypto';

/**
 * Single-developer local runtime (`MUKTI_LOCAL`).
 *
 * @remarks
 * When enabled, the API runs with no external services or secrets: auth is
 * bypassed for a fixed seeded user, MongoDB is embedded and file-backed, and
 * ephemeral secrets are generated on boot. Every bypass is strictly gated on
 * this flag so the hosted path is untouched when it is off.
 */

/** Fixed ObjectId for the seeded local user (24-hex). */
export const LOCAL_USER_ID = '000000000000000000000001';

/** Fixed identity for the seeded local user. */
export const LOCAL_USER = {
  email: 'local@mukti.local',
  firstName: 'Local',
  lastName: 'User',
} as const;

/** Repo-local, gitignored path for the embedded MongoDB data files. */
export const LOCAL_DB_PATH = '.mukti/local-db';

/**
 * Fills in ephemeral secrets and local defaults when they are unset, so local
 * mode boots with zero configuration. Must run before the Nest app is created
 * (secrets are read during module initialization). No-op outside local mode.
 */
export function applyLocalModeEnvDefaults(): void {
  if (!isLocalMode()) {
    return;
  }

  // AI defaults to Claude Code in local mode unless the developer overrides it.
  process.env.AI_PROVIDER ??= 'claude-code';

  const ephemeral = () => randomBytes(32).toString('hex');
  process.env.JWT_SECRET ??= ephemeral();
  process.env.JWT_REFRESH_SECRET ??= ephemeral();
  process.env.SESSION_SECRET ??= ephemeral();
  // AiSecretsService requires a 32-byte base64 key (BYOK is unused locally, but
  // the service must still construct).
  process.env.AI_SECRETS_ENCRYPTION_KEY ??= randomBytes(32).toString('base64');
}

/** Whether the API is running in local mode. Reads `MUKTI_LOCAL` from env. */
export function isLocalMode(): boolean {
  const value = process.env.MUKTI_LOCAL?.toLowerCase();
  return value === '1' || value === 'true';
}
