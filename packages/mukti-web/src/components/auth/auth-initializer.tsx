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

  useEffect(() => {
    // Prevent double initialization in strict mode
    if (initialized.current) {
      return;
    }
    initialized.current = true;

    const initAuth = async () => {
      try {
        // Attempt to get a new access token using the refresh token cookie
        const response = await authApi.refresh();
        if (response.accessToken) {
          setAccessToken(response.accessToken);
        }
      } catch {
        // If refresh fails (e.g., no cookie or expired), clear auth state
        // We don't show an error here as it's expected for unauthenticated users
        clearAuth();
      }
    };

    initAuth();
  }, [setAccessToken, clearAuth]);

  // This component doesn't render anything
  return null;
}
