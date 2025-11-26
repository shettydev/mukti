import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { AuthResponseDto } from './auth-response.dto';
import { ChangePasswordDto } from './change-password.dto';
import { ForgotPasswordDto } from './forgot-password.dto';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';
import { ResetPasswordDto } from './reset-password.dto';
import { TokenResponseDto } from './token-response.dto';
import { UserResponseDto } from './user-response.dto';
import { VerifyEmailDto } from './verify-email.dto';

/**
 * Swagger documentation for getting CSRF token
 */
export const ApiGetCsrfToken = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Retrieves a CSRF token that must be included in the X-CSRF-Token header for all state-changing requests (POST, PUT, PATCH, DELETE). This protects against Cross-Site Request Forgery attacks.',
      summary: 'Get CSRF token',
    }),
    ApiResponse({
      description: 'CSRF token retrieved successfully',
      schema: {
        example: {
          csrfToken: 'abc123-csrf-token-xyz789',
        },
      },
      status: 200,
    }),
    ApiResponse({
      description: 'Internal server error',
      schema: {
        example: {
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to generate CSRF token',
          },
          success: false,
        },
      },
      status: 500,
    }),
  );

/**
 * Swagger documentation for user registration
 */
export const ApiRegister = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Registers a new user account with email and password. Sends a verification email upon successful registration.',
      summary: 'Register a new user',
    }),
    ApiBody({ type: RegisterDto }),
    ApiResponse({
      description: 'User successfully registered',
      status: 201,
      type: AuthResponseDto,
    }),
    ApiResponse({
      description: 'Validation error or invalid input',
      schema: {
        example: {
          error: {
            code: 'BAD_REQUEST',
            details: {
              email: ['email must be a valid email address'],
              password: [
                'password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
              ],
            },
            message: 'Validation failed',
          },
          success: false,
        },
      },
      status: 400,
    }),
    ApiResponse({
      description: 'User with this email already exists',
      schema: {
        example: {
          error: {
            code: 'CONFLICT',
            message: 'User with this email already exists',
          },
          success: false,
        },
      },
      status: 409,
    }),
  );

/**
 * Swagger documentation for user login
 */
export const ApiLogin = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Authenticates a user with email and password. Returns access and refresh tokens.',
      summary: 'Login with email and password',
    }),
    ApiBody({ type: LoginDto }),
    ApiResponse({
      description: 'User successfully authenticated',
      status: 200,
      type: AuthResponseDto,
    }),
    ApiResponse({
      description: 'Invalid credentials',
      schema: {
        example: {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid credentials',
          },
          success: false,
        },
      },
      status: 401,
    }),
    ApiResponse({
      description: 'Rate limit exceeded',
      schema: {
        example: {
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many login attempts. Please try again later.',
          },
          success: false,
        },
      },
      status: 429,
    }),
  );

/**
 * Swagger documentation for token refresh
 */
export const ApiRefresh = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Refreshes an access token using a valid refresh token from cookies.',
      summary: 'Refresh access token',
    }),
    ApiResponse({
      description: 'Access token refreshed successfully',
      status: 200,
      type: TokenResponseDto,
    }),
    ApiResponse({
      description: 'Invalid or expired refresh token',
      schema: {
        example: {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid refresh token',
          },
          success: false,
        },
      },
      status: 401,
    }),
  );

/**
 * Swagger documentation for logout
 */
export const ApiLogout = () =>
  applyDecorators(
    ApiOperation({
      description: 'Logs out the current user by revoking their refresh token.',
      summary: 'Logout current user',
    }),
    ApiBearerAuth(),
    ApiResponse({
      description: 'User successfully logged out',
      status: 204,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
  );

/**
 * Swagger documentation for logout all devices
 */
export const ApiLogoutAll = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Logs out the user from all devices by revoking all refresh tokens except the current one.',
      summary: 'Logout from all devices',
    }),
    ApiBearerAuth(),
    ApiResponse({
      description: 'User successfully logged out from all devices',
      status: 204,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
  );

/**
 * Swagger documentation for forgot password
 */
export const ApiForgotPassword = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Initiates the password reset process by sending a reset email with a time-limited token.',
      summary: 'Request password reset',
    }),
    ApiBody({ type: ForgotPasswordDto }),
    ApiResponse({
      description: 'Password reset email sent successfully',
      status: 200,
    }),
    ApiResponse({
      description: 'User with this email does not exist',
      schema: {
        example: {
          error: {
            code: 'NOT_FOUND',
            message: 'User with this email does not exist',
          },
          success: false,
        },
      },
      status: 404,
    }),
    ApiResponse({
      description: 'Rate limit exceeded',
      schema: {
        example: {
          error: {
            code: 'TOO_MANY_REQUESTS',
            message:
              'Too many password reset requests. Please try again later.',
          },
          success: false,
        },
      },
      status: 429,
    }),
  );

/**
 * Swagger documentation for reset password
 */
export const ApiResetPassword = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Resets a user password using a valid reset token. Invalidates all existing sessions.',
      summary: 'Reset password with token',
    }),
    ApiBody({ type: ResetPasswordDto }),
    ApiResponse({
      description: 'Password reset successfully',
      status: 200,
    }),
    ApiResponse({
      description: 'Invalid or expired reset token',
      schema: {
        example: {
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid or expired reset token',
          },
          success: false,
        },
      },
      status: 400,
    }),
  );

/**
 * Swagger documentation for email verification
 */
