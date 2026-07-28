import { renderHook } from '@testing-library/react';

import { useAuthStore, useIsAuthenticated } from '@/lib/stores/auth-store';

const ORIGINAL = process.env.NEXT_PUBLIC_MUKTI_LOCAL;

describe('useIsAuthenticated — local-mode relaxation', () => {
  beforeEach(() => {
    // Ensure the store is unauthenticated (no user, no token).
    useAuthStore.getState().clearAuth();
  });

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.NEXT_PUBLIC_MUKTI_LOCAL;
    } else {
      process.env.NEXT_PUBLIC_MUKTI_LOCAL = ORIGINAL;
    }
  });

  it('is authenticated in local mode without a user or token', () => {
    process.env.NEXT_PUBLIC_MUKTI_LOCAL = '1';
    const { result } = renderHook(() => useIsAuthenticated());
    expect(result.current).toBe(true);
  });

  it('is NOT authenticated in hosted mode without a user or token', () => {
    delete process.env.NEXT_PUBLIC_MUKTI_LOCAL;
    const { result } = renderHook(() => useIsAuthenticated());
    expect(result.current).toBe(false);
  });
});
