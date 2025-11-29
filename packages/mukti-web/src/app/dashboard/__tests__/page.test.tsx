import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

import DashboardPage from '../page';

let queryClient: QueryClient;

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock auth hooks with a jest.fn() so we can override it per test
const mockUseAuth = jest.fn();

jest.mock('@/lib/hooks/use-auth', () => ({
  useAuth: () => mockUseAuth(),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('DashboardPage', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });

    // Reset mock before each test
    mockUseAuth.mockReset();
  });

  it('should render user profile skeleton initially', () => {
    // Mock loading state
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: true,
      logout: jest.fn(),
      user: null,
    });

    renderWithProviders(<DashboardPage />);

    // When loading, ProtectedRoute shows its own loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should render user profile after loading', () => {
    // Mock loaded state with user data
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      logout: jest.fn(),
      user: {
        email: 'test@example.com',
        emailVerified: true,
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      },
    });

    renderWithProviders(<DashboardPage />);

    // Check for user profile content
    expect(screen.getByText(/Welcome to Mukti Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Test User/i)).toBeInTheDocument();
    expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
  });

  it('should show logout button after loading', () => {
    // Mock loaded state with user data
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      logout: jest.fn(),
      user: {
        email: 'test@example.com',
        emailVerified: true,
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      },
    });

    renderWithProviders(<DashboardPage />);

    // Check for logout button
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    expect(logoutButton).toBeInTheDocument();
  });
});
