import type { TestingModule } from '@nestjs/testing';

import { UnauthorizedException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import * as fc from 'fast-check';
import { Types } from 'mongoose';

import { User } from '../../../../../schemas/user.schema';
import { AuthService } from '../../auth.service';
import { EmailService } from '../../email.service';
import { JwtTokenService } from '../../jwt.service';
import { PasswordService } from '../../password.service';
import { TokenService } from '../../token.service';

/**
 * Property-Based Tests for Token Refresh and Logout
 *
 * Feature: auth-system, Property 9: Token refresh with valid refresh token
 * Validates: Requirements 3.1
 *
 * Feature: auth-system, Property 11: Logout invalidates tokens
 * Validates: Requirements 3.4
 */
describe('AuthService - Token Refresh and Logout Properties', () => {
  let service: AuthService;
  let mockUserModel: any;
  let mockPasswordService: any;
  let mockJwtService: any;
  let mockTokenService: any;
  let mockEmailService: any;

  // Arbitraries for generating test data
  const refreshTokenArb = fc.string({ maxLength: 100, minLength: 20 });
  const userIdArb = fc
    .string({ maxLength: 24, minLength: 24 })
    .map(() => new Types.ObjectId().toString());

  beforeEach(async () => {
    mockUserModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
    };

    mockPasswordService = {
      comparePassword: jest.fn(),
      hashPassword: jest.fn(),
    };

    mockJwtService = {
      generateAccessToken: jest.fn().mockReturnValue('new-access-token'),
      generateRefreshToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
    };

    mockTokenService = {
      createRefreshToken: jest.fn(),
      findRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn().mockResolvedValue(true),
    };

    mockEmailService = {
      sendVerificationEmail: jest.fn(),
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  /**
   * Property 9: Token refresh with valid refresh token
   *
   * For any valid refresh token, calling the refresh endpoint should return
   * a new access token without requiring re-authentication.
   */
  describe('Property 9: Token refresh with valid refresh token', () => {
    it('should return new access token for any valid refresh token', async () => {
      await fc.assert(
        fc.asyncProperty(refreshTokenArb, async (refreshToken) => {
          // Setup: Valid refresh token
          const mockUserId = new Types.ObjectId();
          const mockPayload = {
            email: 'test@example.com',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000),
            role: 'user',
            sub: mockUserId.toString(),
          };

          const mockStoredToken = {
            _id: new Types.ObjectId(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            isRevoked: false,
            token: refreshToken,
            userId: mockUserId,
          };

          const mockUser = {
            _id: mockUserId,
            email: 'test@example.com',
            isActive: true,
            role: 'user',
          };

          mockJwtService.verifyRefreshToken.mockReturnValue(mockPayload);
          mockTokenService.findRefreshToken.mockResolvedValue(mockStoredToken);
          mockUserModel.findById.mockResolvedValue(mockUser);

          // Execute
          const result = await service.refresh(refreshToken);

          // Verify
          expect(result).toEqual({
            accessToken: 'new-access-token',
          });

          expect(mockJwtService.verifyRefreshToken).toHaveBeenCalledWith(
            refreshToken,
          );
          expect(mockTokenService.findRefreshToken).toHaveBeenCalledWith(
            refreshToken,
          );
          expect(mockUserModel.findById).toHaveBeenCalledWith(
            mockUserId.toString(),
          );
          expect(mockJwtService.generateAccessToken).toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    });

    it('should reject refresh for any revoked token', async () => {
      await fc.assert(
        fc.asyncProperty(refreshTokenArb, async (refreshToken) => {
          // Setup: Revoked token
          const mockPayload = {
            email: 'test@example.com',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000),
            role: 'user',
            sub: new Types.ObjectId().toString(),
          };

          const mockStoredToken = {
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            isRevoked: true, // Token is revoked
            token: refreshToken,
          };

          mockJwtService.verifyRefreshToken.mockReturnValue(mockPayload);
          mockTokenService.findRefreshToken.mockResolvedValue(mockStoredToken);

          // Execute and verify
          await expect(service.refresh(refreshToken)).rejects.toThrow(
            UnauthorizedException,
          );
          await expect(service.refresh(refreshToken)).rejects.toThrow(
            'Refresh token has been revoked',
          );

          // Verify no new token was generated
          expect(mockJwtService.generateAccessToken).not.toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    });

    it('should reject refresh for any expired token', async () => {
      await fc.assert(
        fc.asyncProperty(refreshTokenArb, async (refreshToken) => {
          // Setup: Expired token
          const mockPayload = {
            email: 'test@example.com',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000),
            role: 'user',
            sub: new Types.ObjectId().toString(),
          };

          const mockStoredToken = {
            expiresAt: new Date(Date.now() - 1000), // Expired
            isRevoked: false,
            token: refreshToken,
          };

          mockJwtService.verifyRefreshToken.mockReturnValue(mockPayload);
          mockTokenService.findRefreshToken.mockResolvedValue(mockStoredToken);

          // Execute and verify
          await expect(service.refresh(refreshToken)).rejects.toThrow(
            UnauthorizedException,
          );
          await expect(service.refresh(refreshToken)).rejects.toThrow(
            'Refresh token has expired',
          );

          // Verify no new token was generated
          expect(mockJwtService.generateAccessToken).not.toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    });

    it('should reject refresh for any non-existent token', async () => {
      await fc.assert(
        fc.asyncProperty(refreshTokenArb, async (refreshToken) => {
          // Setup: Token not in database
          const mockPayload = {
            email: 'test@example.com',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000),
            role: 'user',
            sub: new Types.ObjectId().toString(),
          };

          mockJwtService.verifyRefreshToken.mockReturnValue(mockPayload);
          mockTokenService.findRefreshToken.mockResolvedValue(null);

          // Execute and verify
          await expect(service.refresh(refreshToken)).rejects.toThrow(
            UnauthorizedException,
          );
          await expect(service.refresh(refreshToken)).rejects.toThrow(
            'Invalid refresh token',
          );

          // Verify no new token was generated
          expect(mockJwtService.generateAccessToken).not.toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 11: Logout invalidates tokens
   *
   * For any authenticated user, logging out should invalidate both the access
   * token and refresh token, making them unusable for subsequent requests.
   */
  describe('Property 11: Logout invalidates tokens', () => {
    it('should revoke refresh token for any logout request', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          refreshTokenArb,
          async (userId, refreshToken) => {
            // Execute
            await service.logout(userId, refreshToken);

            // Verify token was revoked
            expect(mockTokenService.revokeRefreshToken).toHaveBeenCalledWith(
              refreshToken,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should be idempotent for any repeated logout attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          refreshTokenArb,
          async (userId, refreshToken) => {
            // Setup: Token already revoked
            mockTokenService.revokeRefreshToken.mockResolvedValue(false);

            // Execute - should not throw
            await expect(
              service.logout(userId, refreshToken),
            ).resolves.not.toThrow();

            // Verify revoke was attempted
            expect(mockTokenService.revokeRefreshToken).toHaveBeenCalledWith(
              refreshToken,
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should complete successfully for any user ID and token combination', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          refreshTokenArb,
          async (userId, refreshToken) => {
            // Execute
            const result = await service.logout(userId, refreshToken);

            // Verify no return value (void)
            expect(result).toBeUndefined();

            // Verify token revocation was attempted
            expect(mockTokenService.revokeRefreshToken).toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
