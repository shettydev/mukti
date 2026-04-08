import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditableBranchNode } from '../nodes/EditableBranchNode';

jest.mock('@xyflow/react', () => ({
  Handle: () => null,
  Position: {
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
    Top: 'top',
  },
}));

describe('EditableBranchNode', () => {
  const onCommit = jest.fn();
  const onCancel = jest.fn();

  const defaultData = {
    onCancel,
    onCommit,
    side: 'right' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders with placeholder text and "New Branch" label', () => {
    render(<EditableBranchNode data={defaultData} />);

    expect(screen.getByText('New Branch')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type a thought...')).toBeInTheDocument();
  });

  it('shows the character counter starting at 0/120', () => {
    render(<EditableBranchNode data={defaultData} />);

    expect(screen.getByText('0/120')).toBeInTheDocument();
  });

  it('auto-focuses the input on mount', async () => {
    render(<EditableBranchNode data={defaultData} />);

    // The auto-focus uses a 50ms timeout
    jest.advanceTimersByTime(100);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a thought...')).toHaveFocus();
    });
  });

  it('calls onCommit with trimmed text on Enter', async () => {
    jest.useRealTimers();
    const user = userEvent.setup();

    render(<EditableBranchNode data={defaultData} />);

    const input = screen.getByPlaceholderText('Type a thought...');
    await user.type(input, '  My new branch  ');
    await user.keyboard('{Enter}');

    // onCommit fires after a 400ms animation delay — wait for it
    await waitFor(() => expect(onCommit).toHaveBeenCalledWith('My new branch'));
  });

  it('calls onCancel on Escape', async () => {
    jest.useRealTimers();
    const user = userEvent.setup();

    render(<EditableBranchNode data={defaultData} />);

    const input = screen.getByPlaceholderText('Type a thought...');
    await user.type(input, 'some text');
    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('does nothing when Enter is pressed with empty text', async () => {
    jest.useRealTimers();
    const user = userEvent.setup();

    render(<EditableBranchNode data={defaultData} />);

    const input = screen.getByPlaceholderText('Type a thought...');
    await user.click(input);
    await user.keyboard('{Enter}');

    expect(onCancel).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('updates the character counter as user types', async () => {
    jest.useRealTimers();
    const user = userEvent.setup();

    render(<EditableBranchNode data={defaultData} />);

    const input = screen.getByPlaceholderText('Type a thought...');
    await user.type(input, 'Hello');

    expect(screen.getByText('5/120')).toBeInTheDocument();
  });

  it('does not commit more than once (double-commit guard)', async () => {
    jest.useRealTimers();
    const user = userEvent.setup();

    render(<EditableBranchNode data={defaultData} />);

    const input = screen.getByPlaceholderText('Type a thought...');
    await user.type(input, 'Branch text');
    await user.keyboard('{Enter}');
    await user.keyboard('{Enter}');

    // onCommit fires after a 400ms animation delay — wait for it, then confirm it's called only once
    await waitFor(() => expect(onCommit).toHaveBeenCalledTimes(1));
  });
});
