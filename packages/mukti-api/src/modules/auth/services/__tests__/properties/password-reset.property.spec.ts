import type { TestingModule } from '@nestjs/testing';

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import * as fc from 'fast-check';
import { Types } from 'mongoose';

import { User } from '../../../../../schemas/user.schema';
import { AuthService } from '../../auth.service';
import { EmailService } from '../../email.service';
import { JwtTokenService } from '../../jwt.service';
import { PasswordService } from '../../password.service';
import { RateLimitService } from '../../rate-limit.service';
import { TokenService } from '../../token.service';

/**
 * Property-Based Tests for Password Reset
 *
 * Feature: auth-system, Property 12: Password reset request sends email
 * Validates: Requirements 4.1
 *
 * Feature: auth-system, Property 13: Valid reset token allows password change
 * Validates: Requirements 4.2
 *
 * Feature: auth-system, Property 14: Password reset invalidates all sessions
 * Validates: Requirements 4.5, 11.3
 */
describe('AuthService - Password Reset Properties', () => {
  let service: AuthService;
  let mockUserModel: any;
  let mockPasswordService: any;
  let mockJwtService: any;
  let mockTokenService: any;
  let mockEmailService: any;

  // Arbitraries for generating test data
  const emailArb = fc.emailAddress();

  // Generate valid passwords by construction instead of filtering
  const passwordArb = fc
    .tuple(
      fc.string({ maxLength: 5, minLength: 1 }).map((s) => s.toUpperCase()), // Uppercase
      fc.string({ maxLength: 5, minLength: 1 }).map((s) => s.toLowerCase()), // Lowercase
      fc.integer({ max: 9999, min: 0 }).map(String), // Digits
      fc.constantFrom('@', '$', '!', '%', '*', '?', '&'), // Special char
      fc.string({ maxLength: 5, minLength: 0 }), // Filler
    )
    .map(([upper, lower, digit, special, filler]) => {
      // Combine all parts and shuffle
      const parts = (upper + lower + digit + special + filler).split('');
      for (let i = parts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [parts[i], parts[j]] = [parts[j], parts[i]];
      }
      return parts.join('').slice(0, 20);
    });

  // Generate valid hex tokens by construction (64 hex characters)
  const tokenArb = fc
    .array(fc.integer({ max: 255, min: 0 }), { maxLength: 32, minLength: 32 })
    .map((bytes) => Buffer.from(bytes).toString('hex'));

  beforeEach(async () => {
    // Create fresh mock implementations for each test
    mockUserModel = {
      create: jest.fn(),
      findOne: jest.fn().mockReturnValue({
        select: jest.fn(),
      }),
    };

    mockPasswordService = {
      hashPassword: jest.fn(),
      validatePasswordStrength: jest.fn(),
    };

    mockJwtService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
    };

    mockTokenService = {
      createRefreshToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    };

    mockEmailService = {
      sendPasswordResetEmail: jest.fn(),
      sendVerificationEmail: jest.fn(),
    };

    const mockRateLimitService = {
      checkRateLimit: jest.fn().mockResolvedValue(undefined),
      resetRateLimit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
        {
          provide: JwtTokenService,
          useValue: mockJwtService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  /**
   * Property 12: Password reset request sends email
   *
   * For any registered email address, requesting a password reset should
   * send an email containing a time-limited reset token.
   */
  describe('Property 12: Password reset request sends email', () => {
    it('should send reset email for any registered email address', async () => {
      await fc.assert(
        fc.asyncProperty(emailArb, async (email) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          // Setup: User exists with password
          const mockUserId = new Types.ObjectId();
          const mockUser = {
            _id: mockUserId,
            email,
            password: 'hashed-password',
            passwordResetExpires: undefined as Date | undefined,
            passwordResetToken: undefined as string | undefined,
            save: jest.fn().mockResolvedValue(true),
          };

          mockUserModel.findOne.mockResolvedValue(mockUser);
          mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

          // Execute
          await service.forgotPassword({ email });

          // Verify user was found
          expect(mockUserModel.findOne).toHaveBeenCalledWith({ email });

          // Verify reset token was set
          expect(mockUser.save).toHaveBeenCalled();
          expect(mockUser.passwordResetToken).toBeDefined();
          expect(mockUser.passwordResetExpires).toBeDefined();

          // Verify token is a hex string
          expect(mockUser.passwordResetToken).toMatch(/^[a-f0-9]{64}$/);

          // Verify expiration is approximately 1 hour from now
          const now = new Date();
          const oneHour = 60 * 60 * 1000;
          expect(mockUser.passwordResetExpires).toBeDefined();
          const expiresAt = mockUser.passwordResetExpires!.getTime();
          const expectedExpiry = now.getTime() + oneHour;
          expect(Math.abs(expiresAt - expectedExpiry)).toBeLessThan(5000); // Within 5 seconds

          // Verify email was sent with the token
          expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
            email,
            mockUser.passwordResetToken,
          );
        }),
        { numRuns: 10 },
      );
    });

    it('should throw NotFoundException for non-existent email', async () => {
      await fc.assert(
        fc.asyncProperty(emailArb, async (email) => {
          // Reset mocks
          jest.clearAllMocks();

          // Setup: User does not exist
          mockUserModel.findOne.mockResolvedValue(null);

          // Execute and verify
          await expect(service.forgotPassword({ email })).rejects.toThrow(
            NotFoundException,
          );
          await expect(service.forgotPassword({ email })).rejects.toThrow(
            'User with this email does not exist',
          );

          // Verify no email was sent
          expect(
            mockEmailService.sendPasswordResetEmail,
          ).not.toHaveBeenCalled();
        }),
        { numRuns: 10 },
      );
    });

    it('should throw BadRequestException for OAuth users without password', async () => {
      await fc.assert(
        fc.asyncProperty(emailArb, async (email) => {
          // Reset mocks
          jest.clearAllMocks();

          // Setup: User exists but has no password (OAuth user)
          const mockUser = {
            _id: new Types.ObjectId(),
            email,
            googleId: 'google-123',
            password: undefined,
          };

          mockUserModel.findOne.mockResolvedValue(mockUser);

          // Execute and verify
          await expect(service.forgotPassword({ email })).rejects.toThrow(
            BadRequestException,
          );
          await expect(service.forgotPassword({ email })).rejects.toThrow(
            /OAuth authentication/,
          );

          // Verify no email was sent
          expect(
            mockEmailService.sendPasswordResetEmail,
          ).not.toHaveBeenCalled();
        }),
        { numRuns: 10 },
      );
    });

    it('should clear token if email sending fails', async () => {
      await fc.assert(
        fc.asyncProperty(emailArb, async (email) => {
          // Reset mocks
          jest.clearAllMocks();

          // Setup: User exists but email fails
          const mockUser = {
            _id: new Types.ObjectId(),
            email,
            password: 'hashed-password',
            passwordResetExpires: undefined,
            passwordResetToken: undefined,
            save: jest.fn().mockResolvedValue(true),
          };

          mockUserModel.findOne.mockResolvedValue(mockUser);
          mockEmailService.sendPasswordResetEmail.mockRejectedValue(
            new Error('Email service error'),
          );

          // Execute and verify
          await expect(service.forgotPassword({ email })).rejects.toThrow(
            'Failed to send password reset email',
          );

          // Verify token was cleared after email failure
          expect(mockUser.save).toHaveBeenCalledTimes(2); // Once to set, once to clear
          expect(mockUser.passwordResetToken).toBeUndefined();
          expect(mockUser.passwordResetExpires).toBeUndefined();
        }),
        { numRuns: 10 },
      );
    });
  });

  /**
   * Property 13: Valid reset token allows password change
   *
   * For any valid password reset token, using it to reset the password
   * should update the user's password and allow login with the new password.
   */
  describe('Property 13: Valid reset token allows password change', () => {
    it('should reset password for any valid token and new password', async () => {
      await fc.assert(
        fc.asyncProperty(tokenArb, passwordArb, async (token, newPassword) => {
          // Reset mocks
          jest.clearAllMocks();

          // Setup: User exists with valid reset token
          const mockUserId = new Types.ObjectId();
          const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
          const mockUser = {
            _id: mockUserId,
            email: 'user@example.com',
            password: 'old-hashed-password',
            passwordResetExpires: futureDate,
            passwordResetToken: token,
            save: jest.fn().mockResolvedValue(true),
          };

          mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
          });
          mockPasswordService.validatePasswordStrength.mockReturnValue(true);
          mockPasswordService.hashPassword.mockResolvedValue(
            'new-hashed-password',
          );
          mockTokenService.revokeAllUserTokens.mockResolvedValue(undefined);

          // Execute
          await service.resetPassword({ newPassword, token });

          // Verify user was found by token
          expect(mockUserModel.findOne).toHaveBeenCalledWith({
            passwordResetToken: token,
          });

          // Verify password strength was validated
          expect(
            mockPasswordService.validatePasswordStrength,
          ).toHaveBeenCalledWith(newPassword);

          // Verify new password was hashed
          expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(
            newPassword,
          );

          // Verify password was updated
          expect(mockUser.password).toBe('new-hashed-password');

          // Verify reset token was cleared
          expect(mockUser.passwordResetToken).toBeUndefined();
          expect(mockUser.passwordResetExpires).toBeUndefined();

          // Verify user was saved
          expect(mockUser.save).toHaveBeenCalled();

          // Verify all sessions were invalidated
          expect(mockTokenService.revokeAllUserTokens).toHaveBeenCalledWith(
            mockUserId,
          );
        }),
        { numRuns: 10 },
      );
    });

    it('should reject invalid or non-existent tokens', async () => {
      await fc.assert(
        fc.asyncProperty(tokenArb, passwordArb, async (token, newPassword) => {
          // Reset mocks
          jest.clearAllMocks();

          // Setup: No user found with this token
          mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(null),
          });

          // Execute and verify
          await expect(
            service.resetPassword({ newPassword, token }),
          ).rejects.toThrow(BadRequestException);
          await expect(
            service.resetPassword({ newPassword, token }),
          ).rejects.toThrow(/Invalid or expired reset token/);

          // Verify no password operations occurred
          expect(mockPasswordService.hashPassword).not.toHaveBeenCalled();
          expect(mockTokenService.revokeAllUserTokens).not.toHaveBeenCalled();
        }),
        { numRuns: 10 },
      );
    });

    it('should reject expired tokens', async () => {
      await fc.assert(
        fc.asyncProperty(tokenArb, passwordArb, async (token, newPassword) => {
          // Reset mocks
          jest.clearAllMocks();

          // Setup: User exists but token is expired
          const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
          const mockUser = {
            _id: new Types.ObjectId(),
            email: 'user@example.com',
            password: 'old-hashed-password',
            passwordResetExpires: pastDate,
            passwordResetToken: token,
            save: jest.fn().mockResolvedValue(true),
          };

          mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
          });

          // Execute and verify
          await expect(
            service.resetPassword({ newPassword, token }),
          ).rejects.toThrow(BadRequestException);
          await expect(
            service.resetPassword({ newPassword, token }),
          ).rejects.toThrow(/expired/i);

          // Verify token was cleared
          expect(mockUser.save).toHaveBeenCalled();
          expect(mockUser.passwordResetToken).toBeUndefined();
          expect(mockUser.passwordResetExpires).toBeUndefined();

          // Verify no password change occurred
          expect(mockPasswordService.hashPassword).not.toHaveBeenCalled();
          expect(mockTokenService.revokeAllUserTokens).not.toHaveBeenCalled();
        }),
        { numRuns: 10 },
      );
    });

    it('should reject weak passwords', async () => {
      // Generate weak passwords (missing requirements)
      const weakPasswordArb = fc.oneof(
        fc.string({ maxLength: 7, minLength: 1 }), // Too short
        fc
          .string({ maxLength: 20, minLength: 8 })
          .filter((s) => !/[A-Z]/.test(s)), // No uppercase
        fc
          .string({ maxLength: 20, minLength: 8 })
          .filter((s) => !/[a-z]/.test(s)), // No lowercase
        fc.string({ maxLength: 20, minLength: 8 }).filter((s) => !/\d/.test(s)), // No digit
        fc
          .string({ maxLength: 20, minLength: 8 })
          .filter((s) => !/[@$!%*?&]/.test(s)), // No special char
      );

      await fc.assert(
        fc.asyncProperty(
          tokenArb,
          weakPasswordArb,
          async (token, weakPassword) => {
            // Reset mocks
            jest.clearAllMocks();

            // Setup: User exists with valid token
            const futureDate = new Date(Date.now() + 30 * 60 * 1000);
            const mockUser = {
              _id: new Types.ObjectId(),
              email: 'user@example.com',
              password: 'old-hashed-password',
              passwordResetExpires: futureDate,
              passwordResetToken: token,
              save: jest.fn().mockResolvedValue(true),
            };

            mockUserModel.findOne.mockReturnValue({
              select: jest.fn().mockResolvedValue(mockUser),
            });
            mockPasswordService.validatePasswordStrength.mockReturnValue(false);

            // Execute and verify
            await expect(
              service.resetPassword({ newPassword: weakPassword, token }),
            ).rejects.toThrow(BadRequestException);
            await expect(
              service.resetPassword({ newPassword: weakPassword, token }),
            ).rejects.toThrow(/Password must be at least 8 characters/);

            // Verify password was not hashed or saved
            expect(mockPasswordService.hashPassword).not.toHaveBeenCalled();
            expect(mockTokenService.revokeAllUserTokens).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  /**
   * Property 14: Password reset invalidates all sessions
   *
   * For any user who successfully resets their password, all existing
   * sessions for that user should be invalidated, requiring re-authentication
   * on all devices.
   */
  describe('Property 14: Password reset invalidates all sessions', () => {
    it('should invalidate all sessions after successful password reset', async () => {
      await fc.assert(
        fc.asyncProperty(tokenArb, passwordArb, async (token, newPassword) => {
          // Reset mocks
          jest.clearAllMocks();

          // Setup: User exists with valid reset token
          const mockUserId = new Types.ObjectId();
          const futureDate = new Date(Date.now() + 30 * 60 * 1000);
          const mockUser = {
            _id: mockUserId,
            email: 'user@example.com',
            password: 'old-hashed-password',
            passwordResetExpires: futureDate,
            passwordResetToken: token,
            save: jest.fn().mockResolvedValue(true),
          };

          mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
          });
          mockPasswordService.validatePasswordStrength.mockReturnValue(true);
          mockPasswordService.hashPassword.mockResolvedValue(
            'new-hashed-password',
          );
          mockTokenService.revokeAllUserTokens.mockResolvedValue(undefined);

          // Execute
          await service.resetPassword({ newPassword, token });

          // Verify all user tokens were revoked
          expect(mockTokenService.revokeAllUserTokens).toHaveBeenCalledWith(
            mockUserId,
          );

          // Verify it was called after password was updated
          const saveCallOrder = mockUser.save.mock.invocationCallOrder[0];
          const revokeCallOrder =
            mockTokenService.revokeAllUserTokens.mock.invocationCallOrder[0];
          expect(revokeCallOrder).toBeGreaterThan(saveCallOrder);
        }),
        { numRuns: 10 },
      );
    });

    it('should not invalidate sessions if password reset fails', async () => {
      await fc.assert(
        fc.asyncProperty(tokenArb, passwordArb, async (token, newPassword) => {
          // Reset mocks
          jest.clearAllMocks();

          // Setup: User exists but password validation fails
          const mockUser = {
            _id: new Types.ObjectId(),
            email: 'user@example.com',
            password: 'old-hashed-password',
            passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000),
            passwordResetToken: token,
            save: jest.fn().mockResolvedValue(true),
          };

          mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
          });
          mockPasswordService.validatePasswordStrength.mockReturnValue(false);

          // Execute
          try {
            await service.resetPassword({ newPassword, token });
          } catch {
            // Expected to throw
          }

          // Verify sessions were NOT revoked
          expect(mockTokenService.revokeAllUserTokens).not.toHaveBeenCalled();
        }),
        { numRuns: 10 },
      );
    });

    it('should not invalidate sessions if token is invalid', async () => {
      await fc.assert(
        fc.asyncProperty(tokenArb, passwordArb, async (token, newPassword) => {
          // Reset mocks
          jest.clearAllMocks();

          // Setup: No user found with token
          mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(null),
          });

          // Execute
          try {
            await service.resetPassword({ newPassword, token });
          } catch {
            // Expected to throw
          }

          // Verify sessions were NOT revoked
          expect(mockTokenService.revokeAllUserTokens).not.toHaveBeenCalled();
        }),
        { numRuns: 10 },
      );
    });

    it('should not invalidate sessions if token is expired', async () => {
      await fc.assert(
        fc.asyncProperty(tokenArb, passwordArb, async (token, newPassword) => {
          // Reset mocks
          jest.clearAllMocks();

          // Setup: User exists but token is expired
          const pastDate = new Date(Date.now() - 60 * 60 * 1000);
          const mockUser = {
            _id: new Types.ObjectId(),
            email: 'user@example.com',
            password: 'old-hashed-password',
            passwordResetExpires: pastDate,
            passwordResetToken: token,
            save: jest.fn().mockResolvedValue(true),
          };

          mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
          });

          // Execute
          try {
            await service.resetPassword({ newPassword, token });
          } catch {
            // Expected to throw
          }

          // Verify sessions were NOT revoked
          expect(mockTokenService.revokeAllUserTokens).not.toHaveBeenCalled();
        }),
        { numRuns: 10 },
      );
    });
  });
});
