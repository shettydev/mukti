import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

import { RateLimitService } from '../services/rate-limit.service';

/**
 * Guard to enforce rate limiting on password reset requests
 *
 * Limits password reset requests to 3 per hour per email address.
 * Returns 429 Too Many Requests when limit is exceeded.
 *
 * @remarks
 * This guard should be applied to the forgot-password endpoint to prevent abuse.
 */
@Injectable()
export class PasswordResetRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(PasswordResetRateLimitGuard.name);

  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const email = request.body?.email;

    if (!email) {
      // If no email in body, let the request through
      // Validation will catch this later
      return true;
    }

    try {
      const { allowed, remaining, resetAt } =
        await this.rateLimitService.checkPasswordResetRateLimit(email);

      // Add rate limit headers to response
      const response = context.switchToHttp().getResponse();
      response.setHeader('X-RateLimit-Limit', '3');
      response.setHeader('X-RateLimit-Remaining', remaining.toString());
      response.setHeader('X-RateLimit-Reset', resetAt.toISOString());

      if (!allowed) {
        this.logger.warn(
          `Password reset rate limit exceeded for email ${email}. Reset at ${resetAt.toISOString()}`,
        );

        throw new HttpException(
          {
            error: {
              code: 'TOO_MANY_RESET_REQUESTS',
              details: {
                resetAt: resetAt.toISOString(),
              },
              message: `Too many password reset requests. Please try again after ${resetAt.toISOString()}`,
            },
            success: false,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Error in PasswordResetRateLimitGuard: ${error.message}`,
        error.stack,
      );
      // On error, allow the request (fail open)
      return true;
    }
  }
}
