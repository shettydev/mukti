'use client';

/**
 * NodeChatPanel component
 *
 * Main chat panel for node dialogues. Integrates DialogueHeader,
 * message list, and ChatInput with resizable panel functionality.
 *
 * @requirements 1.1 - Open chat panel focused on selected node
 * @requirements 5.1 - Switch to node's dialogue when selected
 * @requirements 5.3 - Update panel to show newly selected node's content
 * @requirements 7.1 - Resizable panel by dragging edge
 * @requirements 7.2 - Min/max width constraints
 * @requirements 7.3 - Canvas expands when panel closed
 */

import { GripVertical, Lightbulb, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

import type { CanvasNode } from '@/types/canvas-visualization.types';

import { Button } from '@/components/ui/button';
import { useDialogueStream, useNodeMessages, useSendNodeMessage } from '@/lib/hooks/use-dialogue';
import {
  MAX_PANEL_WIDTH,
  MIN_PANEL_WIDTH,
  useChatActions,
  usePanelWidth,
} from '@/lib/stores/chat-store';
import { cn } from '@/lib/utils';

import { ChatInput } from './chat-input';
import { ChatMessage } from './chat-message';
import { DialogueHeader } from './dialogue-header';

// ============================================================================
// Types
// ============================================================================

/**
 * Data for creating an insight node
 * @property label - The insight label/content
 * @property parentNodeId - ID of the parent node
 */
export interface InsightNodeData {
  label: string;
  parentNodeId: string;
}

/**
 * Props for NodeChatPanel component
 * @property onClose - Callback when panel is closed
 * @property onInsightCreate - Callback when user creates an insight node
 * @property selectedNode - Currently selected canvas node
 * @property sessionId - Canvas session ID
 */
export interface NodeChatPanelProps {
  onClose: () => void;
  onInsightCreate?: (insight: InsightNodeData) => void;
  selectedNode: CanvasNode | null;
  sessionId: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * NodeChatPanel - Main chat panel for node dialogues
 *
 * Features:
 * - Resizable panel with drag handle
 * - DialogueHeader showing node context
 * - Scrollable message list
 * - ChatInput for sending messages
 * - "Create Insight" button
 * - Loading states and error handling
 *
 * @example
 * ```tsx
 * <NodeChatPanel
 *   sessionId="session-123"
 *   selectedNode={selectedNode}
 *   onClose={() => setSelectedNode(null)}
 *   onInsightCreate={(insight) => createInsightNode(insight)}
 * />
 * ```
 */
export function NodeChatPanel({
  onClose,
  onInsightCreate,
  selectedNode,
  sessionId,
}: NodeChatPanelProps) {
  const panelWidth = usePanelWidth();
  const { setPanelWidth } = useChatActions();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Fetch messages for selected node
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
  } = useNodeMessages(sessionId, selectedNode?.id ?? '', !!selectedNode);

  // Send message mutation
  const { isPending: isSending, mutate: sendMessage } = useSendNodeMessage(
    sessionId,
    selectedNode?.id ?? ''
  );

  // Subscribe to SSE stream for real-time updates
  const { isProcessing, processingStatus } = useDialogueStream(
    sessionId,
    selectedNode?.id ?? '',
    !!selectedNode
  );

  // Flatten paginated messages
  const messages = messagesData?.pages.flatMap((page) => page.messages) ?? [];
  const messageCount = messagesData?.pages[0]?.dialogue.messageCount ?? 0;
  const hasHistory = messages.length > 0;

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  /**
   * Handle sending a message
   */
  const handleSend = useCallback(
    (content: string) => {
      sendMessage({ content });
    },
    [sendMessage]
  );

  /**
   * Handle starting a dialogue
   * Sends an initial message to trigger the AI to generate a Socratic opening question
   */
  const handleStartDialogue = useCallback(() => {
    if (!selectedNode) {
      return;
    }

    // Send an initial message to start the Socratic dialogue
    // The AI will respond with a thought-provoking question based on the node content
    const nodeType = selectedNode.type as string;
    let initialMessage = '';

    switch (nodeType) {
      case 'insight':
        initialMessage = "Let's develop this insight further.";
        break;
      case 'root':
        initialMessage = "I want to question this assumption.";
        break;
      case 'seed':
        initialMessage = "I'd like to explore this problem more deeply.";
        break;
      case 'soil':
        initialMessage = "Help me examine this context/constraint.";
        break;
      default:
        initialMessage = "Let's explore this together.";
    }

    sendMessage({ content: initialMessage });
  }, [selectedNode, sendMessage]);

  /**
   * Handle creating an insight node
   * Opens the InsightNodeDialog via the onInsightCreate callback
   */
  const handleCreateInsight = useCallback(() => {
    if (!selectedNode || !onInsightCreate) {
      return;
    }

    // Trigger the dialog by passing empty label - the dialog will collect the actual label
    onInsightCreate({
      label: '', // Empty label - the InsightNodeDialog will collect the actual label
      parentNodeId: selectedNode.id,
    });
  }, [selectedNode, onInsightCreate]);

  /**
   * Handle resize drag start
   */
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  /**
   * Handle resize drag
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !panelRef.current) {
        return;
      }

      const panelRect = panelRef.current.getBoundingClientRect();
      const newWidth = panelRect.right - e.clientX;

      // Clamp width between min and max
      const clampedWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, newWidth));
      setPanelWidth(clampedWidth);
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
  }, [setPanelWidth]);

  // Don't render if no node selected
  if (!selectedNode) {
    return null;
  }

  return (
    <div
      className={cn(
        'absolute right-0 top-0 z-20 flex h-full flex-col',
        'border-l bg-background shadow-lg'
      )}
      ref={panelRef}
      style={{ width: panelWidth }}
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

      {/* Header with close button */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">Socratic Dialogue</h3>
        <Button onClick={onClose} size="icon" variant="ghost">
          <X className="h-4 w-4" />
          <span className="sr-only">Close panel</span>
        </Button>
      </div>

      {/* Dialogue header with node context */}
      <div className="px-4 pt-4">
        <DialogueHeader
          hasHistory={hasHistory}
          messageCount={messageCount}
          node={selectedNode}
          onStartDialogue={handleStartDialogue}
        />
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4">
        {/* Load more button */}
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
        {isLoadingMessages && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!isLoadingMessages && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No dialogue yet. Start exploring this node!
            </p>
          </div>
        )}

        {/* Messages list */}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{processingStatus || 'Processing...'}</span>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Create insight button */}
      {hasHistory && onInsightCreate && (
        <div className="border-t px-4 py-2">
          <Button
            className="w-full gap-2"
            onClick={handleCreateInsight}
            size="sm"
            variant="outline"
          >
            <Lightbulb className="h-4 w-4" />
            Create Insight Node
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t px-4 py-4">
        <ChatInput
          disabled={!selectedNode}
          isLoading={isSending || isProcessing}
          onSend={handleSend}
          placeholder={getPlaceholder(selectedNode)}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get placeholder text based on node type
 */
function getPlaceholder(node: CanvasNode): string {
  const nodeType = node.type as string;
  switch (nodeType) {
    case 'insight':
      return 'Develop this insight...';
    case 'root':
      return 'Explore this assumption...';
    case 'seed':
      return 'Examine the problem...';
    case 'soil':
      return 'Question this constraint...';
    default:
      return 'Share your thoughts...';
  }
}
