/**
 * Tests for API Client
 */

import { apiClient, ApiClientError } from '../client';

// Mock fetch globally
global.fetch = jest.fn() as unknown as typeof fetch;

const mockAuthState = {
  accessToken: 'mock-access-token',
  clearAuth: jest.fn(),
  isAuthenticated: true,
  setAccessToken: jest.fn(),
  user: { id: 'user-1' },
};

// Mock auth store
jest.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: {
    getState: jest.fn(() => mockAuthState),
  },
}));

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.accessToken = 'mock-access-token';
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = { id: 'user-1' };
    // Reset CSRF token to ensure predictable test behavior
    (apiClient as any).csrfToken = null;
    apiClient.configureRetry({
      maxRetries: 0,
      retryDelay: 0,
      useExponentialBackoff: false,
    });
  });

  describe('GET requests', () => {
    it('should make a successful GET request', async () => {
      const mockData = { id: '1', name: 'Test' };
      const mockResponse = {
        data: mockData,
        success: true,
      };

      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
        ok: true,
        status: 200,
      });

      const result = await apiClient.get('/test');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should include Authorization header when token exists', async () => {
      const mockResponse = {
        data: {},
        success: true,
      };

      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
        ok: true,
        status: 200,
      });

      await apiClient.get('/test');

      const fetchCall = (global.fetch as unknown as jest.Mock).mock.calls[0];
      const headers = fetchCall[1].headers as Headers;

      expect(headers.get('Authorization')).toBe('Bearer mock-access-token');
    });
  });

  describe('POST requests', () => {
    it('should make a successful POST request with body', async () => {
      const requestBody = { name: 'Test' };
      const mockResponse = {
        data: { id: '1', ...requestBody },
        success: true,
      };

      // Mock CSRF token response
      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ csrfToken: 'mock-csrf-token' }),
        ok: true,
        status: 200,
      });

      // Mock API response
      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
        ok: true,
        status: 201,
      });

      const result = await apiClient.post('/test', requestBody);

      expect(result).toEqual(mockResponse.data);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          body: JSON.stringify(requestBody),
          method: 'POST',
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should throw ApiClientError on error response', async () => {
      const mockError = {
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
        success: false,
      };

      const mockResponse = {
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockError,
        ok: false,
        status: 404,
        url: 'http://localhost:3000/api/v1/test',
      };

      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce(mockResponse);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiClientError);
    });

    it('should handle network errors', async () => {
      (global.fetch as unknown as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/test')).rejects.toThrow(ApiClientError);
    });

    it('should clear auth session when refresh endpoint returns 401', async () => {
      const refreshError = {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid refresh token',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
        success: false,
      };

      // CSRF token fetch for initial /auth/refresh request
      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ csrfToken: 'cleanup-csrf-token' }),
        ok: true,
        status: 200,
      });

      // Original /auth/refresh request
      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => refreshError,
        ok: false,
        status: 401,
        url: 'http://localhost:3000/api/v1/auth/refresh',
      });

      // Logout request during cleanup
      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        headers: new Headers(),
        ok: true,
        status: 204,
      });

      await expect(apiClient.post('/auth/refresh')).rejects.toThrow(ApiClientError);

      expect(mockAuthState.clearAuth).toHaveBeenCalledTimes(1);

      const logoutCall = (global.fetch as unknown as jest.Mock).mock.calls.find((call) =>
        String(call[0]).includes('/auth/logout')
      );

      expect(logoutCall).toBeDefined();

      const logoutOptions = logoutCall?.[1] as RequestInit;
      const logoutHeaders = new Headers(logoutOptions.headers);

      expect(logoutOptions.credentials).toBe('include');
      expect(logoutOptions.method).toBe('POST');
      expect(logoutHeaders.get('X-CSRF-Token')).toBe('cleanup-csrf-token');
    });
  });

  describe('Request methods', () => {
    beforeEach(() => {
      (global.fetch as unknown as jest.Mock).mockResolvedValue({
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: {}, success: true }),
        ok: true,
        status: 200,
      });
    });

    it('should support PATCH requests', async () => {
      await apiClient.patch('/test', { name: 'Updated' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    it('should support PUT requests', async () => {
      await apiClient.put('/test', { name: 'Replaced' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });

    it('should support DELETE requests', async () => {
      await apiClient.delete('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Interceptors', () => {
    it('should execute request interceptors', async () => {
      const mockInterceptor = jest.fn((url, options) => ({ options, url }));
      apiClient.addRequestInterceptor(mockInterceptor);

      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: {}, success: true }),
        ok: true,
        status: 200,
      });

      await apiClient.get('/test');

      expect(mockInterceptor).toHaveBeenCalled();
    });

    it('should execute response interceptors', async () => {
      const mockInterceptor = jest.fn((response) => response);
      apiClient.addResponseInterceptor(mockInterceptor);

      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ data: {}, success: true }),
        ok: true,
        status: 200,
      });

      await apiClient.get('/test');

      expect(mockInterceptor).toHaveBeenCalled();
    });
  });

  describe('204 No Content handling', () => {
    it('should handle 204 responses correctly', async () => {
      const mockResponse = {
        headers: new Headers(),
        ok: true,
        status: 204,
        url: 'http://localhost:3000/api/v1/test',
      };

      // Mock CSRF token response
      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce({
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ csrfToken: 'mock-csrf-token' }),
        ok: true,
        status: 200,
      });

      (global.fetch as unknown as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await apiClient.delete('/test');

      expect(result).toBeUndefined();
    });
  });
});
