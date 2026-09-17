/**
 * Transcript rendering shared by the local-CLI factory and adapters that build
 * their own input around it.
 */
import type { AiChatMessage } from '../types/ai-chat-client.interface';

/**
 * Minimal turn used when a request carries no non-system turns.
 *
 * @remarks
 * Print-mode CLIs reject empty input. Some surfaces legitimately send only a
 * system prompt — notably Thought Map initial-question generation, where the
 * whole instruction lives in the system prompt and there is no user message
 * yet. This kickoff supplies the required input while deferring entirely to
 * that system prompt.
 */
export const EMPTY_CONVERSATION_KICKOFF = 'Begin.';

/** A `Role: content` transcript of the non-system turns, blank-line separated. */
export function renderTranscript(messages: readonly AiChatMessage[]): string {
  return messages
    .filter((m) => m.role !== 'system')
    .map(
      (m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`,
    )
    .join('\n\n');
}
