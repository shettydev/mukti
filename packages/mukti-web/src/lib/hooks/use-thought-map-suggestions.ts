'use client';

/**
 * Hook for AI branch suggestions on Thought Map nodes
 *
 * Manages the full suggestion lifecycle:
 * 1. POST to enqueue a suggestion job
 * 2. Open SSE stream to receive suggestions in real time
 * 3. Add received suggestions as ghost nodes in the Zustand store
 * 4. Auto-dismiss ghost nodes after 60 seconds
 * 5. Handle cold-start: auto-suggest when canvas has ≤1 real node + user idle 10s
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { BranchSuggestionEvent } from '@/lib/api/thought-map';

import { thoughtMapApi } from '@/lib/api/thought-map';
import { useAuthStore } from '@/lib/stores/auth-store';
import {
  type GhostNode,
  useThoughtMapActions,
  useThoughtMapStore,
} from '@/lib/stores/thought-map-store';

// ============================================================================
// Constants
// ============================================================================

/** Auto-dismiss ghost nodes after this many milliseconds */
const GHOST_AUTO_DISMISS_MS = 60_000;

/** Cold-start idle timeout before triggering auto-suggest (ms) */
const COLD_START_IDLE_MS = 10_000;

/** Max real nodes to still trigger cold-start auto-suggest */
const COLD_START_MAX_NODES = 1;

/** Poll interval for suggestion job status */
const SUGGESTION_POLL_MS = 500;

// ============================================================================
// Types
// ============================================================================

export interface SuggestionStreamState {
  error: Error | null;
  isStreaming: boolean;
}

/**
 * Converts a GhostNode into props for the QuestionNode React Flow node.
 * Returns a unique React Flow id based on ghostId.
 */
export function ghostNodeToFlowNodeId(ghost: GhostNode): string {
  return `ghost-${ghost.ghostId}`;
}

// ============================================================================
// useThoughtMapSuggestions
// ============================================================================

/**
 * Cold-start auto-suggest: fires when canvas has ≤1 real node and user is idle 10s.
 * Triggers suggestions on the root topic node.
 * Should be mounted once at the canvas level.
 *
 * @param mapId - Thought Map ID
 * @param rootNodeId - nodeId of the root topic node
 * @param enabled - Whether cold-start is active (e.g., disabled while dialogue open)
 */
export function useColdStartSuggestions(mapId: string, rootNodeId: string, enabled = true) {
  const nodes = useThoughtMapStore((state) => state.nodes);
  const ghostNodes = useThoughtMapStore((state) => state.ghostNodes);
  const { addGhostNode } = useThoughtMapActions();
  const accessToken = useAuthStore((state) => state.accessToken);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasFiredRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimer();
    let cleanupPolling: (() => void) | null = null;

    if (!enabled || !accessToken || !mapId || !rootNodeId) {
      return;
    }

    const realNodeCount = Object.keys(nodes).length;
    const hasGhosts = Object.keys(ghostNodes).length > 0;

    // Only fire once per canvas load and only when conditions met
    if (hasFiredRef.current || realNodeCount > COLD_START_MAX_NODES || hasGhosts) {
      return;
    }

    timerRef.current = setTimeout(async () => {
      if (hasFiredRef.current) {
        return;
      }

      hasFiredRef.current = true;

      try {
        const { jobId } = await thoughtMapApi.requestSuggestions(mapId, {
          parentNodeId: rootNodeId,
        });

        cleanupPolling = startSuggestionPolling(mapId, jobId, (event) => {
          if (event.type === 'suggestion') {
            const s = event.data as {
              label: string;
              parentId: string;
              suggestedType: 'question' | 'thought';
            };
            addGhostNode({
              label: s.label,
              parentId: s.parentId,
              suggestedType: s.suggestedType,
            });
          }
        });
      } catch {
        // Cold-start failures are silent — never block the user
      }
    }, COLD_START_IDLE_MS);

    return () => {
      clearTimer();
      cleanupPolling?.();
    };
  }, [enabled, accessToken, mapId, rootNodeId, nodes, ghostNodes, addGhostNode, clearTimer]);

  // Reset fired flag when map changes
  useEffect(() => {
    hasFiredRef.current = false;
  }, [mapId]);
}

// ============================================================================
// useGhostNodeAutoDismiss
// ============================================================================

/**
 * Auto-dismisses ghost nodes after GHOST_AUTO_DISMISS_MS (60 seconds).
 * Should be mounted once at the canvas level.
 */
