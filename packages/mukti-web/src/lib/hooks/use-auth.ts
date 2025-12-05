/**
 * Authentication hooks using TanStack Query
 *
 * Provides hooks for:
 * - User authentication (login, register, logout)
 * - Token management (automatic refresh)
 * - Current user data
 *
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import type { AuthResponse, LoginDto, RegisterDto, TokenResponse } from '@/types/auth.types';

import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Query keys for auth-related queries
 */
export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
} as const;

/**
 * JWT token expiration time in milliseconds
 * Access tokens expire after 15 minutes (as per design)
 */
const ACCESS_TOKEN_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Time before expiration to trigger refresh (in milliseconds)
 * Refresh 2 minutes before expiration to ensure seamless experience
 */
const REFRESH_BEFORE_EXPIRATION_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Main auth hook that combines all auth functionality
 *
 * Automatically sets up token refresh timer to refresh access token before expiration.
 *
 * @returns Object with auth state and methods
 *
 *
 * @example
 * ```tsx
 * function AuthenticatedApp() {
 *   const {
 *     user,
 *     isAuthenticated,
 *     isLoading,
 *     login,
 *     register,
 *     logout,
 *     refreshToken,
 *   } = useAuth();
 *
 *   if (isLoading) return <LoadingScreen />;
 *
 *   if (!isAuthenticated) {
 *     return <LoginPage onLogin={login} onRegister={register} />;
 *   }
 *
 *   return (
 *     <Dashboard user={user} onLogout={logout} />
 *   );
 * }
 * ```
 */
export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const { data: currentUser, isLoading: isUserLoading } = useUser();

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();
  const refreshMutation = useRefreshToken();

  // Track if we're currently restoring a session
  const isRestoringSession = !!user && !isAuthenticated && !refreshMutation.isPending;
  const hasAttemptedRestore = useRef(false);

  // Attempt to restore session when user exists but not authenticated
  // This happens on page reload when user data is persisted but token is not
  useEffect(() => {
    if (isRestoringSession && !hasAttemptedRestore.current) {
      hasAttemptedRestore.current = true;
      // Attempt to refresh the token using the httpOnly refresh cookie
      authApi
        .refresh()
        .then((response) => {
          // Successfully refreshed - restore auth state
          if (user) {
            setAuth(user, response.accessToken);
          }
        })
        .catch(() => {
          // Refresh failed - clear the stale user data
          clearAuth();
        });
    }
  }, [isRestoringSession, user, setAuth, clearAuth]);

  // Reset the restore attempt flag when user logs out
  useEffect(() => {
    if (!user) {
      hasAttemptedRestore.current = false;
    }
  }, [user]);

  // Loading state includes session restoration and store hydration
  const isLoading =
    !hasHydrated || isUserLoading || (!!user && !isAuthenticated && !refreshMutation.isError);

  // Set up automatic token refresh before expiration
  useTokenRefreshTimer();

  return {
    isAuthenticated,
    isLoading,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    loginPending: loginMutation.isPending,
    logout: logoutMutation.mutate,
    logoutAsync: logoutMutation.mutateAsync,
    logoutError: logoutMutation.error,
    logoutPending: logoutMutation.isPending,
    refreshToken: refreshMutation.mutate,
    refreshTokenAsync: refreshMutation.mutateAsync,
    refreshTokenError: refreshMutation.error,
    refreshTokenPending: refreshMutation.isPending,
    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    registerError: registerMutation.error,
    registerPending: registerMutation.isPending,
    user: currentUser || user,
  };
}

/**
 * Hook for requesting password reset email
 *
 * @returns Mutation object for requesting password reset
 *
 *
 * @example
 * ```tsx
 * function ForgotPasswordForm() {
 *   const forgotPasswordMutation = useForgotPassword();
 *
 *   const onSubmit = (data: { email: string }) => {
 *     forgotPasswordMutation.mutate(data, {
 *       onSuccess: () => {
 *         toast.success('Password reset email sent!');
 *       },
 *       onError: (error) => {
 *         toast.error('Failed to send reset email');
 *       },
 *     });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       {/* form fields *\/}
 *       <Button disabled={forgotPasswordMutation.isPending}>
 *         {forgotPasswordMutation.isPending ? 'Sending...' : 'Send Reset Link'}
 *       </Button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (dto: { email: string }) => authApi.forgotPassword(dto),
  });
}

/**
 * Hook for user login
 *
 * @returns Mutation object for logging in a user
 *
 * @example
 * ```tsx
 * function SignInForm() {
 *   const loginMutation = useLogin();
 *
 *   const onSubmit = (data: LoginDto) => {
 *     loginMutation.mutate(data, {
 *       onSuccess: () => {
 *         toast.success('Welcome back!');
 *         router.push('/dashboard');
 *       },
 *       onError: (error) => {
 *         toast.error('Invalid credentials');
 *       },
 *     });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       {/* form fields *\/}
 *       <Button disabled={loginMutation.isPending}>
 *         {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
 *       </Button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (dto: LoginDto) => authApi.login(dto),
    onSuccess: (response: AuthResponse) => {
      // Update auth store with user and token
      setAuth(response.user, response.accessToken);

      // Set user data in query cache
      queryClient.setQueryData(authKeys.currentUser(), response.user);
    },
  });
}

/**
 * Hook for user logout
 *
 * @returns Mutation object for logging out a user
 *
 * @example
 * ```tsx
 * function LogoutButton() {
 *   const logoutMutation = useLogout();
 *
 *   const handleLogout = () => {
 *     logoutMutation.mutate(undefined, {
 *       onSuccess: () => {
 *         toast.success('Logged out successfully');
 *         router.push('/');
 *       },
 *     });
 *   };
 *
 *   return (
 *     <Button onClick={handleLogout} disabled={logoutMutation.isPending}>
 *       {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
 *     </Button>
 *   );
 * }
 * ```
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      // Clear auth store
      clearAuth();

      // Clear all queries from cache
      queryClient.clear();
    },
  });
}

/**
 * Hook for refreshing access token
 *
 * This is typically called automatically by the API client when a 401 is received,
 * but can also be called manually if needed.
 *
 * @returns Mutation object for refreshing the access token
 *
 * @example
 * ```tsx
 * function TokenRefreshButton() {
 *   const refreshMutation = useRefreshToken();
 *
 *   const handleRefresh = () => {
 *     refreshMutation.mutate();
 *   };
 *
 *   return (
 *     <Button onClick={handleRefresh} disabled={refreshMutation.isPending}>
 *       Refresh Token
 *     </Button>
 *   );
 * }
 * ```
 */
