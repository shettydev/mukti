'use client';

/**
 * ThoughtMapToolbar component
 *
 * Floating toolbar panel for the Thought Map canvas. Provides:
 * - Zoom In / Zoom Out / Fit View controls (via useReactFlow)
 * - "Add Branch" button (enabled when any node is selected)
 * - "View Conversation" link (shown when the map was extracted from a conversation)
 * - "Share" button — opens ShareMapDialog
 * - "Auto-suggest" toggle — updates map settings inline
 *
 * Positioned as a floating card over the canvas (absolute, bottom-left).
 * Japandi aesthetic: warm stone surface, minimal icons, calm transitions.
 */

import { useReactFlow } from '@xyflow/react';
import {
  GitBranch,
  Maximize2,
  MessageSquare,
  Minus,
  Plus,
  Share2,
  Zap,
  ZapOff,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';

import { ShareMapDialog } from '@/components/thought-map/ShareMapDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useThoughtMap, useThoughtMapActions } from '@/lib/stores/thought-map-store';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ThoughtMapToolbarProps {
  /** Whether the selected node can have a branch added */
  canAddBranch: boolean;
  /** Called when "Add Branch" is clicked */
  onAddBranch: () => void;
  /** nodeId of the currently selected node, or null */
  selectedNodeId: null | string;
  /** If set, shows a "View Conversation" link back to the source conversation */
  sourceConversationId?: string;
}

interface ToolbarButtonProps {
  'aria-label': string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  tooltip: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ThoughtMapToolbar - Floating action panel for the Thought Map canvas
 *
 * Uses `useReactFlow()` hook — must be rendered inside a `ReactFlowProvider`.
 * Renders zoom controls, context-aware "Add Branch", Share, and Settings toggle.
 *
 * @param selectedNodeId - Currently selected node ID (or null)
 * @param canAddBranch - Whether the selected node supports adding children
 * @param onAddBranch - Callback when "Add Branch" is triggered
 */
export function ThoughtMapToolbar({
  canAddBranch,
  onAddBranch,
  selectedNodeId,
  sourceConversationId,
}: ThoughtMapToolbarProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const map = useThoughtMap();
  const { updateSettings } = useThoughtMapActions();

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isTogglingAutoSuggest, setIsTogglingAutoSuggest] = useState(false);

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

  const handleFitView = useCallback(() => {
    fitView({ duration: 300, padding: 0.15 });
  }, [fitView]);

  const handleToggleAutoSuggest = useCallback(async () => {
    if (!map || isTogglingAutoSuggest) {
      return;
    }

    setIsTogglingAutoSuggest(true);
    await updateSettings({ autoSuggestEnabled: !map.settings.autoSuggestEnabled });
    setIsTogglingAutoSuggest(false);
  }, [map, isTogglingAutoSuggest, updateSettings]);

  const autoSuggestEnabled = map?.settings.autoSuggestEnabled ?? true;

