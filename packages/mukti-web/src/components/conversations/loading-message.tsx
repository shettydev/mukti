/**
 * LoadingMessage component for displaying AI response loading state
 *
 * Displays an animated SVG Enso drawing while the AI processes and generates
 * a response. Includes progressive status text updates based on processing duration.
 *
 * @remarks
 * This component implements the loading state specifications from the SSE design,
 * including animated drawing, pulsing effects, and accessibility features.
 * All animations respect the user's prefers-reduced-motion preference.
 *
 * Progressive disclosure stages:
 * - 0-5s: Initial status message
 * - 5-10s: "Still working on it..."
 * - 10s+: Extended message about longer processing time
 */

'use client';

import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'motion/react';
import { useEffect, useMemo } from 'react';

/**
 * Props for the LoadingMessage component
 * @property {number} [duration] - Time elapsed in seconds since processing started
 * @property {string} status - Current processing status text
 */
interface LoadingMessageProps {
  duration?: number;
  status: string;
}

/**
 * LoadingMessage component
 *
 * Displays a loading state with an animated SVG Enso and status text.
 * Status text updates progressively based on processing duration:
 * - 0-5s: Shows provided status
 * - 5-10s: "Still working on it..."
 * - 10s+: Extended message about longer processing time
 */
export function LoadingMessage({ duration = 0, status }: LoadingMessageProps) {
  const displayStatus = useMemo(() => {
    if (duration > 10) {
      return 'This is taking longer than usual. Your response will arrive shortly.';
    }
    if (duration > 5) {
      return 'Still working on it...';
    }
    return status;
  }, [duration, status]);

  return (
    <div
      aria-label="AI is generating a response"
      aria-live="polite"
      className="flex items-center gap-3 py-4 pl-1 md:pl-2"
      role="status"
    >
      <div aria-hidden="true" className="h-9 w-9 shrink-0">
        <EnsoAnimation duration={duration} />
      </div>
      <StatusText status={displayStatus} />
    </div>
  );
}

function EnsoAnimation({ duration }: { duration: number }) {
  const controls = useAnimationControls();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      controls.set({ opacity: 1, pathLength: 0.92 });
      return;
    }

    const animate = async () => {
      await controls.start({
        opacity: [0, 1],
        pathLength: [0, 0.92],
        transition: { duration: 2.2, ease: [0.22, 1, 0.36, 1] },
      });

      controls.start({
        opacity: [0.85, 1, 0.85],
        scale: [1, 1.06, 1],
        transition: { duration: 3, ease: 'easeInOut', repeat: Infinity },
      });
    };

    animate();
  }, [controls, prefersReducedMotion]);

  return (
    <svg className="h-full w-full text-japandi-stone dark:text-japandi-cream" viewBox="0 0 100 100">
      {!prefersReducedMotion && duration > 10 && (
        <motion.circle
          animate={{ opacity: [0, 0.3, 0], scale: [0.95, 1.08, 0.95] }}
          className="stroke-japandi-sage/30"
          cx={50}
          cy={50}
          fill="none"
          initial={{ opacity: 0, scale: 0.95 }}
          r={42}
          strokeWidth={1.5}
          transition={{ duration: 4, ease: 'easeInOut', repeat: Infinity }}
        />
      )}

      <motion.path
        animate={controls}
        d="M 82,53 C 80,30 65,14 47,14 C 28,14 13,32 13,52 C 13,72 28,88 50,88 C 70,88 83,74 83,56"
        fill="none"
        initial={{ opacity: 0, pathLength: 0 }}
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={7}
        style={{ originX: '50px', originY: '50px' }}
      />

      <motion.circle
        animate={{ opacity: 1 }}
        cx={63}
        cy={67}
        fill="currentColor"
        initial={{ opacity: 0 }}
        r={3}
        transition={{ delay: prefersReducedMotion ? 0 : 2.0, duration: 0.5 }}
      />
    </svg>
  );
}

function StatusText({ status }: { status: string }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="text-sm text-japandi-stone/70 dark:text-japandi-cream/70">
      <AnimatePresence mode="wait">
        <motion.span
          animate={{ opacity: 1, y: 0 }}
          className="inline-block"
          exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -4 }}
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 4 }}
          key={status}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {status}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
