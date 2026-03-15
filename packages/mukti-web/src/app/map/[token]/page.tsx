'use client';

/**
 * Public Thought Map viewer
 *
 * A read-only, unauthenticated view of a shared Thought Map.
 * Fetches the map via share token (public endpoint — no auth required),
 * then renders a static React Flow canvas using the same custom node types
 * as the authenticated ThoughtMapCanvas but without any Zustand store,
 * dialogue panels, or interactive editing features.
 *
 * Route: /map/[token]
 *
 * @requirements RFC-0003 Phase 5 — Map Sharing
 */

import '@xyflow/react/dist/style.css';
import {
  Background,
  BackgroundVariant,
  type EdgeTypes,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  type Edge as RFEdge,
  type Node as RFNode,
} from '@xyflow/react';
import { Brain, ExternalLink, Lock } from 'lucide-react';
import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';

import type { ThoughtMapNode, ThoughtMapWithNodes } from '@/types/thought-map';

import { ThoughtMapEdge } from '@/components/thought-map/edges/ThoughtMapEdge';
import { InsightNode } from '@/components/thought-map/nodes/InsightNode';
import { QuestionNode } from '@/components/thought-map/nodes/QuestionNode';
import { ThoughtNode } from '@/components/thought-map/nodes/ThoughtNode';
import { TopicNode } from '@/components/thought-map/nodes/TopicNode';
import { thoughtMapApi } from '@/lib/api/thought-map';
import { cn } from '@/lib/utils';
import { computeThoughtMapLayout } from '@/lib/utils/thought-map-layout';

// ============================================================================
// Custom node / edge type registrations (read-only — no interactive callbacks)
// ============================================================================

const nodeTypes: NodeTypes = {
  'insight-node': InsightNode as unknown as NodeTypes[string],
  'question-node': QuestionNode as unknown as NodeTypes[string],
  'thought-node': ThoughtNode as unknown as NodeTypes[string],
  'topic-node': TopicNode as unknown as NodeTypes[string],
};

const edgeTypes: EdgeTypes = {
  'thought-map-edge': ThoughtMapEdge as unknown as EdgeTypes[string],
};

// ============================================================================
// Types
// ============================================================================

interface PublicMapPageProps {
  params: Promise<{ token: string }>;
}

// ============================================================================
// Page Component (Export)
// ============================================================================

/**
 * Public Thought Map viewer page
 * Resolves async Next.js 15 params and renders the static canvas
 */
export default function PublicMapPage({ params }: PublicMapPageProps) {
  const { token } = use(params);

  return <PublicMapContent token={token} />;
}

// ============================================================================
// Internal Components (Alphabetical)
// ============================================================================

/**
 * Error state for invalid / expired share links
 */
function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-6 bg-stone-50 px-4 dark:bg-stone-950">
      <div className="rounded-full bg-destructive/10 p-5">
        <Lock className="h-10 w-10 text-destructive" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-semibold text-stone-800 dark:text-stone-100">
          Map Unavailable
        </h1>
        <p className="mt-2 max-w-sm text-sm text-stone-500 dark:text-stone-400">{message}</p>
      </div>
      <Link
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium',
          'border-stone-200 bg-white text-stone-700 shadow-sm',
          'hover:bg-stone-50 hover:border-stone-300',
          'dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200',
          'dark:hover:bg-stone-800 dark:hover:border-stone-600',
          'transition-colors duration-150'
        )}
        href="/"
      >
        Go to Mukti
      </Link>
    </div>
  );
}

/**
 * Minimal loading state while fetching the shared map
 */
function LoadingState() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-stone-50 dark:bg-stone-950">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600 dark:border-stone-700 dark:border-t-stone-300" />
        <span className="text-sm text-stone-500 dark:text-stone-400">Loading shared map…</span>
      </div>
    </div>
  );
}

/**
 * Main content — fetches shared map data and renders the canvas
 */
