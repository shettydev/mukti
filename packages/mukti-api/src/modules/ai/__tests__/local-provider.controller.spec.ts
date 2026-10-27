jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { NotFoundException, ValidationPipe } from '@nestjs/common';

import { SwitchProviderDto } from '../dto/switch-provider.dto';
import { LocalProviderController } from '../local-provider.controller';

/**
 * The Settings endpoints for choosing a local AI CLI.
 *
 * @remarks
 * They must not exist outside local mode, and they hand the web app everything
 * it needs to refresh its model picker in the same round trip as a switch.
 */
describe('LocalProviderController', () => {
  const env = { ...process.env };

  function controller(storedModel?: string) {
    const userModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue({ preferences: { activeModel: storedModel } }),
        }),
      }),
    };
    const aiPolicyService = {
      getCuratedModels: jest
        .fn()
        .mockReturnValue([{ id: 'gpt-6.1', label: 'GPT-6.1' }]),
      resolveLocalCliModel: jest.fn((stored?: string) =>
        stored === 'gpt-6.1-mini' ? stored : 'gpt-6.1',
      ),
    };
    const switcher = {
      getStatus: jest.fn().mockResolvedValue({ activeId: 'codex' }),
      switchTo: jest.fn().mockResolvedValue({
        activeId: 'codex',
        changed: true,
        saved: true,
      }),
    };
    return {
      switcher,
      target: new LocalProviderController(
        userModel as any,
        aiPolicyService as any,
        switcher as any,
      ),
    };
  }

  afterEach(() => {
    process.env = { ...env };
  });

  describe('outside local mode', () => {
    beforeEach(() => {
      delete process.env.MUKTI_LOCAL;
    });

    it('does not report providers', async () => {
      const { switcher, target } = controller();

      await expect(target.getProviders('user-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(switcher.getStatus).not.toHaveBeenCalled();
    });

    it('does not switch', async () => {
      const { switcher, target } = controller();

      await expect(
        target.switchProvider('user-1', { id: 'codex' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(switcher.switchTo).not.toHaveBeenCalled();
    });
  });

  describe('in local mode', () => {
    beforeEach(() => {
      process.env.MUKTI_LOCAL = '1';
    });

    it('reports providers with the model this user will run on', async () => {
      const { switcher, target } = controller('gpt-6.1-mini');

      const result = await target.getProviders('user-1');

      expect(switcher.getStatus).toHaveBeenCalledWith({ refresh: false });
      expect(result).toEqual({
        activeId: 'codex',
        activeModel: 'gpt-6.1-mini',
      });
    });

    it.each([
      ['1', true],
      ['true', true],
      ['0', false],
      [undefined, false],
    ])('treats refresh=%s as a re-check: %s', async (refresh, expected) => {
      const { switcher, target } = controller();

      await target.getProviders('user-1', refresh);

      expect(switcher.getStatus).toHaveBeenCalledWith({ refresh: expected });
    });

    it('switches, passing the save choice through, and returns the new models', async () => {
      const { switcher, target } = controller('opus');

      const result = await target.switchProvider('user-1', {
        id: 'codex',
        saveAsDefault: true,
      });

      expect(switcher.switchTo).toHaveBeenCalledWith('codex', {
        saveAsDefault: true,
      });
      expect(result).toEqual({
        activeId: 'codex',
        activeModel: 'gpt-6.1',
        changed: true,
        models: [{ id: 'gpt-6.1', label: 'GPT-6.1' }],
        saved: true,
      });
    });
  });

  describe('request validation', () => {
    const pipe = new ValidationPipe({ whitelist: true });
    const validate = (body: unknown) =>
      pipe.transform(body, { metatype: SwitchProviderDto, type: 'body' });

    it('accepts an id with an optional save flag', async () => {
      await expect(
        validate({ id: 'codex', saveAsDefault: false }),
      ).resolves.toEqual({ id: 'codex', saveAsDefault: false });
    });

    it.each([{}, { id: '' }, { id: 7 }, { id: 'codex', saveAsDefault: 'yes' }])(
      'rejects %j',
      async (body) => {
        await expect(validate(body)).rejects.toBeDefined();
      },
    );
  });
});
