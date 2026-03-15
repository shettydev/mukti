import {
  type ResponseQuality,
  ScaffoldLevel,
} from '../../interfaces/scaffolding.interface';
import { ScaffoldFadeService } from '../scaffold-fade.service';

describe('ScaffoldFadeService', () => {
  let service: ScaffoldFadeService;

  beforeEach(() => {
    service = new ScaffoldFadeService();
  });

  const quality = (
    overrides: Partial<ResponseQuality> = {},
  ): ResponseQuality => ({
    confidence: 0.2,
    demonstratesUnderstanding: false,
    signals: {
      appliesPattern: false,
      asksRelevantQuestion: false,
      hasExplanation: false,
      mentionsConcept: false,
    },
    ...overrides,
  });

  it('creates an initial fade state with cleared counters', () => {
    expect(
      service.createInitialState(ScaffoldLevel.STRATEGIC_HINTS),
    ).toMatchObject({
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      currentLevel: ScaffoldLevel.STRATEGIC_HINTS,
      transitionHistory: [],
    });
  });

  it('calculates progress with level progress and success bonus', () => {
    const progress = service.calculateProgress({
      consecutiveFailures: 0,
      consecutiveSuccesses: 1,
      currentLevel: ScaffoldLevel.WORKED_EXAMPLES,
      transitionHistory: [],
    });

    expect(progress).toBeGreaterThan(25);
    expect(progress).toBeLessThanOrEqual(100);
    expect(
      service.calculateProgress({
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        currentLevel: ScaffoldLevel.PURE_SOCRATIC,
        transitionHistory: [],
      }),
    ).toBe(100);
  });

  it('fades support after two consecutive successes', () => {
    const transition = service.evaluateAndTransition(
      {
        consecutiveFailures: 0,
        consecutiveSuccesses: 1,
        currentLevel: ScaffoldLevel.STRATEGIC_HINTS,
        transitionHistory: [],
      },
      quality({
        confidence: 0.8,
        demonstratesUnderstanding: true,
      }),
    );

    expect(transition).toEqual({
      changed: true,
      newLevel: ScaffoldLevel.META_COGNITIVE,
      reason: '2 consecutive successes - fading support',
      resetCounters: true,
    });
  });

  it('increases support after two consecutive failures', () => {
    const transition = service.evaluateAndTransition(
      {
        consecutiveFailures: 1,
        consecutiveSuccesses: 0,
        currentLevel: ScaffoldLevel.META_COGNITIVE,
        transitionHistory: [],
      },
      quality(),
    );

    expect(transition).toEqual({
      changed: true,
      newLevel: ScaffoldLevel.STRATEGIC_HINTS,
      reason: '2 consecutive failures - increasing support',
      resetCounters: true,
    });
  });

  it('resets counters when a boundary is hit without changing level', () => {
    const minTransition = service.evaluateAndTransition(
      {
        consecutiveFailures: 0,
        consecutiveSuccesses: 1,
        currentLevel: ScaffoldLevel.PURE_SOCRATIC,
        transitionHistory: [],
      },
      quality({
        confidence: 0.9,
        demonstratesUnderstanding: true,
      }),
    );

    const maxTransition = service.evaluateAndTransition(
      {
        consecutiveFailures: 1,
        consecutiveSuccesses: 0,
        currentLevel: ScaffoldLevel.DIRECT_INSTRUCTION,
        transitionHistory: [],
      },
      quality(),
    );

    expect(minTransition).toEqual({
      changed: false,
      newLevel: ScaffoldLevel.PURE_SOCRATIC,
      reason: 'At minimum level - cannot fade further',
      resetCounters: true,
    });
    expect(maxTransition).toEqual({
      changed: false,
      newLevel: ScaffoldLevel.DIRECT_INSTRUCTION,
      reason: 'At maximum level - cannot escalate further',
      resetCounters: true,
    });
  });

  it('forces a level change and records it in history', () => {
    const result = service.forceLevel(
      {
        consecutiveFailures: 2,
        consecutiveSuccesses: 1,
        currentLevel: ScaffoldLevel.WORKED_EXAMPLES,
        transitionHistory: [],
      },
      ScaffoldLevel.META_COGNITIVE,
      'teacher override',
    );

    expect(result.consecutiveFailures).toBe(0);
    expect(result.consecutiveSuccesses).toBe(0);
    expect(result.currentLevel).toBe(ScaffoldLevel.META_COGNITIVE);
    expect(result.transitionHistory).toHaveLength(1);
    expect(result.transitionHistory[0]).toMatchObject({
      from: ScaffoldLevel.WORKED_EXAMPLES,
      reason: 'Manual: teacher override',
      to: ScaffoldLevel.META_COGNITIVE,
    });
  });

  it('updates state and appends history when a transition occurs', () => {
    const updated = service.updateState(
      {
        consecutiveFailures: 0,
        consecutiveSuccesses: 1,
        currentLevel: ScaffoldLevel.STRATEGIC_HINTS,
        transitionHistory: [],
      },
      {
        changed: true,
        newLevel: ScaffoldLevel.META_COGNITIVE,
        reason: '2 consecutive successes - fading support',
        resetCounters: true,
      },
      0,
      0,
    );

    expect(updated).toMatchObject({
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      currentLevel: ScaffoldLevel.META_COGNITIVE,
    });
    expect(updated.transitionHistory).toHaveLength(1);
    expect(updated.transitionHistory[0]).toMatchObject({
      from: ScaffoldLevel.STRATEGIC_HINTS,
      to: ScaffoldLevel.META_COGNITIVE,
    });
  });
});
