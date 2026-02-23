import { render, screen } from '@testing-library/react';

import { ComingSoon } from '../old-landing/coming-soon';

describe('ComingSoon', () => {
  it('renders feature name correctly', () => {
    render(<ComingSoon description="Test description" feature="Test Feature" />);

    expect(screen.getByText('Test Feature')).toBeInTheDocument();
  });

  it('renders description correctly', () => {
    render(<ComingSoon description="This is a test description" feature="Test Feature" />);

    expect(screen.getByText('This is a test description')).toBeInTheDocument();
  });

  it('renders Coming Soon badge', () => {
    render(<ComingSoon description="Test description" feature="Test Feature" />);

    expect(screen.getByText('Coming Soon')).toBeInTheDocument();
  });

  it('renders Back to Dashboard button', () => {
    render(<ComingSoon description="Test description" feature="Test Feature" />);

    const backButton = screen.getByRole('link', { name: /back to dashboard/i });
    expect(backButton).toBeInTheDocument();
    expect(backButton).toHaveAttribute('href', '/chat');
  });

  it('renders timeline when provided', () => {
    render(<ComingSoon description="Test description" feature="Test Feature" timeline="Q2 2026" />);

    expect(screen.getByText(/Q2 2026/i)).toBeInTheDocument();
  });

  it('does not render timeline when not provided', () => {
    render(<ComingSoon description="Test description" feature="Test Feature" />);

    expect(screen.queryByText(/Expected release/i)).not.toBeInTheDocument();
  });

  it('renders default Clock icon when no custom icon provided', () => {
    const { container } = render(
      <ComingSoon description="Test description" feature="Test Feature" />
    );

    // Check for Clock icon (lucide-react renders as svg)
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <ComingSoon
        className="custom-test-class"
        description="Test description"
        feature="Test Feature"
      />
    );

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv).toHaveClass('custom-test-class');
  });
});
