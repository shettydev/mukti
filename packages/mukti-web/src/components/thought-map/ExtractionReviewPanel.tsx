'use client';

/**
 * ExtractionReviewPanel — shown after the SSE preview event arrives.
 *
 * Displays a summary of the extracted draft Thought Map (central topic,
 * branch count, node count) and offers two actions:
 *   - "Open Map"  → calls confirmDraftMap() then navigates to the map canvas
 *   - "Discard"   → calls resetExtraction()
 *
 * Mounted in ConversationDetail when extractionState === 'preview'.
 */

import { CheckCircle2, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useExtractionState, useThoughtMapActions } from '@/lib/stores/thought-map-store';

export function ExtractionReviewPanel() {
  const router = useRouter();
  const { draftMap } = useExtractionState();
  const { confirmDraftMap, resetExtraction } = useThoughtMapActions();

  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<null | string>(null);

  const handleConfirm = useCallback(async () => {
    if (!draftMap) {
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);

    const confirmed = await confirmDraftMap();

    setIsConfirming(false);

    if (confirmed) {
      router.push(`/dashboard/map/${confirmed.id}`);
    } else {
      setConfirmError('Could not confirm the map. Please try again.');
    }
  }, [draftMap, confirmDraftMap, router]);

  const handleDiscard = useCallback(() => {
    resetExtraction();
  }, [resetExtraction]);

  if (!draftMap) {
    return null;
  }

  const { map, nodes } = draftMap;
  // Count only non-topic nodes for the summary
  const branchCount = nodes.filter((n) => n.depth === 1).length;
  const totalNodes = nodes.length - 1; // exclude root topic

  return (
    <div className="mx-4 mb-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Map ready for review</p>
          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1" title={map.title}>
            {map.title}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {branchCount} branch{branchCount !== 1 ? 'es' : ''} · {totalNodes} node
            {totalNodes !== 1 ? 's' : ''}
          </p>

          {confirmError && <p className="mt-2 text-xs text-destructive">{confirmError}</p>}

          <div className="mt-3 flex items-center gap-2">
            <Button disabled={isConfirming} onClick={handleConfirm} size="sm">
              {isConfirming ? (
                <>
                  <Loader2 aria-hidden="true" className="mr-2 h-3 w-3 animate-spin" />
                  Opening…
                </>
              ) : (
                'Open Map'
              )}
            </Button>
            <Button disabled={isConfirming} onClick={handleDiscard} size="sm" variant="ghost">
              Discard
            </Button>
          </div>
        </div>

        <button
          aria-label="Dismiss extraction preview"
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
          disabled={isConfirming}
          onClick={handleDiscard}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