  return (
    <>
      <div
        aria-label="Thought map controls"
        className={cn(
          // Floating card — positioned by parent canvas wrapper
          'flex items-center gap-1 rounded-xl border',
          'border-stone-200 bg-white/90 px-2 py-1.5 shadow-lg backdrop-blur-sm',
          'dark:border-stone-700 dark:bg-stone-900/90'
        )}
        role="toolbar"
      >
        {/* Zoom controls */}
        <ToolbarButton
          aria-label="Zoom in"
          onClick={handleZoomIn}
          title="Zoom in"
          tooltip="Zoom in for a closer look at this map."
        >
          <Plus className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          aria-label="Zoom out"
          onClick={handleZoomOut}
          title="Zoom out"
          tooltip="Zoom out to see more of the map at once."
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          aria-label="Fit view"
          onClick={handleFitView}
          title="Fit view"
          tooltip="Center and fit the full thought map in view."
        >
          <Maximize2 className="h-4 w-4" />
        </ToolbarButton>

        {/* Divider */}
        <div
          aria-hidden="true"
          className="mx-1 h-5 w-px rounded-full bg-stone-200 dark:bg-stone-700"
        />

        {/* Add Branch — enabled only when a compatible node is selected */}
        <ToolbarTooltip
          content={
            selectedNodeId
              ? 'Create a new branch from the selected node.'
              : 'Select a node first, then add a branch from it.'
          }
        >
          <span className="inline-flex">
            <button
              aria-label="Add branch to selected node"
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium',
                'transition-all duration-150',
                canAddBranch && selectedNodeId
                  ? [
                      'bg-stone-800 text-stone-50 shadow-sm',
                      'hover:bg-stone-700',
                      'dark:bg-stone-200 dark:text-stone-900',
                      'dark:hover:bg-stone-300',
                    ]
                  : 'cursor-not-allowed bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-600'
              )}
              disabled={!canAddBranch || !selectedNodeId}
              onClick={onAddBranch}
              title={!selectedNodeId ? 'Select a node first' : 'Add branch'}
            >
              <GitBranch className="h-3.5 w-3.5" />
              Add Branch
            </button>
          </span>
        </ToolbarTooltip>

        {/* Auto-suggest toggle — Phase 5 */}
        {map && (
          <>
            <div
              aria-hidden="true"
              className="mx-1 h-5 w-px rounded-full bg-stone-200 dark:bg-stone-700"
            />
            <ToolbarButton
              aria-label={autoSuggestEnabled ? 'Disable auto-suggest' : 'Enable auto-suggest'}
              className={cn(
                autoSuggestEnabled
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-stone-400 dark:text-stone-500'
              )}
              disabled={isTogglingAutoSuggest}
              onClick={handleToggleAutoSuggest}
              title={
                autoSuggestEnabled
                  ? 'Auto-suggest on — click to disable'
                  : 'Auto-suggest off — click to enable'
              }
              tooltip={
                autoSuggestEnabled
                  ? 'Turn off AI branch suggestions for this map.'
                  : 'Turn on AI branch suggestions for this map.'
              }
            >
              {autoSuggestEnabled ? (
                <Zap className="h-4 w-4 fill-current" />
              ) : (
                <ZapOff className="h-4 w-4" />
              )}
            </ToolbarButton>
          </>
        )}

        {/* Share button — Phase 5 */}
        {map && (
          <ToolbarButton
            aria-label="Share map"
            onClick={() => setShareDialogOpen(true)}
            title="Share this map"
            tooltip="Create or manage a public share link for this map."
          >
            <Share2 className="h-4 w-4" />
          </ToolbarButton>
        )}

        {/* View Conversation — shown only for maps extracted from a conversation */}
        {sourceConversationId && (
          <>
            <div
              aria-hidden="true"
              className="mx-1 h-5 w-px rounded-full bg-stone-200 dark:bg-stone-700"
            />
            <ToolbarTooltip content="Open the conversation this map was extracted from.">
              <Link
                aria-label="View source conversation"
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium',
                  'text-stone-600 transition-colors duration-150',
                  'hover:bg-stone-100 hover:text-stone-800',
                  'dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-100'
                )}
                href={`/chat/${sourceConversationId}`}
                title="View the conversation this map was extracted from"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                View Conversation
              </Link>
            </ToolbarTooltip>
          </>
        )}
      </div>

      {/* Share dialog — Phase 5 */}
      <ShareMapDialog onOpenChange={setShareDialogOpen} open={shareDialogOpen} />
    </>
  );
}

// ============================================================================
// Subcomponents
// ============================================================================

function ToolbarButton({
  'aria-label': ariaLabel,
  children,
  className,
  disabled,
  onClick,
  title,
  tooltip,
}: ToolbarButtonProps) {
  return (
    <ToolbarTooltip content={tooltip}>
      <span className="inline-flex">
        <button
          aria-label={ariaLabel}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-stone-600 dark:text-stone-300',
            'transition-colors duration-150',
            disabled
              ? 'cursor-not-allowed opacity-30'
              : [
                  'hover:bg-stone-100 hover:text-stone-800',
                  'dark:hover:bg-stone-700 dark:hover:text-stone-100',
                ],
            className
          )}
          disabled={disabled}
          onClick={onClick}
          title={title}
        >
          {children}
        </button>
      </span>
    </ToolbarTooltip>
  );
}

function ToolbarTooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
