import { HttpException } from '@nestjs/common';

import { LocalCliError } from '../../types/local-cli-adapter.interface';
import { streamErrorData } from '../stream-error-data';

describe('streamErrorData', () => {
  it('preserves a nested hosted daily quota refusal', () => {
    const details = { dailyLimit: 10, resetsAt: '2026-11-11T00:00:00Z' };
    expect(
      streamErrorData(
        new HttpException(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              details,
              message: 'Daily quota reached',
            },
          },
          429,
        ),
      ),
    ).toEqual({
      code: 'RATE_LIMIT_EXCEEDED',
      details,
      message: 'Daily quota reached',
      retriable: false,
    });
  });

  it.each([
    [402, 'openrouter_credit'],
    [429, 'openrouter_rate'],
  ])('maps raw SDK statusCode %s for node surfaces', (statusCode, limit) => {
    expect(
      streamErrorData(
        Object.assign(new Error('Provider refused'), { statusCode }),
      ),
    ).toEqual({
      code: 'AI_USAGE_LIMIT',
      details: { limit, provider: 'openrouter' },
      message: 'Provider refused',
      retriable: false,
    });
  });

  it('preserves local CLI sign-in failures instead of calling them limits', () => {
    expect(
      streamErrorData(
        new LocalCliError('Sign in to Claude', 'CLAUDE_CLI_ERROR'),
      ),
    ).toEqual({
      code: 'CLAUDE_CLI_ERROR',
      message: 'Sign in to Claude',
      retriable: false,
    });
  });

  it('preserves unrelated processing failures', () => {
    expect(streamErrorData(new Error('Database unavailable'))).toEqual({
      code: 'PROCESSING_ERROR',
      message: 'Database unavailable',
      retriable: true,
    });
  });
});
