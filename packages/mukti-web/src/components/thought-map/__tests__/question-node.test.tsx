import { act, fireEvent, render, screen } from '@testing-library/react';

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

describe('QuestionNode — GhostCountdownRing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the countdown ring when ghostCreatedAt is provided', () => {
    const now = Date.now();

    render(
      <QuestionNode
        data={{
          ghostCreatedAt: now,
          isGhost: true,
          node: baseNode,
          onAccept: jest.fn(),
          onDismiss: jest.fn(),
        }}
      />
    );

    // SVG ring has an aria-label containing the countdown text
    expect(screen.getByRole('img', { name: /suggestion dismisses in/i })).toBeInTheDocument();
  });

  it('does not render a countdown ring when ghostCreatedAt is absent', () => {
    render(
      <QuestionNode
        data={{
          isGhost: true,
          node: baseNode,
          onAccept: jest.fn(),
          onDismiss: jest.fn(),
        }}
      />
    );

    expect(screen.queryByRole('img', { name: /suggestion dismisses in/i })).not.toBeInTheDocument();
  });

  it('does not render a countdown ring for non-ghost nodes even if ghostCreatedAt is set', () => {
    render(
      <QuestionNode
        data={{
          ghostCreatedAt: Date.now(),
          isGhost: false,
          node: baseNode,
        }}
      />
    );

    expect(screen.queryByRole('img', { name: /suggestion dismisses in/i })).not.toBeInTheDocument();
  });

  it('updates the seconds-left label as time passes', () => {
    const now = Date.now();

    render(
      <QuestionNode
        data={{
          ghostCreatedAt: now,
          isGhost: true,
          node: baseNode,
          onAccept: jest.fn(),
          onDismiss: jest.fn(),
        }}
      />
    );

    // Initially 60 s remaining
    expect(
      screen.getByRole('img', { name: /suggestion dismisses in 60 seconds/i })
    ).toBeInTheDocument();

    // Advance 10 s — the 250 ms interval fires multiple times
    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(
      screen.getByRole('img', { name: /suggestion dismisses in 50 seconds/i })
    ).toBeInTheDocument();
  });

  it('dims the ring while the card is hovered', () => {
    const now = Date.now();

    const { container } = render(
      <QuestionNode
        data={{
          ghostCreatedAt: now,
          isGhost: true,
          node: baseNode,
          onAccept: jest.fn(),
          onDismiss: jest.fn(),
        }}
      />
    );

    const card = container.firstChild as HTMLElement;
    const ring = screen.getByRole('img', { name: /suggestion dismisses in/i });

    // Before hover — higher opacity class present
    expect(ring).toHaveClass('opacity-60');
    expect(ring).not.toHaveClass('opacity-30');

    fireEvent.mouseEnter(card);

    // After hover — dimmed
    expect(ring).toHaveClass('opacity-30');
    expect(ring).not.toHaveClass('opacity-60');

    fireEvent.mouseLeave(card);

    // Back to normal
    expect(ring).toHaveClass('opacity-60');
  });

  it('shows plain text fallback when prefers-reduced-motion is active', async () => {
    // Patch matchMedia to report reduced-motion: reduce before render
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }),
    });

    const now = Date.now();

    await act(async () => {
      render(
        <QuestionNode
          data={{
            ghostCreatedAt: now,
            isGhost: true,
            node: baseNode,
            onAccept: jest.fn(),
            onDismiss: jest.fn(),
          }}
        />
      );
    });

    // Should show a text span rather than an SVG img role
    expect(screen.queryByRole('img', { name: /suggestion dismisses in/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/suggestion dismisses in 60 seconds/i)).toBeInTheDocument();

    // Restore
    Object.defineProperty(window, 'matchMedia', { writable: true, value: originalMatchMedia });
  });
});
