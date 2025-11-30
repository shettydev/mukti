'use client';

import { AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for conversation detail page
 * Displays error state with retry and back options
 *
 * Requirements: 6.6, 11.5
 */
export default function ConversationDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Conversation detail error:', error);
  }, [error]);

  const is404 = error.message.includes('not found') || error.message.includes('404');

  return (
    <div className="flex h-screen bg-[#0a0a0a] items-center justify-center">
      <div className="text-center max-w-md p-8">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">
          {is404 ? 'Conversation Not Found' : 'Something went wrong'}
        </h2>
        <p className="text-white/60 mb-6">
          {is404
            ? "The conversation you're looking for doesn't exist or has been deleted."
            : 'We encountered an error while loading this conversation. Please try again.'}
        </p>
        <div className="flex gap-2 justify-center">
          <Button asChild variant="outline">
            <Link href="/dashboard/conversations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Conversations
            </Link>
          </Button>
          {!is404 && <Button onClick={reset}>Try again</Button>}
        </div>
      </div>
    </div>
  );
}
