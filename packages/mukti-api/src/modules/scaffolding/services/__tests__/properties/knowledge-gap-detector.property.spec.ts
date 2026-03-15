import * as fc from 'fast-check';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { KnowledgeGapDetectorService } from '../../knowledge-gap-detector.service';

describe('KnowledgeGapDetectorService - Score Invariants (Property-Based)', () => {
  let service: KnowledgeGapDetectorService;

  beforeEach(() => {
    service = new KnowledgeGapDetectorService(
      {
        create: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        updateOne: jest.fn(),
      } as any,
      {
        create: jest.fn(),
        exists: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
      } as any,
      { updateKnowledgeState: jest.fn() } as any,
      { checkMultiple: jest.fn() } as any,
      { create: jest.fn() } as any,
      { get: jest.fn() } as any,
    );
  });

  it('keeps weighted gap scores within the normalized range', () => {
    fc.assert(
      fc.property(
        fc.double({ max: 1, min: 0, noDefaultInfinity: true, noNaN: true }),
        fc.double({ max: 1, min: 0, noDefaultInfinity: true, noNaN: true }),
        fc.double({ max: 1, min: 0, noDefaultInfinity: true, noNaN: true }),
        fc.double({ max: 1, min: 0, noDefaultInfinity: true, noNaN: true }),
        (linguistic, behavioral, temporal, knowledgeProbability) => {
          const score = (service as any).calculateGapScore(
            linguistic,
            behavioral,
            temporal,
            knowledgeProbability,
          );

          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
