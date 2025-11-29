import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SignInForm } from '../sign-in-form';

// Mock the auth API
jest.mock('@/lib/api/auth', () => ({
  authApi: {
    login: jest.fn(),
  },
}));

// Mock the auth store
jest.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: jest.fn(() => ({
    clearAuth: jest.fn(),
    setAuth: jest.fn(),
  })),
}));

describe('SignInForm', () => {
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
    renderWithProviders(<SignInForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders forgot password link', () => {
    renderWithProviders(<SignInForm />);

    expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />);

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

  it('toggles remember me checkbox', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />);

    const rememberMeCheckbox = screen.getByRole('checkbox', { name: /remember me/i });

    // Initially unchecked
    expect(rememberMeCheckbox).not.toBeChecked();

    // Click to check
    await user.click(rememberMeCheckbox);
    expect(rememberMeCheckbox).toBeChecked();

    // Click to uncheck
    await user.click(rememberMeCheckbox);
    expect(rememberMeCheckbox).not.toBeChecked();
  });

  it('calls onSwitchToSignUp when sign up link is clicked', async () => {
    const user = userEvent.setup();
    const onSwitchToSignUp = jest.fn();
    renderWithProviders(<SignInForm onSwitchToSignUp={onSwitchToSignUp} />);

    const signUpLink = screen.getByRole('button', { name: /sign up/i });
    await user.click(signUpLink);

    expect(onSwitchToSignUp).toHaveBeenCalledTimes(1);
  });

  it('calls onForgotPassword when forgot password link is clicked', async () => {
    const user = userEvent.setup();
    const onForgotPassword = jest.fn();
    renderWithProviders(<SignInForm onForgotPassword={onForgotPassword} />);

    const forgotPasswordLink = screen.getByRole('button', { name: /forgot password/i });
    await user.click(forgotPasswordLink);

    expect(onForgotPassword).toHaveBeenCalledTimes(1);
  });

  it('accepts valid form data', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />);

    // Fill in all required fields with valid data
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    // Should not show validation errors
    await waitFor(() => {
      expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/please enter a valid/i)).not.toBeInTheDocument();
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    const { authApi } = await import('@/lib/api/auth');

    // Mock a delayed response
    (authApi.login as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    renderWithProviders(<SignInForm />);

    // Fill in valid data
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  it('calls onSuccess when login is successful', async () => {
    const user = userEvent.setup();
    const onSuccess = jest.fn();
    const { authApi } = await import('@/lib/api/auth');

    // Mock successful login
    (authApi.login as jest.Mock).mockResolvedValue({
      accessToken: 'test-token',
      refreshToken: 'test-refresh-token',
      user: {
        email: 'john@example.com',
        firstName: 'John',
        id: '123',
        lastName: 'Doe',
      },
    });

    renderWithProviders(<SignInForm onSuccess={onSuccess} />);

    // Fill in valid data
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'SecurePass123!');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    // Should call onSuccess
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('displays error message when login fails', async () => {
    const user = userEvent.setup();
    const { authApi } = await import('@/lib/api/auth');

    // Mock failed login
    (authApi.login as jest.Mock).mockRejectedValue(new Error('Invalid credentials'));

    renderWithProviders(<SignInForm />);

    // Fill in data
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'WrongPassword123!');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
