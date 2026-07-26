/**
 * Provider-agnostic chat-client abstraction.
 *
 * @remarks
 * Every AI consumer service resolves a client via `factory.create(apiKey)` and
 * then calls `client.chat.send(request, options)`, expecting an OpenAI-shaped
 * payload (`{ choices, usage }`) that `OpenRouterService.parseResponse` normalizes.
 * This interface names that implicit contract so alternative providers (e.g. the
 * local Claude Code CLI) can be swapped in behind the {@link AI_CHAT_CLIENT_FACTORY}
 * token without touching call sites.
 */

/** A resolved chat client. The response is parsed leniently downstream. */
export interface AiChatClient {
  chat: {
    send(
      request: AiChatSendRequest,
      options?: AiChatSendOptions,
    ): Promise<unknown>;
  };
}

/** Factory that produces an {@link AiChatClient} for a given API key. */
export interface AiChatClientFactory {
  create(apiKey: string): AiChatClient;
}

/** Chat message in the shape produced by `OpenRouterService.buildPrompt`. */
export interface AiChatMessage {
  content: string;
  role: 'assistant' | 'system' | 'user';
}

/** Per-request options (headers are OpenRouter-specific and ignored elsewhere). */
export interface AiChatSendOptions {
  headers?: Record<string, string>;
}

/** Request payload accepted by {@link AiChatClient.chat}.send(). */
export interface AiChatSendRequest {
  messages: AiChatMessage[];
  model: string;
  stream?: boolean;
  temperature?: number;
}

/**
 * DI token for the active chat-client factory. Resolved from `AI_PROVIDER`
 * (`claude-code | openrouter`, default `openrouter`) in {@link AiModule}.
 */
export const AI_CHAT_CLIENT_FACTORY = Symbol('AI_CHAT_CLIENT_FACTORY');
