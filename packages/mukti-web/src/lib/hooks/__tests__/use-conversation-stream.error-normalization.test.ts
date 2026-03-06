import type { ErrorEvent } from '../use-conversation-stream';

import { normalizeStreamErrorEvent } from '../use-conversation-stream';

describe('normalizeStreamErrorEvent', () => {
  it('normalizes OpenRouter 402 credit errors into user-friendly copy', () => {
    const event: ErrorEvent = {
      conversationId: 'conv-1',
      data: {
        code: 'PROCESSING_ERROR',
        message:
          'API error occurred: Status 402\nBody: {"error":{"message":"This request requires more credits, or fewer max_tokens. You requested up to 65536 tokens, but can only afford 65152. To increase, visit https://openrouter.ai/settings/keys and create a key with a higher total limit","code":402}}',
        retriable: true,
      },
      timestamp: '2026-03-04T17:00:00.000Z',
      type: 'error',
    };

    const normalized = normalizeStreamErrorEvent(event);

    expect(normalized.data.code).toBe('OPENROUTER_INSUFFICIENT_CREDITS');
    expect(normalized.data.retriable).toBe(false);
    expect(normalized.data.message).toContain('Not enough OpenRouter credits for this request');
    expect(normalized.data.message).toContain('(65536 requested, 65152 available)');
    expect(normalized.data.message).toContain('https://openrouter.ai/settings/keys');
  });

  it('leaves unrelated processing errors unchanged', () => {
    const event: ErrorEvent = {
      conversationId: 'conv-2',
      data: {
        code: 'PROCESSING_ERROR',
        message: 'Something went wrong while generating a response',
        retriable: true,
      },
      timestamp: '2026-03-04T17:00:00.000Z',
      type: 'error',
    };

    const normalized = normalizeStreamErrorEvent(event);

    expect(normalized).toEqual(event);
  });
});
