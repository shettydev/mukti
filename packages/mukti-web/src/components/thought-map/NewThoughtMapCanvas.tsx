'use client';

/**
 * NewThoughtMapCanvas — creation canvas for the `/maps/new` route.
 *
 * Renders an empty React Flow canvas with a single EditableTopicNode at the
 * centre. The user types their starting thought directly into the node.
 * On commit (Enter or blur), the map is created via the Zustand store and
 * the URL transitions to `/maps/{id}` via `router.replace`.
 *
 * A FloatingIntentSelector overlay lets the user optionally pick a thinking
 * intent (defaults to "explore").
 */

import '@xyflow/react/dist/style.css';
import {
  Background,
  BackgroundVariant,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ThinkingIntent } from '@/types/thought-map';

import { useThoughtMapStore } from '@/lib/stores/thought-map-store';
import { cn } from '@/lib/utils';

import { EditableTopicNode } from './nodes/EditableTopicNode';

// ============================================================================
// Node type registration (creation canvas only)
// ============================================================================

const creationNodeTypes: NodeTypes = {
  'editable-topic-node': EditableTopicNode as unknown as NodeTypes[string],
};

// ============================================================================
// Types
// ============================================================================

type CreationPhase = 'created' | 'creating' | 'editing';

// ============================================================================
// Public export
// ============================================================================

export function NewThoughtMapCanvas() {
  return (
    <ReactFlowProvider>
      <NewThoughtMapCanvasInner />
    </ReactFlowProvider>
  );
}

// ============================================================================
// Inner canvas (needs ReactFlowProvider parent)
// ============================================================================

function NewThoughtMapCanvasInner() {
  const router = useRouter();
  const createMap = useThoughtMapStore((s) => s.createMap);
  const setThinkingIntent = useThoughtMapStore((s) => s.setThinkingIntent);

  const [phase, setPhase] = useState<CreationPhase>('editing');
  const [intent, setIntent] = useState<ThinkingIntent>('explore');
  const [error, setError] = useState<null | string>(null);

  const handleCommit = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        setError('Please enter a starting thought.');
        return;
      }

      setError(null);
      setPhase('creating');
      setThinkingIntent(intent);

      try {
        const map = await createMap({ title: trimmed });
        if (map) {
          setPhase('created');
          router.replace(`/maps/${map.id}`);
        } else {
          toast.error('Failed to create Thought Map. Please try again.');
          setPhase('editing');
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to create Thought Map. Please try again.'
        );
        setPhase('editing');
      }
    },
    [createMap, intent, router, setThinkingIntent]
  );

  const nodes = useMemo(
    () => [
      {
        data: {
          error,
          intent,
          isCreating: phase === 'creating',
          onCommit: handleCommit,
          onIntentChange: setIntent,
        },
        id: 'editable-topic',
        position: { x: 0, y: 0 },
        type: 'editable-topic-node',
      },
    ],
    [error, handleCommit, intent, phase]
  );

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        className={cn(
          'rounded-xl',
          '[&_.react-flow__background]:!bg-stone-50',
          'dark:[&_.react-flow__background]:!bg-stone-950'
        )}
        fitView
        fitViewOptions={{ padding: 0.5 }}
        maxZoom={1.5}
        minZoom={0.5}
        nodes={nodes}
        nodesConnectable={false}
        nodesDraggable={false}
        nodeTypes={creationNodeTypes}
        proOptions={{ hideAttribution: true }}
        zoomOnDoubleClick={false}
      >
        <Background
          color="oklch(0.82 0.01 60)"
          gap={32}
          size={1}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>
    </div>
  );
}
