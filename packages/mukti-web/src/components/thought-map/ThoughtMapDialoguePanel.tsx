'use client';

/**
 * ThoughtMapDialoguePanel component
 *
 * Socratic dialogue panel for a Thought Map node.
 * Positioned as an absolute overlay on the right side of the canvas,
 * mirroring the NodeChatPanel UX from the Thinking Canvas.
 *
 * Key differences from NodeChatPanel:
 * - Calls `/thought-maps/:mapId/nodes/:nodeId/` API endpoints
 * - Calls the dedicated `start` endpoint on mount to seed the initial question
 * - No "Create Insight" button (Thought Maps don't have insight nodes)
 * - Node label shown in header instead of node type badge
 */

import { GripVertical, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import type { ThoughtMapNode } from '@/types/thought-map';

import { Button } from '@/components/ui/button';
import {
  useSendThoughtMapMessage,
  useStartThoughtMapDialogue,
  useThoughtMapDialogueStream,
  useThoughtMapNodeMessages,
} from '@/lib/hooks/use-thought-map-dialogue';
import { useAiStore } from '@/lib/stores/ai-store';
import { cn } from '@/lib/utils';

import { ChatInput } from '../canvas/chat/chat-input';
import { ChatMessage } from '../canvas/chat/chat-message';

// ============================================================================
// Constants
// ============================================================================

const MIN_PANEL_WIDTH = 280;
const MAX_PANEL_WIDTH = 560;
const DEFAULT_PANEL_WIDTH = 360;

// ============================================================================
// Types
// ============================================================================

export interface ThoughtMapDialoguePanelProps {
  /** The Thought Map ID */
  mapId: string;
  /** The selected Thought Map node */
  node: ThoughtMapNode;
  /** Callback when the panel is closed */
  onClose: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ThoughtMapDialoguePanel - Per-node Socratic dialogue for Thought Maps.
 *
 * On mount it calls `startDialogue` which either:
 * - Creates the NodeDialogue + returns an initial Socratic question (first open), or
 * - Returns the existing dialogue if messages already exist.
 *
 * @example
 * ```tsx
 * {selectedNode && (
 *   <ThoughtMapDialoguePanel
 *     mapId={mapId}
 *     node={selectedNode}
 *     onClose={() => setSelectedNode(null)}
 *   />
 * )}
 * ```
 */
export function ThoughtMapDialoguePanel({ mapId, node, onClose }: ThoughtMapDialoguePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const panelWidthRef = useRef(DEFAULT_PANEL_WIDTH);

  const activeModel = useAiStore((state) => state.activeModel);

  // Start/load dialogue (seeds initial question on first open)
  const {
    isPending: isStarting,
    isSuccess: hasStarted,
    mutate: startDialogue,
  } = useStartThoughtMapDialogue(mapId, node.nodeId);

  // Fetch paginated messages — gated on startDialogue completion to prevent
  // a race condition where the query fetches the same initial message that
  // the mutation just seeded into the cache, causing duplicates.
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
  } = useThoughtMapNodeMessages(mapId, node.nodeId, hasStarted);

  // Send message mutation
  const { isPending: isSending, mutate: sendMessage } = useSendThoughtMapMessage(
    mapId,
    node.nodeId
  );

  // SSE stream subscription
  const { isProcessing, processingStatus } = useThoughtMapDialogueStream(mapId, node.nodeId, true);

  // Start dialogue on mount (or when node changes)
  useEffect(() => {
    startDialogue();
  }, [mapId, node.nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flatten pages
  const messages = messagesData?.pages.flatMap((page) => page.messages) ?? [];
  const messageCount = messagesData?.pages[0]?.dialogue?.messageCount ?? 0;

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ---- Send handler -----------------------------------------------------------

  const handleSend = useCallback(
    (content: string) => {
      sendMessage({ content, model: activeModel ?? undefined });
    },
    [activeModel, sendMessage]
  );

  // ---- Resize drag handlers ---------------------------------------------------

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !panelRef.current) {
        return;
      }

      const panelRect = panelRef.current.getBoundingClientRect();
      const newWidth = panelRect.right - e.clientX;
      const clamped = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, newWidth));

      panelRef.current.style.width = `${clamped}px`;
      panelWidthRef.current = clamped;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // ---- Render -----------------------------------------------------------------

  return (
    <div
      className={cn(
        'absolute right-0 top-0 z-20 flex h-full flex-col',
        'border-l bg-background shadow-lg'
      )}
      ref={panelRef}
      style={{ width: DEFAULT_PANEL_WIDTH }}
    >
      {/* Resize handle */}
      <div
        className={cn(
          'absolute -left-1 top-0 z-30 flex h-full w-2 cursor-col-resize items-center',
          'hover:bg-primary/10'
        )}
        onMouseDown={handleDragStart}
      >
        <GripVertical className="h-6 w-6 text-muted-foreground/50" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Socratic Dialogue
          </p>
          <h3 className="truncate text-sm font-semibold" title={node.label}>
            {node.label}
          </h3>
        </div>
        <Button className="ml-2 shrink-0" onClick={onClose} size="icon" variant="ghost">
          <X className="h-4 w-4" />
          <span className="sr-only">Close dialogue panel</span>
        </Button>
      </div>

      {/* Message count badge */}
      {messageCount > 0 && (
        <div className="border-b px-4 py-2">
          <span className="text-xs text-muted-foreground">
            {messageCount} message{messageCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4">
        {/* Load older messages */}
        {hasNextPage && (
          <div className="py-2 text-center">
            <Button
              disabled={isFetchingNextPage}
              onClick={() => fetchNextPage()}
              size="sm"
              variant="ghost"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load older messages'
              )}
            </Button>
          </div>
        )}

        {/* Loading state */}
        {(isLoadingMessages || isStarting) && messages.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state — shown only after start has resolved with no messages */}
        {!isLoadingMessages && !isStarting && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Starting Socratic dialogue for this node…
            </p>
          </div>
        )}

        {/* Messages list — reuses the canvas ChatMessage component */}
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={{
              content: message.content,
              dialogueId: message.dialogueId,
              id: message.id,
              metadata: message.metadata,
              role: message.role,
              sequence: message.sequence,
              timestamp: message.timestamp,
            }}
          />
        ))}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{processingStatus ?? 'Processing…'}</span>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-4">
        <ChatInput
          disabled={isStarting}
          isLoading={isSending || isProcessing}
          onSend={handleSend}
          placeholder={getPlaceholder(node.type)}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getPlaceholder(nodeType: ThoughtMapNode['type']): string {
  switch (nodeType) {
    case 'branch':
      return 'Develop this branch of thought…';
    case 'leaf':
      return 'Dig deeper into this idea…';
    case 'topic':
      return 'Explore the central question…';
    default:
      return 'Share your thoughts…';
  }
}
