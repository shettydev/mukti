'use client';

/**
 * QuestionNode component for Thought Map canvas
 *
 * Renders both ghost (AI-suggested) and accepted question nodes.
 *
 * Ghost state:
 * - Dashed border, muted opacity, Sparkles badge, Accept/Dismiss buttons on hover
 * - Countdown background sweep (60s auto-dismiss window)
 * - "Ink solidifies" acceptance animation:
 *   1. Buttons fade out → badge fades up → SVG ink stroke draws around border → card fades out
 *   2. After 500ms, onAccept() fires so the real node appears in its place
 *
 * Accepted state (fromSuggestion && createdAt within 2s):
 * - Spring entrance: scale 0.94→1, opacity 0.5→1
 * - Respects prefers-reduced-motion (skips all animations, fires onAccept immediately)
 */

import { Handle, Position } from '@xyflow/react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Sparkles, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ThoughtMapNode } from '@/types/thought-map';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

/** Must match GHOST_AUTO_DISMISS_MS in use-thought-map-suggestions.ts */
const GHOST_AUTO_DISMISS_MS = 60_000;

/** How recently a node must have been created to play the entrance animation */
const ENTRANCE_ANIMATION_WINDOW_MS = 2_000;

// ============================================================================
// Types
// ============================================================================

/**
 * Data passed to QuestionNode via React Flow's custom node API
 */
export interface QuestionNodeData {
  /**
   * Date.now() timestamp when the ghost was created.
   * Drives the ghost countdown background. Only meaningful when isGhost is true.
   */
  ghostCreatedAt?: number;
  isGhost?: boolean;
  node: ThoughtMapNode;
  onAccept?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDismiss?: (nodeId: string) => void;
  /** Which hemisphere this node sits in — drives handle placement for correct edge routing */
  side?: 'left' | 'right';
}

/**
 * Props for the QuestionNode component (React Flow custom node props shape)
 */
export interface QuestionNodeProps {
  data: QuestionNodeData;
  selected?: boolean;
}

interface AcceptedQuestionNodeProps {
  node: ThoughtMapNode;
  onDeleteNode?: (nodeId: string) => void;
  selected?: boolean;
  side: 'left' | 'right';
}

interface GhostNodeProps {
  ghostCreatedAt?: number;
  node: ThoughtMapNode;
  onAccept?: (nodeId: string) => void;
  onDismiss?: (nodeId: string) => void;
  selected?: boolean;
  side: 'left' | 'right';
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * QuestionNode — React Flow custom node for AI-suggested questions
 *
 * Routes to GhostNode (isGhost=true) or AcceptedQuestionNode (isGhost=false).
 *
 * @param data - Node data including callbacks and node metadata
 * @param selected - Whether the node is currently selected in React Flow
 */
export function QuestionNode({ data, selected }: QuestionNodeProps) {
  const {
    ghostCreatedAt,
    isGhost = false,
    node,
    onAccept,
    onDeleteNode,
    onDismiss,
    side = 'right',
  } = data;

  if (isGhost) {
    return (
      <GhostNode
        ghostCreatedAt={ghostCreatedAt}
        node={node}
        onAccept={onAccept}
        onDismiss={onDismiss}
        selected={selected}
        side={side}
      />
    );
  }

  return (
    <AcceptedQuestionNode node={node} onDeleteNode={onDeleteNode} selected={selected} side={side} />
  );
}

// ============================================================================
// QuestionNode — public export (orchestrates ghost vs accepted state)
// ============================================================================

function AcceptedQuestionNode({ node, onDeleteNode, selected, side }: AcceptedQuestionNodeProps) {
  const prefersReducedMotion = useReducedMotion();

  const handleDelete = useCallback(() => {
    onDeleteNode?.(node.nodeId);
  }, [node.nodeId, onDeleteNode]);

  // Only play entrance animation for nodes accepted within the last 2 seconds
  const isNew =
    !prefersReducedMotion &&
    Date.now() - new Date(node.createdAt).getTime() < ENTRANCE_ANIMATION_WINDOW_MS;

  const nodeContent = (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'relative min-w-[160px] max-w-[240px] cursor-default rounded-xl border p-4',
        'transition-colors duration-200',
        'bg-stone-50 dark:bg-stone-800',
        'border-stone-200 shadow-md shadow-stone-200/60 dark:border-stone-700 dark:shadow-stone-900/40',
        selected &&
          'border-stone-400 ring-2 ring-slate-300/30 ring-offset-2 ring-offset-background dark:border-stone-500',
        !selected && 'hover:border-stone-300 dark:hover:border-stone-600'
      )}
      initial={isNew ? { opacity: 0.5, scale: 0.94 } : false}
      transition={isNew ? { damping: 20, stiffness: 280, type: 'spring' } : undefined}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-stone-400 dark:text-stone-500" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
          Question
        </span>
      </div>

