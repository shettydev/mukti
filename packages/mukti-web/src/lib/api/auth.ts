/**
 * Authentication API client
 * Provides functions for all authentication-related API calls
 *
 * Features:
 * - User registration and login
 * - Token refresh and logout
 * - Password reset flow
 * - Email verification
 * - OAuth authentication (Google, Apple)
 */

import type {
  AuthResponse,
  ForgotPasswordDto,
  LoginDto,
  OAuthDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  SessionsResponse,
  TokenResponse,
  VerifyEmailDto,
} from '@/types/auth.types';

import { apiClient } from './client';

/**
 * Authentication API endpoints
 */
export const authApi = {
  /**
   * Authenticate with Apple OAuth
   *
   * @param dto - OAuth authorization code from Apple
   * @returns Authentication response with user data and tokens
   * @throws {ApiClientError} If OAuth authentication fails
   *
   * @example
   * ```typescript
   * // After Apple OAuth redirect
   * const code = new URLSearchParams(window.location.search).get('code');
   * const response = await authApi.appleAuth({ code });
   * ```
   */
  appleAuth: async (dto: OAuthDto): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/auth/apple/callback', dto);
  },

  /**
   * Request password reset email
   *
   * @param dto - Email address to send reset link
   * @returns void
   * @throws {ApiClientError} If request fails
   *
   * @example
   * ```typescript
   * await authApi.forgotPassword({
   *   email: 'john@example.com'
   * });
   * // User will receive email with reset link
   * ```
   */
  forgotPassword: async (dto: ForgotPasswordDto): Promise<void> => {
    return apiClient.post<void>('/auth/forgot-password', dto);
  },

  /**
   * Get all active sessions for the current user
   *
   * @returns List of active sessions with device and location info
   * @throws {ApiClientError} If request fails
   *
   * @example
   * ```typescript
   * const response = await authApi.getSessions();
   * console.log(response);
   * ```
   */
  getSessions: async (): Promise<SessionsResponse> => {
    const sessions = await apiClient.get<Array<Record<string, unknown>>>('/auth/sessions');
    // Transform _id to id for frontend compatibility
    return sessions.map((session) => ({
      ...session,
      id: session._id as string,
    })) as SessionsResponse;
  },

  /**
   * Authenticate with Google OAuth
   *
   * @param dto - OAuth authorization code from Google
   * @returns Authentication response with user data and tokens
   * @throws {ApiClientError} If OAuth authentication fails
   *
   * @example
   * ```typescript
   * // After Google OAuth redirect
   * const code = new URLSearchParams(window.location.search).get('code');
   * const response = await authApi.googleAuth({ code });
   * ```
   */
  googleAuth: async (dto: OAuthDto): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/auth/google/callback', dto);
  },

  /**
   * Login with email and password
   *
   * @param dto - Login credentials (email, password)
   * @returns Authentication response with user data and tokens
   * @throws {ApiClientError} If credentials are invalid
   *
   * @example
   * ```typescript
   * const response = await authApi.login({
   *   email: 'john@example.com',
   *   password: 'SecurePass123!'
   * });
   * ```
   */
  login: async (dto: LoginDto): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/auth/login', dto);
  },

  /**
   * Logout current user and invalidate tokens
   *
   * @returns void
   * @throws {ApiClientError} If logout fails
   *
   * @example
   * ```typescript
   * await authApi.logout();
   * // Clear auth state
   * useAuthStore.getState().clearAuth();
   * ```
   */
  logout: async (): Promise<void> => {
    return apiClient.post<void>('/auth/logout');
  },

  /**
   * Refresh access token using refresh token (httpOnly cookie)
   *
   * @returns New access token
   * @throws {ApiClientError} If refresh token is invalid or expired
   *
   * @example
   * ```typescript
   * const response = await authApi.refresh();
   * // Update access token in store
   * useAuthStore.getState().setAccessToken(response.accessToken);
   * ```
   */
  refresh: async (): Promise<TokenResponse> => {
    return apiClient.post<TokenResponse>('/auth/refresh');
  },

  /**
   * Register a new user account
   *
   * @param dto - Registration data (email, password, firstName, lastName, phone)
   * @returns Authentication response with user data and tokens
   * @throws {ApiClientError} If registration fails (e.g., duplicate email)
   *
   * @example
   * ```typescript
   * const response = await authApi.register({
   *   email: 'john@example.com',
   *   password: 'SecurePass123!',
   *   firstName: 'John',
   *   lastName: 'Doe',
   *   phone: '+1234567890'
   * });
   * ```
   */
  register: async (dto: RegisterDto): Promise<AuthResponse> => {
    // Remove empty phone field to avoid validation errors
    const payload = { ...dto };
    if (!payload.phone || payload.phone.trim() === '') {
      delete payload.phone;
    }
    return apiClient.post<AuthResponse>('/auth/register', payload);
  },

  /**
   * Resend email verification link
   *
   * @param dto - Email address to resend verification
   * @returns void
   * @throws {ApiClientError} If request fails
   *
   * @example
   * ```typescript
   * await authApi.resendVerification({
   *   email: 'john@example.com'
   * });
   * ```
   */
  resendVerification: async (dto: ResendVerificationDto): Promise<void> => {
    return apiClient.post<void>('/auth/resend-verification', dto);
  },

  /**
   * Reset password with token from email
   *
   * @param dto - Reset token and new password
   * @returns void
   * @throws {ApiClientError} If token is invalid or expired
   *
   * @example
   * ```typescript
   * await authApi.resetPassword({
   *   token: 'reset-token-from-email',
   *   newPassword: 'NewSecurePass123!'
   * });
   * ```
   */
  resetPassword: async (dto: ResetPasswordDto): Promise<void> => {
    return apiClient.post<void>('/auth/reset-password', dto);
  },

  /**
   * Revoke all sessions except the current one
   *
   * @returns void
   * @throws {ApiClientError} If revocation fails
   *
   * @example
   * ```typescript
   * await authApi.revokeAllSessions();
   * // All other devices will be logged out
   * ```
   */
  revokeAllSessions: async (): Promise<void> => {
    return apiClient.delete<void>('/auth/sessions/all');
  },

  /**
   * Revoke a specific session by ID
   *
   * @param sessionId - ID of the session to revoke
   * @returns void
   * @throws {ApiClientError} If session not found or revocation fails
   *
   * @example
   * ```typescript
   * await authApi.revokeSession('session-id-123');
   * ```
   */
  revokeSession: async (sessionId: string): Promise<void> => {
    return apiClient.delete<void>(`/auth/sessions/${sessionId}`);
  },

  /**
   * Verify email address with token from email
   *
   * @param dto - Verification token
   * @returns void
   * @throws {ApiClientError} If token is invalid or expired
   *
   * @example
   * ```typescript
   * await authApi.verifyEmail({
   *   token: 'verification-token-from-email'
   * });
   * ```
   */
  verifyEmail: async (dto: VerifyEmailDto): Promise<void> => {
    return apiClient.post<void>('/auth/verify-email', dto);
  },
};
