import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  RateLimit,
  RateLimitDocument,
} from '../../../schemas/rate-limit.schema';

/**
 * Rate limiting service for authentication endpoints
 *
 * Implements IP-based and user-based rate limiting with automatic reset on success.
 * Uses MongoDB for persistence to support distributed deployments.
 *
 * @remarks
 * Rate limits are enforced per IP address for login attempts and per email
 * for password reset requests. Successful authentication resets the counter.
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(
    @InjectModel(RateLimit.name)
    private rateLimitModel: Model<RateLimitDocument>,
  ) {}

  /**
   * Check if an IP address has exceeded login rate limit
   *
   * @param ipAddress - The IP address to check
   * @returns Object with allowed status, remaining attempts, and reset time
   */
  async checkLoginRateLimit(ipAddress: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    const action = `login:${ipAddress}`;
    const limit = 5; // 5 attempts per 15 minutes
    const windowType = 'hour';

    try {
      const now = new Date();
      const windowStart = this.calculateWindowStart(now, '15min');
      const windowEnd = this.calculateWindowEnd(windowStart, '15min');

      let rateLimit = await this.rateLimitModel.findOne({
        action,
        windowEnd: { $gt: now },
      });

      rateLimit ??= await this.rateLimitModel.create({
        action,
        count: 0,
        limit,
        userId: new Types.ObjectId(), // Dummy user ID for IP-based limits
        windowEnd,
        windowStart,
        windowType,
      });

      const allowed = rateLimit.count < limit;
      const remaining = Math.max(0, limit - rateLimit.count);

      return {
        allowed,
        remaining,
        resetAt: rateLimit.windowEnd,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error checking login rate limit for IP ${ipAddress}: ${err.message}`,
        err.stack,
      );
      // On error, allow the request (fail open)
      return {
        allowed: true,
        remaining: 5,
        resetAt: new Date(Date.now() + 15 * 60 * 1000),
      };
    }
  }

  /**
   * Check if an email has exceeded password reset rate limit
   *
   * @param email - The email address to check
   * @returns Object with allowed status, remaining attempts, and reset time
   */
  async checkPasswordResetRateLimit(email: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    const action = `password-reset:${email.toLowerCase()}`;
    const limit = 3; // 3 attempts per hour

    try {
      const now = new Date();
      const windowStart = this.calculateWindowStart(now, 'hour');
      const windowEnd = this.calculateWindowEnd(windowStart, 'hour');

      let rateLimit = await this.rateLimitModel.findOne({
        action,
        windowEnd: { $gt: now },
      });

      rateLimit ??= await this.rateLimitModel.create({
        action,
        count: 0,
        limit,
        userId: new Types.ObjectId(), // Dummy user ID for email-based limits
        windowEnd,
        windowStart,
        windowType: 'hour',
      });

      const allowed = rateLimit.count < limit;
      const remaining = Math.max(0, limit - rateLimit.count);

      return {
        allowed,
        remaining,
        resetAt: rateLimit.windowEnd,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error checking password reset rate limit for email ${email}: ${err.message}`,
        err.stack,
      );
      // On error, allow the request (fail open)
      return {
        allowed: true,
        remaining: 3,
        resetAt: new Date(Date.now() + 60 * 60 * 1000),
      };
    }
  }

  /**
   * Increment login attempt counter for an IP address
   *
   * @param ipAddress - The IP address to increment
   */
  async incrementLoginAttempt(ipAddress: string): Promise<void> {
    const action = `login:${ipAddress}`;

    try {
      const now = new Date();
      const windowStart = this.calculateWindowStart(now, '15min');
      const windowEnd = this.calculateWindowEnd(windowStart, '15min');

      await this.rateLimitModel.findOneAndUpdate(
        {
          action,
          windowEnd: { $gt: now },
        },
        {
          $inc: { count: 1 },
          $setOnInsert: {
            action,
            limit: 5,
            userId: new Types.ObjectId(),
            windowEnd,
            windowStart,
            windowType: 'hour',
          },
        },
        {
          new: true,
          upsert: true,
        },
      );

      this.logger.debug(`Incremented login attempt for IP ${ipAddress}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error incrementing login attempt for IP ${ipAddress}: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Increment password reset attempt counter for an email
   *
   * @param email - The email address to increment
   */
  async incrementPasswordResetAttempt(email: string): Promise<void> {
    const action = `password-reset:${email.toLowerCase()}`;

    try {
      const now = new Date();
      const windowStart = this.calculateWindowStart(now, 'hour');
      const windowEnd = this.calculateWindowEnd(windowStart, 'hour');

      await this.rateLimitModel.findOneAndUpdate(
        {
          action,
          windowEnd: { $gt: now },
        },
        {
          $inc: { count: 1 },
          $setOnInsert: {
            action,
            limit: 3,
            userId: new Types.ObjectId(),
            windowEnd,
            windowStart,
            windowType: 'hour',
          },
        },
        {
          new: true,
          upsert: true,
        },
      );

      this.logger.debug(
        `Incremented password reset attempt for email ${email}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error incrementing password reset attempt for email ${email}: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Reset login rate limit for an IP address (called on successful login)
   *
   * @param ipAddress - The IP address to reset
   */
  async resetLoginRateLimit(ipAddress: string): Promise<void> {
    const action = `login:${ipAddress}`;

    try {
      await this.rateLimitModel.deleteMany({ action });
      this.logger.debug(`Reset login rate limit for IP ${ipAddress}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Error resetting login rate limit for IP ${ipAddress}: ${err.message}`,
        err.stack,
      );
    }
  }

  /**
   * Calculate window end time based on window type
   */
  private calculateWindowEnd(windowStart: Date, windowType: string): Date {
    const end = new Date(windowStart);

    switch (windowType) {
      case '15min':
        end.setMinutes(end.getMinutes() + 15);
        break;
      case 'day':
        end.setDate(end.getDate() + 1);
        break;
      case 'hour':
        end.setHours(end.getHours() + 1);
        break;
      default:
        end.setHours(end.getHours() + 1);
    }

    return end;
  }

  /**
   * Calculate window start time based on window type
   */
  private calculateWindowStart(date: Date, windowType: string): Date {
    const start = new Date(date);

    switch (windowType) {
      case '15min':
        // Round down to nearest 15 minutes
        start.setMinutes(Math.floor(start.getMinutes() / 15) * 15, 0, 0);
        break;
      case 'day':
        start.setHours(0, 0, 0, 0);
        break;
      case 'hour':
        start.setMinutes(0, 0, 0);
        break;
      default:
        start.setMinutes(0, 0, 0);
    }

    return start;
  }
}
