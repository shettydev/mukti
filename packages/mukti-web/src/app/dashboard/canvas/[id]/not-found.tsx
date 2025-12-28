/**
 * Canvas not-found page
 *
 * Displays a friendly message when a canvas session is not found.
 * Provides navigation back to the canvas listing page.
 *
 */

import { Brain, Home } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

/**
 * Not found component for canvas detail page
 * Displayed when the requested canvas session doesn't exist
 */
export default function CanvasNotFound() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-6 text-center max-w-md px-4">
        {/* Icon */}
        <div className="rounded-full bg-muted/10 p-6">
          <Brain className="h-16 w-16 text-muted-foreground" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold">Canvas Not Found</h1>

        {/* Description */}
        <p className="text-muted-foreground">
          The thinking canvas you&apos;re looking for doesn&apos;t exist or may have been deleted.
          This could happen if the session was removed or if the link is incorrect.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild>
            <Link href="/canvas">
              <Home className="mr-2 h-4 w-4" />
              Back to Canvas List
            </Link>
          </Button>
        </div>

        {/* Help text */}
        <p className="text-sm text-muted-foreground/70">
          Need help? Try creating a new thinking session from the canvas listing page.
        </p>
      </div>
    </div>
  );
}
