import {
  buildConceptExtractionUserPrompt,
  getDefaultBktParamsForDifficulty,
} from '../concept-extraction-prompt';

describe('concept-extraction-prompt', () => {
  it('builds a user prompt that embeds the original message', () => {
    const prompt = buildConceptExtractionUserPrompt(
      'How does recursion use a base case?',
    );

    expect(prompt).toContain('How does recursion use a base case?');
    expect(prompt).toContain('"concepts"');
  });

  it('returns stable BKT defaults by difficulty', () => {
    expect(getDefaultBktParamsForDifficulty('beginner')).toEqual({
      pGuess: 0.3,
      pInit: 0.4,
      pLearn: 0.2,
      pSlip: 0.08,
    });
    expect(getDefaultBktParamsForDifficulty('intermediate')).toEqual({
      pGuess: 0.25,
      pInit: 0.3,
      pLearn: 0.15,
      pSlip: 0.1,
    });
    expect(getDefaultBktParamsForDifficulty('advanced')).toEqual({
      pGuess: 0.2,
      pInit: 0.2,
      pLearn: 0.1,
      pSlip: 0.12,
    });
  });
});
