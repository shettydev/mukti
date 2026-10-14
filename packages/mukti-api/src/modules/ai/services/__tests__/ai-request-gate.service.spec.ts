import { HttpException, InternalServerErrorException } from '@nestjs/common';
import { Types } from 'mongoose';

// Avoid importing the ESM build of @openrouter/sdk during tests
jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { AiRequestGate } from '../ai-request-gate.service';

/**
 * Every AI surface (chat, canvas node chat, thought-map node chat, branch
 * suggestions, conversation extraction) passes through this gate before it
 * enqueues work. These tests pin the policy in one place.
 */
describe('AiRequestGate', () => {
  const userId = new Types.ObjectId();

  let userModel: { findById: jest.Mock; updateOne: jest.Mock };
  let subscriptionModel: { findOne: jest.Mock };
  let configService: { get: jest.Mock };
  let aiPolicyService: {
    isLocalCliProvider: jest.Mock;
    resolveEffectiveModel: jest.Mock;
  };
  let aiSecretsService: { decryptString: jest.Mock };
  let freeQuotaService: { checkAndConsume: jest.Mock };
  let gate: AiRequestGate;

  function build(
    options: {
      activeModel?: string;
      byokKey?: string;
      localCli?: boolean;
      serverKey?: string;
      tier?: 'free' | 'paid';
      userExists?: boolean;
    } = {},
  ) {
    const userRecord =
      options.userExists === false
        ? null
        : {
            _id: userId,
            openRouterApiKeyEncrypted: options.byokKey,
            preferences: { activeModel: options.activeModel },
          };
    userModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(userRecord),
        }),
      }),
      updateOne: jest.fn(),
    };
    subscriptionModel = {
      findOne: jest.fn().mockReturnValue({
        lean: jest
          .fn()
          .mockResolvedValue(options.tier ? { tier: options.tier } : null),
      }),
    };
    configService = {
      get: jest.fn().mockReturnValue(options.serverKey ?? 'sk-or-server'),
    };
    aiPolicyService = {
      isLocalCliProvider: jest.fn().mockReturnValue(options.localCli ?? false),
      resolveEffectiveModel: jest.fn().mockResolvedValue('resolved-model'),
    };
    aiSecretsService = { decryptString: jest.fn().mockReturnValue('sk-user') };
    freeQuotaService = { checkAndConsume: jest.fn() };

    gate = new AiRequestGate(
      userModel as any,
      subscriptionModel as any,
      configService as any,
      aiPolicyService as any,
      aiSecretsService as any,
      freeQuotaService as any,
    );
  }

  it('consumes one free message when the request runs on the server key', async () => {
    build();

    const result = await gate.authorize(userId);

    expect(freeQuotaService.checkAndConsume).toHaveBeenCalledWith(userId);
    expect(result).toEqual({
      model: 'resolved-model',
      subscriptionTier: 'free',
      usedByok: false,
    });
  });

  it('propagates the 429 when the free allowance is used up', async () => {
    build();
    freeQuotaService.checkAndConsume.mockRejectedValue(
      new HttpException('limit', 429),
    );

    await expect(gate.authorize(userId)).rejects.toThrow(HttpException);
    expect(userModel.updateOne).not.toHaveBeenCalled();
  });

  it('does not consume quota for a user with their own key and validates with it', async () => {
    build({ byokKey: 'encrypted' });

    const result = await gate.authorize(userId);

    expect(freeQuotaService.checkAndConsume).not.toHaveBeenCalled();
    expect(aiSecretsService.decryptString).toHaveBeenCalledWith('encrypted');
    expect(aiPolicyService.resolveEffectiveModel).toHaveBeenCalledWith(
      expect.objectContaining({ hasByok: true, validationApiKey: 'sk-user' }),
    );
    expect(result.usedByok).toBe(true);
  });

  it('neither consumes quota nor requires a server key under a local-CLI provider', async () => {
    build({ localCli: true, serverKey: '' });

    await expect(gate.authorize(userId)).resolves.toMatchObject({
      usedByok: false,
    });
    expect(freeQuotaService.checkAndConsume).not.toHaveBeenCalled();
  });

  it('reports AI as unavailable, without spending quota, when the server key is missing', async () => {
    build({ serverKey: '' });

    await expect(gate.authorize(userId)).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(freeQuotaService.checkAndConsume).not.toHaveBeenCalled();
  });

  it('does not spend quota when the requested model is rejected', async () => {
    build();
    aiPolicyService.resolveEffectiveModel.mockRejectedValue(
      new Error('model not allowed'),
    );

    await expect(gate.authorize(userId, 'bad/model')).rejects.toThrow(
      'model not allowed',
    );
    expect(freeQuotaService.checkAndConsume).not.toHaveBeenCalled();
  });

  it('reads the tier from the subscription record, not the request user', async () => {
    build({ tier: 'paid' });

    await expect(gate.authorize(userId)).resolves.toMatchObject({
      subscriptionTier: 'paid',
    });
  });

  it('persists the model when one is requested or none is saved yet', async () => {
    build({ activeModel: 'saved' });
    await gate.authorize(userId);
    expect(userModel.updateOne).not.toHaveBeenCalled();

    await gate.authorize(userId, 'picked/model');
    expect(userModel.updateOne).toHaveBeenCalledWith(
      { _id: userId },
      { $set: { 'preferences.activeModel': 'resolved-model' } },
    );
  });

  it('throws NotFound when the user record is missing', async () => {
    build({ userExists: false });

    await expect(gate.authorize(userId)).rejects.toThrow('User not found');
  });
});
