'use client';

/**
 * VisualizeAsMapButton — triggers the conversation → Thought Map extraction flow.
 *
 * Renders a button with three states:
 * - idle: "Visualize as Map" with a network/brain icon
 * - streaming: "Extracting…" with a spinner
 * - error: "Retry" with an error tooltip
 *
 * On click, calls useThoughtMapExtraction.triggerExtraction().
 * The parent is responsible for rendering ExtractionReviewPanel when
 * extractionState === 'preview'.
 */

import { Loader2, Network } from 'lucide-react';
import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { useThoughtMapExtraction } from '@/lib/hooks/use-thought-map-extraction';

interface VisualizeAsMapButtonProps {
  /** Extra CSS classes for the button */
  className?: string;
  conversationId: string;
  /** Optional model override */
  model?: string;
}

export function VisualizeAsMapButton({
  className,
  conversationId,
  model,
}: VisualizeAsMapButtonProps) {
  const { error, isStreaming, triggerExtraction } = useThoughtMapExtraction(conversationId);

  const handleClick = useCallback(() => {
    void triggerExtraction(model);
  }, [triggerExtraction, model]);

  if (isStreaming) {
    return (
      <Button className={className} disabled size="sm" variant="outline">
        <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
        Extracting…
      </Button>
    );
  }

  return (
    <Button
      aria-label={error ? 'Retry map extraction' : 'Visualize conversation as a Thought Map'}
      className={className}
      onClick={handleClick}
      size="sm"
      title={error ? `Extraction failed: ${error.message}. Click to retry.` : undefined}
      variant={error ? 'destructive' : 'outline'}
    >
      <Network aria-hidden="true" className="mr-2 h-4 w-4" />
      {error ? 'Retry extraction' : 'Visualize as Map'}
    </Button>
  );
}
