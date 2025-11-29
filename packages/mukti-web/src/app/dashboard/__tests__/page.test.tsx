/**
 * Dashboard page tests
 * Tests loading states and skeleton loaders
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import DashboardPage from '../page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock auth store
vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: () => ({
    clearAuth: vi.fn(),
    isAuthenticated: true,
    user: {
      email: 'test@example.com',
      emailVerified: true,
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
    },
  }),
}));

describe('DashboardPage', () => {
  it('should render user profile skeleton initially', () => {
    render(<DashboardPage />);

    // Check for skeleton elements (they have specific classes)
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render user profile after loading', async () => {
    render(<DashboardPage />);

    // Wait for loading to complete (500ms timeout in component)
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Check for user profile content
    expect(screen.getByText(/Welcome to Mukti Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Test User/i)).toBeInTheDocument();
    expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
  });

  it('should show logout button after loading', async () => {
    render(<DashboardPage />);

    // Wait for loading to complete
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Check for logout button
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    expect(logoutButton).toBeInTheDocument();
  });
});
