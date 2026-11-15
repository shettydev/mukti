import { HttpException } from '@nestjs/common';

/** Preserve structured refusals from provider edges and HTTP quota checks on SSE. */
export function streamErrorData(error: unknown): {
  code: string;
  details?: Record<string, unknown>;
  message: string;
  retriable: boolean;
} {
  let source: Record<string, unknown> =
    typeof error === 'object' && error !== null
      ? (error as Record<string, unknown>)
      : {};
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'object' && response !== null) {
      const body = response as Record<string, unknown>;
      source =
        typeof body.error === 'object' && body.error !== null
          ? (body.error as Record<string, unknown>)
          : body;
    }
  }
  const status = source.statusCode ?? source.status;
  const limit =
    status === 402
      ? 'openrouter_credit'
      : status === 429
        ? 'openrouter_rate'
        : undefined;
  const code =
    typeof source.code === 'string'
      ? source.code
      : limit
        ? 'AI_USAGE_LIMIT'
        : 'PROCESSING_ERROR';
  const details =
    typeof source.details === 'object' && source.details !== null
      ? (source.details as Record<string, unknown>)
      : limit
        ? { limit, provider: 'openrouter' }
        : undefined;
  return {
    code,
    ...(details ? { details } : {}),
    message:
      typeof source.message === 'string'
        ? source.message
        : error instanceof Error
          ? error.message
          : String(error),
    retriable:
      code === 'AI_USAGE_LIMIT' || code === 'RATE_LIMIT_EXCEEDED'
        ? false
        : typeof source.retriable === 'boolean'
          ? source.retriable
          : true,
  };
}
