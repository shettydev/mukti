import { Types } from 'mongoose';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import type { ProblemStructure } from '../../../../schemas/canvas-session.schema';

import {
  SOCRATIC_EXPLANATION_FORMAT,
  SOCRATIC_QUESTION_FORMAT,
  SOCRATIC_SUMMARY_FORMAT,
} from '../../../ai/types/ai-response-format.interface';
import { ScaffoldLevel } from '../../../scaffolding/interfaces/scaffolding.interface';
import { ScaffoldFadeService } from '../../../scaffolding/services/scaffold-fade.service';
import { SocraticTurnEngine } from '../../../socratic-turn/socratic-turn.engine';
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

    // The real turn engine, built from mocked collaborators
    const socraticTurnEngine = new SocraticTurnEngine(
      { resolve: jest.fn().mockResolvedValue('') } as any, // aiKeyResolver
      {
        getCuratedModels: jest.fn().mockReturnValue([{ id: 'sonnet' }]),
        isLocalCliProvider: jest.fn().mockReturnValue(true),
      } as any, // aiPolicyService
      dialogueQualityService as any,
      knowledgeGapDetector as any,
      { monitor: jest.fn() } as any, // postResponseMonitor
      {
        evaluate: jest.fn().mockReturnValue({
          quality: { demonstratesUnderstanding: false },
        }),
      } as any, // responseEvaluator
      {
        evaluateAndTransition: jest
          .fn()
          .mockReturnValue({ newLevel: 0, resetCounters: false }),
      } as any, // scaffoldFadeService
    );

    service = new DialogueQueueService(
      queue as any,
      { create: jest.fn() } as any, // canvasSessionModel
      { create: jest.fn().mockResolvedValue({}) } as any, // usageEventModel
      dialogueAIService as any,
      dialogueService as any,
      dialogueStreamService as any,
      socraticTurnEngine,
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

/**
 * dialogue-help-controls in a canvas node dialogue: each turn kind declares its
 * own learner-facing shape, settles the scaffold state its own way, tags the
 * reply, and streams the help state; the turn budget is read in the job.
 */
describe('DialogueQueueService — help controls and turn budget', () => {
  const SESSION = new Types.ObjectId().toString();
  const USER = new Types.ObjectId().toString();
  const problemStructure: ProblemStructure = {
    roots: [],
    seed: 'Our retry handler double-charges',
    soil: [],
  };
  const reply = {
    completionTokens: 8,
    content: 'What has to stay true when the same request arrives twice?',
    cost: 0,
    latencyMs: 5,
    model: 'sonnet',
    promptTokens: 12,
    totalTokens: 20,
  };

  let service: DialogueQueueService;
  let queue: { add: jest.Mock; getWaiting: jest.Mock };
  let dialogueService: Record<string, jest.Mock>;
  let dialogueAIService: { generateScaffoldedResponse: jest.Mock };
  let emit: jest.Mock;
  let monitor: jest.Mock;
  let assess: jest.Mock;
  let updateKnowledgeState: jest.Mock;

  const buildService = (dialogue: Record<string, unknown>) => {
    queue = {
      add: jest.fn().mockResolvedValue({
        getState: jest.fn().mockResolvedValue('active'),
        id: 'job-1',
      }),
      getWaiting: jest.fn().mockResolvedValue([]),
    };
    emit = jest.fn();
    monitor = jest.fn().mockReturnValue({ questionCount: 0, violations: [] });
    assess = jest.fn().mockResolvedValue({
      directives: [],
      misconception: { fromCache: false, hasMisconception: false },
    });
    updateKnowledgeState = jest.fn().mockResolvedValue(undefined);
    dialogueService = {
      addMessage: jest.fn().mockImplementation((_id, role) =>
        Promise.resolve({
          _id: new Types.ObjectId(),
          createdAt: new Date(),
          role,
          sequence: role === 'user' ? 3 : 4,
        }),
      ),
      getMessages: jest.fn().mockResolvedValue({
        messages: [
          {
            content: 'Opening?',
            createdAt: new Date(),
            role: 'assistant',
            sequence: 0,
          },
          {
            content: 'First try',
            createdAt: new Date(),
            role: 'user',
            sequence: 1,
          },
          {
            content: 'Hmm?',
            createdAt: new Date(),
            role: 'assistant',
            sequence: 2,
          },
          {
            content: 'I am stuck',
            createdAt: new Date(),
            role: 'user',
            sequence: 3,
          },
        ],
      }),
      getOrCreateDialogue: jest.fn().mockResolvedValue({
        _id: new Types.ObjectId(),
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        currentScaffoldLevel: ScaffoldLevel.META_COGNITIVE,
        detectedConcepts: ['idempotency'],
        messageCount: 3,
        turnBudget: null,
        ...dialogue,
      }),
      updateQualityState: jest.fn().mockResolvedValue(undefined),
      updateScaffoldState: jest.fn().mockResolvedValue(true),
    };
    dialogueAIService = {
      generateScaffoldedResponse: jest.fn().mockResolvedValue(reply),
    };
    const realFade = new ScaffoldFadeService();

    const engine = new SocraticTurnEngine(
      { resolve: jest.fn().mockResolvedValue('key') } as any,
      {
        getCuratedModels: jest.fn().mockReturnValue([{ id: 'sonnet' }]),
      } as any,
      { assess } as any,
      {
        analyze: jest.fn().mockResolvedValue({
          detectedConcepts: ['idempotency'],
          gapScore: 0.2,
          knowledgeProbability: 0.5,
          missingPrerequisites: [],
          recommendation: 'socratic',
          rootGap: null,
          scaffoldLevel: 0,
          signals: { behavioral: 0, linguistic: 0, temporal: 0 },
        }),
        updateKnowledgeState,
      } as any,
      { monitor } as any,
      {
        evaluate: jest.fn().mockReturnValue({
          quality: { demonstratesUnderstanding: false },
        }),
      } as any,
      {
        evaluateAndTransition: jest.fn().mockReturnValue({
          changed: false,
          newLevel: (dialogue.currentScaffoldLevel as number | undefined) ?? 1,
          reason: 'No change needed',
          resetCounters: false,
        }),
        manualRaise: jest.fn((level: ScaffoldLevel) =>
          realFade.manualRaise(level),
        ),
      } as any,
    );

    service = new DialogueQueueService(
      queue as any,
      {} as any, // canvasSessionModel
      { create: jest.fn().mockResolvedValue({}) } as any, // usageEventModel
      dialogueAIService as any,
      dialogueService as any,
      { emitToNodeDialogue: emit } as any,
      engine,
    );
  };

  const runTurn = async (
    options: { dialogue?: Record<string, unknown>; helpControl?: string } = {},
  ) => {
    buildService(options.dialogue ?? {});
    await service.process({
      data: {
        ...(options.helpControl ? { helpControl: options.helpControl } : {}),
        message: 'I am stuck',
        model: 'sonnet',
        nodeId: 'seed',
        nodeLabel: 'Seed label',
        nodeType: 'seed',
        problemStructure,
        sessionId: SESSION,
        subscriptionTier: 'free',
        usedByok: false,
        userId: USER,
      },
      id: 'job-1',
    } as any);
    const events = emit.mock.calls.map(([, , , event]) => event);
    return {
      complete: events.find((e) => e.type === 'complete')?.data,
      reply: events.filter((e) => e.type === 'message').at(-1)?.data,
      responseFormat:
        dialogueAIService.generateScaffoldedResponse.mock.calls[0][8],
      savedReply: dialogueService.addMessage.mock.calls[1][3],
      scaffoldContext:
        dialogueAIService.generateScaffoldedResponse.mock.calls[0][6],
    };
  };

  afterEach(() => jest.clearAllMocks());

  it('carries the help control from the request into the job', async () => {
    buildService({});
    const original = process.env.MUKTI_LOCAL;
    delete process.env.MUKTI_LOCAL;
    try {
      await service.enqueueRequest(
        USER,
        SESSION,
        'seed',
        'seed',
        'Seed label',
        problemStructure,
        'Explain please',
        'free',
        'sonnet',
        false,
        'explain',
      );
    } finally {
      if (original !== undefined) {
        process.env.MUKTI_LOCAL = original;
      }
    }

    expect(queue.add).toHaveBeenCalledWith(
      'process-dialogue-request',
      expect.objectContaining({ helpControl: 'explain' }),
      { priority: 1 },
    );
  });

  it('applies the default turn budget when the job creates the dialogue', async () => {
    await runTurn();

    expect(dialogueService.getOrCreateDialogue).toHaveBeenCalledWith(
      SESSION,
      'seed',
      'seed',
      'Seed label',
      USER,
    );
  });

  it.each([
    ['ordinary', undefined, SOCRATIC_QUESTION_FORMAT],
    ['more_help', 'more_help', SOCRATIC_QUESTION_FORMAT],
    ['explain', 'explain', SOCRATIC_EXPLANATION_FORMAT],
    ['wrap_up', 'wrap_up', SOCRATIC_SUMMARY_FORMAT],
  ])(
    '%s: declares its shape, tags the reply and streams the turn kind',
    async (turnKind, helpControl, format) => {
      const {
        complete,
        reply: streamed,
        responseFormat,
        savedReply,
      } = await runTurn({ helpControl });

      expect(responseFormat).toBe(format);
      expect(savedReply).toMatchObject({ turnKind });
      expect(streamed).toMatchObject({ role: 'assistant', turnKind });
      expect(complete).toMatchObject({ budget: null, turnKind });
      expect(monitor).toHaveBeenCalledWith(reply.content, turnKind);
    },
  );

  it('More help from level 1 writes and stores level 2 with counters reset', async () => {
    const { complete, scaffoldContext } = await runTurn({
      helpControl: 'more_help',
    });

    expect(scaffoldContext).toMatchObject({ level: 2 });
    expect(dialogueService.updateScaffoldState).toHaveBeenCalledWith(
      expect.anything(),
      ScaffoldLevel.META_COGNITIVE,
      expect.objectContaining({
        changed: true,
        newLevel: ScaffoldLevel.STRATEGIC_HINTS,
        resetCounters: true,
      }),
      expect.anything(),
      false,
      expect.anything(),
    );
    expect(complete).toMatchObject({ scaffoldLevel: 2 });
  });

  it('More help at the top level stays at level 4', async () => {
    const { complete, scaffoldContext } = await runTurn({
      dialogue: { currentScaffoldLevel: ScaffoldLevel.DIRECT_INSTRUCTION },
      helpControl: 'more_help',
    });

    expect(scaffoldContext).toMatchObject({ level: 4 });
    expect(complete).toMatchObject({ scaffoldLevel: 4 });
  });

  it('Explain does not count as a failure', async () => {
    const { complete, scaffoldContext } = await runTurn({
      dialogue: { consecutiveFailures: 1 },
      helpControl: 'explain',
    });

    expect(scaffoldContext).toMatchObject({ level: 1 });
    expect(dialogueService.updateScaffoldState).not.toHaveBeenCalled();
    // Asking for the missing piece is evidence of a gap
    expect(updateKnowledgeState).toHaveBeenCalledWith(
      USER,
      'idempotency',
      false,
    );
    expect(complete).toMatchObject({ scaffoldLevel: 1 });
  });

  it('Wrap up keeps the stored state and records conclusionOffered', async () => {
    const { complete } = await runTurn({ helpControl: 'wrap_up' });

    expect(dialogueService.updateScaffoldState).not.toHaveBeenCalled();
    expect(dialogueService.updateQualityState).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      false,
      true,
    );
    expect(complete).toMatchObject({ scaffoldLevel: 1 });
  });

  it('continues with an ordinary reply after a wrap up', async () => {
    const { complete, responseFormat } = await runTurn({
      dialogue: { conclusionOffered: true },
    });

    expect(responseFormat).toBe(SOCRATIC_QUESTION_FORMAT);
    expect(complete).toMatchObject({ turnKind: 'ordinary' });
    expect(assess).toHaveBeenCalledWith(
      expect.objectContaining({
        explainRequested: false,
        wrapUpRequested: false,
      }),
    );
    expect(dialogueService.updateQualityState).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      false,
      false,
    );
  });

  it('answers the exchange that reaches the budget with a summary', async () => {
    // Opening question + 4 exchanges: this message is the 5th exchange
    const { complete, responseFormat } = await runTurn({
      dialogue: { messageCount: 9, turnBudget: 5 },
    });

    expect(responseFormat).toBe(SOCRATIC_SUMMARY_FORMAT);
    expect(complete).toMatchObject({
      budget: { limit: 5, used: 5 },
      turnKind: 'wrap_up',
    });
  });

  it('continues with an ordinary reply past the budget', async () => {
    const { complete, responseFormat } = await runTurn({
      dialogue: { messageCount: 11, turnBudget: 5 },
    });

    expect(responseFormat).toBe(SOCRATIC_QUESTION_FORMAT);
    expect(complete).toMatchObject({
      budget: { limit: 5, used: 6 },
      turnKind: 'ordinary',
    });
  });

  it('answers Explain with the summary when it reaches the budget', async () => {
    const { complete, responseFormat } = await runTurn({
      dialogue: { messageCount: 9, turnBudget: 5 },
      helpControl: 'explain',
    });

    expect(responseFormat).toBe(SOCRATIC_SUMMARY_FORMAT);
    expect(complete).toMatchObject({ turnKind: 'wrap_up' });
  });
});
