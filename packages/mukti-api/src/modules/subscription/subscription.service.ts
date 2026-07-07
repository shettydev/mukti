import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Subscription,
  SubscriptionDocument,
} from '../../schemas/subscription.schema';
import { User, UserDocument } from '../../schemas/user.schema';

/**
 * Owns creation of user Subscription records.
 *
 * Every user is expected to have exactly one Subscription document, which the
 * free-quota and rate-limit flows read and mutate. This service is the single
 * source of truth for creating the default free-tier subscription so the shape
 * is not duplicated across the registration, OAuth, and seed paths.
 */
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Ensures the given user has a subscription record, creating a default
   * free-tier subscription when none exists.
   *
   * Idempotent and safe under concurrent calls — the unique `userId` index
   * guarantees a single record, and a duplicate-key race resolves to the
   * existing document rather than throwing.
   */
  async ensureSubscription(
    userId: string | Types.ObjectId,
  ): Promise<SubscriptionDocument> {
    const id = new Types.ObjectId(userId.toString());

    const existing = await this.subscriptionModel.findOne({ userId: id });
    if (existing) {
      return existing;
    }

    try {
      // Schema defaults populate `tier` ('free'), `limits`, `usage`, and
      // `isActive`; only `startDate` (required, no default) must be provided.
      const subscription = await this.subscriptionModel.create({
        startDate: new Date(),
        userId: id,
      });

      // Best-effort back-link on the user; never block on it.
      await this.userModel.updateOne(
        { _id: id, subscriptionId: { $exists: false } },
        { $set: { subscriptionId: subscription._id } },
      );

      this.logger.log(
        `Created default free subscription for user ${id.toString()}`,
      );
      return subscription;
    } catch (error) {
      // A concurrent request created the subscription first — reuse it.
      if (this.isDuplicateKeyError(error)) {
        const created = await this.subscriptionModel.findOne({ userId: id });
        if (created) {
          return created;
        }
      }
      throw error;
    }
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}
