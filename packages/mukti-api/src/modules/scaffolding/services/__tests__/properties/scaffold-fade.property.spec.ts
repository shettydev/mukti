import * as fc from 'fast-check';

import { ScaffoldLevel } from '../../../interfaces/scaffolding.interface';
import { ScaffoldFadeService } from '../../scaffold-fade.service';

describe('ScaffoldFadeService - Transition Invariants (Property-Based)', () => {
  let service: ScaffoldFadeService;

  beforeEach(() => {
    service = new ScaffoldFadeService();
  });

  const levelArb = fc.constantFrom(
    ScaffoldLevel.PURE_SOCRATIC,
    ScaffoldLevel.META_COGNITIVE,
    ScaffoldLevel.STRATEGIC_HINTS,
    ScaffoldLevel.WORKED_EXAMPLES,
    ScaffoldLevel.DIRECT_INSTRUCTION,
  );

  it('keeps progress bounded and transitions within one level step', () => {
    fc.assert(
      fc.property(
        fc.record({
          confidence: fc.double({
            max: 1,
            min: 0,
            noDefaultInfinity: true,
            noNaN: true,
          }),
          currentLevel: levelArb,
          demonstratesUnderstanding: fc.boolean(),
          failures: fc.integer({ max: 4, min: 0 }),
          failureSignals: fc.boolean(),
          successes: fc.integer({ max: 4, min: 0 }),
        }),
        ({
          confidence,
          currentLevel,
          demonstratesUnderstanding,
          failures,
          failureSignals,
          successes,
        }) => {
          const progress = service.calculateProgress({
            consecutiveFailures: failures,
            consecutiveSuccesses: successes,
            currentLevel,
            transitionHistory: [],
          });

          const transition = service.evaluateAndTransition(
            {
              consecutiveFailures: failures,
              consecutiveSuccesses: successes,
              currentLevel,
              transitionHistory: [],
            },
            {
              confidence,
              demonstratesUnderstanding,
              signals: {
                appliesPattern: failureSignals,
                asksRelevantQuestion: failureSignals,
                hasExplanation: failureSignals,
                mentionsConcept: failureSignals,
              },
            },
          );

          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(100);
          expect(transition.newLevel).toBeGreaterThanOrEqual(
            ScaffoldLevel.PURE_SOCRATIC,
          );
          expect(transition.newLevel).toBeLessThanOrEqual(
            ScaffoldLevel.DIRECT_INSTRUCTION,
          );
          expect(
            Math.abs(transition.newLevel - currentLevel),
          ).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
