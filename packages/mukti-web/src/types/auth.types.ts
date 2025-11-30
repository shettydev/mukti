/**
 * Authentication type definitions for frontend
 * Based on auth DTOs from backend
 */

import type { User } from './user.types';

/**
 * Authentication response (login/register)
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/**
 * Forgot password request payload
 */
export interface ForgotPasswordDto {
  email: string;
}

/**
 * Login request payload
 */
export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * OAuth authentication request payload
 */
export interface OAuthDto {
  code: string;
}

/**
 * Registration request payload
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
 */
export interface ResendVerificationDto {
  email: string;
}

/**
 * Reset password request payload
 */
export interface ResetPasswordDto {
  newPassword: string;
  token: string;
}

/**
 * Session data structure
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
 */
export interface SessionsResponse {
  sessions: Session[];
}

/**
 * Token refresh response
 */
export interface TokenResponse {
  accessToken: string;
}

/**
 * Email verification request payload
 */
export interface VerifyEmailDto {
  token: string;
}
