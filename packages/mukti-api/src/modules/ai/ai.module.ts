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
import { LocalProviderController } from './local-provider.controller';
import { ActiveProviderClientFactory } from './services/active-provider-client.factory';
import { AiKeyResolver } from './services/ai-key-resolver.service';
import { AiPolicyService } from './services/ai-policy.service';
import { AiProviderRegistry } from './services/ai-provider.registry';
import { AiRequestGate } from './services/ai-request-gate.service';
import { AiSecretsService } from './services/ai-secrets.service';
import { FreeQuotaService } from './services/free-quota.service';
import { GeminiClientFactory } from './services/gemini-client.factory';
import { LocalProviderSwitchService } from './services/local-provider-switch.service';
import { OpenRouterClientFactory } from './services/openrouter-client.factory';
import { OpenRouterModelsService } from './services/openrouter-models.service';
import {
  AI_CHAT_CLIENT_FACTORY,
  type AiChatClientFactory,
} from './types/ai-chat-client.interface';

/**
 * The chat-client factory every AI surface injects.
 *
 * @remarks
 * Resolves the active provider per `create()` call, not once here, so that a
 * local-CLI switch from Settings reaches every surface without restarting
 * anything (see {@link ActiveProviderClientFactory}). Local-CLI providers
 * (`claude-code`, `antigravity`, `codex`) share `LocalCliClientFactory` and
 * differ only by adapter; anything else is served by OpenRouter over HTTP.
 */
const aiChatClientFactoryProvider = {
  inject: [AiProviderRegistry, OpenRouterClientFactory],
  provide: AI_CHAT_CLIENT_FACTORY,
  useFactory: (
    aiProviderRegistry: AiProviderRegistry,
    openRouterClientFactory: OpenRouterClientFactory,
  ): AiChatClientFactory =>
    new ActiveProviderClientFactory(
      aiProviderRegistry,
      openRouterClientFactory,
    ),
};

@Module({
  controllers: [AiController, LocalProviderController],
  exports: [
    AI_CHAT_CLIENT_FACTORY,
    AiKeyResolver,
    AiPolicyService,
    AiProviderRegistry,
    AiRequestGate,
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
    AiRequestGate,
    AiSecretsService,
    FreeQuotaService,
    GeminiClientFactory,
    LocalProviderSwitchService,
    OpenRouterClientFactory,
    OpenRouterModelsService,
  ],
})
export class AiModule {}
