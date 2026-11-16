/** Usage block of an OpenAI-style chat completion, in either casing. */
export interface ChatUsagePayload {
  completion_tokens?: number;
  completionTokens?: number;
  prompt_tokens?: number;
  promptTokens?: number;
  total_tokens?: number;
  totalTokens?: number;
}

/** Token counts a provider reported; each is undefined when it was not. */
export interface ReportedUsage {
  completionTokens?: number;
  promptTokens?: number;
  totalTokens?: number;
}

/**
 * Reads token counts from a completion's usage block without inventing any.
 *
 * @remarks
 * A count the provider did not report stays `undefined`, so exports can say
 * "not reported" instead of showing a free reply. The total falls back to the
 * sum of its parts only when both parts were reported.
 */
export function readUsage(usage: ChatUsagePayload | undefined): ReportedUsage {
  const promptTokens = count(usage?.promptTokens ?? usage?.prompt_tokens);
  const completionTokens = count(
    usage?.completionTokens ?? usage?.completion_tokens,
  );
  const reportedTotal = count(usage?.totalTokens ?? usage?.total_tokens);
  const totalTokens =
    reportedTotal ??
    (promptTokens !== undefined && completionTokens !== undefined
      ? promptTokens + completionTokens
      : undefined);

  return { completionTokens, promptTokens, totalTokens };
}

function count(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}
