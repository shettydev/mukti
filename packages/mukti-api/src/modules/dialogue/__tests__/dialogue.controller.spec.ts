jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { HttpException } from '@nestjs/common';
import { Types } from 'mongoose';

import { DialogueController } from '../dialogue.controller';

/**
 * The Canvas node-dialogue send path.
 *
 * @remarks
 * Quota, key and model policy live in `AiRequestGate` (see its spec). Here we
 * only pin that the controller goes through the gate and forwards its result,
 * and that a rejected gate stops the request before anything is enqueued.
 */
describe('DialogueController.sendMessage', () => {
  const userId = new Types.ObjectId();
  const user = { _id: userId } as any;
  const sessionId = new Types.ObjectId().toString();

  let aiRequestGate: { authorize: jest.Mock };
  let dialogueQueueService: { enqueueRequest: jest.Mock };
  let controller: DialogueController;

  beforeEach(() => {
    aiRequestGate = {
      authorize: jest.fn().mockResolvedValue({
        model: 'sonnet',
        subscriptionTier: 'free',
        usedByok: false,
      }),
    };
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
      aiRequestGate as any,
      dialogueQueueService as any,
      dialogueService as any,
      {} as any,
    );
  });

  const send = (model?: string) =>
    controller.sendMessage(
      sessionId,
      'seed',
      { content: 'Why?', model } as any,
      user,
    );

  it('authorizes through the AI request gate and enqueues with its result', async () => {
    await expect(send('picked/model')).resolves.toEqual({
      jobId: 'job-1',
      position: 0,
    });

    expect(aiRequestGate.authorize).toHaveBeenCalledWith(
      userId,
      'picked/model',
    );
    expect(dialogueQueueService.enqueueRequest).toHaveBeenCalledWith(
      userId,
      sessionId,
      'seed',
      'seed',
      expect.any(String),
      expect.any(Object),
      'Why?',
      'free',
      'sonnet',
      false,
    );
  });

  it('enqueues nothing when the gate rejects the request', async () => {
    aiRequestGate.authorize.mockRejectedValue(new HttpException('limit', 429));

    await expect(send()).rejects.toThrow(HttpException);
    expect(dialogueQueueService.enqueueRequest).not.toHaveBeenCalled();
  });
});
