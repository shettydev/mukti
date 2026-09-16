/**
 * Chat-client factory for the hosted OpenRouter API.
 *
 * @remarks
 * Wraps the SDK client rather than returning it directly, for one reason: this
 * provider **declines to enforce** declared response shapes, and declining
 * requires somewhere to drop the field before it reaches the SDK.
 *
 * Why decline, when `responseFormat` is the SDK's own parameter and would be
 * forwarded for free? Two reasons. The learner-facing surfaces render a
 * completion's content verbatim as the assistant message, so a schema-shaped
 * response would put raw `{"question":"…"}` JSON in front of a learner unless
 * something unwrapped it. And BYOK users choose their own model, not all of
 * which support schema-constrained output — forwarding would risk a
 * request-time failure on the user's chosen model to buy a guarantee this
 * provider already meets, since the Socratic constraint is carried here by the
 * system prompt and works.
 *
 * The declaration is not ignored in the sense of being unsupported: it states
 * what the calling surface needs, and a provider that cannot meet that intent
 * any other way must enforce it. That provider is the Antigravity CLI, whose
 * built-in coding prompt cannot be replaced. Adopting enforcement here later is
 * deleting the strip below, not writing a translation.
 */
import { Injectable } from '@nestjs/common';
import { OpenRouter } from '@openrouter/sdk';

import type {
  AiChatClient,
  AiChatClientFactory,
  AiChatSendOptions,
  AiChatSendRequest,
} from '../types/ai-chat-client.interface';

@Injectable()
export class OpenRouterClientFactory implements AiChatClientFactory {
  create(apiKey: string): AiChatClient {
    const client = this.createSdkClient(apiKey);

    return {
      chat: {
        send: (request: AiChatSendRequest, options?: AiChatSendOptions) => {
          // Dropped, not forwarded — see the note above. Everything else is
          // passed through untouched, so the request this provider issues is
          // identical to the one it issued before shapes could be declared.
          const { responseFormat: _declined, ...forwarded } = request;

          return client.chat.send(forwarded, options);
        },
      },
    };
  }

  /**
   * The raw SDK client, for OpenRouter-specific operations outside the chat
   * seam — currently the model catalogue, which has no provider-agnostic
   * equivalent and is skipped entirely under a local-CLI provider.
   *
   * @remarks
   * Separate from {@link create} on purpose: that one is the provider-agnostic
   * chat seam and deliberately exposes only `chat.send`, so a consumer cannot
   * reach past it into OpenRouter-only surfaces without saying so here.
   */
  createSdkClient(apiKey: string): OpenRouter {
    return new OpenRouter({ apiKey });
  }
}