function PublicMapContent({ token }: { token: string }) {
  const [mapData, setMapData] = useState<null | ThoughtMapWithNodes>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<null | string>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchMap = async () => {
      try {
        const data = await thoughtMapApi.getSharedMap(token);
        if (!cancelled) {
          setMapData(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'This map is no longer available or has expired.';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchMap();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !mapData) {
    return <ErrorState message={error ?? 'This map is no longer available or has expired.'} />;
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-stone-50 dark:bg-stone-950">
      <PublicMapHeader title={mapData.map.title} />

      {/* Canvas — pushed down by header (48px) */}
      <div className="absolute inset-0 top-[49px]">
        <ReactFlowProvider>
          <StaticMapCanvas nodes={mapData.nodes} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}

/**
 * Public map header — minimal, Japandi, shows title + Mukti attribution
 */
function PublicMapHeader({ title }: { title: string }) {
  return (
    <div
      className={cn(
        'absolute left-0 right-0 top-0 z-10',
        'flex items-center justify-between px-5 py-3',
        'bg-white/80 backdrop-blur-sm dark:bg-stone-950/80',
        'border-b border-stone-100 dark:border-stone-800'
      )}
    >
      {/* Map title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="shrink-0 rounded-md bg-stone-100 p-1.5 dark:bg-stone-800">
          <Brain className="h-4 w-4 text-stone-600 dark:text-stone-400" />
        </div>
        <span className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
          {title}
        </span>
      </div>

      {/* Mukti attribution */}
      <Link
        className={cn(
          'ml-4 shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium',
          'border border-stone-200 bg-stone-50 text-stone-600',
          'hover:bg-stone-100 hover:border-stone-300 hover:text-stone-800',
          'dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400',
          'dark:hover:bg-stone-800 dark:hover:border-stone-600 dark:hover:text-stone-200',
          'transition-colors duration-150'
        )}
        href="/"
        rel="noopener noreferrer"
        target="_blank"
      >
        Mukti
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/** Map each domain node type to the correct React Flow custom node type key */
function resolveNodeType(type: ThoughtMapNode['type']): string {
  switch (type) {
    case 'insight':
      return 'insight-node';
    case 'question':
      return 'question-node';
    case 'topic':
      return 'topic-node';
    default:
      // 'branch' | 'leaf' | 'thought'
      return 'thought-node';
  }
}

/**
 * Read-only React Flow canvas for the shared thought map.
 *
 * No Zustand store, no editing, no AI suggestions.
 * Applies the same radial layout algorithm as the authenticated canvas.
 * Nodes are rendered via the same custom node components, but onAddBranch
 * and onSuggestBranches are no-ops (context menus will open but actions are
 * effectively disabled — future improvement: hide menus in read-only mode).
 */
function StaticMapCanvas({ nodes }: { nodes: ThoughtMapNode[] }) {
  // Build React Flow nodes using the layout algorithm
  const flowNodes = useMemo<RFNode[]>(() => {
    const layoutPositions = computeThoughtMapLayout(nodes);

    // No-op callbacks — this is a read-only viewer
    const noop = () => undefined;

    return nodes.map((n) => {
      const layoutPos = layoutPositions[n.nodeId];
      const position = layoutPos ?? n.position;
      const type = resolveNodeType(n.type);

      return {
        data: { node: n, onAddBranch: noop, onSuggestBranches: noop },
        id: n.nodeId,
        position,
        type,
      } satisfies RFNode;
    });
  }, [nodes]);

  // Build React Flow edges from parent-child relationships
  const flowEdges = useMemo<RFEdge[]>(() => {
    return nodes
      .filter((n): n is ThoughtMapNode & { parentNodeId: string } => n.parentNodeId !== null)
      .map((n) => ({
        id: `edge-${n.parentNodeId}-${n.nodeId}`,
        source: n.parentNodeId,
        target: n.nodeId,
        type: 'thought-map-edge',
      }));
  }, [nodes]);

  return (
    <ReactFlow
      className={cn(
        '[&_.react-flow__background]:!bg-stone-50',
        'dark:[&_.react-flow__background]:!bg-stone-950'
      )}
      edges={flowEdges}
      edgeTypes={edgeTypes}
      elementsSelectable={false}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      maxZoom={2}
      minZoom={0.2}
      nodes={flowNodes}
      nodesConnectable={false}
      nodesDraggable={false}
      nodeTypes={nodeTypes}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="oklch(0.82 0.01 60)" gap={32} size={1} variant={BackgroundVariant.Dots} />
    </ReactFlow>
  );
}
