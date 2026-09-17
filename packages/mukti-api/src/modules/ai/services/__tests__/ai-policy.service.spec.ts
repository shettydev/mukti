jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import type { ConfigService } from '@nestjs/config';

import type { OpenRouterModelsService } from '../openrouter-models.service';

import { OpenRouterService } from '../../../conversations/services/openrouter.service';
import { AntigravityCliAdapter } from '../adapters/antigravity-cli.adapter';
import { AiPolicyService } from '../ai-policy.service';
import { AiProviderRegistry } from '../ai-provider.registry';

/**
 * The provider-family rules, checked against the real registry for every
 * local-CLI provider rather than against a mocked predicate — so adding a
 * provider cannot silently skip one of them.
 */
describe.each(['claude-code', 'antigravity'])(
  'AiPolicyService under the %s provider',
  (provider) => {
    let openRouterModels: { validateModelExists: jest.Mock };
    let policy: AiPolicyService;

    beforeEach(() => {
      jest.restoreAllMocks();
      // agy's catalogue is loaded at boot; stand in for it here.
      jest
        .spyOn(AntigravityCliAdapter.prototype, 'getModels')
        .mockReturnValue([
          { id: 'gemini-3.8-flash-high', label: 'Gemini 3.8 Flash (High)' },
        ]);
      const config = {
        get: jest.fn((key: string) =>
          key === 'AI_PROVIDER' ? provider : undefined,
        ),
      } as unknown as ConfigService;
      openRouterModels = { validateModelExists: jest.fn() };
      policy = new AiPolicyService(
        new AiProviderRegistry(config),
        config,
        openRouterModels as unknown as OpenRouterModelsService,
      );
    });

    it('requires no API key', () => {
      expect(policy.isLocalCliProvider()).toBe(true);
      expect(policy.providerRequiresApiKey()).toBe(false);
    });

    it('offers the CLI’s own models, never the OpenRouter list', () => {
      const ids = policy.getCuratedModels().map((m) => m.id);

      expect(ids).not.toContain('qwen/qwen3.7-max');
      expect(policy.getDefaultModel()).toBe(ids[0]);
    });

    it('honours a requested model the CLI offers, without consulting the OpenRouter catalogue', async () => {
      const offered = policy.getCuratedModels().at(-1)!.id;

      await expect(
        policy.resolveEffectiveModel({
          hasByok: false,
          requestedModel: offered,
          validationApiKey: '',
        }),
      ).resolves.toBe(offered);
      await policy.validateModelOrThrow({ apiKey: '', model: 'anything' });

      expect(openRouterModels.validateModelExists).not.toHaveBeenCalled();
    });

    // A preference can outlive its provider: `sonnet` saved under claude-code,
    // or the web app's hosted default. A CLI handed a model it does not know
    // fails every turn, so such a model is replaced, not passed on.
    it('replaces a requested or stored model the CLI does not offer with its default', async () => {
      await expect(
        policy.resolveEffectiveModel({
          hasByok: false,
          requestedModel: 'anthropic/claude-sonnet-4-6',
          userActiveModel: 'not-a-model-here',
          validationApiKey: '',
        }),
      ).resolves.toBe(policy.getDefaultModel());
    });

    it('falls back to a stored preference the CLI offers', async () => {
      const offered = policy.getCuratedModels().at(-1)!.id;

      await expect(
        policy.resolveEffectiveModel({
          hasByok: false,
          requestedModel: 'anthropic/claude-sonnet-4-6',
          userActiveModel: offered,
          validationApiKey: '',
        }),
      ).resolves.toBe(offered);
    });

    it('reports the model a stored preference will actually run on', () => {
      const offered = policy.getCuratedModels().at(-1)!.id;

      expect(policy.resolveLocalCliModel(offered)).toBe(offered);
      expect(policy.resolveLocalCliModel('sonnet-from-elsewhere')).toBe(
        policy.getDefaultModel(),
      );
      expect(policy.resolveLocalCliModel(undefined)).toBe(
        policy.getDefaultModel(),
      );
    });
  },
);

describe('AiPolicyService under the openrouter provider', () => {
  it('requires an API key', () => {
    const config = { get: jest.fn() } as unknown as ConfigService;
    const policy = new AiPolicyService(
      new AiProviderRegistry(config),
      config,
      {} as OpenRouterModelsService,
    );

    expect(policy.providerRequiresApiKey()).toBe(true);
  });
});

describe('local-CLI completion cost', () => {
  // The user's own subscription pays; nothing is billed through Mukti.
  it('is reported as 0 when a consumer parses a local-CLI payload', () => {
    // The shape LocalCliClientFactory returns for every local-CLI provider.
    const payload = {
      choices: [{ message: { content: 'What do you already know?' } }],
      usage: {
        completion_tokens: 675,
        prompt_tokens: 14942,
        total_tokens: 15617,
      },
    };

    const service = new OpenRouterService({} as any, {} as any, {} as any);
    const parsed = service.parseResponse(payload, 'gemini-3.8-flash-high');

    expect(parsed.cost).toBe(0);
    expect(parsed.promptTokens).toBe(14942);
    expect(parsed.content).toBe('What do you already know?');
  });
});
