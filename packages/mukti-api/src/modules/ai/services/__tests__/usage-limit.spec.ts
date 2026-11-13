import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';

import { OpenRouterService } from '../../../conversations/services/openrouter.service';
import { AntigravityCliAdapter } from '../adapters/antigravity-cli.adapter';
import { ClaudeCliAdapter } from '../adapters/claude-cli.adapter';
import { CodexCliAdapter } from '../adapters/codex-cli.adapter';
import {
  CLI_NON_LIMIT_FIXTURES,
  CLI_USAGE_LIMIT_FIXTURES,
} from '../adapters/usage-limit.fixtures';
import { LocalCliClientFactory } from '../local-cli-client.factory';
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
  it('uses the Claude failure envelope rather than incidental stderr', async () => {
    (spawn as jest.Mock).mockReturnValue(
      fakeChild({
        code: 1,
        stderr: 'Diagnostic: request unsuccessful',
        stdout: JSON.stringify({
          is_error: true,
          result: "You've hit your limit · resets 5pm",
        }),
      }),
    );
    await expect(
      new LocalCliClientFactory(new ClaudeCliAdapter())
        .create('')
        .chat.send({ messages: [], model: '', responseFormat: undefined }),
    ).rejects.toMatchObject({ code: 'AI_USAGE_LIMIT' });
  });
  it.each([
    [
      new CodexCliAdapter(),
      JSON.stringify({
        error: {
          message:
            'You have hit your usage limit. Upgrade to Pro or try again later.',
        },
        type: 'turn.failed',
      }),
    ],
    [
      new AntigravityCliAdapter(),
      JSON.stringify({
        error: 'RESOURCE_EXHAUSTED: quota exceeded',
        status: 'error',
      }),
    ],
  ])(
    'classifies zero-exit structured failures from %s',
    async (adapter, stdout) => {
      (spawn as jest.Mock).mockReturnValue(fakeChild({ code: 0, stdout }));
      await expect(
        new LocalCliClientFactory(adapter)
          .create('')
          .chat.send({ messages: [], model: '', responseFormat: undefined }),
      ).rejects.toMatchObject({
        code: 'AI_USAGE_LIMIT',
        details: { limit: 'cli_plan', provider: adapter.providerId },
      });
    },
  );
  it.each(fixtures)(
    'does not classify configuration errors mentioning limits as quota refusals',
    (adapter) => {
      expect(adapter.isUsageLimit('Invalid rate limit configuration')).toBe(
        false,
      );
      expect(
        adapter.isUsageLimit(
          'Unable to read usage limit settings: Permission denied',
        ),
      ).toBe(false);
    },
  );
  it.each(fixtures)(
    'matches provider fixtures without matching unrelated errors',
    (adapter) => {
      for (const detail of CLI_USAGE_LIMIT_FIXTURES[adapter.providerId]) {
        expect(adapter.isUsageLimit(detail)).toBe(true);
      }
      for (const detail of CLI_NON_LIMIT_FIXTURES) {
        expect(adapter.isUsageLimit(detail)).toBe(false);
      }
    },
  );
  it('classifies Claude zero-exit failure envelopes too', async () => {
    (spawn as jest.Mock).mockReturnValue(
      fakeChild({
        code: 0,
        stdout: JSON.stringify({
          is_error: true,
          result: 'Usage limit reached',
        }),
      }),
    );
    await expect(
      new LocalCliClientFactory(new ClaudeCliAdapter())
        .create('')
        .chat.send({ messages: [], model: '', responseFormat: undefined }),
    ).rejects.toMatchObject({
      code: 'AI_USAGE_LIMIT',
      details: { limit: 'cli_plan', provider: 'claude-code' },
    });
  });
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
      service.handleError({ message: 'provider refusal', status }),
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
  it.each([
    [402, 'openrouter_credit'],
    [429, 'openrouter_rate'],
  ])('classifies SDK statusCode %s', (statusCode, limit) => {
    expect(
      service.handleError({ message: 'provider refusal', statusCode }),
    ).toMatchObject({
      code: 'AI_USAGE_LIMIT',
      details: { limit, provider: 'openrouter' },
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
