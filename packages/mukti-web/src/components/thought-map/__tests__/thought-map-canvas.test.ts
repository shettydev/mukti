import type { GhostNode } from '@/lib/stores/thought-map-store';
import type { ThoughtMapNode } from '@/types/thought-map';

import {
  computeThoughtMapLayout,
  GHOST_VERTICAL_SPACING,
  HORIZONTAL_SPACING,
} from '@/lib/utils/thought-map-layout';

import { toFlowNodes, toGhostFlowNodes } from '../ThoughtMapCanvas';

jest.mock('@xyflow/react/dist/style.css', () => ({}));

const createNode = (overrides: Partial<ThoughtMapNode>): ThoughtMapNode => ({
  createdAt: new Date().toISOString(),
  depth: 1,
  fromSuggestion: false,
  id: `id-${overrides.nodeId ?? 'node'}`,
  isCollapsed: false,
  isExplored: false,
  label: 'Node',
  mapId: 'map-1',
  messageCount: 0,
  nodeId: 'node',
  parentNodeId: 'topic-0',
  position: { x: 0, y: 0 },
  type: 'branch',
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('ThoughtMapCanvas helpers', () => {
  it('marks persisted question nodes as non-ghost nodes', () => {
    const topic = createNode({
      depth: 0,
      nodeId: 'topic-0',
      parentNodeId: null,
      type: 'topic',
    });
    const question = createNode({
      depth: 1,
      label: 'What evidence supports this?',
      nodeId: 'question-1',
      parentNodeId: 'topic-0',
      type: 'question',
    });

    const layoutPositions = computeThoughtMapLayout([topic, question]);
    const flowNodes = toFlowNodes([topic, question], layoutPositions, jest.fn(), jest.fn());
    const persistedQuestion = flowNodes.find((node) => node.id === 'question-1');

    expect(persistedQuestion).toBeDefined();
    expect(persistedQuestion?.data).toMatchObject({ isGhost: false });
  });

  it('anchors ghost suggestions to the displayed parent position', () => {
    const topic = createNode({
      depth: 0,
      nodeId: 'topic-0',
      parentNodeId: null,
      type: 'topic',
    });
    const parent = createNode({
      depth: 1,
      label: 'Branch',
      nodeId: 'branch-1',
      parentNodeId: 'topic-0',
      position: { x: 0, y: 0 },
      type: 'branch',
    });

    const ghost: GhostNode = {
      createdAt: Date.now(),
      ghostId: 'ghost-1',
      label: 'Suggested question',
      parentId: 'branch-1',
      suggestedType: 'question',
    };

    const layoutPositions = computeThoughtMapLayout([topic, parent]);
    const displayedParent = layoutPositions[parent.nodeId] ?? parent.position;
    const ghostNodes = toGhostFlowNodes(
      [ghost],
      { [parent.nodeId]: parent, [topic.nodeId]: topic },
      layoutPositions,
      jest.fn(),
      jest.fn()
    );

    expect(ghostNodes[0]?.position).toEqual({
      x: displayedParent.x + (displayedParent.x < 0 ? -HORIZONTAL_SPACING : HORIZONTAL_SPACING),
      y: displayedParent.y,
    });
    expect(ghostNodes[0]?.data).toMatchObject({ isGhost: true });
  });

  it('stages ghost suggestions independently per parent', () => {
    const topic = createNode({
      depth: 0,
      nodeId: 'topic-0',
      parentNodeId: null,
      type: 'topic',
    });
    const leftParent = createNode({
      depth: 1,
      label: 'Left branch',
      nodeId: 'branch-left',
      parentNodeId: 'topic-0',
      type: 'branch',
    });
    const rightParent = createNode({
      depth: 1,
      label: 'Right branch',
      nodeId: 'branch-right',
      parentNodeId: 'topic-0',
      type: 'branch',
    });

    const ghosts: GhostNode[] = [
      {
        createdAt: Date.now(),
        ghostId: 'ghost-left',
        label: 'Left suggestion',
        parentId: 'branch-left',
        suggestedType: 'question',
      },
      {
        createdAt: Date.now(),
        ghostId: 'ghost-right',
        label: 'Right suggestion',
        parentId: 'branch-right',
        suggestedType: 'question',
      },
      {
        createdAt: Date.now(),
        ghostId: 'ghost-left-2',
        label: 'Second left suggestion',
        parentId: 'branch-left',
        suggestedType: 'question',
      },
    ];

    const layoutPositions = computeThoughtMapLayout([topic, leftParent, rightParent]);
    const leftPosition = layoutPositions[leftParent.nodeId] ?? leftParent.position;
    const rightPosition = layoutPositions[rightParent.nodeId] ?? rightParent.position;
    const flowGhosts = toGhostFlowNodes(
      ghosts,
      {
        [leftParent.nodeId]: leftParent,
        [rightParent.nodeId]: rightParent,
        [topic.nodeId]: topic,
      },
      layoutPositions,
      jest.fn(),
      jest.fn()
    );

    // Ghosts are grouped by parent: left ghosts [0,1] then right ghost [2].
    // centredYPositions(2, leftY, 150) → [leftY - 75, leftY + 75]
    // centredYPositions(1, rightY, 150) → [rightY]
    const halfGhostSpacing = GHOST_VERTICAL_SPACING / 2;
    expect(flowGhosts[0]?.position.y).toBe(leftPosition.y - halfGhostSpacing);
    expect(flowGhosts[1]?.position.y).toBe(leftPosition.y + halfGhostSpacing);
    expect(flowGhosts[2]?.position.y).toBe(rightPosition.y);
  });
});
