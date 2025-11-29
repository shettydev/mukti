'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface GradientBackgroundProps {
  /**
   * Content to render on top of the gradient background
   */
  children: ReactNode;
  /**
   * Additional CSS classes to apply to the container
   */
  className?: string;
}

/**
 * Full-page gradient background component for authentication pages.
 *
 * Creates a beautiful gradient that transitions from dark/black at the top
 * through deep purple to vibrant blue at the bottom, providing an engaging
 * visual experience for the authentication flow.
 *
 * The gradient uses the following color scheme:
 * - Top: #000000 (black) - Creates dramatic dark atmosphere
 * - Middle: #581C87 (purple-900) - Deep purple transition
 * - Bottom: #2563EB (blue-600) - Vibrant blue
 *
 * @example
 * ```tsx
 * <GradientBackground>
 *   <AuthCard />
 * </GradientBackground>
 * ```
 *
 * @remarks
 * This component is designed to be used as a full-page wrapper for authentication
 * pages. It ensures the gradient covers the entire viewport and is responsive
 * across all screen sizes.
 *
 * @see {@link https://tailwindcss.com/docs/gradient-color-stops} for Tailwind gradient documentation
 */
export function GradientBackground({ children, className }: GradientBackgroundProps) {
  return (
    <div
      className={cn(
        // Full viewport height and width
        'min-h-screen w-full',
        // Gradient from dark/black (top) through purple to vibrant blue (bottom)
        // Matches the design reference with darker tones at top
        'bg-gradient-to-b from-black via-purple-900 to-blue-600',
        // Ensure gradient covers entire viewport on all devices
        'relative overflow-hidden',
        // Flexbox for centering content
        'flex items-center justify-center',
        // Padding for mobile responsiveness
        'p-4 sm:p-6 md:p-8',
        className
      )}
    >
      {children}
    </div>
  );
}
