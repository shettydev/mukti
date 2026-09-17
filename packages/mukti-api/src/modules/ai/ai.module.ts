import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Subscription,
  SubscriptionSchema,
} from '../../schemas/subscription.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { AiController } from './ai.controller';
import { AiKeyResolver } from './services/ai-key-resolver.service';
import { AiPolicyService } from './services/ai-policy.service';
import { AiProviderRegistry } from './services/ai-provider.registry';
import { AiSecretsService } from './services/ai-secrets.service';
import { FreeQuotaService } from './services/free-quota.service';
import { GeminiClientFactory } from './services/gemini-client.factory';
import { LocalCliClientFactory } from './services/local-cli-client.factory';
import { OpenRouterClientFactory } from './services/openrouter-client.factory';
import { OpenRouterModelsService } from './services/openrouter-models.service';
import {
  AI_CHAT_CLIENT_FACTORY,
  type AiChatClientFactory,
} from './types/ai-chat-client.interface';

/**
 * Resolves the active chat-client factory from the provider registry.
 *
 * @remarks
 * Local-CLI providers (`claude-code`, `antigravity`) share
 * {@link LocalCliClientFactory} and differ only by adapter, so a new CLI is an
 * adapter plus a registry entry rather than another branch here. Anything else
 * is served by OpenRouter over HTTP.
 */
const aiChatClientFactoryProvider = {
  inject: [AiProviderRegistry, OpenRouterClientFactory],
  provide: AI_CHAT_CLIENT_FACTORY,
  useFactory: (
    aiProviderRegistry: AiProviderRegistry,
    openRouterClientFactory: OpenRouterClientFactory,
  ): AiChatClientFactory => {
    const adapter = aiProviderRegistry.getActiveLocalCliAdapter();
    return adapter
      ? new LocalCliClientFactory(adapter)
      : openRouterClientFactory;
  },
};

@Module({
  controllers: [AiController],
  exports: [
    AI_CHAT_CLIENT_FACTORY,
    AiKeyResolver,
    AiPolicyService,
    AiProviderRegistry,
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
    AiKeyResolver,
    AiPolicyService,
    AiProviderRegistry,
    AiSecretsService,
    FreeQuotaService,
    GeminiClientFactory,
    OpenRouterClientFactory,
    OpenRouterModelsService,
  ],
})
export class AiModule {}
