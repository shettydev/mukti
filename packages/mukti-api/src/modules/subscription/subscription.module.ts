import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Subscription,
  SubscriptionSchema,
} from '../../schemas/subscription.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { SubscriptionService } from './subscription.service';

/**
 * Provides {@link SubscriptionService} — the single source of truth for
 * creating user Subscription records — to any module that needs to guarantee
 * a subscription exists (auth registration, OAuth signup, free-quota checks).
 */
@Module({
  exports: [SubscriptionService],
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [SubscriptionService],
})
export class SubscriptionModule {}
