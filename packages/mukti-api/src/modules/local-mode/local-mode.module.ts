import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SeedService } from '../../common/seeds/seed.service';
import {
  Subscription,
  SubscriptionSchema,
} from '../../schemas/subscription.schema';
import { Technique, TechniqueSchema } from '../../schemas/technique.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { LocalUserSeederService } from './local-user-seeder.service';

/**
 * Wiring for the `MUKTI_LOCAL` runtime. Always imported; the seeder is inert
 * outside local mode, so the hosted path is unaffected.
 *
 * `SeedService` is provided directly (rather than importing `SeedModule`, which
 * would open a second Mongo connection); its `forFeature` models resolve against
 * the global connection established by `DatabaseModule`.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Technique.name, schema: TechniqueSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
  ],
  providers: [LocalUserSeederService, SeedService],
})
export class LocalModeModule {}
