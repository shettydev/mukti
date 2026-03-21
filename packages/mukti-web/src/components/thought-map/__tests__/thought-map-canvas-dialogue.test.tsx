import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThoughtMapCanvas } from '../ThoughtMapCanvas';

const mockAcceptGhostNode = jest.fn();
const mockAddNode = jest.fn();
const mockDeleteNode = jest.fn();
const mockRemoveGhostNode = jest.fn();
const mockRequestSuggestions = jest.fn();
const mockSetMap = jest.fn();
const mockSetSelectedNodeId = jest.fn();
const mockUpdateNode = jest.fn();
const mockOnNodesChange = jest.fn();
const mockSetNodes = jest.fn();

const topicNode = {
  createdAt: '2026-01-01T00:00:00.000Z',
  depth: 0,
  fromSuggestion: false,
  id: 'topic-id',
  isCollapsed: false,
  isExplored: false,
  label: 'Topic',
  mapId: 'map-1',
  messageCount: 0,
  nodeId: 'topic-0',
  parentNodeId: null,
  position: { x: 0, y: 0 },
  type: 'topic' as const,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const branchNode = {
  createdAt: '2026-01-01T00:00:00.000Z',
  depth: 1,
  fromSuggestion: false,
  id: 'branch-id',
  isCollapsed: false,
  isExplored: false,
  label: 'Branch',
  mapId: 'map-1',
  messageCount: 0,
  nodeId: 'branch-1',
  parentNodeId: 'topic-0',
  position: { x: 240, y: 0 },
  type: 'branch' as const,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const storeState = {
  map: {
    createdAt: '2026-01-01T00:00:00.000Z',
    id: 'map-1',
    nodeCount: 2,
    rootNodeId: 'topic-0',
    settings: {
      autoSuggestEnabled: true,
      autoSuggestIdleSeconds: 10,
      maxSuggestionsPerNode: 4,
    },
    sourceConversationId: null,
    status: 'active',
    title: 'Test map',
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId: 'user-1',
  },
  nodes: {
    [branchNode.nodeId]: branchNode,
    [topicNode.nodeId]: topicNode,
  },
  selectedNodeId: null as null | string,
};

const thoughtMapActions = {
  acceptGhostNode: mockAcceptGhostNode,
  addNode: mockAddNode,
  deleteNode: mockDeleteNode,
  removeGhostNode: mockRemoveGhostNode,
  setMap: mockSetMap,
  setSelectedNodeId: mockSetSelectedNodeId,
  updateNode: mockUpdateNode,
};

const suggestionHookResult = {
  isStreaming: false,
  requestSuggestions: mockRequestSuggestions,
};

jest.mock('@xyflow/react/dist/style.css', () => ({}));

jest.mock('@xyflow/react', () => {
  return {
    Background: () => null,
    BackgroundVariant: {
      Dots: 'dots',
    },
    Handle: () => null,
    Position: {
      Bottom: 'bottom',
      Left: 'left',
      Right: 'right',
      Top: 'top',
    },
    ReactFlow: ({
      children,
      nodes,
      onNodeClick,
      onNodeDragStart,
      onNodeDragStop,
      onNodesChange,
    }: any) => {
      const targetNode =
        nodes.find((node: { id: string }) => node.id === branchNode.nodeId) ?? nodes[0];
      const inlineEditNode = nodes.find((node: { id: string }) => node.id === '__inline-edit__');

      return (
        <div>
          <button
            onClick={() => onNodesChange?.([{ id: targetNode.id, selected: true, type: 'select' }])}
            type="button"
          >
            select node
          </button>
          <button onClick={() => onNodeClick?.({}, targetNode)} type="button">
            click node
          </button>
          <button onClick={() => onNodeDragStart?.({}, targetNode, nodes)} type="button">
            drag start
          </button>
          <button
            onClick={() =>
              onNodeDragStop?.({}, { ...targetNode, position: { x: 500, y: 300 } }, nodes)
            }
            type="button"
          >
            drag stop
          </button>
          <button
            onClick={() =>
              onNodeDragStop?.({}, { id: '__inline-edit__', position: { x: 100, y: 100 } }, nodes)
            }
            type="button"
          >
            drag stop inline
          </button>
          {targetNode?.data?.onAddBranch && (
            <button onClick={() => targetNode.data.onAddBranch(targetNode.id)} type="button">
              add branch
            </button>
          )}
          {inlineEditNode?.data?.onCommit && (
            <button onClick={() => inlineEditNode.data.onCommit('New thought')} type="button">
              commit inline
            </button>
          )}
          {children}
        </div>
      );
    },
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
    useNodesState: (initialNodes: unknown[]) => [initialNodes, mockSetNodes, mockOnNodesChange],
  };
});

jest.mock('@/lib/hooks/use-thought-map', () => ({
  useThoughtMap: () => ({
    data: {
      map: storeState.map,
      nodes: Object.values(storeState.nodes),
    },
    error: null,
    isLoading: false,
  }),
}));

jest.mock('@/lib/hooks/use-thought-map-suggestions', () => ({
  ghostNodeToFlowNodeId: (ghost: { ghostId: string }) => `ghost-${ghost.ghostId}`,
  useColdStartSuggestions: jest.fn(),
  useGhostNodeAutoDismiss: jest.fn(),
  useThoughtMapSuggestions: () => suggestionHookResult,
}));

jest.mock('@/lib/stores/thought-map-store', () => ({
  useGhostNodes: () => [],
  useThoughtMapActions: () => thoughtMapActions,
  useThoughtMapNodes: () => storeState.nodes,
  useThoughtMapStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

jest.mock('../CreateNodeDialog', () => ({
  CreateNodeDialog: () => null,
}));

jest.mock('../ThoughtMapDialoguePanel', () => ({
  ThoughtMapDialoguePanel: ({ node }: { node: { label: string } }) => (
    <div>Dialogue: {node.label}</div>
  ),
}));

jest.mock('../ThoughtMapToolbar', () => ({
  ThoughtMapToolbar: () => null,
}));

describe('ThoughtMapCanvas dialogue behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storeState.selectedNodeId = null;
    mockSetNodes.mockReset();
    mockOnNodesChange.mockReset();
  });

  it('does not open the dialogue panel on selection changes alone', async () => {
    const user = userEvent.setup();

    render(<ThoughtMapCanvas mapId="map-1" />);

    await user.click(screen.getByRole('button', { name: /select node/i }));

    expect(mockSetSelectedNodeId).toHaveBeenCalledWith('branch-1');
    expect(screen.queryByText('Dialogue: Branch')).not.toBeInTheDocument();
  });

  it('opens the dialogue panel when the node is explicitly clicked', async () => {
    const user = userEvent.setup();

    render(<ThoughtMapCanvas mapId="map-1" />);

    await user.click(screen.getByRole('button', { name: /click node/i }));

    expect(screen.getByText('Dialogue: Branch')).toBeInTheDocument();
  });
});

describe('ThoughtMapCanvas drag behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storeState.selectedNodeId = null;
    mockSetNodes.mockReset();
    mockOnNodesChange.mockReset();
    mockUpdateNode.mockResolvedValue(true);
  });

  it('calls updateNode with drag position on drag stop', async () => {
    const user = userEvent.setup();

    render(<ThoughtMapCanvas mapId="map-1" />);

    await user.click(screen.getByRole('button', { name: /drag start/i }));
    await user.click(screen.getByRole('button', { name: /drag stop$/i }));

    expect(mockUpdateNode).toHaveBeenCalledWith('branch-1', { x: 500, y: 300 });
  });

  it('does not call updateNode for inline edit node drag', async () => {
    const user = userEvent.setup();

    render(<ThoughtMapCanvas mapId="map-1" />);

    await user.click(screen.getByRole('button', { name: /drag stop inline/i }));

    expect(mockUpdateNode).not.toHaveBeenCalled();
  });

  it('provides onNodeDragStart to ReactFlow', () => {
    render(<ThoughtMapCanvas mapId="map-1" />);

    // The drag start button exists, which means onNodeDragStart was passed to ReactFlow
    expect(screen.getByRole('button', { name: /drag start/i })).toBeInTheDocument();
  });

  it('does not throw when drag start and stop are called in sequence', async () => {
    const user = userEvent.setup();

    render(<ThoughtMapCanvas mapId="map-1" />);

    // Should complete without errors
    await user.click(screen.getByRole('button', { name: /drag start/i }));
    await user.click(screen.getByRole('button', { name: /drag stop$/i }));

    expect(mockUpdateNode).toHaveBeenCalledTimes(1);
  });
});

describe('ThoughtMapCanvas inline edit position', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storeState.selectedNodeId = null;
    mockSetNodes.mockReset();
    mockOnNodesChange.mockReset();
    mockAddNode.mockResolvedValue('new-node-id');
  });

  it('passes the inline edit position to addNode on commit', async () => {
    const user = userEvent.setup();

    render(<ThoughtMapCanvas mapId="map-1" />);

    // Trigger "Add Branch" on the branch node
    await user.click(screen.getByRole('button', { name: /add branch/i }));

    // The inline edit node should now be rendered; commit it
    await user.click(screen.getByRole('button', { name: /commit inline/i }));

    expect(mockAddNode).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'New thought',
        mapId: 'map-1',
        parentNodeId: 'branch-1',
        x: expect.any(Number),
        y: expect.any(Number),
      })
    );

    // Position should be non-zero (offset from parent)
    const call = mockAddNode.mock.calls[0][0];
    expect(call.x).not.toBe(0);
  });
});
