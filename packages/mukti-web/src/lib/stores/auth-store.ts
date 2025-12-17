/**
 * Authentication store using Zustand
 * Manages user authentication state and tokens
 *
 * @remarks
 * - Access tokens are stored in memory only (not persisted)
 * - User data is persisted to localStorage for better UX
 * - Refresh tokens are handled via httpOnly cookies (backend)
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { User } from '@/types/user.types';

interface AuthState {
  /**
   * Whether the store has been hydrated from storage
   */
  _hasHydrated: boolean;

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
   * Whether authentication is initializing (checking session)
   */
  isInitializing: boolean;

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
   * Set hydration state
   */
  setHasHydrated: (state: boolean) => void;

  /**
   * Set initialization state
   */
  setInitializing: (state: boolean) => void;

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
      _hasHydrated: false,
      accessToken: null,
      clearAuth: () =>
        set({
          accessToken: null,
          isAuthenticated: false,
          user: null,
        }),
      isAuthenticated: false,
      isInitializing: true,
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

      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setInitializing: (state) => set({ isInitializing: state }),

      setUser: (user) =>
        set((state) => ({
          isAuthenticated: !!user && !!state.accessToken,
          user,
        })),

      user: null,
    }),
    {
      name: 'mukti-auth-storage',
      // On rehydration, keep user but clear access token
      // isAuthenticated stays false until token is refreshed
      // The user presence indicates a session restoration is needed
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.accessToken = null;
          // Keep isAuthenticated false - the useAuth hook will handle
          // session restoration by checking if user exists
          state.isAuthenticated = false;
          state._hasHydrated = true;
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
