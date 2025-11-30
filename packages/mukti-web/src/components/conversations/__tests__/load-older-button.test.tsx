/**
 * Unit tests for LoadOlderButton component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LoadOlderButton } from '../load-older-button';

describe('LoadOlderButton', () => {
  it('should render button when hasMore is true', () => {
    render(<LoadOlderButton hasMore isLoading={false} onLoad={jest.fn()} />);

    const button = screen.getByRole('button', { name: /load older messages/i });
    expect(button).toBeInTheDocument();
  });

  it('should not render when hasMore is false', () => {
    render(<LoadOlderButton hasMore={false} isLoading={false} onLoad={jest.fn()} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should call onLoad when clicked', async () => {
    const user = userEvent.setup();
    const onLoad = jest.fn();

    render(<LoadOlderButton hasMore isLoading={false} onLoad={onLoad} />);

    const button = screen.getByRole('button', { name: /load older messages/i });
    await user.click(button);

    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when isLoading is true', () => {
    render(<LoadOlderButton hasMore isLoading onLoad={jest.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should show loading state when isLoading is true', () => {
    render(<LoadOlderButton hasMore isLoading onLoad={jest.fn()} />);

    expect(screen.getByText(/loading older messages/i)).toBeInTheDocument();
  });

  it('should show default state when not loading', () => {
    render(<LoadOlderButton hasMore isLoading={false} onLoad={jest.fn()} />);

    expect(screen.getByText(/load older messages/i)).toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('should not call onLoad when disabled', async () => {
    const user = userEvent.setup();
    const onLoad = jest.fn();

    render(<LoadOlderButton hasMore isLoading onLoad={onLoad} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(onLoad).not.toHaveBeenCalled();
  });
});
