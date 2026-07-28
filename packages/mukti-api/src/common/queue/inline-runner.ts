import type { Logger } from '@nestjs/common';

import { randomBytes } from 'crypto';

/**
 * Local-mode inline processing shared by every AI queue surface.
 *
 * @remarks
 * In local mode (`MUKTI_LOCAL`) there is no Redis/BullMQ, so each `@Processor`
 * queue's `enqueue*` method runs its existing `process(job)` inline instead of
 * calling `queue.add(...)`. The inline path is identical across surfaces —
 * defer via `setImmediate`, wait (bounded) for the client's SSE stream so the
 * first event isn't dropped, run `process(job)`, and swallow the post-emit
 * rejection (`process` already emits an `error` event before rethrowing for the
 * BullMQ retry that does not exist here). Defining it once keeps the five
 * surfaces from re-deriving the SSE-race and error-swallow behavior.
 */

/** Minimal synthetic job the inline path hands to a queue processor. */
export interface InlineJob<TData> {
  data: TData;
  id: string;
}

/** Builds a unique job id for an inline (local-mode) run. */
export function makeInlineJobId(key: string): string {
  return `local-${key}-${Date.now()}-${randomBytes(3).toString('hex')}`;
}

/**
 * Runs a queue processor inline (local mode) instead of enqueuing to BullMQ.
 *
 * Builds the synthetic job, defers via `setImmediate`, awaits the bounded
 * `waitForConnection()`, runs `process(job)`, and swallows the post-emit
 * rejection. Returns synchronously with the generated job id so the HTTP
 * response can hand the id back before any event is emitted.
 */
export function runJobInline<TData>(options: {
  jobData: TData;
  makeJobId: () => string;
  onError?: (error: unknown) => void;
  process: (job: InlineJob<TData>) => Promise<unknown>;
  waitForConnection: () => Promise<void>;
}): { jobId: string; position: number } {
  const jobId = options.makeJobId();
  const job: InlineJob<TData> = { data: options.jobData, id: jobId };

  setImmediate(() => {
    void options
      .waitForConnection()
      .then(() => options.process(job))
      .catch((error) => {
        // process() already emitted an SSE 'error' event before rethrowing for
        // BullMQ retry. There is no queue here, so swallow to avoid an
        // unhandledRejection.
        options.onError?.(error);
      });
  });

  return { jobId, position: 1 };
}

/**
 * Waits (bounded) for a surface's SSE client to connect before the inline path
 * emits its first event, so the response's job id does not race the first
 * emitted event. Proceeds anyway on timeout.
 *
 * @param hasConnection - Per-surface check: does a live stream exist for this
 *   request's key? (e.g. `conversationId`, `sessionId:nodeId`, `map:mapId`.)
 */
export async function waitForStreamConnection(
  hasConnection: () => boolean,
  options: {
    intervalMs?: number;
    label?: string;
    logger?: Logger;
    timeoutMs?: number;
  } = {},
): Promise<void> {
  const { intervalMs = 25, label, logger, timeoutMs = 10000 } = options;
  const start = Date.now();

  while (!hasConnection()) {
    if (Date.now() - start >= timeoutMs) {
      logger?.warn(
        `No SSE connection${label ? ` for ${label}` : ''} after ${timeoutMs}ms; processing anyway`,
      );
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
