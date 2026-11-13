import { fireEvent, render, screen } from '@testing-library/react';

import { UsageLimitBanner } from '../usage-limit-banner';

describe('UsageLimitBanner', () => {
  it.each([
    ['free_daily', 'Daily message limit reached', 'OpenRouter key'],
    ['openrouter_credit', 'OpenRouter credit exhausted', 'credit'],
    ['openrouter_rate', 'OpenRouter rate limit reached', 'try again'],
    ['cli_plan', 'codex plan limit reached', 'Settings'],
  ])('explains %s and preserves the message', (limit, title, nextStep) => {
    const resend = jest.fn();
    render(
      <UsageLimitBanner
        error={{
          code: 'AI_USAGE_LIMIT',
          details: { dailyLimit: 10, limit, provider: 'codex', resetsAt: '2026-11-10T00:00:00Z' },
        }}
        onResend={resend}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent(title);
    expect(screen.getByRole('alert')).toHaveTextContent(nextStep);
    expect(screen.getByRole('alert')).toHaveTextContent('Your message was kept');
    fireEvent.click(screen.getByRole('button', { name: 'Resend' }));
    expect(resend).toHaveBeenCalledTimes(1);
  });
  it('handles legacy free-quota errors', () => {
    render(
      <UsageLimitBanner
        error={{
          code: 'RATE_LIMIT_EXCEEDED',
          details: { dailyLimit: 10, resetsAt: '2026-11-10T00:00:00Z' },
        }}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Daily message limit reached');
    expect(screen.getByRole('alert')).toHaveTextContent('10');
  });
  it('offers Try again without claiming a message was kept when no message was sent', () => {
    const retry = jest.fn();
    render(
      <UsageLimitBanner
        error={{ code: 'RATE_LIMIT_EXCEEDED', details: { dailyLimit: 10 } }}
        onRetry={retry}
      />
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent('Your message was kept');
    expect(screen.queryByRole('button', { name: 'Resend' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
  it('does not claim a message was kept when there is nothing to resend', () => {
    render(<UsageLimitBanner error={{ code: 'AI_USAGE_LIMIT', details: { limit: 'cli_plan' } }} />);
    expect(screen.getByRole('alert')).not.toHaveTextContent('Your message was kept');
  });
});
