jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { ValidationPipe } from '@nestjs/common';

import { VALIDATION_PIPE_OPTIONS } from '../../../common/config/validation';
import { AiController } from '../ai.controller';
import { UpdateAiSettingsDto } from '../dto/ai-settings.dto';

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
    storedDefaultTurnBudget?: unknown;
    storedModel?: string;
  }): AiController {
    const userModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            preferences: {
              activeModel: options.storedModel,
              defaultTurnBudget: options.storedDefaultTurnBudget,
            },
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

/**
 * The Settings default turn budget (dialogue-help-controls): read by
 * `GET /ai/settings`, saved by `PATCH /ai/settings`, independent of the model.
 */
describe('AiController default turn budget', () => {
  function controller(storedDefaultTurnBudget?: unknown) {
    const userModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            preferences: { defaultTurnBudget: storedDefaultTurnBudget },
          }),
        }),
      }),
      updateOne: jest.fn(),
    };
    const aiPolicyService = {
      isLocalCliProvider: jest.fn().mockReturnValue(false),
      resolveEffectiveModel: jest.fn(),
    };
    const aiSettingsService = {
      setDefaultTurnBudget: jest.fn((_userId: string, value: null | number) =>
        Promise.resolve(value),
      ),
    };
    const instance = new AiController(
      userModel as any,
      aiPolicyService as any,
      {} as any,
      aiSettingsService as any,
      {} as any,
      {} as any,
    );
    return { aiPolicyService, aiSettingsService, instance, userModel };
  }

  it.each([
    [10, 10],
    [undefined, null],
    [null, null],
    [0, null],
    [99, null],
    ['10', null],
  ])('reports a stored default of %p as %p', async (stored, expected) => {
    const settings = await controller(stored).instance.getSettings('user-1');
    expect(settings.defaultTurnBudget).toBe(expected);
  });

  it('saves the default without touching the model', async () => {
    const { aiPolicyService, aiSettingsService, instance, userModel } =
      controller();

    const result = await instance.updateSettings('user-1', {
      defaultTurnBudget: 10,
    });

    expect(result).toEqual({ defaultTurnBudget: 10 });
    expect(aiSettingsService.setDefaultTurnBudget).toHaveBeenCalledWith(
      'user-1',
      10,
    );
    expect(aiPolicyService.resolveEffectiveModel).not.toHaveBeenCalled();
    expect(userModel.updateOne).not.toHaveBeenCalled();
  });

  it('clears the default with null', async () => {
    const { aiSettingsService, instance } = controller(10);

    const result = await instance.updateSettings('user-1', {
      defaultTurnBudget: null,
    });

    expect(result).toEqual({ defaultTurnBudget: null });
    expect(aiSettingsService.setDefaultTurnBudget).toHaveBeenCalledWith(
      'user-1',
      null,
    );
  });

  it('leaves the default alone when the field is omitted', async () => {
    const { aiSettingsService, instance } = controller(10);

    await expect(instance.updateSettings('user-1', {})).resolves.toEqual({
      activeModel: null,
    });
    expect(aiSettingsService.setDefaultTurnBudget).not.toHaveBeenCalled();
  });

  describe('request validation (the API-wide pipe)', () => {
    const pipe = new ValidationPipe(VALIDATION_PIPE_OPTIONS);
    const validate = (body: unknown) =>
      pipe.transform(body, { metatype: UpdateAiSettingsDto, type: 'body' });

    it.each([1, 10, 50, null])('accepts a default of %p', async (value) => {
      await expect(
        validate({ defaultTurnBudget: value }),
      ).resolves.toMatchObject({ defaultTurnBudget: value });
    });

    it.each([0, 51, 2.5, -3, 'ten', true])(
      'rejects a default of %p',
      async (value) => {
        await expect(validate({ defaultTurnBudget: value })).rejects.toThrow();
      },
    );
  });
});
