// Avoid importing the ESM build of @openrouter/sdk during tests
jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { ScaffoldLevel } from '../../scaffolding/interfaces/scaffolding.interface';
import { ScaffoldFadeService } from '../../scaffolding/services/scaffold-fade.service';
import {
  SOCRATIC_EXPLANATION_FORMAT,
  SOCRATIC_QUESTION_FORMAT,
  SOCRATIC_SUMMARY_FORMAT,
} from '../../ai/types/ai-response-format.interface';
import {
  type PrepareTurnInput,
  SocraticTurnEngine,
} from '../socratic-turn.engine';

/**
 * The shared Socratic turn used by chat, canvas node chat and thought-map
 * node chat. Surface specs exercise it end to end; these pin its rules.
 */
describe('SocraticTurnEngine', () => {
  const aiKeyResolver = { resolve: jest.fn() };
  const aiPolicyService = { getCuratedModels: jest.fn() };
  const dialogueQualityService = { assess: jest.fn() };
  const knowledgeGapDetector = {
    analyze: jest.fn(),
    updateKnowledgeState: jest.fn(),
  };
  const postResponseMonitor = { monitor: jest.fn() };
  const responseEvaluator = { evaluate: jest.fn() };
  const realFade = new ScaffoldFadeService();
  const scaffoldFadeService = {
    evaluateAndTransition: jest.fn(),
    manualRaise: jest.fn((level: ScaffoldLevel) => realFade.manualRaise(level)),
  };

  let engine: SocraticTurnEngine;

  const gapResult = (overrides: Record<string, unknown> = {}) => ({
    detectedConcepts: ['recursion'],
    gapScore: 0.2,
    knowledgeProbability: 0.5,
    missingPrerequisites: [],
    recommendation: 'socratic',
    rootGap: null,
    scaffoldLevel: ScaffoldLevel.PURE_SOCRATIC,
    signals: { behavioral: 0, linguistic: 0, temporal: 0 },
    ...overrides,
  });

  const input = (overrides: Partial<PrepareTurnInput> = {}) =>
    ({
      conversationHistory: [{ content: 'Why?', role: 'assistant' }],
      model: ' curated ',
      previousResponseLengths: [],
      state: {},
      usedByok: false,
      userId: 'user-1',
      userMessage: 'Because the base case stops it',
      ...overrides,
    }) as PrepareTurnInput;

  const understands = (value: boolean) => ({
    quality: { demonstratesUnderstanding: value },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    aiKeyResolver.resolve.mockResolvedValue('sk');
    aiPolicyService.getCuratedModels.mockReturnValue([{ id: 'curated' }]);
    dialogueQualityService.assess.mockResolvedValue({
      directives: [],
      misconception: { fromCache: false, hasMisconception: false },
    });
    knowledgeGapDetector.analyze.mockResolvedValue(gapResult());
    responseEvaluator.evaluate.mockReturnValue(understands(false));
    scaffoldFadeService.evaluateAndTransition.mockReturnValue({
      changed: false,
      newLevel: ScaffoldLevel.PURE_SOCRATIC,
      reason: 'none',
      resetCounters: false,
    });

    engine = new SocraticTurnEngine(
      aiKeyResolver as any,
      aiPolicyService as any,
      dialogueQualityService as any,
      knowledgeGapDetector as any,
      postResponseMonitor as any,
      responseEvaluator as any,
      scaffoldFadeService as any,
    );
  });

  describe('prepare', () => {
    it('rejects a non-curated model for a user without their own key', async () => {
      await expect(engine.prepare(input({ model: 'other' }))).rejects.toThrow(
        'MODEL_NOT_ALLOWED',
      );
      expect(knowledgeGapDetector.analyze).not.toHaveBeenCalled();
    });

    it('accepts any model with the user\u2019s own key', async () => {
      const turn = await engine.prepare(
        input({ model: 'any/model', usedByok: true }),
      );
      expect(turn.model).toBe('any/model');
    });

    it('always runs both gap detection and the quality checks', async () => {
      const turn = await engine.prepare(input({ model: ' curated ' }));

      expect(turn.model).toBe('curated');
      expect(turn.apiKey).toBe('sk');
      expect(knowledgeGapDetector.analyze).toHaveBeenCalledWith(
        expect.objectContaining({ aiApiKey: 'sk', aiModel: 'curated' }),
      );
      expect(dialogueQualityService.assess).toHaveBeenCalledTimes(1);
    });

    it('lets gap detection raise the level but never lower it', async () => {
      knowledgeGapDetector.analyze.mockResolvedValueOnce(
        gapResult({ scaffoldLevel: ScaffoldLevel.PURE_SOCRATIC }),
      );
      const kept = await engine.prepare(
        input({ state: { currentScaffoldLevel: 2 } }),
      );
      expect(kept.scaffoldContext.level).toBe(2);

      knowledgeGapDetector.analyze.mockResolvedValueOnce(
        gapResult({ scaffoldLevel: 3 }),
      );
      const raised = await engine.prepare(
        input({ state: { currentScaffoldLevel: 1 } }),
      );
      expect(raised.scaffoldContext.level).toBe(3);
      expect(raised.storedLevel).toBe(1);
    });
  });

  describe('settle', () => {
    it('on a first exchange grades nothing and writes no knowledge', async () => {
      const turn = await engine.prepare(input());
      const outcome = await engine.settle(turn, {
        hasPriorAssistantMessage: false,
      });

      expect(outcome.scaffoldUpdate).toBeUndefined();
      expect(outcome.isBreakthrough).toBe(false);
      expect(knowledgeGapDetector.updateKnowledgeState).not.toHaveBeenCalled();
    });

    it('grades the reply at the stored level and updates each concept once', async () => {
      knowledgeGapDetector.analyze.mockResolvedValue(
        gapResult({ rootGap: 'base-case', scaffoldLevel: 3 }),
      );
      responseEvaluator.evaluate.mockReturnValue(understands(true));

      const turn = await engine.prepare(
        input({ state: { currentScaffoldLevel: 1 } }),
      );
      const outcome = await engine.settle(turn, {
        hasPriorAssistantMessage: true,
      });

      expect(responseEvaluator.evaluate).toHaveBeenLastCalledWith(
        expect.objectContaining({ scaffoldLevel: 1 }),
      );
      expect(scaffoldFadeService.evaluateAndTransition).toHaveBeenCalledWith(
        expect.objectContaining({ currentLevel: 1 }),
        expect.anything(),
      );
      expect(knowledgeGapDetector.updateKnowledgeState).toHaveBeenCalledTimes(
        2,
      );
      expect(knowledgeGapDetector.updateKnowledgeState).toHaveBeenCalledWith(
        'user-1',
        'base-case',
        true,
      );
      expect(outcome.scaffoldUpdate?.demonstratedUnderstanding).toBe(true);
    });

    it('marks a breakthrough only after two or more failures', async () => {
      responseEvaluator.evaluate.mockReturnValue(understands(true));

      const afterStruggle = await engine.settle(
        await engine.prepare(input({ state: { consecutiveFailures: 2 } })),
        { hasPriorAssistantMessage: true },
      );
      expect(afterStruggle.isBreakthrough).toBe(true);

      const noStruggle = await engine.settle(
        await engine.prepare(input({ state: { consecutiveFailures: 1 } })),
        { hasPriorAssistantMessage: true },
      );
      expect(noStruggle.isBreakthrough).toBe(false);
    });

    it('keeps the turn when a knowledge write fails, so the job is not retried', async () => {
      knowledgeGapDetector.updateKnowledgeState.mockRejectedValueOnce(
        new Error('kept changing'),
      );

      const outcome = await engine.settle(await engine.prepare(input()), {
        hasPriorAssistantMessage: true,
      });

      expect(outcome.scaffoldUpdate).toBeDefined();
    });

    it('guards the scaffold write on the state the turn read', async () => {
      const outcome = await engine.settle(
        await engine.prepare(
          input({
            state: {
              consecutiveFailures: 0,
              consecutiveSuccesses: 1,
              currentScaffoldLevel: 2,
            },
          }),
        ),
        { hasPriorAssistantMessage: true },
      );

      expect(outcome.scaffoldUpdate?.guard).toEqual({
        consecutiveFailures: { $in: [0, null] },
        consecutiveSuccesses: 1,
        currentScaffoldLevel: 2,
      });
    });

    it('passes a detected misconception through for the surface to store', async () => {
      const misconception = {
        conceptName: 'recursion',
        fromCache: false,
        hasMisconception: true,
      };
      dialogueQualityService.assess.mockResolvedValue({
        directives: [],
        misconception,
      });

      const outcome = await engine.settle(await engine.prepare(input()), {
        hasPriorAssistantMessage: false,
      });

      expect(outcome.misconception).toBe(misconception);
    });
  });

  describe('help controls', () => {
    describe('response shape (ai-response-format)', () => {
      it.each([0, 1, 2, 3, 4])(
        'declares the question shape for ordinary and more_help turns at level %i',
        async (level) => {
          for (const helpControl of [undefined, 'more_help'] as const) {
            const turn = await engine.prepare(
              input({ helpControl, state: { currentScaffoldLevel: level } }),
            );
            expect(turn.responseFormat).toBe(SOCRATIC_QUESTION_FORMAT);
          }
        },
      );

      it('declares the explanation shape for explain and the summary shape for wrap_up', async () => {
        const explain = await engine.prepare(input({ helpControl: 'explain' }));
        expect(explain.turnKind).toBe('explain');
        expect(explain.responseFormat).toBe(SOCRATIC_EXPLANATION_FORMAT);

        const wrap = await engine.prepare(input({ helpControl: 'wrap_up' }));
        expect(wrap.turnKind).toBe('wrap_up');
        expect(wrap.responseFormat).toBe(SOCRATIC_SUMMARY_FORMAT);
      });

      it('treats the legacy wrapUpRequested flag as wrap_up', async () => {
        const turn = await engine.prepare(input({ wrapUpRequested: true }));
        expect(turn.turnKind).toBe('wrap_up');
        expect(dialogueQualityService.assess).toHaveBeenCalledWith(
          expect.objectContaining({ wrapUpRequested: true }),
        );
      });

      it('passes explainRequested only on an explain turn', async () => {
        await engine.prepare(input({ helpControl: 'explain' }));
        expect(dialogueQualityService.assess).toHaveBeenLastCalledWith(
          expect.objectContaining({
            explainRequested: true,
            wrapUpRequested: false,
          }),
        );
        await engine.prepare(input());
        expect(dialogueQualityService.assess).toHaveBeenLastCalledWith(
          expect.objectContaining({
            explainRequested: false,
            wrapUpRequested: false,
          }),
        );
      });
    });

    describe('turn budget', () => {
      it('turns the exchange that reaches the budget into a wrap-up, over any control', async () => {
        const turn = await engine.prepare(
          input({ exchangesBefore: 4, helpControl: 'explain', turnBudget: 5 }),
        );
        expect(turn.turnKind).toBe('wrap_up');
        expect(turn.responseFormat).toBe(SOCRATIC_SUMMARY_FORMAT);
        expect(turn.budget).toEqual({ limit: 5, used: 5 });
      });

      it('does not block or summarise past the budget', async () => {
        const turn = await engine.prepare(
          input({ exchangesBefore: 5, turnBudget: 5 }),
        );
        expect(turn.turnKind).toBe('ordinary');
        expect(turn.budget).toEqual({ limit: 5, used: 6 });
      });

      it('reports no budget when none is set', async () => {
        const turn = await engine.prepare(input({ exchangesBefore: 9 }));
        expect(turn.budget).toBeNull();
      });
    });

    describe('more help', () => {
      it('writes the reply one level higher and stores it with counters reset', async () => {
        const turn = await engine.prepare(
          input({
            helpControl: 'more_help',
            state: { consecutiveFailures: 1, currentScaffoldLevel: 1 },
          }),
        );
        expect(turn.scaffoldContext.level).toBe(2);

        const outcome = await engine.settle(turn, {
          hasPriorAssistantMessage: true,
        });
        expect(
          scaffoldFadeService.evaluateAndTransition,
        ).not.toHaveBeenCalled();
        expect(outcome.scaffoldUpdate?.transition).toMatchObject({
          changed: true,
          newLevel: 2,
          resetCounters: true,
        });
      });

      it('stays at level 4 and reports no change at the top', async () => {
        const turn = await engine.prepare(
          input({
            helpControl: 'more_help',
            state: { currentScaffoldLevel: 4 },
          }),
        );
        expect(turn.scaffoldContext.level).toBe(4);
        const outcome = await engine.settle(turn, {
          hasPriorAssistantMessage: true,
        });
        expect(outcome.scaffoldUpdate?.transition).toMatchObject({
          changed: false,
          newLevel: 4,
        });
      });

      it('persists the gap-detected level when it is above stored + 1', async () => {
        knowledgeGapDetector.analyze.mockResolvedValueOnce(
          gapResult({ scaffoldLevel: 4 }),
        );
        const turn = await engine.prepare(
          input({
            helpControl: 'more_help',
            state: { currentScaffoldLevel: 1 },
          }),
        );
        const outcome = await engine.settle(turn, {
          hasPriorAssistantMessage: true,
        });
        expect(outcome.scaffoldUpdate?.transition.newLevel).toBe(4);
      });

      it('raises even on the first exchange', async () => {
        const outcome = await engine.settle(
          await engine.prepare(input({ helpControl: 'more_help' })),
          { hasPriorAssistantMessage: false },
        );
        expect(outcome.scaffoldUpdate?.transition.newLevel).toBe(1);
      });
    });

    describe('explain and wrap up hold the ladder', () => {
      it('explain keeps level and counters, and records the gap', async () => {
        const turn = await engine.prepare(
          input({
            helpControl: 'explain',
            state: { consecutiveFailures: 1, currentScaffoldLevel: 2 },
          }),
        );
        expect(turn.scaffoldContext.level).toBe(2);
        const outcome = await engine.settle(turn, {
          hasPriorAssistantMessage: true,
        });
        expect(outcome.scaffoldHeld).toBe(true);
        expect(outcome.scaffoldUpdate).toBeUndefined();
        expect(
          scaffoldFadeService.evaluateAndTransition,
        ).not.toHaveBeenCalled();
        expect(knowledgeGapDetector.updateKnowledgeState).toHaveBeenCalledWith(
          'user-1',
          'recursion',
          false,
        );
      });

      it('wrap up neither grades the message nor writes knowledge', async () => {
        const outcome = await engine.settle(
          await engine.prepare(input({ helpControl: 'wrap_up' })),
          { hasPriorAssistantMessage: true },
        );
        expect(outcome.scaffoldHeld).toBe(true);
        expect(outcome.scaffoldUpdate).toBeUndefined();
        expect(outcome.isBreakthrough).toBe(false);
        expect(
          knowledgeGapDetector.updateKnowledgeState,
        ).not.toHaveBeenCalled();
      });
    });

    it('passes the turn kind to the reply monitor', () => {
      engine.inspectReply('Idempotency means...', 'explain');
      expect(postResponseMonitor.monitor).toHaveBeenCalledWith(
        'Idempotency means...',
        'explain',
      );
    });
  });
});
