import { Types } from 'mongoose';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import type { ProblemStructure } from '../../../../schemas/canvas-session.schema';

import { DialogueQueueService } from '../dialogue-queue.service';

/**
 * Local-mode inline processing for Canvas node dialogue (RFC add-canvas-maps-local-runtime).
 *
 * Verifies that under `MUKTI_LOCAL` the dialogue queue does not enqueue to
 * BullMQ, emits its normal SSE sequence on success, and emits `error` (with no
 * `complete`) when the AI provider fails.
 */
describe('DialogueQueueService — local mode (inline)', () => {
  const SESSION = new Types.ObjectId().toString();
  const NODE = 'seed';
  const USER = new Types.ObjectId().toString();

  const problemStructure: ProblemStructure = { roots: [], seed: '', soil: [] };

  let service: DialogueQueueService;
  let queue: { add: jest.Mock };
  let dialogueStreamService: {
    emitToNodeDialogue: jest.Mock;
    getNodeDialogueConnectionCount: jest.Mock;
  };
  let dialogueService: {
    addMessage: jest.Mock;
    getMessages: jest.Mock;
    getOrCreateDialogue: jest.Mock;
    updateQualityState: jest.Mock;
    updateScaffoldState: jest.Mock;
  };
  let dialogueAIService: { generateScaffoldedResponse: jest.Mock };

  const originalLocal = process.env.MUKTI_LOCAL;

  const flush = () => new Promise((resolve) => setTimeout(resolve, 60));

  beforeEach(() => {
    process.env.MUKTI_LOCAL = '1';
    queue = { add: jest.fn() };

    dialogueStreamService = {
      emitToNodeDialogue: jest.fn(),
      getNodeDialogueConnectionCount: jest.fn().mockReturnValue(1),
    };

    dialogueService = {
      addMessage: jest.fn().mockImplementation((_id, role) =>
        Promise.resolve({
          _id: new Types.ObjectId(),
          createdAt: new Date(),
          role,
          sequence: role === 'user' ? 1 : 2,
        }),
      ),
      getMessages: jest.fn().mockResolvedValue({ messages: [] }),
      getOrCreateDialogue: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        currentScaffoldLevel: 0,
        detectedConcepts: [],
      }),
      updateQualityState: jest.fn().mockResolvedValue(undefined),
      updateScaffoldState: jest.fn().mockResolvedValue(undefined),
    };

    dialogueAIService = {
      generateScaffoldedResponse: jest.fn().mockResolvedValue({
        completionTokens: 8,
        content: 'What makes you believe that?',
        cost: 0,
        latencyMs: 5,
        model: 'sonnet',
        promptTokens: 12,
        totalTokens: 20,
      }),
    };

    const knowledgeGapDetector = {
      analyze: jest.fn().mockResolvedValue({
        detectedConcepts: [],
        gapScore: 0.1,
        knowledgeProbability: 0.5,
        missingPrerequisites: [],
        recommendation: 'socratic',
        rootGap: null,
        scaffoldLevel: 0,
        signals: { behavioral: 0, linguistic: 0, temporal: 0 },
      }),
      updateKnowledgeState: jest.fn().mockResolvedValue(undefined),
    };

    const dialogueQualityService = {
      assess: jest.fn().mockResolvedValue({
        directives: [],
        misconception: { fromCache: false, hasMisconception: false },
      }),
    };

    service = new DialogueQueueService(
      queue as any,
      { create: jest.fn() } as any, // canvasSessionModel
      { create: jest.fn().mockResolvedValue({}) } as any, // usageEventModel
      { resolve: jest.fn().mockResolvedValue('') } as any, // aiKeyResolver
      {
        getCuratedModels: jest.fn().mockReturnValue([{ id: 'sonnet' }]),
        isClaudeCodeProvider: jest.fn().mockReturnValue(true),
      } as any, // aiPolicyService
      dialogueAIService as any,
      dialogueQualityService as any,
      dialogueService as any,
      dialogueStreamService as any,
      knowledgeGapDetector as any,
      { monitor: jest.fn() } as any, // postResponseMonitor
      {
        evaluateAndTransition: jest
          .fn()
          .mockReturnValue({ newLevel: 0, resetCounters: false }),
      } as any, // scaffoldFadeService
      {
        evaluate: jest.fn().mockReturnValue({
          quality: { demonstratesUnderstanding: false },
        }),
      } as any, // responseEvaluator
    );
  });

  afterEach(() => {
    if (originalLocal === undefined) {
      delete process.env.MUKTI_LOCAL;
    } else {
      process.env.MUKTI_LOCAL = originalLocal;
    }
    jest.clearAllMocks();
  });

  const enqueue = () =>
    service.enqueueRequest(
      USER,
      SESSION,
      NODE,
      'seed',
      'Seed label',
      problemStructure,
      'my message',
      'free',
      'sonnet',
      false,
    );

  it('does not enqueue to BullMQ and returns a local job id', async () => {
    const result = await enqueue();

    expect(queue.add).not.toHaveBeenCalled();
    expect(result.position).toBe(1);
    expect(result.jobId).toMatch(/^local-/);
  });

  it('emits the normal node-dialogue SSE sequence on success (no error)', async () => {
    await enqueue();
    await flush();

    const types = dialogueStreamService.emitToNodeDialogue.mock.calls.map(
      ([, , , event]) => event.type,
    );
    expect(queue.add).not.toHaveBeenCalled();
    expect(types).toContain('processing');
    expect(types).toContain('message');
    expect(types).toContain('complete');
    expect(types).not.toContain('error');
  });

  it('emits error and no complete when the provider fails', async () => {
    dialogueAIService.generateScaffoldedResponse.mockRejectedValue(
      new Error('provider down'),
    );

    await enqueue();
    await flush();

    const types = dialogueStreamService.emitToNodeDialogue.mock.calls.map(
      ([, , , event]) => event.type,
    );
    expect(types).toContain('error');
    expect(types).not.toContain('complete');
  });
});
