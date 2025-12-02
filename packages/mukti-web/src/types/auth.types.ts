/**
 * Authentication type definitions for frontend
 * Based on auth DTOs from backend
 */

import type { User } from './user.types';

/**
 * Authentication response (login/register)
 * @property {string} accessToken - JWT access token
 * @property {string} refreshToken - JWT refresh token
 * @property {User} user - Authenticated user data
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/**
 * Forgot password request payload
 * @property {string} email - User email address
 */
export interface ForgotPasswordDto {
  email: string;
}

/**
 * Login request payload
 * @property {string} email - User email address
 * @property {string} password - User password
 * @property {boolean} [rememberMe] - Keep user logged in
 */
export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * OAuth authentication request payload
 * @property {string} code - OAuth authorization code
 */
export interface OAuthDto {
  code: string;
}

/**
 * Registration request payload
 * @property {string} email - User email address
 * @property {string} firstName - User's first name
 * @property {string} lastName - User's last name
 * @property {string} password - User password
 * @property {string} [phone] - User phone number
 */
export interface RegisterDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string;
}

/**
 * Resend verification email request payload
 * @property {string} email - User email address
 */
export interface ResendVerificationDto {
  email: string;
}

/**
 * Reset password request payload
 * @property {string} newPassword - New password
 * @property {string} token - Password reset token
 */
export interface ResetPasswordDto {
  newPassword: string;
  token: string;
}

/**
 * Session data structure
 * @property {Date} createdAt - Session creation timestamp
 * @property {string} deviceInfo - Device information
 * @property {Date} expiresAt - Session expiration timestamp
 * @property {string} id - Unique session identifier
 * @property {string} ipAddress - IP address of session
 * @property {boolean} isActive - Whether session is active
 * @property {boolean} [isCurrent] - Whether this is the current session
 * @property {Date} lastActivityAt - Last activity timestamp
 * @property {string} [location] - Geographic location
 * @property {string} userAgent - Browser user agent
 * @property {string} userId - Associated user ID
 */
export interface Session {
  createdAt: Date;
  deviceInfo: string;
  expiresAt: Date;
  id: string;
  ipAddress: string;
  isActive: boolean;
  isCurrent?: boolean;
  lastActivityAt: Date;
  location?: string;
  userAgent: string;
  userId: string;
}

/**
 * Sessions list response
 * @property {Session[]} sessions - Array of user sessions
 */
export interface SessionsResponse {
  sessions: Session[];
}

/**
 * Token refresh response
 * @property {string} accessToken - New JWT access token
 */
export interface TokenResponse {
  accessToken: string;
}

/**
 * Email verification request payload
 * @property {string} token - Email verification token
 */
export interface VerifyEmailDto {
  token: string;
}