export function useGhostNodeAutoDismiss() {
  const { removeGhostNode } = useThoughtMapActions();
  const ghostNodes = useThoughtMapStore((state) => state.ghostNodes);

  useEffect(() => {
    const entries = Object.values(ghostNodes);
    if (entries.length === 0) {
      return;
    }

    const now = Date.now();
    const timers: NodeJS.Timeout[] = [];

    for (const ghost of entries) {
      const elapsed = now - ghost.createdAt;
      const remaining = GHOST_AUTO_DISMISS_MS - elapsed;

      if (remaining <= 0) {
        // Already expired — dismiss immediately
        removeGhostNode(ghost.ghostId);
      } else {
        const timer = setTimeout(() => {
          removeGhostNode(ghost.ghostId);
        }, remaining);
        timers.push(timer);
      }
    }

    return () => {
      for (const t of timers) {
        clearTimeout(t);
      }
    };
  }, [ghostNodes, removeGhostNode]);
}

// ============================================================================
// useColdStartSuggestions
// ============================================================================

/**
 * Hook that manages the branch suggestion flow for a given Thought Map node.
 *
 * @param mapId - Thought Map ID
 * @param parentNodeId - Node to generate suggestions from
 * @returns trigger function + streaming state
 *
 * @example
 * ```typescript
 * const { requestSuggestions, isStreaming } = useThoughtMapSuggestions(mapId, 'topic-0');
 * <button onClick={requestSuggestions}>Suggest Branches</button>
 * ```
 */
export function useThoughtMapSuggestions(mapId: string, parentNodeId: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { addGhostNode } = useThoughtMapActions();

  const cleanupRef = useRef<(() => void) | null>(null);
  const isUnmountedRef = useRef(false);

  const [state, setState] = useState<SuggestionStreamState>({
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

  const requestSuggestions = useCallback(
    async (model?: string) => {
      if (!accessToken || !mapId || !parentNodeId) {
        return;
      }

      // Close any existing stream for this node before opening a new one
      cleanupRef.current?.();
      cleanupRef.current = null;

      setState({ error: null, isStreaming: true });

      try {
        const { jobId } = await thoughtMapApi.requestSuggestions(mapId, {
          model,
          parentNodeId,
        });

        cleanupRef.current = startSuggestionPolling(mapId, jobId, handleEvent, handleError);
      } catch (err) {
        if (!isUnmountedRef.current) {
          setState({
            error: err instanceof Error ? err : new Error('Failed to request suggestions'),
            isStreaming: false,
          });
        }
        return;
      }

      // Open SSE stream
      function handleEvent(event: BranchSuggestionEvent) {
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
            break;
          }

          case 'suggestion': {
            const s = event.data as {
              label: string;
              parentId: string;
              suggestedType: 'question' | 'thought';
            };
            addGhostNode({
              label: s.label,
              parentId: s.parentId,
              suggestedType: s.suggestedType,
            });
            break;
          }

          default:
            break;
        }
      }

      function handleError() {
        if (!isUnmountedRef.current) {
          setState((prev) => ({ ...prev, isStreaming: false }));
        }
      }
    },
    [accessToken, mapId, parentNodeId, addGhostNode]
  );

  return { ...state, requestSuggestions };
}

// ============================================================================
// ghostNodeToFlowNode helper (re-exported for canvas use)
// ============================================================================

function startSuggestionPolling(
  mapId: string,
  jobId: string,
  onEvent: (event: BranchSuggestionEvent) => void,
  onError?: (error: Error) => void
): () => void {
  let cancelled = false;
  let timeoutId: NodeJS.Timeout | null = null;

  const scheduleNext = () => {
    if (cancelled) {
      return;
    }
    timeoutId = setTimeout(() => {
      void poll();
    }, SUGGESTION_POLL_MS);
  };

  const poll = async () => {
    if (cancelled) {
      return;
    }

    try {
      const status = await thoughtMapApi.getSuggestionJobStatus(mapId, jobId);

      if (cancelled) {
        return;
      }

      if (
        status.state === 'waiting' ||
        status.state === 'delayed' ||
        status.state === 'prioritized' ||
        status.state === 'active'
      ) {
        scheduleNext();
        return;
      }

      if (status.state === 'failed') {
        onEvent({
          data: {
            code: 'SUGGESTION_ERROR',
            message: 'Suggestion job failed',
            retriable: true,
          },
          type: 'error',
        });
        return;
      }

      if (status.state === 'completed') {
        const suggestions = status.result?.suggestions ?? [];

        for (const suggestion of suggestions) {
          onEvent({
            data: suggestion,
            type: 'suggestion',
          });
        }

        onEvent({
          data: {
            jobId,
            suggestionCount: suggestions.length,
          },
          type: 'complete',
        });
        return;
      }

      scheduleNext();
    } catch (error) {
      if (!cancelled) {
        onError?.(error instanceof Error ? error : new Error('Failed to poll suggestion status'));
      }
    }
  };

  void poll();

  return () => {
    cancelled = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}
