import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for marking routes that skip the response envelope.
 * Used by ResponseInterceptor to bypass automatic wrapping.
 */
export const SKIP_ENVELOPE_KEY = 'skipEnvelope';

/**
 * Decorator that marks a route or controller to skip automatic response envelope wrapping.
 *
 * @returns Method or class decorator
 *
 * @remarks
 * This decorator:
 * - Prevents ResponseInterceptor from wrapping the return value in `{ success, data, meta }`
 * - Useful for SSE endpoints that return `Observable<MessageEvent>`
 * - Useful for void/204 endpoints that return no content
 * - Useful for health check endpoints with their own response format
 * - Can be applied to controllers (all routes) or individual methods
 *
 * @example
 * ```typescript
 * // Skip envelope for SSE stream endpoint
 * @SkipEnvelope()
 * @Sse(':id/stream')
 * streamConversation(): Observable<MessageEvent> {
 *   // Response is NOT wrapped in envelope
 * }
 *
 * // Skip envelope for entire controller
 * @SkipEnvelope()
 * @Controller('health')
 * export class HealthController {
 *   // All routes skip envelope wrapping
 * }
 * ```
 */
export const SkipEnvelope = () => SetMetadata(SKIP_ENVELOPE_KEY, true);
