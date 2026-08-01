/**
 * Local mode must boot with no configuration at all.
 *
 * @remarks
 * `GoogleStrategy`'s constructor throws when `GOOGLE_CLIENT_ID` /
 * `GOOGLE_CLIENT_SECRET` are absent. In a repo checkout a developer's `.env`
 * hides that, but `npx muktiai` runs on machines with no `.env` anywhere —
 * where registering it took the whole API down during Nest's provider
 * instantiation, before the app ever listened.
 *
 * Local mode bypasses auth for a seeded user and has no login screen, so the
 * strategy is unreachable there and must not be registered.
 */

/** Re-imports the module with the current env, since the check runs at import. */
async function loadProviders(): Promise<unknown[]> {
  jest.resetModules();
  const { AuthModule } = (await import('../auth.module')) as {
    AuthModule: unknown;
  };
  const metadata = Reflect.getMetadata(
    'providers',
    AuthModule as object,
  ) as unknown[];
  return metadata;
}

async function providerNames(): Promise<string[]> {
  const providers = await loadProviders();
  return providers.map((provider) =>
    typeof provider === 'function' ? provider.name : String(provider),
  );
}

describe('AuthModule provider registration', () => {
  const original = process.env.MUKTI_LOCAL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.MUKTI_LOCAL;
    } else {
      process.env.MUKTI_LOCAL = original;
    }
  });

  it('omits GoogleStrategy in local mode, so a machine with no credentials boots', async () => {
    process.env.MUKTI_LOCAL = '1';
    const names = await providerNames();

    expect(names).not.toContain('GoogleStrategy');
    // The rest of auth is untouched — only the unreachable strategy is dropped.
    expect(names).toContain('JwtStrategy');
    expect(names).toContain('AuthService');
  });

  it('registers GoogleStrategy outside local mode, leaving hosted auth unchanged', async () => {
    delete process.env.MUKTI_LOCAL;
    const names = await providerNames();

    expect(names).toContain('GoogleStrategy');
  });
});
