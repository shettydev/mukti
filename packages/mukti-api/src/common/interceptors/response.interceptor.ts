import type { Request } from 'express';

import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { v7 as uuidv7 } from 'uuid';

import { SKIP_ENVELOPE_KEY } from '../decorators/skip-envelope.decorator';

/**
 * Standard API response envelope shape.
 */
interface ApiEnvelope<T = unknown> {
  data?: T;
  meta: {
    requestId: string;
    timestamp: string;
    [key: string]: unknown;
  };
  success: true;
}

/**
 * Shape detected when a controller returns paginated or pre-enveloped data.
 * Used to extract `data` and merge `meta` into the standard envelope.
 */
interface PaginatedResult {
  data: unknown;
  meta: Record<string, unknown>;
}

/**
 * Checks whether a value looks like a paginated result with `data` + `meta` keys.
 */
const isPaginatedResult = (value: unknown): value is PaginatedResult =>
  typeof value === 'object' &&
  value !== null &&
  'data' in value &&
  'meta' in value &&
  typeof (value as PaginatedResult).meta === 'object';

/**
 * Global interceptor that wraps controller return values in the standard API envelope.
 *
 * @remarks
 * Response format:
 * ```json
 * {
 *   "success": true,
 *   "data": <controller return value>,
 *   "meta": {
 *     "requestId": "<uuidv7>",
 *     "timestamp": "<ISO 8601>"
 *   }
 * }
 * ```
 *
 * Behaviour:
 * - Skips wrapping when `@SkipEnvelope()` is present on the handler or controller
 * - Skips wrapping for 204 No Content responses (controller returns `undefined`)
 * - When controller returns `{ data, meta }`, extracts `data` as the payload and
 *   merges `meta` (e.g. pagination fields) into the envelope meta
 * - When controller returns `null`/`undefined` for non-204 responses, omits the
 *   `data` key entirely (e.g. delete confirmations returning 200)
 * - Uses `uuidv7()` for requestId, consistent with `HttpExceptionFilter`
 * - Error responses are handled by `HttpExceptionFilter` (unchanged)
 *
 * @example
 * ```typescript
 * // Registered globally via APP_INTERCEPTOR in AppModule
 * providers: [
 *   { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
 * ]
 * ```
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const shouldSkip = this.reflector.getAllAndOverride<boolean>(
      SKIP_ENVELOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (shouldSkip) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();
    const statusCode: number = response.statusCode;

    return next.handle().pipe(
      map((value) => {
        // 204 No Content — pass through as-is (NestJS sends empty body)
        if (statusCode === HttpStatus.NO_CONTENT) {
          return value;
        }

        const baseMeta = {
          requestId: uuidv7(),
          timestamp: new Date().toISOString(),
        };

        // Controller returned { data, meta } (e.g. paginated results)
        if (isPaginatedResult(value)) {
          return {
            data: value.data,
            meta: { ...baseMeta, ...value.meta },
            success: true,
          } satisfies ApiEnvelope;
        }

        // Controller returned null/undefined for non-204 (e.g. delete 200)
        if (value === null || value === undefined) {
          return {
            meta: baseMeta,
            success: true,
          } satisfies ApiEnvelope;
        }

        // Standard case — wrap the entire return value as data
        return {
          data: value,
          meta: baseMeta,
          success: true,
        } satisfies ApiEnvelope;
      }),
    );
  }
}
