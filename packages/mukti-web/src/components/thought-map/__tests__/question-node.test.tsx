import { render, screen } from '@testing-library/react';

import { QuestionNode } from '../nodes/QuestionNode';

jest.mock('@xyflow/react', () => ({
  Handle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Position: {
    Left: 'left',
    Right: 'right',
  },
}));

const baseNode = {
  createdAt: new Date().toISOString(),
  depth: 2,
  fromSuggestion: false,
  id: 'node-1',
  isCollapsed: false,
  isExplored: false,
  label: 'What assumption is driving this?',
  mapId: 'map-1',
  messageCount: 0,
  nodeId: 'question-1',
  parentNodeId: 'branch-1',
  position: { x: 0, y: 0 },
  type: 'question' as const,
  updatedAt: new Date().toISOString(),
};

describe('QuestionNode', () => {
  it('renders ghost suggestions with suggestion affordances', () => {
    const { container } = render(
      <QuestionNode
        data={{
          isGhost: true,
          node: baseNode,
          onAccept: jest.fn(),
          onDismiss: jest.fn(),
        }}
      />
    );

    expect(screen.getByText('Suggestion')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept suggestion/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss suggestion/i })).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('border-dashed');
  });

  it('renders persisted question nodes without ghost affordances', () => {
    const { container } = render(
      <QuestionNode
        data={{
          isGhost: false,
          node: baseNode,
        }}
      />
    );

    expect(screen.getByText('Question')).toBeInTheDocument();
    expect(screen.queryByText('Suggestion')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept suggestion/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dismiss suggestion/i })).not.toBeInTheDocument();
    expect(container.firstChild).not.toHaveClass('border-dashed');
  });
});
