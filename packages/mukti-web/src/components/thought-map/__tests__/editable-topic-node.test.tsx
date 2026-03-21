import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditableTopicNode } from '../nodes/EditableTopicNode';

jest.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: {
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
    Top: 'top',
  },
}));

jest.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
}));

jest.mock('../ThinkingIntentSelector', () => ({
  ThinkingIntentSelector: ({
    onChange,
    value,
  }: {
    onChange: (v: string) => void;
    value: string;
  }) => (
    <div data-testid="intent-selector" data-value={value}>
      <button onClick={() => onChange('decide')} type="button">
        Change Intent
      </button>
    </div>
  ),
}));

describe('EditableTopicNode', () => {
  const onCommit = jest.fn();
  const onIntentChange = jest.fn();

  const defaultData = {
    error: null,
    intent: 'explore' as const,
    isCreating: false,
    onCommit,
    onIntentChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the Topic header label', () => {
    render(<EditableTopicNode data={defaultData} />);

    expect(screen.getByText('Topic')).toBeInTheDocument();
  });

  it('renders a textarea for input', () => {
    render(<EditableTopicNode data={defaultData} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('auto-focuses on mount', async () => {
    render(<EditableTopicNode data={defaultData} />);

    jest.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });

  it('calls onCommit on Enter (without Shift)', async () => {
    jest.useRealTimers();
    const user = userEvent.setup();

    render(<EditableTopicNode data={defaultData} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'My starting thought');
    await user.keyboard('{Enter}');

    expect(onCommit).toHaveBeenCalledWith('My starting thought');
  });

  it('does not commit on Shift+Enter (allows multiline)', async () => {
    jest.useRealTimers();
    const user = userEvent.setup();

    render(<EditableTopicNode data={defaultData} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Line one');
    await user.keyboard('{Shift>}{Enter}{/Shift}');

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('clears text on Escape', async () => {
    jest.useRealTimers();
    const user = userEvent.setup();

    render(<EditableTopicNode data={defaultData} />);

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Some text');
    await user.keyboard('{Escape}');

    expect(textarea).toHaveValue('');
  });

  it('shows loading state when isCreating is true', () => {
    render(<EditableTopicNode data={{ ...defaultData, isCreating: true }} />);

    expect(screen.getByText('Setting up...')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows an error message when error is provided', () => {
    render(<EditableTopicNode data={{ ...defaultData, error: 'Something went wrong' }} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders the ThinkingIntentSelector when not creating', () => {
    render(<EditableTopicNode data={defaultData} />);

    expect(screen.getByTestId('intent-selector')).toBeInTheDocument();
  });

  it('hides the ThinkingIntentSelector when creating', () => {
    render(<EditableTopicNode data={{ ...defaultData, isCreating: true }} />);

    expect(screen.queryByTestId('intent-selector')).not.toBeInTheDocument();
  });

  it('shows character counter', async () => {
    jest.useRealTimers();
    const user = userEvent.setup();

    render(<EditableTopicNode data={defaultData} />);

    expect(screen.getByText('0/500')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox'), 'Hi');

    expect(screen.getByText('2/500')).toBeInTheDocument();
  });

  it('shows "Press Enter to begin" hint when text is non-empty', async () => {
    jest.useRealTimers();
    const user = userEvent.setup();

    render(<EditableTopicNode data={defaultData} />);

    expect(screen.queryByText('Press Enter to begin')).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox'), 'Something');

    expect(screen.getByText('Press Enter to begin')).toBeInTheDocument();
  });
});
