jest.mock('@openrouter/sdk', () => ({ OpenRouter: jest.fn() }));

import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { DataDisclosureController } from '../data-disclosure.controller';

/**
 * GET /data-disclosure (per user) and GET /data-disclosure/hosted (public,
 * for the sign-up link).
 */
describe('DataDisclosureController', () => {
  const userId = '6aec291f848ad114d2b5bbe2';

  function controller(options: {
    activeCli?: 'agy' | 'claude' | 'codex';
    dataDir?: string;
    local?: boolean;
    ownKey?: boolean;
  }) {
    const findById = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        openRouterApiKeyUpdatedAt: options.ownKey ? new Date() : undefined,
      }),
      select: jest.fn().mockReturnThis(),
    });
    // select() returns the same query object
    const query = findById();
    query.select.mockReturnValue(query);
    findById.mockReturnValue(query);

    const registry = {
      getProviderId: () =>
        options.local
          ? { agy: 'antigravity', claude: 'claude-code', codex: 'codex' }[
              options.activeCli ?? 'claude'
            ]
          : 'openrouter',
      isLocalCliProvider: () => !!options.local,
    };
    const config = {
      get: (key: string) =>
        key === 'MUKTI_LOCAL_DB_PATH' ? options.dataDir : undefined,
    };

    return {
      controller: new DataDisclosureController(
        { findById } as never,
        registry as never,
        config as never,
      ),
      findById,
    };
  }

  it('describes the hosted free tier for a user without their own key', async () => {
    const { controller: c } = controller({});

    const disclosure = await c.getForUser(userId);

    expect(disclosure.configuration).toBe('hosted-free');
  });

  it('describes hosted with own key for a user who saved one', async () => {
    const { controller: c } = controller({ ownKey: true });

    expect((await c.getForUser(userId)).configuration).toBe('hosted-own-key');
  });

  it('describes the active local CLI and the local data path', async () => {
    const { controller: c } = controller({
      activeCli: 'agy',
      dataDir: '/tmp/m/local-db',
      local: true,
    });

    const disclosure = await c.getForUser(userId);

    expect(disclosure.configuration).toBe('local');
    expect(disclosure.model.runner).toMatch(/Antigravity CLI/);
    expect(disclosure.storage.location).toMatch(/^\/tmp\/m\/local-db/);
  });

  it('serves the hosted free-tier view publicly, reading no user', () => {
    const { controller: c, findById } = controller({ local: true });
    findById.mockClear();

    const disclosure = c.getHostedPublic();

    expect(disclosure.configuration).toBe('hosted-free');
    expect(findById).not.toHaveBeenCalled();
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        DataDisclosureController.prototype.getHostedPublic,
      ),
    ).toBe(true);
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        DataDisclosureController.prototype.getForUser,
      ),
    ).toBeUndefined();
  });
});
