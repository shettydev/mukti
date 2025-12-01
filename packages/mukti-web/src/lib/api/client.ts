/**
 * API Client with automatic token management and request/response interceptors
 *
 * Features:
 * - Automatic Authorization header injection
 * - Automatic token refresh on 401 responses
 * - Request/response interceptors
 * - Consistent error handling
 * - CSRF token support
 */

import { config } from '@/lib/config';
import { useAuthStore } from '@/lib/stores/auth-store';

/**
 * API configuration from centralized config
 */
const API_BASE_URL = config.api.baseUrl;

/**
 * Standard API error response format
 */
export interface ApiError {
  error: {
    code: string;
    details?: unknown;
    message: string;
  };
  meta: {
    requestId?: string;
    timestamp: string;
  };
  success: false;
}

/**
 * Standard API success response format
 */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    limit?: number;
    page?: number;
    requestId?: string;
    timestamp?: string;
    total?: number;
    totalPages?: number;
  };
  success: true;
}

/**
 * Error interceptor type
 */
type ErrorInterceptor = (error: ApiClientError) => never | Promise<never>;

/**
 * Request interceptor type
 */
type RequestInterceptor = (
  url: string,
  options: RequestInit
) => Promise<{ options: RequestInit; url: string }> | { options: RequestInit; url: string };

/**
 * Response interceptor type
 */
type ResponseInterceptor = (response: Response) => Promise<Response> | Response;

/**
 * Retry configuration
 */
interface RetryConfig {
  /**
   * Maximum number of retry attempts
   */
  maxRetries: number;
  /**
   * Delay between retries in milliseconds
   */
  retryDelay: number;
  /**
   * Whether to use exponential backoff
   */
  useExponentialBackoff: boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  useExponentialBackoff: true,
};

/**
 * API Client class with interceptor support
 */
class ApiClient {
  private errorInterceptors: ErrorInterceptor[] = [];
  private isRefreshing = false;
  private refreshPromise: null | Promise<string> = null;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG;

  constructor() {
    // Add default request interceptor for Authorization header
    this.addRequestInterceptor(this.authInterceptor.bind(this));

    // Add default response interceptor for token refresh
    this.addResponseInterceptor(this.tokenRefreshInterceptor.bind(this));
  }

