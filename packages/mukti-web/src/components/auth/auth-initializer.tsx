'use client';

import { useEffect, useRef } from 'react';

import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * Component to initialize authentication state on application load
 *
 * It attempts to refresh the access token using the httpOnly cookie.
 * This ensures that if the user has a valid session, they are automatically logged in.
 */
export function AuthInitializer() {
  const initialized = useRef(false);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setHasHydrated = useAuthStore((state) => state.setHasHydrated);
  const setInitializing = useAuthStore((state) => state.setInitializing);

  useEffect(() => {
    // Prevent double initialization in strict mode
    if (initialized.current) {
      return;
    }
    initialized.current = true;

    // Ensure hydration is marked as complete
    // This is a safety fallback in case Zustand's persist onRehydrateStorage doesn't fire
    setHasHydrated(true);

    const initAuth = async () => {
      try {
        // Attempt to get a new access token using the refresh token cookie
        const response = await authApi.refresh();

        if (response.accessToken) {
          // Check if we have user data in the store (from persistence)
          const currentUser = useAuthStore.getState().user;

          if (currentUser) {
            // We have user data, just set the token
            setAccessToken(response.accessToken);
          } else {
            // We have a token but no user data (e.g. cleared storage), fetch it
            try {
              // Set token first so the request is authenticated
              setAccessToken(response.accessToken);
              const user = await authApi.getMe();
              setAuth(user, response.accessToken);
            } catch {
              // If fetching user fails, we can't be authenticated
              throw new Error('Failed to fetch user profile');
            }
          }
        }
      } catch {
        // If refresh fails (e.g., no cookie or expired), clear auth state
        // We don't show an error here as it's expected for unauthenticated users
        clearAuth();

        // Ensure cookies are cleared to prevent middleware redirect loops
        try {
          await authApi.logout();
        } catch {
          // Ignore logout errors (e.g. if already logged out)
        }
      } finally {
        // Initialization complete
        setInitializing(false);
      }
    };

    initAuth();
  }, [setAccessToken, clearAuth, setHasHydrated, setInitializing, setAuth]);

  // This component doesn't render anything
  return null;
}
