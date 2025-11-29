/**
 * Tests for auth hooks
 */

import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';

import type { AuthResponse, LoginDto, RegisterDto, TokenResponse } from '@/types/auth.types';
import type { User } from '@/types/user.types';

import { authApi } from '@/lib/api/auth';
import {
  authKeys,
  useAuth,
  useLogin,
  useLogout,
  useRefreshToken,
  useRegister,
  useUser,
} from '@/lib/hooks/use-auth';
import { useAuthStore } from '@/lib/stores/auth-store';

// Mock the auth API
jest.mock('@/lib/api/auth');

const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
  });

  // eslint-disable-next-line react/display-name
  return ({ children }: { children: ReactNode }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// Mock user data
const mockUser: User = {
  createdAt: new Date('2024-01-01'),
  email: 'test@example.com',
  emailVerified: true,
  firstName: 'Test',
  id: 'user123',
  isActive: true,
  lastName: 'User',
  role: 'user',
  updatedAt: new Date('2024-01-01'),
};

const mockAuthResponse: AuthResponse = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
  user: mockUser,
};

describe('Auth Hooks', () => {
  beforeEach(() => {
    // Clear auth store before each test
    useAuthStore.getState().clearAuth();
    jest.clearAllMocks();
  });

  describe('useUser', () => {
    it('should return null when not authenticated', () => {
      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeUndefined();
    });

    it('should return user when authenticated', async () => {
      // Set authenticated state
      act(() => {
        useAuthStore.getState().setAuth(mockUser, 'mock-token');
      });

      const { result } = renderHook(() => useUser(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockUser);
      });
    });
  });

  describe('useRegister', () => {
    it('should register a new user successfully', async () => {
      mockAuthApi.register.mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useRegister(), {
        wrapper: createWrapper(),
      });

      const registerDto: RegisterDto = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePass123!',
      };

      act(() => {
        result.current.mutate(registerDto);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAuthApi.register).toHaveBeenCalledWith(registerDto);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().accessToken).toBe('mock-access-token');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should handle registration errors', async () => {
      const error = new Error('Email already exists');
      mockAuthApi.register.mockRejectedValue(error);

      const { result } = renderHook(() => useRegister(), {
        wrapper: createWrapper(),
      });

      const registerDto: RegisterDto = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'SecurePass123!',
      };

      act(() => {
        result.current.mutate(registerDto);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('useLogin', () => {
    it('should login a user successfully', async () => {
      mockAuthApi.login.mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      act(() => {
        result.current.mutate(loginDto);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAuthApi.login).toHaveBeenCalledWith(loginDto);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().accessToken).toBe('mock-access-token');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should handle login errors', async () => {
      const error = new Error('Invalid credentials');
      mockAuthApi.login.mockRejectedValue(error);

      const { result } = renderHook(() => useLogin(), {
        wrapper: createWrapper(),
      });

      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      act(() => {
        result.current.mutate(loginDto);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('useLogout', () => {
    it('should logout a user successfully', async () => {
      // Set authenticated state first
      act(() => {
        useAuthStore.getState().setAuth(mockUser, 'mock-token');
      });

      mockAuthApi.logout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLogout(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAuthApi.logout).toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('useRefreshToken', () => {
    it('should refresh access token successfully', async () => {
      const tokenResponse: TokenResponse = {
        accessToken: 'new-access-token',
      };

      mockAuthApi.refresh.mockResolvedValue(tokenResponse);

      // Set initial auth state
      act(() => {
        useAuthStore.getState().setAuth(mockUser, 'old-token');
      });

      const { result } = renderHook(() => useRefreshToken(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockAuthApi.refresh).toHaveBeenCalled();
      expect(useAuthStore.getState().accessToken).toBe('new-access-token');
    });

    it('should clear auth on refresh failure', async () => {
      const error = new Error('Refresh token expired');
      mockAuthApi.refresh.mockRejectedValue(error);

      // Set initial auth state
      act(() => {
        useAuthStore.getState().setAuth(mockUser, 'old-token');
      });

      const { result } = renderHook(() => useRefreshToken(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('useAuth', () => {
    it('should provide all auth functionality', async () => {
      mockAuthApi.login.mockResolvedValue(mockAuthResponse);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();

      // Test login
      act(() => {
        result.current.login({
          email: 'test@example.com',
          password: 'SecurePass123!',
        });
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);
    });

    it('should expose all mutation states', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('loginAsync');
      expect(result.current).toHaveProperty('loginPending');
      expect(result.current).toHaveProperty('loginError');

      expect(result.current).toHaveProperty('register');
      expect(result.current).toHaveProperty('registerAsync');
      expect(result.current).toHaveProperty('registerPending');
      expect(result.current).toHaveProperty('registerError');

      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('logoutAsync');
      expect(result.current).toHaveProperty('logoutPending');
      expect(result.current).toHaveProperty('logoutError');

      expect(result.current).toHaveProperty('refreshToken');
      expect(result.current).toHaveProperty('refreshTokenAsync');
      expect(result.current).toHaveProperty('refreshTokenPending');
      expect(result.current).toHaveProperty('refreshTokenError');
    });
  });

  describe('authKeys', () => {
    it('should generate correct query keys', () => {
      expect(authKeys.all).toEqual(['auth']);
      expect(authKeys.currentUser()).toEqual(['auth', 'current-user']);
    });
  });
});
