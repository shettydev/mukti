'use client';

/**
 * RateLimitBanner component for displaying rate limit errors with countdown
 *
 * Shows a banner when the user hits rate limits, with a countdown timer
 * showing when they can retry.
 *
 */

import { AlertCircle, Clock, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

export interface RateLimitBannerProps {
  /** Additional CSS classes */
  className?: string;
  /** Whether the banner can be manually dismissed */
  dismissible?: boolean;
  /** Custom message to display */
  message?: string;
  /** Callback when the countdown completes or banner is dismissed */
  onDismiss: () => void;
  /** Time in seconds until the user can retry */
  retryAfter: number;
}

/**
 * RateLimitBanner displays rate limit information with a countdown timer
 */
export function RateLimitBanner({
  className = '',
  dismissible = false,
  message = "You've reached your message limit.",
  onDismiss,
  retryAfter,
}: RateLimitBannerProps) {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.floor(retryAfter)));

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    // Reset timer when retryAfter changes
    setTimeLeft(Math.max(0, Math.floor(retryAfter)));
  }, [retryAfter]);

  useEffect(() => {
    if (timeLeft <= 0) {
      handleDismiss();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newValue = prev - 1;
        if (newValue <= 0) {
          clearInterval(interval);
          // Use setTimeout to avoid state update during render
          setTimeout(handleDismiss, 0);
          return 0;
        }
        return newValue;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, handleDismiss]);

  // Don't render if time is already up
  if (timeLeft <= 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={`flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 ${className}`}
      data-testid="rate-limit-banner"
      role="alert"
    >
      <div className="flex-shrink-0">
        <AlertCircle
          aria-hidden="true"
          className="h-5 w-5 text-destructive"
          data-testid="rate-limit-icon"
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-destructive" data-testid="rate-limit-title">
          Rate Limit Exceeded
        </p>
        <p className="text-sm text-muted-foreground" data-testid="rate-limit-message">
          {message}
        </p>
      </div>

      <div
        aria-label={`Try again in ${formatTimeRemaining(timeLeft)}`}
        className="flex items-center gap-2 text-sm font-medium text-destructive"
        data-testid="rate-limit-countdown"
      >
        <Clock aria-hidden="true" className="h-4 w-4" />
        <span data-testid="countdown-value">{formatTimeRemaining(timeLeft)}</span>
      </div>

      {dismissible && (
        <Button
          aria-label="Dismiss rate limit banner"
          className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
          data-testid="dismiss-button"
          onClick={handleDismiss}
          size="icon"
          variant="ghost"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Formats seconds into a human-readable time string
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) {
    return '0 seconds';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  }

  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
