import * as fc from 'fast-check';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { MapExtractionService } from '../../map-extraction.service';

describe('MapExtractionService - Parser Invariants (Property-Based)', () => {
  let service: MapExtractionService;

  beforeEach(() => {
    service = new MapExtractionService(
      { add: jest.fn(), getWaiting: jest.fn() } as any,
      { create: jest.fn() } as any,
      { create: jest.fn() } as any,
      { findOne: jest.fn() } as any,
      { create: jest.fn() } as any,
      {
        findById: jest.fn().mockReturnThis(),
        lean: jest.fn(),
        select: jest.fn().mockReturnThis(),
      } as any,
      { get: jest.fn() } as any,
      {
        getCuratedModels: jest.fn().mockReturnValue([{ id: 'allowed-model' }]),
      } as any,
      { decryptString: jest.fn() } as any,
    );
  });

  it('bounds parsed extraction results for any valid extraction-shaped payload', () => {
    const extractionArb = fc.record({
      branches: fc.array(
        fc.record({
          label: fc.string({ maxLength: 160, minLength: 1 }),
          sourceMessageIndices: fc.array(fc.integer({ max: 20, min: -5 }), {
            maxLength: 8,
          }),
          subPoints: fc.array(
            fc.record({
              label: fc.string({ maxLength: 160, minLength: 1 }),
              sourceMessageIndices: fc.array(fc.integer({ max: 20, min: -5 }), {
                maxLength: 8,
              }),
            }),
            { maxLength: 8 },
          ),
        }),
        { maxLength: 10 },
      ),
      centralTopic: fc.string({ maxLength: 220, minLength: 1 }),
      unresolvedQuestions: fc.array(
        fc.string({ maxLength: 120, minLength: 0 }),
        {
          maxLength: 6,
        },
      ),
    });

    fc.assert(
      fc.property(extractionArb, (payload) => {
        const result = (service as any).parseExtractionResult(
          JSON.stringify(payload),
        );

        expect(result.centralTopic.length).toBeLessThanOrEqual(100);
        expect(result.centralTopic).toBe(
          payload.centralTopic.trim().slice(0, 100),
        );
        expect(result.branches.length).toBeLessThanOrEqual(7);
        expect(result.unresolvedQuestions.length).toBeLessThanOrEqual(3);

        for (const branch of result.branches) {
          expect(branch.label.length).toBeLessThanOrEqual(80);
          expect(branch.subPoints.length).toBeLessThanOrEqual(4);
          for (const subPoint of branch.subPoints) {
            expect(subPoint.label.length).toBeLessThanOrEqual(80);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
