'use client';

/**
 * Hook for the conversation → Thought Map extraction flow
 *
 * Manages the full extraction lifecycle:
 * 1. POST to enqueue the extraction job
 * 2. Open SSE stream to receive the draft map preview in real time
 * 3. Store the draft map in Zustand (extractionState = 'preview')
 * 4. User reviews → calls confirmDraftMap() to finalize
 * 5. On confirm, the map transitions to 'active' and is loaded into the canvas
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ExtractionStreamEvent } from '@/types/thought-map';

import { thoughtMapApi } from '@/lib/api/thought-map';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useThoughtMapActions } from '@/lib/stores/thought-map-store';

// ============================================================================
// Types
// ============================================================================

export interface ExtractionFlowState {
  error: Error | null;
  isStreaming: boolean;
}

// ============================================================================
// useThoughtMapExtraction
// ============================================================================

/**
 * Manages the full conversation → Thought Map extraction flow.
 *
 * @param conversationId - The conversation to extract a Thought Map from
 * @returns trigger function + current streaming/error state
 *
 * @example
 * ```typescript
 * const { startExtraction, isStreaming, error } = useThoughtMapExtraction(conversationId);
 * <button onClick={() => startExtraction()}>Visualize as Map</button>
 * ```
 */
export function useThoughtMapExtraction(conversationId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { resetExtraction, setExtractionPreview, startExtraction } = useThoughtMapActions();

  const cleanupRef = useRef<(() => void) | null>(null);
  const isUnmountedRef = useRef(false);

  const [state, setState] = useState<ExtractionFlowState>({
    error: null,
    isStreaming: false,
  });

  // Clean up SSE on unmount
  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  const triggerExtraction = useCallback(
    async (model?: string) => {
      if (!accessToken || !conversationId) {
        return;
      }

      // Close any existing extraction stream
      cleanupRef.current?.();
      cleanupRef.current = null;

      setState({ error: null, isStreaming: true });

      // Enqueue the extraction job
      let jobId: string;
      try {
        const result = await thoughtMapApi.extractConversation({
          conversationId,
          model,
        });
        jobId = result.jobId;
      } catch (err) {
        if (!isUnmountedRef.current) {
          setState({
            error: err instanceof Error ? err : new Error('Failed to start extraction'),
            isStreaming: false,
          });
        }
        return;
      }

      // Update store with the job ID
      startExtraction(jobId);

      // Open SSE stream
      function handleEvent(event: ExtractionStreamEvent) {
        if (isUnmountedRef.current) {
          return;
        }

        switch (event.type) {
          case 'complete':
            setState({ error: null, isStreaming: false });
            break;

          case 'error': {
            const errData = event.data as { message: string };
            setState({ error: new Error(errData.message), isStreaming: false });
            resetExtraction();
            break;
          }

          case 'preview':
            // Store the draft map — the UI will show the review panel
            setExtractionPreview(event.data);
            setState({ error: null, isStreaming: false });
            break;

          default:
            break;
        }
      }

      function handleError() {
        if (!isUnmountedRef.current) {
          setState((prev) => ({ ...prev, isStreaming: false }));
          resetExtraction();
        }
      }

      cleanupRef.current = thoughtMapApi.streamExtraction(
        jobId,
        accessToken,
        handleEvent,
        handleError
      );
    },
    [accessToken, conversationId, startExtraction, setExtractionPreview, resetExtraction]
  );

  return { ...state, triggerExtraction };
}
