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
 * - Shows a "Start Dialogue" button to initiate the first Socratic question
 * - No "Create Insight" button (Thought Maps don't have insight nodes)
 * - Node type icon + label shown in dialogue header
 */

import {
  GitBranch,
  GripVertical,
  Leaf,
  Loader2,
  MessageSquare,
  Network,
  Play,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import type { ThoughtMapNode, ThoughtMapNodeType } from '@/types/thought-map';

import { LoadingMessage } from '@/components/conversations/loading-message';
import { Badge } from '@/components/ui/badge';
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

/**
 * Display configuration for Thought Map node types.
 * Maps each node type to its icon, label, and color for the dialogue header.
 */
const NODE_TYPE_CONFIG: Record<
  ThoughtMapNodeType,
  { color: string; icon: typeof Network; label: string }
> = {
  branch: { color: 'text-blue-600', icon: GitBranch, label: 'Branch' },
  insight: { color: 'text-purple-500', icon: Network, label: 'Insight' },
  leaf: { color: 'text-emerald-600', icon: Leaf, label: 'Leaf' },
  question: { color: 'text-amber-500', icon: MessageSquare, label: 'Question' },
  thought: { color: 'text-slate-500', icon: Network, label: 'Thought' },
  topic: { color: 'text-green-600', icon: Network, label: 'Topic' },
};

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
 * On mount it fetches existing messages. If no dialogue history exists,
 * a "Start Dialogue" button is shown (matching the Thinking Canvas UX).
 * Clicking the button calls `startDialogue` which creates the NodeDialogue
 * and returns an initial Socratic question.
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
  const { isPending: isStarting, mutate: startDialogue } = useStartThoughtMapDialogue(
    mapId,
    node.nodeId
  );

  // Fetch paginated messages — always enabled so we can detect existing history
  // and show the "Start Dialogue" button when no messages exist.
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
  } = useThoughtMapNodeMessages(mapId, node.nodeId, true);

  // Send message mutation
  const { isPending: isSending, mutate: sendMessage } = useSendThoughtMapMessage(
    mapId,
    node.nodeId
  );

  // SSE stream subscription
  const { isProcessing, processingStatus } = useThoughtMapDialogueStream(mapId, node.nodeId, true);

  // Flatten pages
  const messages = messagesData?.pages.flatMap((page) => page.messages) ?? [];
  const messageCount = messagesData?.pages[0]?.dialogue?.messageCount ?? 0;
  const hasDialogue = messagesData?.pages[0]?.dialogue != null;
  const hasHistory = messages.length > 0;
  const nodeConfig = NODE_TYPE_CONFIG[node.type] ?? NODE_TYPE_CONFIG.topic;
  const NodeIcon = nodeConfig.icon;

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
        </div>
        <Button className="ml-2 shrink-0" onClick={onClose} size="icon" variant="ghost">
          <X className="h-4 w-4" />
          <span className="sr-only">Close dialogue panel</span>
        </Button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4">
        {/* Dialogue header — node type, label, count, and start button */}
        <div className="flex flex-col gap-3 border-b pb-4 pt-4">
          {/* Node type indicator and message count */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <NodeIcon className={cn('h-4 w-4', nodeConfig.color)} />
              <span className="text-sm font-medium">{nodeConfig.label}</span>
            </div>

            {messageCount > 0 && (
              <Badge className="gap-1" variant="secondary">
                <MessageSquare className="h-3 w-3" />
                {messageCount}
              </Badge>
            )}
          </div>

          {/* Node label */}
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm leading-relaxed">{node.label}</p>
          </div>

          {/* Start dialogue button — shown when no dialogue exists */}
          {!hasDialogue && !isStarting && !isLoadingMessages && (
            <Button className="w-full gap-2" onClick={() => startDialogue()} variant="default">
              <Play className="h-4 w-4" />
              Start Dialogue
            </Button>
          )}

          {/* Loading state for start mutation in-flight */}
          {isStarting && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Starting dialogue…</span>
            </div>
          )}

          {/* Generating state — dialogue created, AI producing initial question */}
          {!isStarting && hasDialogue && !hasHistory && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Generating initial question…</span>
            </div>
          )}

          {/* Continue hint — shown when history exists */}
          {hasHistory && (
            <p className="text-xs text-muted-foreground">
              Continue exploring this {nodeConfig.label.toLowerCase()} below
            </p>
          )}
        </div>
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

        {/* Loading messages spinner */}
        {isLoadingMessages && messages.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
        {isProcessing && <LoadingMessage status={processingStatus ?? 'Mukti is thinking...'} />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-4">
        <ChatInput
          disabled={isStarting || !hasHistory}
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
