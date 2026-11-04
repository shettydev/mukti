import { AiSettingsService } from '../ai-settings.service';

/**
 * The per-user default turn budget (dialogue-help-controls, "default budget
 * from Settings"): every surface reads it when it creates a dialogue.
 */
describe('AiSettingsService', () => {
  function service(storedPreferences?: Record<string, unknown>) {
    const lean = jest
      .fn()
      .mockResolvedValue(
        storedPreferences === undefined
          ? null
          : { preferences: storedPreferences },
      );
    const select = jest.fn().mockReturnValue({ lean });
    const userModel = {
      findById: jest.fn().mockReturnValue({ select }),
      updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
    };
    return {
      instance: new AiSettingsService(userModel as any),
      select,
      userModel,
    };
  }

  describe('getDefaultTurnBudget', () => {
    it('returns the stored default', async () => {
      const { instance, select } = service({ defaultTurnBudget: 10 });

      await expect(instance.getDefaultTurnBudget('user-1')).resolves.toBe(10);
      expect(select).toHaveBeenCalledWith('preferences.defaultTurnBudget');
    });

    it.each([
      ['no user', undefined],
      ['no preference', {}],
      ['a cleared preference', { defaultTurnBudget: null }],
      ['a value below the range', { defaultTurnBudget: 0 }],
      ['a value above the range', { defaultTurnBudget: 51 }],
      ['a fractional value', { defaultTurnBudget: 2.5 }],
      ['a string', { defaultTurnBudget: '10' }],
    ])('returns null for %s', async (_label, stored) => {
      const { instance } = service(stored);

      await expect(instance.getDefaultTurnBudget('user-1')).resolves.toBe(null);
    });
  });

  describe('setDefaultTurnBudget', () => {
    it('stores a value from 1 to 50', async () => {
      const { instance, userModel } = service({});

      await expect(instance.setDefaultTurnBudget('user-1', 25)).resolves.toBe(
        25,
      );
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: 'user-1' },
        { $set: { 'preferences.defaultTurnBudget': 25 } },
      );
    });

    it('clears the default for null', async () => {
      const { instance, userModel } = service({ defaultTurnBudget: 10 });

      await expect(
        instance.setDefaultTurnBudget('user-1', null),
      ).resolves.toBeNull();
      expect(userModel.updateOne).toHaveBeenCalledWith(
        { _id: 'user-1' },
        { $unset: { 'preferences.defaultTurnBudget': 1 } },
      );
    });
  });
});
