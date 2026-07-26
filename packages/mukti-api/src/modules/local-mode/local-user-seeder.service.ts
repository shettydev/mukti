import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  isLocalMode,
  LOCAL_USER,
  LOCAL_USER_ID,
} from '../../common/config/local-mode';
import { SeedService } from '../../common/seeds/seed.service';
import { User } from '../../schemas/user.schema';

/**
 * Seeds the fixed local user and the built-in Socratic techniques on boot, so
 * the auth-bypassed request resolves to a real user and conversations can select
 * a technique. Idempotent; no-op outside local mode.
 */
@Injectable()
export class LocalUserSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LocalUserSeederService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    private readonly seedService: SeedService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!isLocalMode()) {
      return;
    }

    await this.userModel.updateOne(
      { _id: new Types.ObjectId(LOCAL_USER_ID) },
      {
        $setOnInsert: {
          email: LOCAL_USER.email,
          emailVerified: true,
          firstName: LOCAL_USER.firstName,
          isActive: true,
          lastName: LOCAL_USER.lastName,
          role: 'user',
        },
      },
      { upsert: true },
    );

    // Techniques are required reference data for conversations (embedded Mongo
    // starts empty). seedTechniques is idempotent.
    await this.seedService.seedTechniques();

    this.logger.log(`Local user + techniques ready (${LOCAL_USER.email})`);
  }
}
