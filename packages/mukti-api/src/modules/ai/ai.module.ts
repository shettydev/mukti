import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import {
  AiModelConfig,
  AiModelConfigSchema,
} from '../../schemas/ai-model-config.schema';
import {
  AiProviderConfig,
  AiProviderConfigSchema,
} from '../../schemas/ai-provider-config.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { AuthModule } from '../auth/auth.module';
import { AiController } from './ai.controller';
import { AiPolicyService } from './services/ai-policy.service';
import { AiConfigService } from './services/ai-config.service';
import { AiGatewayService } from './services/ai-gateway.service';
import { AiSecretsService } from './services/ai-secrets.service';
import { GeminiClientFactory } from './services/gemini-client.factory';
import { OpenRouterClientFactory } from './services/openrouter-client.factory';
import { OpenRouterModelsService } from './services/openrouter-models.service';
import { AnthropicProviderService } from './services/providers/anthropic-provider.service';
import { GeminiProviderService } from './services/providers/gemini-provider.service';
import { OpenAiProviderService } from './services/providers/openai-provider.service';
import { OpenRouterProviderService } from './services/providers/openrouter-provider.service';

@Module({
  controllers: [AiController],
  exports: [
    AiPolicyService,
    AiConfigService,
    AiGatewayService,
    AiSecretsService,
    GeminiClientFactory,
    OpenRouterClientFactory,
    OpenRouterModelsService,
  ],
  imports: [
    ConfigModule,
    AuthModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AiProviderConfig.name, schema: AiProviderConfigSchema },
      { name: AiModelConfig.name, schema: AiModelConfigSchema },
    ]),
  ],
  providers: [
    AiPolicyService,
    AiConfigService,
    AiGatewayService,
    AiSecretsService,
    GeminiClientFactory,
    OpenRouterClientFactory,
    OpenRouterModelsService,
    OpenAiProviderService,
    AnthropicProviderService,
    GeminiProviderService,
    OpenRouterProviderService,
  ],
})
export class AiModule {}
