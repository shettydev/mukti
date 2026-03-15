import * as fc from 'fast-check';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { BranchSuggestionService } from '../../branch-suggestion.service';

describe('BranchSuggestionService - Parser Invariants (Property-Based)', () => {
  let service: BranchSuggestionService;

  beforeEach(() => {
    service = new BranchSuggestionService(
      { add: jest.fn(), getJob: jest.fn(), getWaiting: jest.fn() } as any,
      { find: jest.fn(), findOne: jest.fn() } as any,
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

  it('normalizes parsed suggestions to bounded, trimmed parent-scoped results', () => {
    const suggestionArray = fc.array(
      fc.record({
        label: fc.string({ maxLength: 40, minLength: 1 }),
        suggestedType: fc.string({ maxLength: 12, minLength: 1 }),
      }),
      { maxLength: 8, minLength: 1 },
    );

    fc.assert(
      fc.property(
        suggestionArray,
        fc.string({ maxLength: 20, minLength: 1 }),
        (items, parentId) => {
          const content = JSON.stringify(items);
          const result = (service as any).parseJsonSuggestions(
            content,
            parentId,
          );

          expect(result.length).toBeLessThanOrEqual(3);
          for (let i = 0; i < result.length; i++) {
            expect(result[i].parentId).toBe(parentId);
            expect(result[i].label).toBe(items[i].label.trim());
            expect(['question', 'thought']).toContain(result[i].suggestedType);
            expect(result[i].suggestedType).toBe(
              items[i].suggestedType === 'thought' ? 'thought' : 'question',
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
