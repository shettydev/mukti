import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { RateLimitService } from '../services/rate-limit.service';

/**
 * Guard to enforce rate limiting on login attempts
 *
 * Limits login attempts to 5 per 15 minutes per IP address.
 * Returns 429 Too Many Requests when limit is exceeded.
 *
 * @remarks
 * This guard should be applied to the login endpoint to prevent brute force attacks.
 * The rate limit is automatically reset on successful authentication.
 */
@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(LoginRateLimitGuard.name);

  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ipAddress = this.getIpAddress(request);

    try {
      const { allowed, remaining, resetAt } =
        await this.rateLimitService.checkLoginRateLimit(ipAddress);

      // Add rate limit headers to response
      const response = context.switchToHttp().getResponse<Response>();
      response.setHeader('X-RateLimit-Limit', '5');
      response.setHeader('X-RateLimit-Remaining', remaining.toString());
      response.setHeader('X-RateLimit-Reset', resetAt.toISOString());

      if (!allowed) {
        this.logger.warn(
          `Login rate limit exceeded for IP ${ipAddress}. Reset at ${resetAt.toISOString()}`,
        );

        throw new HttpException(
          {
            error: {
              code: 'TOO_MANY_LOGIN_ATTEMPTS',
              details: {
                resetAt: resetAt.toISOString(),
              },
              message: `Too many login attempts. Please try again after ${resetAt.toISOString()}`,
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

      const err = error as Error;
      this.logger.error(
        `Error in LoginRateLimitGuard: ${err.message}`,
        err.stack,
      );
      // On error, allow the request (fail open)
      return true;
    }
  }

  /**
   * Extract IP address from request
   */
  private getIpAddress(request: Request): string {
    // Check for proxy headers first
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    return request.ip ?? request.socket.remoteAddress ?? 'unknown';
  }
}
