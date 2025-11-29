import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SignUpForm } from '../sign-up-form';

// Mock the auth API
jest.mock('@/lib/api/auth', () => ({
  authApi: {
    register: jest.fn(),
  },
}));

// Mock the auth store
jest.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: jest.fn(() => ({
    clearAuth: jest.fn(),
    setAuth: jest.fn(),
  })),
}));

describe('SignUpForm', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
        },
        queries: {
          retry: false,
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  it('renders all form fields', () => {
    renderWithProviders(<SignUpForm />);

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignUpForm />);

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/first name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/last name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignUpForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('shows validation errors for weak password', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignUpForm />);

    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'weak');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('shows password strength indicator', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignUpForm />);

    const passwordInput = screen.getByLabelText(/^password$/i);

    // Type a weak password
    await user.type(passwordInput, 'password');
    await waitFor(() => {
      expect(screen.getByText(/password strength:/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignUpForm />);

    const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    // Initially password should be hidden
    expect(passwordInput.type).toBe('password');

    // Click to show password
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    // Click to hide password again
    await user.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('calls onSwitchToSignIn when sign in link is clicked', async () => {
    const user = userEvent.setup();
    const onSwitchToSignIn = jest.fn();
    renderWithProviders(<SignUpForm onSwitchToSignIn={onSwitchToSignIn} />);

    const signInLink = screen.getByRole('button', { name: /sign in/i });
    await user.click(signInLink);

    expect(onSwitchToSignIn).toHaveBeenCalledTimes(1);
  });

  it('accepts valid form data', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignUpForm />);

    // Fill in all required fields with valid data
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    // Should not show validation errors
    await waitFor(() => {
      expect(screen.queryByText(/must be at least/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    const { authApi } = await import('@/lib/api/auth');

    // Mock a delayed response
    (authApi.register as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    renderWithProviders(<SignUpForm />);

    // Fill in valid data
    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');

    const submitButton = screen.getByRole('button', { name: /create account/i });
    await user.click(submitButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/creating account/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });
});
