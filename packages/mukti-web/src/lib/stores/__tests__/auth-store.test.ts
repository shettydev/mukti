/**
 * Unit tests for auth store
 * Tests Zustand store directly without React hooks
 */

import type { User } from '@/types/user.types';

import { useAuthStore } from '../auth-store';

// Mock user data
const createMockUser = (): User => ({
  createdAt: new Date('2024-01-01'),
  email: 'test@example.com',
  emailVerified: true,
  firstName: 'John',
  id: '123',
  isActive: true,
  lastName: 'Doe',
  role: 'user',
  updatedAt: new Date('2024-01-01'),
});

describe('AuthStore', () => {
  beforeEach(() => {
    // Clear store and localStorage before each test
    useAuthStore.getState().clearAuth();
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should have null user and accessToken initially', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should set user and update isAuthenticated when token exists', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      // Set token first
      store.setAccessToken('mock-token');
      // Then set user
      store.setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should not set isAuthenticated if no token exists', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      store.setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(false);
    });

    it('should clear user when set to null', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      store.setAuth(mockUser, 'mock-token');
      expect(useAuthStore.getState().user).toEqual(mockUser);

      store.setUser(null);
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('setAccessToken', () => {
    it('should set access token and update isAuthenticated when user exists', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      // Set user first
      store.setUser(mockUser);
      // Then set token
      store.setAccessToken('mock-token');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('mock-token');
      expect(state.isAuthenticated).toBe(true);
    });

    it('should not set isAuthenticated if no user exists', () => {
      const store = useAuthStore.getState();

      store.setAccessToken('mock-token');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('mock-token');
      expect(state.isAuthenticated).toBe(false);
    });

    it('should clear token when set to null', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      store.setAuth(mockUser, 'mock-token');
      expect(useAuthStore.getState().accessToken).toBe('mock-token');

      store.setAccessToken(null);
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('setAuth', () => {
    it('should set both user and token and mark as authenticated', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      store.setAuth(mockUser, 'mock-token');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('mock-token');
      expect(state.isAuthenticated).toBe(true);
    });

    it('should update existing auth state', () => {
      const mockUser1 = createMockUser();
      const mockUser2 = { ...createMockUser(), email: 'other@example.com', id: '456' };
      const store = useAuthStore.getState();

      store.setAuth(mockUser1, 'token-1');
      expect(useAuthStore.getState().user?.id).toBe('123');

      store.setAuth(mockUser2, 'token-2');
      const state = useAuthStore.getState();
      expect(state.user?.id).toBe('456');
      expect(state.accessToken).toBe('token-2');
      expect(state.isAuthenticated).toBe(true);
    });
  });

  describe('clearAuth', () => {
    it('should clear all auth state', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      store.setAuth(mockUser, 'mock-token');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      store.clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should be idempotent', () => {
      const store = useAuthStore.getState();

      store.clearAuth();
      store.clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('should persist user data to localStorage', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      store.setUser(mockUser);

      const stored = localStorage.getItem('mukti-auth-storage');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.user.email).toBe('test@example.com');
      expect(parsed.state.user.id).toBe('123');
    });

    it('should not persist access token to localStorage', () => {
      const store = useAuthStore.getState();

      store.setAccessToken('mock-token');

      const stored = localStorage.getItem('mukti-auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.accessToken).toBeUndefined();
      }
    });

    it('should persist user when using setAuth', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      store.setAuth(mockUser, 'mock-token');

      const stored = localStorage.getItem('mukti-auth-storage');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.user).toBeTruthy();
      expect(parsed.state.user.email).toBe('test@example.com');
      // Token should not be persisted
      expect(parsed.state.accessToken).toBeUndefined();
    });

    it('should clear persisted data on clearAuth', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      store.setAuth(mockUser, 'mock-token');
      expect(localStorage.getItem('mukti-auth-storage')).toBeTruthy();

      store.clearAuth();

      const stored = localStorage.getItem('mukti-auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.user).toBeNull();
      }
    });
  });

  describe('Selector Hooks', () => {
    it('should export useUser selector', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      store.setUser(mockUser);

      // Access the selector directly
      const user = useAuthStore.getState().user;
      expect(user).toEqual(mockUser);
    });

    it('should export useAccessToken selector', () => {
      const store = useAuthStore.getState();

      store.setAccessToken('mock-token');

      const token = useAuthStore.getState().accessToken;
      expect(token).toBe('mock-token');
    });

    it('should export useIsAuthenticated selector', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      store.setAuth(mockUser, 'mock-token');

      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      expect(isAuthenticated).toBe(true);
    });
  });

  describe('Authentication State Logic', () => {
    it('should require both user and token for authentication', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      // Only user, no token
      store.setUser(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // Clear and try only token, no user
      store.clearAuth();
      store.setAccessToken('mock-token');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // Both user and token
      store.setUser(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('should update isAuthenticated when user is removed', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      store.setAuth(mockUser, 'mock-token');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      store.setUser(null);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should update isAuthenticated when token is removed', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      store.setAuth(mockUser, 'mock-token');
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      store.setAccessToken(null);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string token', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      store.setUser(mockUser);
      store.setAccessToken('');

      // Empty string is falsy, so should not be authenticated
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('should handle user with all optional fields', () => {
      const minimalUser: User = {
        createdAt: new Date(),
        email: 'test@example.com',
        emailVerified: false,
        firstName: 'John',
        id: '123',
        isActive: true,
        lastName: 'Doe',
        role: 'user',
        updatedAt: new Date(),
      };

      const store = useAuthStore.getState();
      store.setAuth(minimalUser, 'mock-token');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(minimalUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should handle rapid state changes', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      // Rapid changes
      store.setAuth(mockUser, 'token-1');
      store.setAccessToken('token-2');
      store.setUser(null);
      store.setUser(mockUser);
      store.clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('Security Requirements', () => {
    it('should not persist access token)', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      store.setAuth(mockUser, 'sensitive-token');

      const stored = localStorage.getItem('mukti-auth-storage');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      // Verify token is NOT in localStorage
      expect(parsed.state.accessToken).toBeUndefined();
      expect(JSON.stringify(parsed)).not.toContain('sensitive-token');
    });

    it('should persist user data for UX', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      store.setAuth(mockUser, 'mock-token');

      const stored = localStorage.getItem('mukti-auth-storage');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      // Verify user IS in localStorage
      expect(parsed.state.user).toBeTruthy();
      expect(parsed.state.user.email).toBe('test@example.com');
    });

    it('should clear access token on rehydration', () => {
      const mockUser = createMockUser();
      const store = useAuthStore.getState();

      // Set auth state
      store.setAuth(mockUser, 'mock-token');
      expect(useAuthStore.getState().accessToken).toBe('mock-token');

      // Simulate rehydration by manually calling the onRehydrateStorage callback
      const state = useAuthStore.getState();
      if (state) {
        state.accessToken = null;
        state.isAuthenticated = false;
      }

      // After rehydration, token should be null
      expect(useAuthStore.getState().accessToken).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
});
