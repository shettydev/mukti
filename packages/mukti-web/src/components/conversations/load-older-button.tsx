/**
 * Button component for loading older archived messages
 */

'use client';

import { ChevronUp, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface LoadOlderButtonProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoad: () => void;
}

export function LoadOlderButton({
  hasMore,
  isLoading,
  onLoad,
}: LoadOlderButtonProps) {
  if (!hasMore) {
    return null;
  }

  return (
    <div className="flex justify-center py-4">
      <Button
        className="gap-2"
        disabled={isLoading}
        onClick={onLoad}
        size="sm"
        variant="outline"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading older messages...
          </>
        ) : (
          <>
            <ChevronUp className="h-4 w-4" />
            Load older messages
          </>
        )}
      </Button>
    </div>
  );
}
