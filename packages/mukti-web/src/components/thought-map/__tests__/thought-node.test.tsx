import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThoughtNode } from '../nodes/ThoughtNode';

jest.mock('@xyflow/react', () => ({
  Handle: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Position: {
    Left: 'left',
    Right: 'right',
  },
}));

describe('ThoughtNode', () => {
  it('allows deeper nodes to add a branch', async () => {
    const onAddBranch = jest.fn();
    const user = userEvent.setup();

    render(
      <ThoughtNode
        data={{
          node: {
            createdAt: new Date().toISOString(),
            depth: 3,
            fromSuggestion: false,
            id: 'node-1',
            isCollapsed: false,
            isExplored: false,
            label: 'Deep thought',
            mapId: 'map-1',
            messageCount: 0,
            nodeId: 'thought-3',
            parentNodeId: 'thought-2',
            position: { x: 0, y: 0 },
            type: 'leaf',
            updatedAt: new Date().toISOString(),
          },
          onAddBranch,
        }}
      />
    );

    await user.pointer({
      keys: '[MouseRight]',
      target: screen.getByText('Deep thought'),
    });
    await user.click(screen.getByRole('menuitem', { name: /add branch/i }));

    expect(onAddBranch).toHaveBeenCalledWith('thought-3');
  });
});