  /**
   * Add an error interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * Add a request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add a response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Configure retry behavior
   */
  configureRetry(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      body: body ? JSON.stringify(body) : undefined,
      method: 'PATCH',
    });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      body: body ? JSON.stringify(body) : undefined,
      method: 'POST',
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      body: body ? JSON.stringify(body) : undefined,
      method: 'PUT',
    });
  }

  /**
   * Main request method with retry logic
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.requestWithRetry<T>(endpoint, options, 0);
  }

  /**
   * Default auth interceptor - adds Authorization header
   */
  private authInterceptor(
    url: string,
    options: RequestInit
  ): { options: RequestInit; url: string } {
    const accessToken = useAuthStore.getState().accessToken;

    if (accessToken) {
      const headers = new Headers(options.headers);
      headers.set('Authorization', `Bearer ${accessToken}`);

      return {
        options: { ...options, headers },
        url,
      };
    }

    return { options, url };
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attemptNumber: number): number {
    if (!this.retryConfig.useExponentialBackoff) {
      return this.retryConfig.retryDelay;
    }

    // Exponential backoff: delay * (2 ^ attemptNumber)
    // With jitter to prevent thundering herd
    const exponentialDelay = this.retryConfig.retryDelay * Math.pow(2, attemptNumber);
    const jitter = Math.random() * 1000; // Random jitter up to 1 second

    return exponentialDelay + jitter;
  }

  /**
   * Execute error interceptors
   */
  private async executeErrorInterceptors(error: ApiClientError): Promise<never> {
    let currentError = error;

    for (const interceptor of this.errorInterceptors) {
      try {
        await interceptor(currentError);
      } catch (err) {
        if (err instanceof ApiClientError) {
          currentError = err;
        }
      }
    }

    throw currentError;
  }

  /**
   * Execute request interceptors
   */
  private async executeRequestInterceptors(
    url: string,
    options: RequestInit
  ): Promise<{ options: RequestInit; url: string }> {
    let currentUrl = url;
    let currentOptions = options;

    for (const interceptor of this.requestInterceptors) {
      const result = await interceptor(currentUrl, currentOptions);
      currentUrl = result.url;
      currentOptions = result.options;
    }

    return { options: currentOptions, url: currentUrl };
  }

  /**
   * Execute response interceptors
   */
  private async executeResponseInterceptors(response: Response): Promise<Response> {
    let currentResponse = response;

    for (const interceptor of this.responseInterceptors) {
      currentResponse = await interceptor(currentResponse);
    }

    return currentResponse;
  }

  /**
   * Refresh the access token using the refresh token (in httpOnly cookie)
   */
  private async refreshAccessToken(): Promise<string> {
    try {
      // Check if user is authenticated before attempting refresh
      const authState = useAuthStore.getState();
      if (!authState.isAuthenticated || !authState.user) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        credentials: 'include', // Include httpOnly cookie
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = (await response.json()) as ApiResponse<{ accessToken: string }>;

      if (!data.success || !data.data.accessToken) {
        throw new Error('Invalid refresh response');
      }

      // Update access token in store
      useAuthStore.getState().setAccessToken(data.data.accessToken);

      return data.data.accessToken;
    } catch (error) {
      // Clear auth state on refresh failure
      useAuthStore.getState().clearAuth();
      throw error;
    }
  }

  /**
   * Internal request method with retry logic
   */
  private async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit,
    attemptNumber: number
  ): Promise<T> {
    try {
      // Construct full URL
      const url = `${API_BASE_URL}${endpoint}`;

      // Set default headers
      const defaultHeaders: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const requestOptions: RequestInit = {
        ...options,
        credentials: 'include', // Always include cookies for refresh token
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      };

      // Execute request interceptors
      const { options: interceptedOptions, url: interceptedUrl } =
        await this.executeRequestInterceptors(url, requestOptions);

      // Make the request
      let response = await fetch(interceptedUrl, interceptedOptions);

      // Execute response interceptors (including token refresh)
      response = await this.executeResponseInterceptors(response);

      // Handle 204 No Content early (before trying to parse JSON)
      if (response.status === 204) {
        return undefined as T;
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      let data: ApiError | ApiResponse<T>;

      if (isJson) {
        data = (await response.json()) as ApiError | ApiResponse<T>;
      } else {
        throw new ApiClientError('Unexpected response format', 'INVALID_RESPONSE', response.status);
      }

      // Handle error responses
      if (!response.ok || ('success' in data && !data.success)) {
        const errorData = data as ApiError;
        const error = new ApiClientError(
          errorData.error?.message || 'An error occurred',
          errorData.error?.code || 'UNKNOWN_ERROR',
          response.status,
          errorData.error?.details
        );

        // This will always throw
        await this.executeErrorInterceptors(error);
        // TypeScript doesn't know executeErrorInterceptors always throws
        throw error;
      }

      // Return successful data
      // Handle both wrapped ({ success: true, data: T }) and unwrapped (T) responses
      if ('success' in data && data.success) {
        return (data as ApiResponse<T>).data;
      }
      // If response is not wrapped, return it directly
      return data as T;
    } catch (error) {
      // Handle network errors or other exceptions
      const apiError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError(
              error instanceof Error ? error.message : 'Network error',
              'NETWORK_ERROR',
              0
            );

      // Check if we should retry
      if (this.shouldRetry(apiError, attemptNumber)) {
        // Calculate delay with exponential backoff
        const delay = this.calculateRetryDelay(attemptNumber);

        // Wait before retrying
        await this.sleep(delay);

        // Retry the request
        return this.requestWithRetry<T>(endpoint, options, attemptNumber + 1);
      }

      // No more retries, execute error interceptors and throw
      await this.executeErrorInterceptors(apiError);
      // TypeScript doesn't know executeErrorInterceptors always throws
      throw apiError;
    }
  }

  /**
   * Retry a failed request with a new access token
   */
  private async retryRequest(originalResponse: Response, newToken: string): Promise<Response> {
    const url = originalResponse.url;

    // Get the original request details from the response
    const headers = new Headers();
    originalResponse.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    // Update Authorization header with new token
    headers.set('Authorization', `Bearer ${newToken}`);

    // Retry the request (note: we can't get the original body from Response)
    // This is a limitation - if the original request had a body, it won't be retried
    const options: RequestInit = {
      credentials: 'include',
      headers,
      method: originalResponse.type === 'cors' ? 'GET' : 'GET', // Default to GET for retry
    };

    // Retry the request
    return fetch(url, options);
  }

  /**
   * Check if request should be retried
   */
  private shouldRetry(error: ApiClientError, attemptNumber: number): boolean {
    // Don't retry if we've exceeded max retries
    if (attemptNumber >= this.retryConfig.maxRetries) {
      return false;
    }

    // Retry on network errors
    if (error.code === 'NETWORK_ERROR' || error.status === 0) {
      return true;
    }

    // Retry on 5xx server errors
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Retry on 429 (rate limit) with backoff
    if (error.status === 429) {
      return true;
    }

    // Don't retry on other errors (4xx client errors, auth errors, etc.)
    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Token refresh interceptor - handles 401 responses
   */
  private async tokenRefreshInterceptor(response: Response): Promise<Response> {
    // If not a 401, return response as-is
    if (response.status !== 401) {
      return response;
    }

    // Don't retry refresh endpoint itself
    if (response.url.includes('/auth/refresh')) {
      // Clear auth state on refresh failure
      useAuthStore.getState().clearAuth();
      return response;
    }

    // Check if user is authenticated before attempting refresh
    const authState = useAuthStore.getState();
    if (!authState.isAuthenticated || !authState.user) {
      // Not authenticated, don't attempt refresh
      return response;
    }

    // If already refreshing, wait for that to complete
    if (this.isRefreshing && this.refreshPromise) {
      try {
        const newToken = await this.refreshPromise;
        // Retry the original request with new token
        return this.retryRequest(response, newToken);
      } catch {
        // Refresh failed, clear auth and return original response
        useAuthStore.getState().clearAuth();
        return response;
      }
    }

    // Start token refresh
    this.isRefreshing = true;
    this.refreshPromise = this.refreshAccessToken();

    try {
      const newToken = await this.refreshPromise;
      // Retry the original request with new token
      return this.retryRequest(response, newToken);
    } catch {
      // Refresh failed, clear auth and return original response
      useAuthStore.getState().clearAuth();
      return response;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }
}

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Singleton API client instance
 */
export const apiClient = new ApiClient();

/**
 * Convenience function for making API requests
 * @deprecated Use apiClient methods directly for better type safety
 */
export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return apiClient.request<T>(endpoint, options);
}
