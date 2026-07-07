import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Subscription } from '../../../schemas/subscription.schema';
import { SubscriptionService } from '../../subscription/subscription.service';

/** Daily free message limit for users without BYOK configured. */
const FREE_DAILY_LIMIT = 10;

@Injectable()
export class FreeQuotaService {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<Subscription>,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Atomically checks and consumes one free API message for the given user.
   *
   * Uses a single findOneAndUpdate with an aggregation pipeline to detect
   * day boundaries and increment in one round-trip — no race conditions.
   *
   * If the user has no subscription record yet (e.g. accounts created before
   * subscriptions were provisioned at signup), one is created on the fly so
   * the free daily allowance still applies instead of failing with a 500.
   *
   * @throws HttpException(429) when the daily limit is exceeded.
   */
  async checkAndConsume(userId: string | Types.ObjectId): Promise<void> {
    let updated = await this.tryConsume(userId);

    if (!updated) {
      // Either the user has no subscription record, or the daily limit was hit.
      const subscriptionExists = await this.subscriptionModel.exists({
        userId: new Types.ObjectId(userId.toString()),
      });

      if (!subscriptionExists) {
        // Self-heal: provision the missing subscription, then consume once.
        await this.subscriptionService.ensureSubscription(userId);
        updated = await this.tryConsume(userId);
      }
    }

    if (!updated) {
      throw new HttpException(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            details: {
              dailyLimit: FREE_DAILY_LIMIT,
              resetsAt: this.getNextMidnight().toISOString(),
            },
            message: `You've reached your daily limit of ${FREE_DAILY_LIMIT} free AI messages. Add your own OpenRouter API key in Settings to continue without limits.`,
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
          success: false,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private getNextMidnight(): Date {
    const next = new Date();
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(0, 0, 0, 0);
    return next;
  }

  /**
   * Atomically consumes one free message when the user is under their daily
   * limit. Returns the updated document, or `null` when nothing matched
   * (no subscription record, or the daily limit has been reached).
   */
  private async tryConsume(
    userId: string | Types.ObjectId,
  ): Promise<null | Subscription> {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    return this.subscriptionModel.findOneAndUpdate(
      {
        $or: [
          // New day — allow regardless of current counter
          { 'usage.freeApiLastResetAt': { $lt: todayStart } },
          // Same day, still under the limit
          {
            'usage.freeApiLastResetAt': { $gte: todayStart },
            'usage.freeApiMessagesUsed': { $lt: FREE_DAILY_LIMIT },
          },
        ],
        userId: new Types.ObjectId(userId.toString()),
      },
      [
        {
          $set: {
            'usage.freeApiLastResetAt': {
              $cond: [
                { $lt: ['$usage.freeApiLastResetAt', todayStart] },
                '$$NOW',
                '$usage.freeApiLastResetAt',
              ],
            },
            'usage.freeApiMessagesUsed': {
              $cond: [
                { $lt: ['$usage.freeApiLastResetAt', todayStart] },
                1,
                { $add: ['$usage.freeApiMessagesUsed', 1] },
              ],
            },
          },
        },
      ],
      { new: true },
    );
  }
}
