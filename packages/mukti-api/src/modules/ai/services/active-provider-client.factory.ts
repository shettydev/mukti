/**
 * The chat-client factory every AI surface injects (`AI_CHAT_CLIENT_FACTORY`).
 *
 * @remarks
 * Resolves the active provider on each `create()` rather than once at startup,
 * so a local-CLI switch from Settings reaches every surface on its next
 * request without any of them being reconfigured. A client keeps the provider
 * it was created for: a turn that has started finishes where it started, and
 * only the next `create()` sees the new provider.
 *
 * Local CLIs share {@link LocalCliClientFactory} and differ only by adapter, so
 * one is created per adapter, lazily, and reused. Anything that is not a local
 * CLI is served by OpenRouter over HTTP.
 */
import type {
  AiChatClient,
  AiChatClientFactory,
} from '../types/ai-chat-client.interface';
import type { LocalCliAdapter } from '../types/local-cli-adapter.interface';
import type { AiProviderRegistry } from './ai-provider.registry';

import { LocalCliClientFactory } from './local-cli-client.factory';

export class ActiveProviderClientFactory implements AiChatClientFactory {
  private readonly localFactories = new Map<
    LocalCliAdapter,
    LocalCliClientFactory
  >();

  constructor(
    private readonly registry: AiProviderRegistry,
    private readonly hosted: AiChatClientFactory,
  ) {}

  create(apiKey: string): AiChatClient {
    const adapter = this.registry.getActiveLocalCliAdapter();
    if (!adapter) {
      return this.hosted.create(apiKey);
    }

    let factory = this.localFactories.get(adapter);
    if (!factory) {
      factory = new LocalCliClientFactory(adapter);
      this.localFactories.set(adapter, factory);
    }
    return factory.create(apiKey);
  }
}
