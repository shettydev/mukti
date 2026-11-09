import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';

import { ClaudeCliAdapter } from '../adapters/claude-cli.adapter';
import { CodexCliAdapter } from '../adapters/codex-cli.adapter';
import { AntigravityCliAdapter } from '../adapters/antigravity-cli.adapter';
import { LocalCliClientFactory } from '../local-cli-client.factory';
import { OpenRouterService } from '../../../conversations/services/openrouter.service';
import { fakeChild } from './fake-child';

jest.mock('child_process', () => ({ spawn: jest.fn() }));

const fixtures = [
  [new ClaudeCliAdapter(), 'Usage limit reached. Your limit resets at 5pm.'],
  [
    new CodexCliAdapter(),
    '{"error":{"type":"usage_limit_reached","message":"You have hit your usage limit"}}',
  ],
  [
    new AntigravityCliAdapter(),
    'RESOURCE_EXHAUSTED: quota exceeded for this model',
  ],
] as const;

describe('Usage-limit errors', () => {
  const service = new OpenRouterService(
    new ConfigService(),
    {} as never,
    {} as never,
  );
  it.each([
    [402, 'openrouter_credit'],
    [429, 'openrouter_rate'],
  ])('classifies OpenRouter %s', (status, limit) => {
    expect(
      service.handleError({ status, message: 'provider refusal' }),
    ).toMatchObject({
      code: 'AI_USAGE_LIMIT',
      details: { limit, provider: 'openrouter' },
      retriable: false,
    });
  });
  it('preserves unrelated server errors', () => {
    expect(service.handleError({ status: 500 })).toMatchObject({
      code: 'SERVER_ERROR',
      retriable: true,
    });
  });
  it.each(fixtures)(
    'classifies %s limits and leaves signed-out failures alone',
    async (adapter, detail) => {
      const factory = new LocalCliClientFactory(adapter);
      const request = {
        messages: [{ content: 'Keep this thought', role: 'user' as const }],
        model: '',
        responseFormat: undefined,
      };
      (spawn as jest.Mock).mockReturnValue(
        fakeChild({ code: 1, stderr: detail }),
      );
      await expect(factory.create('').chat.send(request)).rejects.toMatchObject(
        {
          code: 'AI_USAGE_LIMIT',
          details: { limit: 'cli_plan', provider: adapter.providerId },
          retriable: false,
        },
      );
      (spawn as jest.Mock).mockReturnValue(
        fakeChild({ code: 1, stderr: 'Not signed in. Please authenticate.' }),
      );
      await expect(factory.create('').chat.send(request)).rejects.toMatchObject(
        {
          code: adapter.errorCode,
          message: expect.stringContaining(adapter.signInHint),
        },
      );
    },
  );
});
