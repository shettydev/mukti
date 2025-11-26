import type { TestingModule } from '@nestjs/testing';

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
 * Property-Based Tests for Default Role Assignment
 *
 * Feature: auth-system, Property 16: New users have default role
 * Validates: Requirements 6.1
 */
describe('AuthService - Default Role Property', () => {
  let service: AuthService;
  let mockUserModel: any;
  let mockPasswordService: any;
  let mockJwtService: any;
  let mockTokenService: any;
  let mockEmailService: any;
  let mockRateLimitService: any;

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

    mockRateLimitService = {
      incrementLoginAttempt: jest.fn(),
      incrementPasswordResetAttempt: jest.fn(),
      resetLoginRateLimit: jest.fn(),
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
   * Property 16: New users have default role
   *
   * For any newly created user, the system should automatically assign
   * the default role of "user".
   */
  describe('Property 16: New users have default role', () => {
    it('should assign default role "user" to all new registrations', async () => {
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

          // Verify role is always "user" in the create call
          expect(mockUserModel.create).toHaveBeenCalledWith(
            expect.objectContaining({
              role: 'user',
            }),
          );

          // Verify role is "user" in the response
          expect(result.user.role).toBe('user');

          // Verify JWT tokens include the default role
          expect(mockJwtService.generateAccessToken).toHaveBeenCalledWith(
            expect.objectContaining({
              role: 'user',
            }),
          );

          expect(mockJwtService.generateRefreshToken).toHaveBeenCalledWith(
            expect.objectContaining({
              role: 'user',
            }),
          );
        }),
        { numRuns: 100 },
      );
    });

    it('should never assign admin or moderator role during registration', async () => {
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

          // Verify role is not admin or moderator
          const createCall = mockUserModel.create.mock.calls[0][0];
          expect(createCall.role).not.toBe('admin');
          expect(createCall.role).not.toBe('moderator');
          expect(result.user.role).not.toBe('admin');
          expect(result.user.role).not.toBe('moderator');
        }),
        { numRuns: 100 },
      );
    });

    it('should consistently assign "user" role regardless of input data', async () => {
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
          await service.register(dto);

          // Verify the role is hardcoded to "user" and not derived from input
          const createCall = mockUserModel.create.mock.calls[0][0];
          expect(createCall.role).toBe('user');

          // Ensure the DTO doesn't contain a role field that could influence this
          expect(dto).not.toHaveProperty('role');
        }),
        { numRuns: 100 },
      );
    });
  });
});
