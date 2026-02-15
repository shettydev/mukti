import { calculateAiCostUsd } from '../ai-cost.service';

describe('calculateAiCostUsd', () => {
  it('should calculate deterministic cost from prompt and completion pricing', () => {
    const cost = calculateAiCostUsd({
      completionTokens: 1_500,
      pricing: {
        completionUsdPer1M: 0.6,
        promptUsdPer1M: 0.15,
      },
      promptTokens: 2_500,
    });

    expect(cost).toBeCloseTo(0.001275, 10);
  });
});
