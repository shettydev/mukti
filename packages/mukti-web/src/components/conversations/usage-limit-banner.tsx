'use client';

import { Button } from '@/components/ui/button';

export interface UsageLimitError {
  code: 'AI_USAGE_LIMIT' | 'RATE_LIMIT_EXCEEDED';
  details?: unknown;
  message?: string;
}

export function isUsageLimitError(error: unknown): error is UsageLimitError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'AI_USAGE_LIMIT' || error.code === 'RATE_LIMIT_EXCEEDED')
  );
}

/** Shared across chat and both node dialogues. No invented reset countdown. */
export function UsageLimitBanner({
  error,
  onDismiss,
  onResend,
}: {
  error: UsageLimitError;
  onDismiss?: () => void;
  onResend?: () => void;
}) {
  const details = (
    typeof error.details === 'object' && error.details !== null ? error.details : {}
  ) as Record<string, unknown>;
  const limit = details.limit ?? (error.code === 'RATE_LIMIT_EXCEEDED' ? 'free_daily' : undefined);
  const provider = typeof details.provider === 'string' ? details.provider : 'CLI';
  const reset = typeof details.resetsAt === 'string' ? new Date(details.resetsAt) : null;
  const resetText =
    reset && !Number.isNaN(reset.getTime()) ? ` Resets at ${reset.toLocaleString()}.` : '';
  const copy =
    limit === 'free_daily'
      ? {
          next: `Your free daily${typeof details.dailyLimit === 'number' ? ` ${details.dailyLimit}-message` : ' message'} limit has been reached.${resetText} Add an OpenRouter key in Settings to remove this limit.`,
          title: 'Daily message limit reached',
        }
      : limit === 'openrouter_credit'
        ? {
            next: 'Add credit to your OpenRouter account, then resend your message.',
            title: 'OpenRouter credit exhausted',
          }
        : limit === 'openrouter_rate'
          ? {
              next: 'Wait for the provider rate limit to clear, then try again.',
              title: 'OpenRouter rate limit reached',
            }
          : {
              next: 'Check your CLI plan or wait for its limit to reset. You can switch CLI in Settings.',
              title: `${provider} plan limit reached`,
            };
  return (
    <div
      aria-live="polite"
      className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm"
      data-testid="usage-limit-banner"
      role="alert"
    >
      <p className="font-medium">{copy.title}</p>
      <p>{copy.next}</p>
      <p>Your message was kept. You can resend it without retyping.</p>
      {onResend && (
        <Button onClick={onResend} size="sm" variant="outline">
          Resend
        </Button>
      )}
      {onDismiss && (
        <Button onClick={onDismiss} size="sm" variant="ghost">
          Dismiss
        </Button>
      )}
    </div>
  );
}