export const ApiVerifyEmail = () =>
  applyDecorators(
    ApiOperation({
      description: 'Verifies a user email address using a verification token.',
      summary: 'Verify email address',
    }),
    ApiBody({ type: VerifyEmailDto }),
    ApiResponse({
      description: 'Email verified successfully',
      status: 200,
    }),
    ApiResponse({
      description: 'Invalid or expired verification token',
      schema: {
        example: {
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid or expired verification token',
          },
          success: false,
        },
      },
      status: 400,
    }),
  );

/**
 * Swagger documentation for resend verification email
 */
export const ApiResendVerification = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Resends the email verification email to a user who has not yet verified their email.',
      summary: 'Resend verification email',
    }),
    ApiBody({
      schema: {
        properties: {
          email: {
            example: 'user@example.com',
            type: 'string',
          },
        },
        required: ['email'],
        type: 'object',
      },
    }),
    ApiResponse({
      description: 'Verification email sent successfully',
      status: 200,
    }),
    ApiResponse({
      description: 'User not found or email already verified',
      schema: {
        example: {
          error: {
            code: 'BAD_REQUEST',
            message: 'Email is already verified',
          },
          success: false,
        },
      },
      status: 400,
    }),
    ApiResponse({
      description: 'User with this email does not exist',
      schema: {
        example: {
          error: {
            code: 'NOT_FOUND',
            message: 'User with this email does not exist',
          },
          success: false,
        },
      },
      status: 404,
    }),
  );

/**
 * Swagger documentation for get current user
 */
export const ApiGetMe = () =>
  applyDecorators(
    ApiOperation({
      description: 'Retrieves the currently authenticated user information.',
      summary: 'Get current user',
    }),
    ApiBearerAuth(),
    ApiResponse({
      description: 'Current user information',
      status: 200,
      type: UserResponseDto,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
  );

/**
 * Swagger documentation for change password
 */
export const ApiChangePassword = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Changes the current user password after verifying the current password. Invalidates all existing sessions.',
      summary: 'Change password',
    }),
    ApiBearerAuth(),
    ApiBody({ type: ChangePasswordDto }),
    ApiResponse({
      description: 'Password changed successfully',
      status: 200,
    }),
    ApiResponse({
      description: 'Current password is incorrect',
      schema: {
        example: {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Current password is incorrect',
          },
          success: false,
        },
      },
      status: 401,
    }),
    ApiResponse({
      description: 'New password does not meet requirements',
      schema: {
        example: {
          error: {
            code: 'BAD_REQUEST',
            message:
              'New password must be at least 8 characters and contain uppercase, lowercase, number, and special character',
          },
          success: false,
        },
      },
      status: 400,
    }),
  );

/**
 * Swagger documentation for Google OAuth initiation
 */
export const ApiGoogleAuth = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Initiates Google OAuth 2.0 authentication flow. Redirects user to Google consent screen.',
      summary: 'Initiate Google OAuth',
    }),
    ApiResponse({
      description: 'Redirects to Google OAuth consent screen',
      status: 302,
    }),
  );

/**
 * Swagger documentation for Google OAuth callback
 */
export const ApiGoogleCallback = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Handles Google OAuth callback. Creates or links user account and returns authentication tokens.',
      summary: 'Google OAuth callback',
    }),
    ApiResponse({
      description: 'User successfully authenticated with Google',
      status: 200,
      type: AuthResponseDto,
    }),
    ApiResponse({
      description: 'Google authentication failed',
      schema: {
        example: {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Google authentication failed',
          },
          success: false,
        },
      },
      status: 401,
    }),
    ApiResponse({
      description: 'Google account already linked to another user',
      schema: {
        example: {
          error: {
            code: 'CONFLICT',
            message: 'This Google account is already linked to another user',
          },
          success: false,
        },
      },
      status: 409,
    }),
  );

/**
 * Swagger documentation for listing user sessions
 */
export const ApiGetSessions = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Retrieves all active sessions for the current user with device, location, and last activity information.',
      summary: 'List active sessions',
    }),
    ApiBearerAuth(),
    ApiResponse({
      description: 'Active sessions retrieved successfully',
      schema: {
        example: {
          data: [
            {
              _id: '507f1f77bcf86cd799439011',
              deviceInfo: 'Chrome on macOS',
              expiresAt: '2024-01-08T00:00:00Z',
              ipAddress: '192.168.1.1',
              isActive: true,
              lastActivityAt: '2024-01-01T12:00:00Z',
              location: 'San Francisco, CA',
              userAgent: 'Mozilla/5.0...',
              userId: '507f1f77bcf86cd799439012',
            },
          ],
          success: true,
        },
      },
      status: 200,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
  );

/**
 * Swagger documentation for revoking a specific session
 */
export const ApiRevokeSession = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Revokes a specific session by ID, immediately invalidating its refresh token.',
      summary: 'Revoke a session',
    }),
    ApiBearerAuth(),
    ApiResponse({
      description: 'Session revoked successfully',
      status: 204,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
    ApiResponse({
      description: 'Session not found or does not belong to user',
      schema: {
        example: {
          error: {
            code: 'NOT_FOUND',
            message:
              'Session 507f1f77bcf86cd799439011 not found or does not belong to user',
          },
          success: false,
        },
      },
      status: 404,
    }),
  );

/**
 * Swagger documentation for revoking all sessions
 */
export const ApiRevokeAllSessions = () =>
  applyDecorators(
    ApiOperation({
      description:
        'Revokes all sessions for the current user except the current one, logging out from all other devices.',
      summary: 'Revoke all sessions',
    }),
    ApiBearerAuth(),
    ApiResponse({
      description: 'All sessions revoked successfully',
      status: 204,
    }),
    ApiResponse({
      description: 'Unauthorized - JWT token missing or invalid',
      status: 401,
    }),
  );
