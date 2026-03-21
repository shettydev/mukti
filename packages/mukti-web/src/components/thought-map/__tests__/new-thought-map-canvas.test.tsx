import { render, screen } from '@testing-library/react';

import { NewThoughtMapCanvas } from '../NewThoughtMapCanvas';

const mockCreateMap = jest.fn();
const mockSetThinkingIntent = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('@xyflow/react/dist/style.css', () => ({}));

jest.mock('@xyflow/react', () => ({
  Background: () => null,
  BackgroundVariant: { Dots: 'dots' },
  ReactFlow: ({ nodes }: any) => (
    <div data-testid="react-flow">
      {nodes.map((node: any) => (
        <div data-node-type={node.type} data-testid={`node-${node.id}`} key={node.id}>
          {node.type}
        </div>
      ))}
    </div>
  ),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
  }),
}));

jest.mock('@/lib/stores/thought-map-store', () => ({
  useThoughtMapStore: (selector: (state: any) => any) =>
    selector({
      createMap: mockCreateMap,
      setThinkingIntent: mockSetThinkingIntent,
    }),
}));

jest.mock('../nodes/EditableTopicNode', () => ({
  EditableTopicNode: () => <div data-testid="editable-topic-node">EditableTopicNode</div>,
}));

describe('NewThoughtMapCanvas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the React Flow canvas with an editable topic node', () => {
    render(<NewThoughtMapCanvas />);

    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
    expect(screen.getByTestId('node-editable-topic')).toBeInTheDocument();
  });

  it('passes editable-topic-node as the node type', () => {
    render(<NewThoughtMapCanvas />);

    const node = screen.getByTestId('node-editable-topic');
    expect(node).toHaveAttribute('data-node-type', 'editable-topic-node');
  });
});
