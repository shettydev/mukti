import * as fc from 'fast-check';

import { ScaffoldLevel } from '../../../interfaces/scaffolding.interface';
import { ResponseEvaluatorService } from '../../response-evaluator.service';

describe('ResponseEvaluatorService - Evaluation Invariants (Property-Based)', () => {
  let service: ResponseEvaluatorService;

  beforeEach(() => {
    service = new ResponseEvaluatorService();
  });

  it('keeps scores bounded and signal flags aligned with analysis counts', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 400 }),
        fc.array(fc.string({ maxLength: 20, minLength: 1 }), { maxLength: 5 }),
        fc.constantFrom(
          ScaffoldLevel.PURE_SOCRATIC,
          ScaffoldLevel.META_COGNITIVE,
          ScaffoldLevel.STRATEGIC_HINTS,
          ScaffoldLevel.WORKED_EXAMPLES,
          ScaffoldLevel.DIRECT_INSTRUCTION,
        ),
        (userResponse, conceptKeywords, scaffoldLevel) => {
          const result = service.evaluate({
            conceptKeywords,
            scaffoldLevel,
            userResponse,
          });

          expect(result.quality.confidence).toBeGreaterThanOrEqual(0);
          expect(result.quality.confidence).toBeLessThanOrEqual(1);
          expect(result.rawScores.depth).toBeGreaterThanOrEqual(0);
          expect(result.rawScores.depth).toBeLessThanOrEqual(1);
          expect(result.rawScores.relevance).toBeGreaterThanOrEqual(0);
          expect(result.rawScores.relevance).toBeLessThanOrEqual(1);
          expect(result.rawScores.engagement).toBeGreaterThanOrEqual(0);
          expect(result.rawScores.engagement).toBeLessThanOrEqual(1);
          expect(result.rawScores.application).toBeGreaterThanOrEqual(0);
          expect(result.rawScores.application).toBeLessThanOrEqual(1);
          expect(result.quality.signals.mentionsConcept).toBe(
            result.analysis.conceptMentions >= 1,
          );
          expect(result.quality.signals.hasExplanation).toBe(
            result.analysis.explanationIndicators >= 1,
          );
          expect(result.quality.signals.appliesPattern).toBe(
            result.analysis.patternApplications >= 1,
          );
          expect(result.quality.signals.asksRelevantQuestion).toBe(
            result.analysis.questionCount >= 1,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
