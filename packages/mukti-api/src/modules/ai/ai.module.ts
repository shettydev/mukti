import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from '../../schemas/user.schema';
import { AiController } from './ai.controller';
import { AiPolicyService } from './services/ai-policy.service';
import { AiSecretsService } from './services/ai-secrets.service';
import { GeminiClientFactory } from './services/gemini-client.factory';
import { OpenRouterClientFactory } from './services/openrouter-client.factory';
import { OpenRouterModelsService } from './services/openrouter-models.service';

@Module({
  controllers: [AiController],
  exports: [
    AiPolicyService,
    AiSecretsService,
    GeminiClientFactory,
    OpenRouterClientFactory,
    OpenRouterModelsService,
  ],
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [
    AiPolicyService,
    AiSecretsService,
    GeminiClientFactory,
    OpenRouterClientFactory,
    OpenRouterModelsService,
  ],
})
export class AiModule {}
