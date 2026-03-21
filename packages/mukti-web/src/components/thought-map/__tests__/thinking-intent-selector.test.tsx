import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThinkingIntentSelector } from '../ThinkingIntentSelector';

describe('ThinkingIntentSelector', () => {
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all four intent buttons', () => {
    render(<ThinkingIntentSelector onChange={onChange} value="explore" />);

    expect(screen.getByRole('button', { name: /explore/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /decide/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /understand/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /debug/i })).toBeInTheDocument();
  });

  it('calls onChange with the clicked intent value', async () => {
    const user = userEvent.setup();

    render(<ThinkingIntentSelector onChange={onChange} value="explore" />);

    await user.click(screen.getByRole('button', { name: /decide/i }));

    expect(onChange).toHaveBeenCalledWith('decide');
  });

  it('calls onChange when clicking the currently selected intent', async () => {
    const user = userEvent.setup();

    render(<ThinkingIntentSelector onChange={onChange} value="debug" />);

    await user.click(screen.getByRole('button', { name: /debug/i }));

    expect(onChange).toHaveBeenCalledWith('debug');
  });

  it('renders in dialog variant by default', () => {
    const { container } = render(<ThinkingIntentSelector onChange={onChange} value="explore" />);

    // Dialog variant uses 'grid-cols-2 sm:grid-cols-4'
    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain('grid-cols-2');
  });

  it('renders in floating variant when specified', () => {
    const { container } = render(
      <ThinkingIntentSelector onChange={onChange} value="explore" variant="floating" />
    );

    // Floating variant uses 'grid-cols-4' without the sm: breakpoint prefix
    const grid = container.firstChild as HTMLElement;
    expect(grid.className).toContain('grid-cols-4');
    expect(grid.className).not.toContain('grid-cols-2');
  });
});
