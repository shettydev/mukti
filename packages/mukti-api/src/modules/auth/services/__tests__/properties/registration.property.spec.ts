import type { TestingModule } from '@nestjs/testing';

import { ConflictException } from '@nestjs/common';
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
 * Property-Based Tests for User Registration
 *
 * Feature: auth-system, Property 1: Valid registration creates user and returns tokens
 * Validates: Requirements 1.1
 *
 * Feature: auth-system, Property 2: Duplicate email registration is rejected
 * Validates: Requirements 1.2
 */
describe('AuthService - Registration Properties', () => {
  let service: AuthService;
  let mockUserModel: any;
  let mockPasswordService: any;
  let mockJwtService: any;
  let mockTokenService: any;
  let mockEmailService: any;

  // Arbitraries for generating test data
  const emailArb = fc.emailAddress();
  const passwordArb = fc
    .string({ maxLength: 20, minLength: 8 })
    .filter((pwd) => {
      // Ensure password meets requirements
      return (
        /[A-Z]/.test(pwd) &&
        /[a-z]/.test(pwd) &&
        /\d/.test(pwd) &&
        /[@$!%*?&]/.test(pwd)
      );
    });
  // Generate names that are not just whitespace
  const nameArb = fc
    .string({ maxLength: 50, minLength: 2 })
    .filter((name) => name.trim().length >= 2);
  const phoneArb = fc.option(
    fc.string({ maxLength: 15, minLength: 10 }).map((s) => `+${s}`),
    { nil: undefined },
  );

  const registerDtoArb = fc.record({
    email: emailArb,
    firstName: nameArb,
    lastName: nameArb,
    password: passwordArb,
    phone: phoneArb,
  });

  beforeEach(async () => {
    // Create fresh mock implementations for each test
    mockUserModel = {
      create: jest.fn(),
      findOne: jest.fn(),
    };

    mockPasswordService = {
      hashPassword: jest.fn(),
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
   * Property 1: Valid registration creates user and returns tokens
   *
   * For any valid registration data (first name, last name, email, password),
   * registering should create a user account and return both access and refresh tokens.
   */
  describe('Property 1: Valid registration creates user and returns tokens', () => {
    it('should create user and return tokens for any valid registration data', async () => {
      await fc.assert(
        fc.asyncProperty(registerDtoArb, async (dto) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          // Setup mocks
          mockUserModel.findOne.mockResolvedValue(null); // No existing user
          mockPasswordService.hashPassword.mockResolvedValue('hashed-password');

          const mockUserId = new Types.ObjectId();
          const mockUser = {
            _id: mockUserId,
            createdAt: new Date(),
            email: dto.email,
            emailVerificationExpires: new Date(),
            emailVerificationToken: 'token',
            emailVerified: false,
            firstName: dto.firstName,
            isActive: true,
            lastName: dto.lastName,
            password: 'hashed-password',
            phone: dto.phone,
            role: 'user',
            updatedAt: new Date(),
          };

          mockUserModel.create.mockResolvedValue(mockUser);
          mockJwtService.generateAccessToken.mockReturnValue('access-token');
          mockJwtService.generateRefreshToken.mockReturnValue('refresh-token');
          mockTokenService.createRefreshToken.mockResolvedValue({});
          mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

          // Execute
          const result = await service.register(dto);

          // Verify user was created
          expect(mockUserModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
              email: dto.email,
              emailVerified: false,
              firstName: dto.firstName,
              isActive: true,
              lastName: dto.lastName,
              password: 'hashed-password',
              phone: dto.phone,
              role: 'user',
            }),
          );

          // Verify password was hashed
          expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(
            dto.password,
          );

          // Verify tokens were generated
          expect(mockJwtService.generateAccessToken).toHaveBeenCalledWith(
            expect.objectContaining({
              email: dto.email,
              role: 'user',
              sub: mockUserId.toString(),
            }),
          );

          expect(mockJwtService.generateRefreshToken).toHaveBeenCalledWith(
            expect.objectContaining({
              email: dto.email,
              role: 'user',
              sub: mockUserId.toString(),
            }),
          );

          // Verify refresh token was stored
          expect(mockTokenService.createRefreshToken).toHaveBeenCalledWith(
            mockUserId,
            'refresh-token',
            expect.any(Date),
          );

          // Verify verification email was sent
          expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
            dto.email,
            expect.any(String),
          );

          // Verify response structure
          expect(result).toEqual({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            user: expect.objectContaining({
              email: dto.email,
              emailVerified: false,
              firstName: dto.firstName,
              id: mockUserId.toString(),
              isActive: true,
              lastName: dto.lastName,
              phone: dto.phone,
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

    it('should assign default role "user" to all new registrations', async () => {
      await fc.assert(
        fc.asyncProperty(registerDtoArb, async (dto) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          // Setup mocks
          mockUserModel.findOne.mockResolvedValue(null);
          mockPasswordService.hashPassword.mockResolvedValue('hashed-password');

          const mockUserId = new Types.ObjectId();
          const mockUser = {
            _id: mockUserId,
            createdAt: new Date(),
            email: dto.email,
            emailVerified: false,
            firstName: dto.firstName,
            isActive: true,
            lastName: dto.lastName,
            role: 'user',
            updatedAt: new Date(),
          };

          mockUserModel.create.mockResolvedValue(mockUser);
          mockJwtService.generateAccessToken.mockReturnValue('access-token');
          mockJwtService.generateRefreshToken.mockReturnValue('refresh-token');
          mockTokenService.createRefreshToken.mockResolvedValue({});
          mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

          // Execute
          const result = await service.register(dto);

          // Verify role is always "user"
          expect(mockUserModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
              role: 'user',
            }),
          );

          expect(result.user.role).toBe('user');
        }),
        { numRuns: 100 },
      );
    });

    it('should set emailVerified to false for all new registrations', async () => {
      await fc.assert(
        fc.asyncProperty(registerDtoArb, async (dto) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          // Setup mocks
          mockUserModel.findOne.mockResolvedValue(null);
          mockPasswordService.hashPassword.mockResolvedValue('hashed-password');

          const mockUserId = new Types.ObjectId();
          const mockUser = {
            _id: mockUserId,
            createdAt: new Date(),
            email: dto.email,
            emailVerified: false,
            firstName: dto.firstName,
            isActive: true,
            lastName: dto.lastName,
            role: 'user',
            updatedAt: new Date(),
          };

          mockUserModel.create.mockResolvedValue(mockUser);
          mockJwtService.generateAccessToken.mockReturnValue('access-token');
          mockJwtService.generateRefreshToken.mockReturnValue('refresh-token');
          mockTokenService.createRefreshToken.mockResolvedValue({});
          mockEmailService.sendVerificationEmail.mockResolvedValue(undefined);

          // Execute
          const result = await service.register(dto);

          // Verify emailVerified is always false
          expect(mockUserModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
              emailVerified: false,
            }),
          );

          expect(result.user.emailVerified).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 2: Duplicate email registration is rejected
   *
   * For any email address that already exists in the system, attempting to
   * register with that email should return a 409 conflict error and not
   * create a duplicate user.
   */
  describe('Property 2: Duplicate email registration is rejected', () => {
    it('should reject registration for any existing email', async () => {
      await fc.assert(
        fc.asyncProperty(registerDtoArb, async (dto) => {
          // Setup: User already exists
          const existingUser = {
            _id: new Types.ObjectId(),
            email: dto.email,
            firstName: 'Existing',
            lastName: 'User',
          };

          mockUserModel.findOne.mockResolvedValue(existingUser);

          // Execute and verify
          await expect(service.register(dto)).rejects.toThrow(
            ConflictException,
          );
          await expect(service.register(dto)).rejects.toThrow(
            'User with this email already exists',
          );

          // Verify user creation was never attempted
          expect(mockUserModel.create).not.toHaveBeenCalled();
          expect(mockPasswordService.hashPassword).not.toHaveBeenCalled();
          expect(mockJwtService.generateAccessToken).not.toHaveBeenCalled();
          expect(mockJwtService.generateRefreshToken).not.toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    });

    it('should check for existing email before any other operations', async () => {
      await fc.assert(
        fc.asyncProperty(registerDtoArb, async (dto) => {
          // Setup: User already exists
          mockUserModel.findOne.mockResolvedValue({ email: dto.email });

          // Execute
          try {
            await service.register(dto);
          } catch {
            // Expected to throw
          }

          // Verify findOne was called first
          expect(mockUserModel.findOne).toHaveBeenCalledWith({
            email: dto.email,
          });

          // Verify no other operations were performed
          expect(mockPasswordService.hashPassword).not.toHaveBeenCalled();
          expect(mockUserModel.create).not.toHaveBeenCalled();
        }),
        { numRuns: 100 },
      );
    });
  });
});
