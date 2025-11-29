/**
 * Authentication store using Zustand
 * Manages user authentication state and tokens
 *
 * @remarks
 * - Access tokens are stored in memory only (not persisted)
 * - User data is persisted to localStorage for better UX
 * - Refresh tokens are handled via httpOnly cookies (backend)
 *
 * Requirements: 3.2, 9.1
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { User } from '@/types/user.types';

interface AuthState {
  /**
   * JWT access token for API authentication
   * Stored in memory only (not persisted for security)
   */
  accessToken: null | string;

  /**
   * Clear all authentication state
   * Used during logout
   */
  clearAuth: () => void;

  /**
   * Whether user is authenticated
   * Derived from presence of user and accessToken
   */
  isAuthenticated: boolean;

  /**
   * Set the access token
   * @param token - JWT access token
   */
  setAccessToken: (token: null | string) => void;

  /**
   * Update authentication state with user and token
   * @param user - User object
   * @param accessToken - JWT access token
   */
  setAuth: (user: User, accessToken: string) => void;

  /**
   * Set the current user
   * @param user - User object to store
   */
  setUser: (user: null | User) => void;

  /**
   * Currently authenticated user
   * Persisted to localStorage
   */
  user: null | User;
}

/**
 * Auth store with persistence for user data only
 * Access tokens are kept in memory for security
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      clearAuth: () =>
        set({
          accessToken: null,
          isAuthenticated: false,
          user: null,
        }),
      isAuthenticated: false,

      setAccessToken: (token) =>
        set((state) => ({
          accessToken: token,
          isAuthenticated: !!state.user && !!token,
        })),

      setAuth: (user, accessToken) =>
        set({
          accessToken,
          isAuthenticated: true,
          user,
        }),

      setUser: (user) =>
        set((state) => ({
          isAuthenticated: !!user && !!state.accessToken,
          user,
        })),

      user: null,
    }),
    {
      name: 'mukti-auth-storage',
      // Restore access token as null on hydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.accessToken = null;
          state.isAuthenticated = false;
        }
      },
      // Only persist user data, not access token
      partialize: (state) => ({
        user: state.user,
      }),
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/**
 * Selector hooks for better performance
 * Use these instead of accessing the full store
 */

export const useUser = () => useAuthStore((state) => state.user);
export const useAccessToken = () => useAuthStore((state) => state.accessToken);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
