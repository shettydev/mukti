'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for conversations list page
 * Displays error state with retry option
 *
 */
export default function ConversationsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Conversations page error:', error);
  }, [error]);

  return (
    <div className="flex h-screen bg-[#0a0a0a] items-center justify-center">
      <div className="text-center max-w-md p-8">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-white/60 mb-6">
          We encountered an error while loading your conversations. Please try again.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