      <p className="text-sm font-medium leading-snug text-stone-700 dark:text-stone-200">
        {node.label}
      </p>

      <NodeHandles isGhost={false} side={side} />
    </motion.div>
  );

  if (!onDeleteNode) {
    return nodeContent;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{nodeContent}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-[160px]">
        <ContextMenuItem inset={false} onClick={handleDelete}>
          <Trash2 className="h-4 w-4 text-red-500" />
          <span className="text-red-600 dark:text-red-400">Delete</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ============================================================================
// GhostNode — ink-solidifies acceptance animation
// ============================================================================

/**
 * Subtle animated background sweep for a ghost card.
 * Slides horizontally from right → left over the 60s auto-dismiss window.
 * Respects prefers-reduced-motion: shows a plain text countdown instead.
 */
function GhostCountdownBackground({ createdAt, hovered }: { createdAt: number; hovered: boolean }) {
  const { progress, reducedMotion, secondsLeft } = useGhostCountdown(createdAt);
  const translateX = Math.min(progress * 100, 100);

  if (reducedMotion) {
    return (
      <span
        aria-label={`Suggestion dismisses in ${secondsLeft} seconds`}
        className={cn(
          'absolute bottom-2 right-3 z-10 text-[9px] tabular-nums text-stone-400 dark:text-stone-500',
          'transition-opacity duration-150',
          hovered ? 'opacity-40' : 'opacity-70'
        )}
      >
        {secondsLeft}s
      </span>
    );
  }

  return (
    <div
      aria-label={`Suggestion dismisses in ${secondsLeft} seconds`}
      className={cn(
        'pointer-events-none absolute inset-[1px] overflow-hidden rounded-[11px]',
        'transition-opacity duration-150',
        hovered ? 'opacity-45' : 'opacity-70'
      )}
      data-testid="ghost-countdown-background"
    >
      <div className="absolute inset-0 bg-slate-200/15 dark:bg-slate-500/10" />
      <div
        className="absolute inset-y-0 right-0 w-full bg-gradient-to-l from-slate-300/40 via-slate-200/25 to-transparent dark:from-slate-500/25 dark:via-slate-400/15 dark:to-transparent"
        style={{ transform: `translateX(-${translateX}%)`, transition: 'transform 0.25s linear' }}
      />
    </div>
  );
}

// ============================================================================
// AcceptedQuestionNode — spring entrance for freshly accepted nodes
// ============================================================================

function GhostNode({ ghostCreatedAt, node, onAccept, onDismiss, selected, side }: GhostNodeProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodeSize, setNodeSize] = useState<null | { h: number; w: number }>(null);

  // Measure node dimensions after mount for the SVG overlay
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const { offsetHeight, offsetWidth } = containerRef.current;
    if (offsetWidth > 0 && offsetHeight > 0) {
      setNodeSize({ h: offsetHeight, w: offsetWidth });
    }
  }, []);

  const handleAccept = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (prefersReducedMotion) {
        onAccept?.(node.nodeId);
        return;
      }
      setIsAccepting(true);
      // Delay actual acceptance until ink animation completes
      setTimeout(() => onAccept?.(node.nodeId), 500);
    },
    [node.nodeId, onAccept, prefersReducedMotion]
  );

  const handleDismiss = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDismiss?.(node.nodeId);
    },
    [node.nodeId, onDismiss]
  );

  const borderRadius = 12; // matches rounded-xl (12px)
  const svgPadding = 2; // inset to sit just on top of the border

  return (
    <motion.div
      animate={isAccepting ? { opacity: 0 } : { opacity: 1 }}
      className={cn(
        'relative min-w-[160px] max-w-[240px] cursor-default rounded-xl border p-4',
        'transition-colors duration-200',
        'border-dashed bg-stone-50/60 dark:bg-stone-800/50',
        'border-slate-300 shadow-sm shadow-slate-200/40 dark:border-slate-600 dark:shadow-slate-900/20',
        (selected || hovered) && 'opacity-100',
        selected &&
          'border-slate-400 ring-2 ring-slate-300/30 ring-offset-2 ring-offset-background dark:border-slate-500',
        !selected && 'hover:border-slate-400 dark:hover:border-slate-500'
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      ref={containerRef}
      style={isAccepting ? { opacity: 0.7 } : { opacity: hovered || selected ? 1 : 0.7 }}
      transition={isAccepting ? { delay: 0.46, duration: 0.12 } : undefined}
    >
      {/* Countdown background — ghost nodes only */}
      {ghostCreatedAt !== undefined && (
        <GhostCountdownBackground createdAt={ghostCreatedAt} hovered={hovered} />
      )}

      {/* Ink stroke SVG overlay — draws around border on accept */}
      {nodeSize && !prefersReducedMotion && (
        <svg
          className={cn(
            'pointer-events-none absolute text-stone-500 dark:text-stone-400',
            'overflow-visible'
          )}
          fill="none"
          height={nodeSize.h + svgPadding * 2}
          style={{ left: -svgPadding, top: -svgPadding, zIndex: 10 }}
          width={nodeSize.w + svgPadding * 2}
        >
          <motion.path
            animate={isAccepting ? { pathLength: 1 } : { pathLength: 0 }}
            d={roundedRectPath(
              nodeSize.w + svgPadding * 2,
              nodeSize.h + svgPadding * 2,
              borderRadius + svgPadding
            )}
            initial={{ pathLength: 0 }}
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth={2}
            transition={isAccepting ? { duration: 0.46, ease: 'easeInOut' } : { duration: 0 }}
          />
        </svg>
      )}

      {/* "Suggestion" badge — fades out when accepting */}
      <motion.div
        animate={isAccepting ? { opacity: 0, y: -6 } : { opacity: 1, y: 0 }}
        className="mb-2 flex items-center gap-1.5"
        transition={isAccepting ? { duration: 0.18 } : undefined}
      >
        <Sparkles className="h-3 w-3 text-slate-400 dark:text-slate-500" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Suggestion
        </span>
      </motion.div>

      {/* Question label */}
      <p className="text-sm font-medium leading-snug text-stone-600 dark:text-stone-300">
        {node.label}
      </p>

      {/* Accept / Dismiss buttons — fade out immediately when accepting */}
      <motion.div
        animate={isAccepting ? { opacity: 0 } : { opacity: hovered || selected ? 1 : 0 }}
        className="mt-3 flex items-center gap-2"
        transition={{ duration: 0.15 }}
      >
        <button
          aria-label="Accept suggestion"
          className={cn(
            'flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium',
            'border-emerald-200 bg-emerald-50 text-emerald-600',
            'hover:bg-emerald-100',
            'dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-400',
            'transition-colors duration-150'
          )}
          onClick={handleAccept}
        >
          <Check className="h-3 w-3" />
          Accept
        </button>
        <button
          aria-label="Dismiss suggestion"
          className={cn(
            'flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium',
            'border-stone-200 bg-stone-50 text-stone-500',
            'hover:bg-stone-100',
            'dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400',
            'transition-colors duration-150'
          )}
          onClick={handleDismiss}
        >
          <X className="h-3 w-3" />
          Dismiss
        </button>
      </motion.div>

      <NodeHandles isGhost side={side} />
    </motion.div>
  );
}

// ============================================================================
// NodeHandles — side-aware React Flow handles
// ============================================================================

function NodeHandles({ isGhost, side }: { isGhost: boolean; side: 'left' | 'right' }) {
  const handleClass = cn(
    '!h-2.5 !w-2.5',
    isGhost
      ? '!border-slate-300 !bg-slate-200 dark:!border-slate-600 dark:!bg-slate-700'
      : '!border-stone-300 !bg-stone-200 dark:!border-stone-600 dark:!bg-stone-700'
  );

  if (side === 'left') {
    return (
      <>
        <Handle className={handleClass} id="target-right" position={Position.Right} type="target" />
        <Handle className={handleClass} id="source-left" position={Position.Left} type="source" />
      </>
    );
  }

  return (
    <>
      <Handle className={handleClass} id="target-left" position={Position.Left} type="target" />
      <Handle className={handleClass} id="source-right" position={Position.Right} type="source" />
    </>
  );
}

// ============================================================================
// GhostCountdownBackground
// ============================================================================

/**
 * Generates an SVG path string for a rounded rectangle.
 * Required because <motion.path> supports pathLength animation; <rect> does not.
 */
function roundedRectPath(w: number, h: number, r: number): string {
  return [
    `M ${r} 0`,
    `L ${w - r} 0`,
    `Q ${w} 0 ${w} ${r}`,
    `L ${w} ${h - r}`,
    `Q ${w} ${h} ${w - r} ${h}`,
    `L ${r} ${h}`,
    `Q 0 ${h} 0 ${h - r}`,
    `L 0 ${r}`,
    `Q 0 0 ${r} 0`,
    'Z',
  ].join(' ');
}

// ============================================================================
// useGhostCountdown
// ============================================================================

/**
 * Drives the countdown background for a ghost node.
 * Polls at 250ms for a smooth drain without excessive re-renders.
 *
 * @returns progress (0→1), secondsLeft (integer), reducedMotion flag
 */
function useGhostCountdown(createdAt: number | undefined) {
  const [progress, setProgress] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  useEffect(() => {
    if (!createdAt) {
      return;
    }

    const tick = () => {
      const elapsed = Date.now() - createdAt;
      const clamped = Math.min(elapsed, GHOST_AUTO_DISMISS_MS);
      setProgress(clamped / GHOST_AUTO_DISMISS_MS);
      setSecondsLeft(Math.max(0, Math.ceil((GHOST_AUTO_DISMISS_MS - clamped) / 1000)));
    };

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [createdAt]);

  return { progress, reducedMotion, secondsLeft };
}
