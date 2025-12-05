'use client';

import { ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';

import type { ComingSoonProps } from '@/types/layout.types';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Coming soon placeholder component
 *
 * Displays informative message for features under development.
 * Includes feature name, description, timeline, and navigation back to dashboard.
 *
 * Features:
 * - Consistent design with dashboard theme
 * - Optional icon support
 * - Optional timeline display
 * - Back to dashboard navigation
 * - Responsive layout
 *
 * @example
 * ```tsx
 * <ComingSoon
 *   feature="Community"
 *   description="Connect with other users, share insights, and collaborate on inquiries."
 *   timeline="Q2 2026"
 *   icon={<Users className="w-12 h-12" />}
 * />
 * ```
 */
export function ComingSoon({ className, description, feature, icon, timeline }: ComingSoonProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[60vh] px-4 py-12 text-center',
        className
      )}
    >
      {/* Icon */}
      <div className="mb-6 text-white/40">
        {icon || <Clock className="w-16 h-16 md:w-20 md:h-20" />}
      </div>

      {/* Feature name */}
      <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        {feature}
      </h1>

      {/* Coming soon badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
        <Clock className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-purple-400">Coming Soon</span>
      </div>

      {/* Description */}
      <p className="text-lg md:text-xl text-white/70 max-w-2xl mb-4">{description}</p>

      {/* Timeline */}
      {timeline && (
        <p className="text-sm text-white/50 mb-8">
          Expected release: <span className="font-medium text-white/70">{timeline}</span>
        </p>
      )}

      {/* Back to dashboard button */}
      <Button asChild size="lg" variant="outline">
        <Link href="/dashboard">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </Button>

      {/* Additional info */}
      <p className="text-sm text-white/40 mt-8 max-w-md">
        We&apos;re working hard to bring you this feature. Stay tuned for updates!
      </p>
    </div>
  );
}
