// Avoid importing the ESM build of @openrouter/sdk during tests
jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { ScaffoldLevel } from '../../scaffolding/interfaces/scaffolding.interface';
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
  const scaffoldFadeService = { evaluateAndTransition: jest.fn() };

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
});
