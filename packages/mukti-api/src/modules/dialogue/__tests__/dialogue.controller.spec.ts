jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { InternalServerErrorException } from '@nestjs/common';
import { Types } from 'mongoose';

import { DialogueController } from '../dialogue.controller';

/**
 * The Canvas node-dialogue send path and its free-tier gate.
 *
 * @remarks
 * This gate is the Canvas twin of the one on the conversation surface. Under a
 * local-CLI provider the user's own CLI pays for completions and local mode sets
 * no OpenRouter key, so the gate must neither consume quota nor demand a server
 * key — otherwise Canvas dialogue fails in local mode with "AI service is
 * temporarily unavailable" while conversations work.
 */
describe('DialogueController.sendMessage', () => {
  const userId = new Types.ObjectId();
  const user = { _id: userId } as any;
  const sessionId = new Types.ObjectId().toString();

  let aiPolicyService: {
    isLocalCliProvider: jest.Mock;
    resolveEffectiveModel: jest.Mock;
  };
  let configService: { get: jest.Mock };
  let dialogueQueueService: { enqueueRequest: jest.Mock };
  let freeQuotaService: { checkAndConsume: jest.Mock };
  let controller: DialogueController;

  function build(options: { localCli: boolean; serverKey: string }) {
    const userModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: userId,
            preferences: { activeModel: 'sonnet' },
          }),
        }),
      }),
      updateOne: jest.fn(),
    };
    const subscriptionModel = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      }),
    };
    configService = { get: jest.fn().mockReturnValue(options.serverKey) };
    aiPolicyService = {
      isLocalCliProvider: jest.fn().mockReturnValue(options.localCli),
      resolveEffectiveModel: jest.fn().mockResolvedValue('sonnet'),
    };
    freeQuotaService = { checkAndConsume: jest.fn() };
    dialogueQueueService = {
      enqueueRequest: jest
        .fn()
        .mockResolvedValue({ jobId: 'job-1', position: 0 }),
    };
    const dialogueService = {
      validateSessionOwnership: jest.fn().mockResolvedValue({
        problemStructure: {
          roots: ['An assumption'],
          seed: 'Why is my app slow?',
          soil: ['A constraint'],
        },
      }),
    };

    controller = new DialogueController(
      userModel as any,
      subscriptionModel as any,
      configService as any,
      aiPolicyService as any,
      { decryptString: jest.fn() } as any,
      freeQuotaService as any,
      dialogueQueueService as any,
      dialogueService as any,
      {} as any,
    );
  }

  const send = () =>
    controller.sendMessage(sessionId, 'seed', { content: 'Why?' } as any, user);

  it('consumes free quota for a non-BYOK OpenRouter user', async () => {
    build({ localCli: false, serverKey: 'sk-or-server' });

    await send();

    expect(freeQuotaService.checkAndConsume).toHaveBeenCalledWith(userId);
    expect(dialogueQueueService.enqueueRequest).toHaveBeenCalled();
  });

  it('reports AI as unavailable when an OpenRouter deployment has no server key', async () => {
    build({ localCli: false, serverKey: '' });

    await expect(send()).rejects.toThrow(InternalServerErrorException);
  });

  it('neither consumes quota nor requires a server key under a local-CLI provider', async () => {
    build({ localCli: true, serverKey: '' });

    await expect(send()).resolves.toEqual({ jobId: 'job-1', position: 0 });
    expect(freeQuotaService.checkAndConsume).not.toHaveBeenCalled();
    expect(aiPolicyService.resolveEffectiveModel).toHaveBeenCalledWith(
      expect.objectContaining({ hasByok: false }),
    );
  });
});
