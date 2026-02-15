import type { AiModelPricing } from '../../../schemas/ai-model-config.schema';

export function calculateAiCostUsd(params: {
  completionTokens: number;
  pricing: AiModelPricing;
  promptTokens: number;
}): number {
  const promptCost = params.promptTokens * params.pricing.promptUsdPer1M;
  const completionCost =
    params.completionTokens * params.pricing.completionUsdPer1M;

  return (promptCost + completionCost) / 1_000_000;
}
