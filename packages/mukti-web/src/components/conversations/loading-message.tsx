/**
 * LoadingMessage component for displaying AI response loading state
 *
 * Displays an animated loading indicator while the AI processes and generates
 * a response. Includes progressive status text updates based on processing duration.
 *
 * @remarks
 * This component implements the loading state specifications from the SSE design,
 * including animated typing indicators, pulsing effects, and accessibility features.
 * All animations respect the user's prefers-reduced-motion preference.
 *
 * Progressive disclosure stages:
 * - 0-5s: Initial status message
 * - 5-10s: "Still working on it..." with queue position if available
 * - 10s+: Extended message about longer processing time
 */

'use client';

import { Bot, Clock, Users } from 'lucide-react';
import { useMemo } from 'react';

import { cn } from '@/lib/utils';

/**
 * Props for the LoadingMessage component
 * @property {number} [duration] - Time elapsed in seconds since processing started
 * @property {number} [queuePosition] - Position in processing queue (if available)
 * @property {string} status - Current processing status text
 */
interface LoadingMessageProps {
  duration?: number;
  queuePosition?: number;
  status: string;
}

/**
 * LoadingMessage component
 *
 * Displays a loading state with AI avatar, status text, and typing indicator.
 * Status text updates progressively based on processing duration:
 * - 0-5s: Shows provided status
 * - 5-10s: "Still working on it..." (with queue position if available)
 * - 10s+: Extended message about longer processing time
 *
 * Features progressive disclosure with:
 * - Dynamic status text based on elapsed time
 * - Queue position indicator when available
 * - Hover tooltip with additional details
 * - Smooth transitions between states
 *
 * @example
 * ```tsx
 * <LoadingMessage
 *   status="AI is thinking..."
 *   duration={3}
 * />
 *
 * <LoadingMessage
 *   status="Generating response..."
 *   queuePosition={2}
 *   duration={7}
 * />
 * ```
 */
export function LoadingMessage({ duration = 0, queuePosition, status }: LoadingMessageProps) {
  // Update status text based on processing duration with progressive disclosure
  const displayStatus = useMemo(() => {
    if (duration > 10) {
      return 'This is taking longer than usual. Your response will arrive shortly.';
    }
    if (duration > 5) {
      return 'Still working on it...';
    }
    return status;
  }, [duration, status]);

  // Generate tooltip content with additional details
  const tooltipContent = useMemo(() => {
    const parts: string[] = [];

    // Add elapsed time
    if (duration > 0) {
      parts.push(`Processing for ${duration}s`);
    }

    // Add queue position
    if (queuePosition !== undefined && queuePosition > 0) {
      parts.push(`Position #${queuePosition} in queue`);
    }

    // Add estimated time for longer waits
    if (duration > 10) {
      parts.push('Usually completes within 30 seconds');
    }

    return parts.length > 0 ? parts.join(' • ') : 'AI is processing your message';
  }, [duration, queuePosition]);

  return (
    <div
      aria-label="AI is generating a response"
      aria-live="polite"
      className="flex w-full gap-3 py-4 animate-fade-in"
      role="status"
    >
      {/* AI Avatar with pulse animation */}
      <div className="relative flex-shrink-0">
        <div
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center',
            'bg-primary/10 text-primary'
          )}
        >
          <Bot aria-hidden="true" className="h-5 w-5" />
        </div>
        {/* Pulsing ring effect - respects prefers-reduced-motion */}
        <div
          aria-hidden="true"
          className={cn('absolute inset-0 rounded-full bg-primary/20', 'motion-safe:animate-ping')}
        />
      </div>

      {/* Loading message bubble with hover tooltip */}
      <div className="flex-1 max-w-[80%] group">
        <div
          className={cn(
            'rounded-lg px-4 py-3 relative',
            'bg-muted/50 border border-muted',
            'animate-pulse-border',
            'transition-all duration-300'
          )}
          title={tooltipContent}
        >
          {/* Main status text */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="transition-all duration-300">{displayStatus}</span>
            <TypingIndicator />
          </div>

          {/* Additional info badges - shown for longer processing times */}
          {(duration > 5 || queuePosition !== undefined) && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground/80">
              {/* Duration indicator */}
              {duration > 5 && (
                <div className="flex items-center gap-1 animate-fade-in">
                  <Clock aria-hidden="true" className="h-3 w-3" />
                  <span>{duration}s</span>
                </div>
              )}

              {/* Queue position indicator */}
              {queuePosition !== undefined && queuePosition > 0 && (
                <div className="flex items-center gap-1 animate-fade-in">
                  <Users aria-hidden="true" className="h-3 w-3" />
                  <span>#{queuePosition} in queue</span>
                </div>
              )}
            </div>
          )}

          {/* Hover tooltip - desktop only */}
          <div
            className={cn(
              'absolute left-0 right-0 -bottom-2 translate-y-full',
              'px-3 py-2 rounded-md',
              'bg-popover text-popover-foreground',
              'border shadow-md',
              'text-xs',
              'opacity-0 invisible',
              'group-hover:opacity-100 group-hover:visible',
              'transition-all duration-200',
              'pointer-events-none',
              'z-10',
              'hidden sm:block' // Only show on larger screens
            )}
          >
            <div className="flex flex-col gap-1">
              {duration > 0 && (
                <div className="flex items-center gap-2">
                  <Clock aria-hidden="true" className="h-3 w-3 text-muted-foreground" />
                  <span>Processing for {duration} seconds</span>
                </div>
              )}
              {queuePosition !== undefined && queuePosition > 0 && (
                <div className="flex items-center gap-2">
                  <Users aria-hidden="true" className="h-3 w-3 text-muted-foreground" />
                  <span>Position #{queuePosition} in queue</span>
                </div>
              )}
              {duration > 10 && (
                <div className="text-muted-foreground mt-1">
                  Usually completes within 30 seconds
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Typing indicator with three animated dots
 *
 * Displays three dots that pulse in sequence to indicate active processing.
 * Animation respects prefers-reduced-motion preference.
 */
function TypingIndicator() {
  return (
    <div aria-hidden="true" className="flex gap-1">
      <span
        className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot"
        style={{ animationDelay: '200ms' }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot"
        style={{ animationDelay: '400ms' }}
      />
    </div>
  );
}
