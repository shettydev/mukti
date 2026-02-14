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

export function GradientBackground({ children, className }: GradientBackgroundProps) {
  return (
    <div
      className={cn(
        'japandi-page bg-grain relative min-h-dvh w-full overflow-hidden',
        'flex items-center justify-center',
        'px-4 py-6 sm:px-6 sm:py-8 md:px-8',
        'before:z-0',
        className
      )}
      suppressHydrationWarning
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_18%,rgba(196,120,91,0.12),transparent_40%),radial-gradient(circle_at_80%_12%,rgba(139,158,130,0.1),transparent_35%),radial-gradient(circle_at_48%_88%,rgba(91,105,135,0.1),transparent_46%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(212,144,110,0.1),transparent_40%),radial-gradient(circle_at_80%_12%,rgba(155,179,146,0.1),transparent_35%),radial-gradient(circle_at_48%_88%,rgba(126,148,179,0.09),transparent_46%)]"
      />

      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
