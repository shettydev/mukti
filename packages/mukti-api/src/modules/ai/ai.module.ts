import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Subscription,
  SubscriptionSchema,
} from '../../schemas/subscription.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { AiController } from './ai.controller';
import { AiPolicyService } from './services/ai-policy.service';
import { AiSecretsService } from './services/ai-secrets.service';
import { ClaudeCodeClientFactory } from './services/claude-code-client.factory';
import { FreeQuotaService } from './services/free-quota.service';
import { GeminiClientFactory } from './services/gemini-client.factory';
import { OpenRouterClientFactory } from './services/openrouter-client.factory';
import { OpenRouterModelsService } from './services/openrouter-models.service';
import {
  AI_CHAT_CLIENT_FACTORY,
  type AiChatClientFactory,
} from './types/ai-chat-client.interface';

/**
 * Resolves the active chat-client factory from `AI_PROVIDER`.
 * Defaults to `openrouter`; `claude-code` routes completions through the local
 * `claude -p` CLI on the developer's own Claude auth.
 */
const aiChatClientFactoryProvider = {
  inject: [ConfigService, OpenRouterClientFactory, ClaudeCodeClientFactory],
  provide: AI_CHAT_CLIENT_FACTORY,
  useFactory: (
    configService: ConfigService,
    openRouterClientFactory: OpenRouterClientFactory,
    claudeCodeClientFactory: ClaudeCodeClientFactory,
  ): AiChatClientFactory =>
    configService.get<string>('AI_PROVIDER') === 'claude-code'
      ? claudeCodeClientFactory
      : openRouterClientFactory,
};

@Module({
  controllers: [AiController],
  exports: [
    AI_CHAT_CLIENT_FACTORY,
    AiPolicyService,
    AiSecretsService,
    FreeQuotaService,
    GeminiClientFactory,
    OpenRouterClientFactory,
    OpenRouterModelsService,
  ],
  imports: [
    ConfigModule,
    SubscriptionModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
  ],
  providers: [
    aiChatClientFactoryProvider,
    AiPolicyService,
    AiSecretsService,
    ClaudeCodeClientFactory,
    FreeQuotaService,
    GeminiClientFactory,
    OpenRouterClientFactory,
    OpenRouterModelsService,
  ],
})
export class AiModule {}
