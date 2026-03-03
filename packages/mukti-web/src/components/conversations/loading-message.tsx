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

/**
 * Props for the LoadingMessage component
 * @property {number} [duration] - Time elapsed in seconds since processing started
 */
interface LoadingMessageProps {
  duration?: number;
  status?: string;
}

/**
 * LoadingMessage component
 *
 * Displays a loading state with a continuously looping animated SVG Enso.
 */
export function LoadingMessage({ duration = 0 }: LoadingMessageProps) {
  return (
    <div
      aria-label="AI is generating a response"
      aria-live="polite"
      className="flex items-center py-4 pl-1 md:pl-2"
      role="status"
    >
      <div aria-hidden="true" className="h-10 w-10 shrink-0">
        <EnsoAnimation duration={duration} />
      </div>
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
          strokeLinecap="round"
          strokeWidth={7}
          strokeDasharray="92 100"
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
          transition={{
            duration: 2.5,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        />
      )}

      <motion.path
        animate={{
          pathLength: [0, 0.92, 0.92, 0],
          opacity: [0, 1, 1, 0],
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
        transition={{
          duration: 3.2,
          ease: 'easeInOut',
          repeat: Infinity,
          times: [0.5, 0.6, 0.75, 0.85],
        }}
      />
    </svg>
  );
}
