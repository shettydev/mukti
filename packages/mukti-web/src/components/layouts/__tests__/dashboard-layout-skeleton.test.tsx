import { render, screen } from '@testing-library/react';

import { DashboardLayoutSkeleton } from '../dashboard-layout-skeleton';

describe('DashboardLayoutSkeleton', () => {
  it('renders sidebar skeleton by default', () => {
    const { container } = render(<DashboardLayoutSkeleton />);

    // Check for sidebar element
    const sidebar = container.querySelector('aside');
    expect(sidebar).toBeInTheDocument();
  });

  it('hides sidebar skeleton when showSidebar is false', () => {
    const { container } = render(<DashboardLayoutSkeleton showSidebar={false} />);

    // Check that sidebar is not rendered
    const sidebar = container.querySelector('aside');
    expect(sidebar).not.toBeInTheDocument();
  });

  it('renders navbar skeleton', () => {
    const { container } = render(<DashboardLayoutSkeleton />);

    // Check for header element
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
  });

  it('renders default content skeleton when no children provided', () => {
    const { container } = render(<DashboardLayoutSkeleton />);

    // Check for skeleton elements in content area
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders custom children when provided', () => {
    render(
      <DashboardLayoutSkeleton>
        <div data-testid="custom-skeleton">Custom Content</div>
      </DashboardLayoutSkeleton>
    );

    expect(screen.getByTestId('custom-skeleton')).toBeInTheDocument();
    expect(screen.getByText('Custom Content')).toBeInTheDocument();
  });

  it('applies custom contentClassName', () => {
    const { container } = render(
      <DashboardLayoutSkeleton contentClassName="custom-content-class" />
    );

    const contentArea = container.querySelector('.custom-content-class');
    expect(contentArea).toBeInTheDocument();
  });

  it('matches DashboardLayout structure with main and header', () => {
    const { container } = render(<DashboardLayoutSkeleton />);

    // Check for main element
    const main = container.querySelector('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('role', 'main');

    // Check for header element
    const header = container.querySelector('header');
    expect(header).toBeInTheDocument();
  });

  it('renders navigation skeleton items in sidebar', () => {
    const { container } = render(<DashboardLayoutSkeleton />);

    // Check for navigation element
    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();

    // Check for multiple skeleton items (should have 8 nav items)
    const navItems = nav?.querySelectorAll('.flex.items-center');
    expect(navItems?.length).toBe(8);
  });

  it('renders user menu skeleton in navbar', () => {
    const { container } = render(<DashboardLayoutSkeleton />);

    // Check for user avatar skeleton (rounded-full)
    const avatarSkeleton = container.querySelector('.rounded-full');
    expect(avatarSkeleton).toBeInTheDocument();
  });
});
