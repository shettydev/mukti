import { applyLocalModeEnvDefaults, isLocalMode } from '../local-mode';

const SECRET_KEYS = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_SECRET',
  'AI_SECRETS_ENCRYPTION_KEY',
  'AI_PROVIDER',
];

describe('local-mode config', () => {
  const snapshot = new Map<string, string | undefined>();

  beforeEach(() => {
    [...SECRET_KEYS, 'MUKTI_LOCAL'].forEach((k) =>
      snapshot.set(k, process.env[k]),
    );
    [...SECRET_KEYS, 'MUKTI_LOCAL'].forEach((k) => delete process.env[k]);
  });

  afterEach(() => {
    snapshot.forEach((value, key) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  describe('isLocalMode', () => {
    it.each(['1', 'true', 'TRUE'])('is true for %s', (v) => {
      process.env.MUKTI_LOCAL = v;
      expect(isLocalMode()).toBe(true);
    });

    it.each(['0', 'false', '', undefined])('is false for %s', (v) => {
      if (v === undefined) {
        delete process.env.MUKTI_LOCAL;
      } else {
        process.env.MUKTI_LOCAL = v;
      }
      expect(isLocalMode()).toBe(false);
    });
  });

  describe('applyLocalModeEnvDefaults', () => {
    it('generates secrets and defaults AI_PROVIDER in local mode', () => {
      process.env.MUKTI_LOCAL = '1';

      applyLocalModeEnvDefaults();

      expect(process.env.AI_PROVIDER).toBe('claude-code');
      expect(process.env.JWT_SECRET).toBeTruthy();
      expect(process.env.JWT_REFRESH_SECRET).toBeTruthy();
      expect(process.env.SESSION_SECRET).toBeTruthy();
      // Encryption key must decode to exactly 32 bytes.
      expect(
        Buffer.from(process.env.AI_SECRETS_ENCRYPTION_KEY!, 'base64').length,
      ).toBe(32);
    });

    it('does not overwrite explicitly provided values', () => {
      process.env.MUKTI_LOCAL = '1';
      process.env.AI_PROVIDER = 'openrouter';
      process.env.JWT_SECRET = 'explicit';

      applyLocalModeEnvDefaults();

      expect(process.env.AI_PROVIDER).toBe('openrouter');
      expect(process.env.JWT_SECRET).toBe('explicit');
    });

    it('is a no-op outside local mode', () => {
      applyLocalModeEnvDefaults();

      expect(process.env.JWT_SECRET).toBeUndefined();
      expect(process.env.AI_PROVIDER).toBeUndefined();
    });
  });
});
