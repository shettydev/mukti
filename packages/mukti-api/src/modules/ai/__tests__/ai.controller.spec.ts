jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { AiController } from '../ai.controller';

/**
 * What the settings endpoint tells the model picker.
 *
 * @remarks
 * Under a local CLI the picker must show the model turns will really run on.
 * A stored preference from another provider (or none at all) would otherwise
 * make the web app fall back to a model the CLI does not know and send it.
 */
describe('AiController.getSettings', () => {
  function controller(options: {
    localCli: boolean;
    storedModel?: string;
  }): AiController {
    const userModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            preferences: { activeModel: options.storedModel },
          }),
        }),
      }),
    };
    const aiPolicyService = {
      isLocalCliProvider: jest.fn().mockReturnValue(options.localCli),
      resolveLocalCliModel: jest.fn((stored?: string) =>
        stored === 'gemini-3.8-flash-low' ? stored : 'gemini-3.8-flash-high',
      ),
    };
    return new AiController(
      userModel as any,
      aiPolicyService as any,
      {} as any,
      {} as any,
      {} as any,
    );
  }

  it('reports the stored model unchanged on the hosted provider', async () => {
    const settings = await controller({
      localCli: false,
      storedModel: 'anthropic/claude-sonnet-4-6',
    }).getSettings('user-1');

    expect(settings.activeModel).toBe('anthropic/claude-sonnet-4-6');
  });

  it('reports the default model under a local CLI when nothing is stored', async () => {
    const settings = await controller({ localCli: true }).getSettings('user-1');

    expect(settings.activeModel).toBe('gemini-3.8-flash-high');
  });

  it('reports the default model under a local CLI when the stored one is from another provider', async () => {
    const settings = await controller({
      localCli: true,
      storedModel: 'sonnet',
    }).getSettings('user-1');

    expect(settings.activeModel).toBe('gemini-3.8-flash-high');
  });

  it('keeps a stored model the local CLI offers', async () => {
    const settings = await controller({
      localCli: true,
      storedModel: 'gemini-3.8-flash-low',
    }).getSettings('user-1');

    expect(settings.activeModel).toBe('gemini-3.8-flash-low');
  });
});
