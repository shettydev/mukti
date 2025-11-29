/**
 * Centralized application configuration
 * Single source of truth for all environment variables and app settings
 *
 * This file provides type-safe access to environment variables and ensures
 * consistent configuration across the entire application.
 *
 * Usage:
 * ```typescript
 * import { config } from '@/lib/config';
 *
 * // Access API URL
 * const apiUrl = config.api.baseUrl;
 *
 * // Check environment
 * if (config.isDevelopment) {
 *   console.log('Running in development mode');
 * }
 * ```
 */

/**
 * Validate required environment variables
 * Throws an error if any required variables are missing
 */
function validateEnv(): void {
  const required: string[] = [
    // Add required env vars here as needed
    // 'NEXT_PUBLIC_API_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please check your .env.local file.'
    );
  }
}

// Validate environment on module load (only in Node.js environment)
if (typeof window === 'undefined') {
  validateEnv();
}

/**
 * Application configuration object
 * All environment variables and app settings in one place
 */
export const config = {
  /**
   * API configuration
   */
  api: {
    /**
     * Base URL for the Mukti API
     * @default 'http://localhost:3000/api/v1'
     */
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',

    /**
     * API request timeout in milliseconds
     * @default 30000 (30 seconds)
     */
    timeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 30000,
  },

  /**
   * Application URLs
   */
  app: {
    /**
     * Base URL of the application
     * @default 'http://localhost:3001'
     */
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',

    /**
     * Site description
     */
    description:
      process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
      'AI mentor that uses the Socratic method to guide you toward your own insights',

    /**
     * Site name
     * @default 'Mukti'
     */
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Mukti',
  },

  /**
   * Authentication configuration
   */
  auth: {
    /**
     * Access token expiration time in seconds
     * @default 900 (15 minutes)
     */
    accessTokenExpiry: Number(process.env.NEXT_PUBLIC_ACCESS_TOKEN_EXPIRY) || 900,

    /**
     * Refresh token expiration time in seconds
     * @default 604800 (7 days)
     */
    refreshTokenExpiry: Number(process.env.NEXT_PUBLIC_REFRESH_TOKEN_EXPIRY) || 604800,

    /**
     * Time before token expiry to trigger refresh (in seconds)
     * @default 60 (1 minute)
     */
    tokenRefreshBuffer: Number(process.env.NEXT_PUBLIC_TOKEN_REFRESH_BUFFER) || 60,
  },

  /**
   * Cache configuration
   */
  cache: {
    /**
     * Default cache time for TanStack Query (in milliseconds)
     * @default 300000 (5 minutes)
     */
    defaultCacheTime: Number(process.env.NEXT_PUBLIC_CACHE_TIME) || 300000,

    /**
     * Default stale time for TanStack Query (in milliseconds)
     * @default 60000 (1 minute)
     */
    defaultStaleTime: Number(process.env.NEXT_PUBLIC_CACHE_STALE_TIME) || 60000,
  },

  /**
   * Environment information
   */
  env: {
    /**
     * Is client-side
     */
    isClient: typeof window !== 'undefined',

    /**
     * Is development environment
     */
    isDevelopment: process.env.NODE_ENV === 'development',

    /**
     * Is production environment
     */
    isProduction: process.env.NODE_ENV === 'production',

    /**
     * Is server-side rendering
     */
    isServer: typeof window === 'undefined',

    /**
     * Is test environment
     */
    isTest: process.env.NODE_ENV === 'test',

    /**
     * Current environment
     * @default 'development'
     */
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  },

  /**
   * Feature flags
   */
  features: {
    /**
     * Enable analytics
     * @default false in development, true in production
     */
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',

    /**
     * Enable debug mode
     * @default true in development, false in production
     */
    enableDebug: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',

    /**
     * Enable email verification
     * @default true
     */
    enableEmailVerification: process.env.NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION !== 'false',

    /**
     * Enable OAuth authentication
     * @default true
     */
    enableOAuth: process.env.NEXT_PUBLIC_ENABLE_OAUTH !== 'false',
  },

  /**
   * OAuth configuration
   */
  oauth: {
    /**
     * Apple OAuth client ID
     */
    appleClientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '',

    /**
     * Google OAuth client ID
     */
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',

    /**
     * OAuth redirect URI
     */
    redirectUri: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI || '',
  },

  /**
   * Pagination defaults
   */
  pagination: {
    /**
     * Default page size for lists
     * @default 20
     */
    defaultPageSize: Number(process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE) || 20,

    /**
     * Maximum page size
     * @default 100
     */
    maxPageSize: Number(process.env.NEXT_PUBLIC_MAX_PAGE_SIZE) || 100,
  },
} as const;

/**
 * Type-safe config access
 * Export individual config sections for convenience
 */
export const { api, app, auth, cache, env, features, oauth, pagination } = config;

/**
 * Helper function to get full API endpoint URL
 */
export function getApiUrl(endpoint: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${config.api.baseUrl}/${cleanEndpoint}`;
}

/**
 * Helper function to get full app URL
 */
export function getAppUrl(path: string = ''): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return cleanPath ? `${config.app.baseUrl}/${cleanPath}` : config.app.baseUrl;
}

/**
 * Helper function to check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof config.features): boolean {
  return config.features[feature];
}
