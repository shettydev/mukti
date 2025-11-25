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
 * Property-Based Tests for User Login
 *
 * Feature: auth-system, Property 6: Valid login returns tokens
 * Validates: Requirements 2.1
 *
 * Feature: auth-system, Property 7: Invalid credentials are rejected
 * Validates: Requirements 2.2
 */
describe('AuthService - Login Properties', () => {
  let service: AuthService;
  let mockUserModel: any;
  let mockPasswordService: any;
  let mockJwtService: any;
  let mockTokenService: any;
  let mockEmailService: any;

  // Arbitraries for generating test data
  const emailArb = fc.emailAddress();
  const passwordArb = fc.string({ maxLength: 20, minLength: 8 });

  const loginDtoArb = fc.record({
    email: emailArb,
    password: passwordArb,
  });

  beforeEach(async () => {
    // Create fresh mock implementations for each test
    mockUserModel = {
      findOne: jest.fn(),
    };

    mockPasswordService = {
      comparePassword: jest.fn(),
    };

    mockJwtService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
    };

    mockTokenService = {
      createRefreshToken: jest.fn(),
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
   * Property 6: Valid login returns tokens
   *
   * For any user with valid credentials (email and password), logging in should
   * authenticate the user and return both access and refresh tokens.
   */
  describe('Property 6: Valid login returns tokens', () => {
    it('should return tokens for any valid credentials', async () => {
      await fc.assert(
        fc.asyncProperty(loginDtoArb, async (dto) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          // Setup: User exists with password
          const mockUserId = new Types.ObjectId();
          const mockUser = {
            _id: mockUserId,
            createdAt: new Date(),
            email: dto.email,
            emailVerified: false,
            firstName: 'Test',
            isActive: true,
            lastLoginAt: null,
            lastName: 'User',
            password: 'hashed-password',
            role: 'user',
            save: jest.fn().mockResolvedValue(undefined),
            updatedAt: new Date(),
          };

          mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
          });
          mockPasswordService.comparePassword.mockResolvedValue(true);
          mockJwtService.generateAccessToken.mockReturnValue('access-token');
          mockJwtService.generateRefreshToken.mockReturnValue('refresh-token');
          mockTokenService.createRefreshToken.mockResolvedValue({});

          // Execute
          const result = await service.login(dto);

          // Verify tokens were generated
          expect(mockJwtService.generateAccessToken).toHaveBeenCalled();
          expect(mockJwtService.generateRefreshToken).toHaveBeenCalled();

          // Verify response structure
          expect(result).toEqual({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            user: expect.objectContaining({
              email: dto.email,
              id: mockUserId.toString(),
              role: 'user',
            }),
          });

          // Verify tokens are non-empty strings
          expect(result.accessToken).toBeTruthy();
          expect(result.refreshToken).toBeTruthy();
          expect(typeof result.accessToken).toBe('string');
          expect(typeof result.refreshToken).toBe('string');
        }),
        { numRuns: 100 },
      );
    });

    it('should update lastLoginAt for all successful logins', async () => {
      await fc.assert(
        fc.asyncProperty(loginDtoArb, async (dto) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          // Setup
          const mockUserId = new Types.ObjectId();
          const mockUser = {
            _id: mockUserId,
            createdAt: new Date(),
            email: dto.email,
            emailVerified: false,
            firstName: 'Test',
            isActive: true,
            lastLoginAt: null,
            lastName: 'User',
            password: 'hashed-password',
            role: 'user',
            save: jest.fn().mockResolvedValue(undefined),
            updatedAt: new Date(),
          };

          mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
          });
          mockPasswordService.comparePassword.mockResolvedValue(true);
          mockJwtService.generateAccessToken.mockReturnValue('access-token');
          mockJwtService.generateRefreshToken.mockReturnValue('refresh-token');
          mockTokenService.createRefreshToken.mockResolvedValue({});

          // Execute
          await service.login(dto);

          // Verify lastLoginAt was updated
          expect(mockUser.lastLoginAt).toBeInstanceOf(Date);
          expect(mockUser.save).toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 7: Invalid credentials are rejected
   *
   * For any login attempt with invalid credentials (wrong email or password),
   * the system should return a 401 unauthorized error and not issue tokens.
   */
  describe('Property 7: Invalid credentials are rejected', () => {
    it('should reject login for any non-existent email', async () => {
      await fc.assert(
        fc.asyncProperty(loginDtoArb, async (dto) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          // Setup: User does not exist
          mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(null),
          });

          // Execute and verify
          await expect(service.login(dto)).rejects.toThrow(
            UnauthorizedException,
          );
          await expect(service.login(dto)).rejects.toThrow(
            'Invalid credentials',
          );

          // Verify no tokens were generated
          expect(mockJwtService.generateAccessToken).not.toHaveBeenCalled();
          expect(mockJwtService.generateRefreshToken).not.toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    });

    it('should reject login for any incorrect password', async () => {
      await fc.assert(
        fc.asyncProperty(loginDtoArb, async (dto) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          // Setup: User exists but password is wrong
          const mockUser = {
            _id: new Types.ObjectId(),
            email: dto.email,
            password: 'hashed-password',
          };

          mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
          });
          mockPasswordService.comparePassword.mockResolvedValue(false);

          // Execute and verify
          await expect(service.login(dto)).rejects.toThrow(
            UnauthorizedException,
          );
          await expect(service.login(dto)).rejects.toThrow(
            'Invalid credentials',
          );

          // Verify password was checked
          expect(mockPasswordService.comparePassword).toHaveBeenCalledWith(
            dto.password,
            'hashed-password',
          );

          // Verify no tokens were generated
          expect(mockJwtService.generateAccessToken).not.toHaveBeenCalled();
          expect(mockJwtService.generateRefreshToken).not.toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    });

    it('should reject login for OAuth users without password', async () => {
      await fc.assert(
        fc.asyncProperty(loginDtoArb, async (dto) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          // Setup: User exists but has no password (OAuth user)
          const mockUser = {
            _id: new Types.ObjectId(),
            email: dto.email,
            password: undefined,
          };

          mockUserModel.findOne.mockReturnValue({
            select: jest.fn().mockResolvedValue(mockUser),
          });

          // Execute and verify
          await expect(service.login(dto)).rejects.toThrow(
            UnauthorizedException,
          );
          await expect(service.login(dto)).rejects.toThrow(
            'Invalid credentials',
          );

          // Verify password comparison was not attempted
          expect(mockPasswordService.comparePassword).not.toHaveBeenCalled();

          // Verify no tokens were generated
          expect(mockJwtService.generateAccessToken).not.toHaveBeenCalled();
          expect(mockJwtService.generateRefreshToken).not.toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    });
  });
});
