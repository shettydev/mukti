/**
 * Tests for API Client
 */

import { apiClient, ApiClientError } from '../client';

// Mock fetch globally
global.fetch = jest.fn();

// Mock auth store
jest.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      accessToken: 'mock-access-token',
      clearAuth: jest.fn(),
      setAccessToken: jest.fn(),
    })),
  },
}));

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET requests', () => {
    it('should make a successful GET request', async () => {
      const mockData = { id: '1', name: 'Test' };
      const mockResponse = {
        data: mockData,
        success: true,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
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

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponse,
        ok: true,
        status: 200,
      });

      await apiClient.get('/test');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
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

      (global.fetch as jest.Mock).mockResolvedValueOnce({
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

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      await expect(apiClient.get('/test')).rejects.toThrow(ApiClientError);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/test')).rejects.toThrow(ApiClientError);
    });
  });

  describe('Request methods', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
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

      (global.fetch as jest.Mock).mockResolvedValueOnce({
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

      (global.fetch as jest.Mock).mockResolvedValueOnce({
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

      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await apiClient.delete('/test');

      expect(result).toBeUndefined();
    });
  });
});
