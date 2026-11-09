import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';
import { join, resolve } from 'path';

import { LOCAL_DB_PATH } from '../../common/config/local-mode';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { User, UserDocument } from '../../schemas/user.schema';
import { SUPPORTED_PROVIDERS } from '../ai/local-cli/provider-catalog';
import { AiProviderRegistry } from '../ai/services/ai-provider.registry';
import { FREE_DAILY_LIMIT } from '../ai/services/free-quota.service';
import { buildDisclosure, type DataDisclosure } from './build-disclosure';

/**
 * The "Your data and costs" disclosure (data-flow-disclosure).
 *
 * @remarks
 * `GET /data-disclosure` describes the caller's own configuration: hosted free
 * tier, hosted with their own OpenRouter key, or local with the active CLI.
 * `GET /data-disclosure/hosted` is public, for the sign-up page, and always
 * describes the hosted free tier without reading any user. Neither holds a
 * secret.
 */
@ApiTags('Data disclosure')
@Controller('data-disclosure')
export class DataDisclosureController {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly registry: AiProviderRegistry,
    private readonly config: ConfigService,
  ) {}

  @ApiOperation({ summary: "The disclosure for the caller's configuration" })
  @Get()
  async getForUser(
    @CurrentUser('_id') userId: string,
  ): Promise<DataDisclosure> {
    const now = new Date();

    if (this.registry.isLocalCliProvider()) {
      const adapterId = this.registry.getProviderId();
      const provider = SUPPORTED_PROVIDERS.find(
        (p) => p.adapterId === adapterId,
      );
      if (provider) {
        return buildDisclosure({
          dataDir: this.localDataDir(),
          mode: 'local',
          now,
          provider,
        });
      }
    }

    const user = await this.userModel
      .findById(userId)
      .select('openRouterApiKeyUpdatedAt')
      .lean();

    return buildDisclosure({
      freeDailyLimit: FREE_DAILY_LIMIT,
      hasOwnOpenRouterKey: !!user?.openRouterApiKeyUpdatedAt,
      mode: 'hosted',
      now,
    });
  }

  @ApiOperation({
    summary: 'The hosted free-tier disclosure, for the sign-up page',
  })
  @Get('hosted')
  @Public()
  getHostedPublic(): DataDisclosure {
    return buildDisclosure({
      freeDailyLimit: FREE_DAILY_LIMIT,
      hasOwnOpenRouterKey: false,
      mode: 'hosted',
      now: new Date(),
    });
  }

  /**
   * Where the local database lives: the launcher passes its path, as it does
   * for the database itself (`core/database/mongo-uri.ts`).
   */
  private localDataDir(): string {
    // `||` (not `??`): a blank value means unset.
    /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
    return (
      this.config.get<string>('MUKTI_LOCAL_DB_PATH')?.trim() ||
      resolve(join(process.cwd(), LOCAL_DB_PATH))
    );
    /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */
  }
}