export function useRefreshToken() {
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useMutation({
    mutationFn: () => {
      // Only attempt refresh if authenticated
      if (!isAuthenticated) {
        throw new Error('Not authenticated');
      }
      return authApi.refresh();
    },
    onError: () => {
      // If refresh fails, clear auth state
      clearAuth();
    },
    onSuccess: (response: TokenResponse) => {
      // Update access token in store
      setAccessToken(response.accessToken);
    },
  });
}

/**
 * Hook for user registration
 *
 * @returns Mutation object for registering a new user
 *
 * @example
 * ```tsx
 * function SignUpForm() {
 *   const registerMutation = useRegister();
 *
 *   const onSubmit = (data: RegisterDto) => {
 *     registerMutation.mutate(data, {
 *       onSuccess: () => {
 *         toast.success('Account created successfully!');
 *         router.push('/dashboard');
 *       },
 *       onError: (error) => {
 *         toast.error(error.message);
 *       },
 *     });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       {/* form fields *\/}
 *       <Button disabled={registerMutation.isPending}>
 *         {registerMutation.isPending ? 'Creating account...' : 'Sign Up'}
 *       </Button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useRegister() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (dto: RegisterDto) => authApi.register(dto),
    onSuccess: (response: AuthResponse) => {
      // Update auth store with user and token
      setAuth(response.user, response.accessToken);

      // Set user data in query cache
      queryClient.setQueryData(authKeys.currentUser(), response.user);
    },
  });
}

/**
 * Hook for resetting password with token
 *
 * @returns Mutation object for resetting password
 *
 * @example
 * ```tsx
 * function ResetPasswordForm({ token }: { token: string }) {
 *   const resetPasswordMutation = useResetPassword();
 *
 *   const onSubmit = (data: { newPassword: string }) => {
 *     resetPasswordMutation.mutate(
 *       { token, newPassword: data.newPassword },
 *       {
 *         onSuccess: () => {
 *           toast.success('Password reset successfully!');
 *           router.push('/auth/signin');
 *         },
 *         onError: (error) => {
 *           toast.error('Failed to reset password. Token may be expired.');
 *         },
 *       }
 *     );
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       {/* form fields *\/}
 *       <Button disabled={resetPasswordMutation.isPending}>
 *         {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
 *       </Button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useResetPassword() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: { newPassword: string; token: string }) => authApi.resetPassword(dto),
    onSuccess: () => {
      // Clear auth state since all sessions are invalidated
      clearAuth();

      // Clear all queries from cache
      queryClient.clear();
    },
  });
}

/**
 * Hook to automatically refresh access token before expiration
 *
 * This hook sets up a timer that refreshes the access token before it expires,
 * ensuring users don't experience authentication failures during active sessions.
 *
 * @example
 * ```tsx
 * function App() {
 *   useTokenRefreshTimer();
 *
 *   return <YourApp />;
 * }
 * ```
 */
export function useTokenRefreshTimer() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshMutation = useRefreshToken();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Only set up timer if authenticated and have access token
    if (!isAuthenticated || !accessToken) {
      return;
    }

    // Calculate when to refresh (token expiration - buffer time)
    const refreshTime = ACCESS_TOKEN_EXPIRATION_MS - REFRESH_BEFORE_EXPIRATION_MS;

    // Set up timer to refresh token before expiration
    timerRef.current = setTimeout(() => {
      // Only refresh if still authenticated
      if (useAuthStore.getState().isAuthenticated) {
        refreshMutation.mutate();
      }
    }, refreshTime);

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isAuthenticated, accessToken, refreshMutation]);
}

/**
 * Hook to get the current authenticated user
 *
 * @returns Query result with current user data
 *
 * @example
 * ```tsx
 * function Profile() {
 *   const { data: user, isLoading } = useUser();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!user) return <LoginPrompt />;
 *
 *   return <div>Welcome, {user.firstName}!</div>;
 * }
 * ```
 */
export function useUser() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    enabled: isAuthenticated && !!user,
    queryFn: async () => {
      // User is already in the store, just return it
      // In a real app, you might want to fetch fresh data from /auth/me
      return user;
    },
    queryKey: authKeys.currentUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
