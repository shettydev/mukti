import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Subscription,
  SubscriptionSchema,
} from '../../schemas/subscription.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { AiController } from './ai.controller';
import { AiPolicyService } from './services/ai-policy.service';
import { AiSecretsService } from './services/ai-secrets.service';
import { FreeQuotaService } from './services/free-quota.service';
import { GeminiClientFactory } from './services/gemini-client.factory';
import { OpenRouterClientFactory } from './services/openrouter-client.factory';
import { OpenRouterModelsService } from './services/openrouter-models.service';

@Module({
  controllers: [AiController],
  exports: [
    AiPolicyService,
    AiSecretsService,
    FreeQuotaService,
    GeminiClientFactory,
    OpenRouterClientFactory,
    OpenRouterModelsService,
  ],
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
  ],
  providers: [
    AiPolicyService,
    AiSecretsService,
    FreeQuotaService,
    GeminiClientFactory,
    OpenRouterClientFactory,
    OpenRouterModelsService,
  ],
})
export class AiModule {}
