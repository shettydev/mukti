import { render, screen } from '@testing-library/react';

import { GradientBackground } from '../gradient-background';

describe('GradientBackground', () => {
  it('renders children correctly', () => {
    render(
      <GradientBackground>
        <div data-testid="test-child">Test Content</div>
      </GradientBackground>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies gradient background classes', () => {
    const { container } = render(
      <GradientBackground>
        <div>Content</div>
      </GradientBackground>
    );

    const backgroundDiv = container.firstChild as HTMLElement;
    expect(backgroundDiv).toHaveClass('bg-gradient-to-b');
    expect(backgroundDiv).toHaveClass('from-black');
    expect(backgroundDiv).toHaveClass('via-purple-900');
    expect(backgroundDiv).toHaveClass('to-blue-600');
  });

  it('applies full viewport height and width classes', () => {
    const { container } = render(
      <GradientBackground>
        <div>Content</div>
      </GradientBackground>
    );

    const backgroundDiv = container.firstChild as HTMLElement;
    expect(backgroundDiv).toHaveClass('min-h-screen');
    expect(backgroundDiv).toHaveClass('w-full');
  });

  it('applies responsive padding classes', () => {
    const { container } = render(
      <GradientBackground>
        <div>Content</div>
      </GradientBackground>
    );

    const backgroundDiv = container.firstChild as HTMLElement;
    expect(backgroundDiv).toHaveClass('p-4');
    expect(backgroundDiv).toHaveClass('sm:p-6');
    expect(backgroundDiv).toHaveClass('md:p-8');
  });

  it('applies flexbox centering classes', () => {
    const { container } = render(
      <GradientBackground>
        <div>Content</div>
      </GradientBackground>
    );

    const backgroundDiv = container.firstChild as HTMLElement;
    expect(backgroundDiv).toHaveClass('flex');
    expect(backgroundDiv).toHaveClass('items-center');
    expect(backgroundDiv).toHaveClass('justify-center');
  });

  it('accepts and applies custom className', () => {
    const { container } = render(
      <GradientBackground className="custom-class">
        <div>Content</div>
      </GradientBackground>
    );

    const backgroundDiv = container.firstChild as HTMLElement;
    expect(backgroundDiv).toHaveClass('custom-class');
  });

  it('renders multiple children', () => {
    render(
      <GradientBackground>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </GradientBackground>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });
});
