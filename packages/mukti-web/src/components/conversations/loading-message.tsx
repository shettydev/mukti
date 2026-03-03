/**
 * LoadingMessage component for displaying AI response loading state
 *
 * Displays a continuously animated SVG Enso drawing while the AI processes
 * and generates a response. The Enso draws itself in a smooth loop.
 *
 * @remarks
 * This component implements the loading state specifications from the SSE design,
 * with a looping draw animation for clear visual feedback.
 * All animations respect the user's prefers-reduced-motion preference.
 */

'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useMemo } from 'react';

/**
 * Props for the LoadingMessage component
 * @property {number} [duration] - Time elapsed in seconds since processing started
 * @property {string} [status] - Current processing status text. Rendered as screen-reader-only
 *   text inside the aria-live region so assistive technology announces status updates.
 *   Kept in the public interface for forward-compatibility; visual display may be
 *   reintroduced alongside the animation in a future iteration.
 */
interface LoadingMessageProps {
  duration?: number;
  status?: string;
}

/**
 * LoadingMessage component
 *
 * Displays a loading state with a continuously looping animated SVG Enso.
 * Status text is surfaced to screen readers via a visually-hidden element inside
 * the aria-live region so progressive status updates are still announced
 * accessibly even though they are not shown visually.
 */
export function LoadingMessage({ duration = 0, status }: LoadingMessageProps) {
  const displayStatus = useMemo(() => {
    if (duration > 10) {
      return 'This is taking longer than usual. Your response will arrive shortly.';
    }
    if (duration > 5) {
      return 'Still working on it...';
    }
    return status ?? 'AI is generating a response';
  }, [duration, status]);

  return (
    <div aria-live="polite" className="flex items-center py-4 pl-1 md:pl-2" role="status">
      <div aria-hidden="true" className="h-10 w-10 shrink-0">
        <EnsoAnimation duration={duration} />
      </div>
      {/* Visually hidden — surfaced to screen readers via the aria-live region */}
      <span className="sr-only">{displayStatus}</span>
    </div>
  );
}

function EnsoAnimation({ duration }: { duration: number }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <svg
        className="h-full w-full text-japandi-stone dark:text-japandi-cream"
        viewBox="0 0 100 100"
      >
        <path
          d="M 82,53 C 80,30 65,14 47,14 C 28,14 13,32 13,52 C 13,72 28,88 50,88 C 70,88 83,74 83,56"
          fill="none"
          stroke="currentColor"
          strokeDasharray="92 100"
          strokeLinecap="round"
          strokeWidth={7}
        />
        <circle cx={63} cy={67} fill="currentColor" r={3} />
      </svg>
    );
  }

  return (
    <svg className="h-full w-full text-japandi-stone dark:text-japandi-cream" viewBox="0 0 100 100">
      {duration > 8 && (
        <motion.circle
          animate={{
            opacity: [0, 0.4, 0],
            scale: [0.8, 1.15, 0.8],
          }}
          className="stroke-japandi-sage/40 dark:stroke-japandi-sage/30"
          cx={50}
          cy={50}
          fill="none"
          r={44}
          strokeWidth={1.5}
          // transformBox + transformOrigin ensure scale is relative to the circle's own
          // centre rather than the SVG viewport origin (which defaults to 0 0 in SVG).
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          transition={{
            duration: 2.5,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        />
      )}

      <motion.path
        animate={{
          opacity: [0, 1, 1, 0],
          pathLength: [0, 0.92, 0.92, 0],
        }}
        d="M 82,53 C 80,30 65,14 47,14 C 28,14 13,32 13,52 C 13,72 28,88 50,88 C 70,88 83,74 83,56"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={7}
        style={{ originX: '50px', originY: '50px' }}
        transition={{
          duration: 3.2,
          ease: [0.22, 1, 0.36, 1],
          repeat: Infinity,
          times: [0, 0.55, 0.75, 1],
        }}
      />

      <motion.circle
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [0.5, 1, 1, 0.5],
        }}
        cx={63}
        cy={67}
        fill="currentColor"
        r={3}
        // transformBox + transformOrigin ensure scale is relative to the dot's own centre.
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        transition={{
          duration: 3.2,
          ease: 'easeInOut',
          repeat: Infinity,
          // The last time value (0.85) is intentionally < 1 to create a brief pause
          // with the dot hidden before the next loop, for a more natural ink-brush rhythm.
          times: [0.5, 0.6, 0.75, 0.85],
        }}
      />
    </svg>
  );
}
