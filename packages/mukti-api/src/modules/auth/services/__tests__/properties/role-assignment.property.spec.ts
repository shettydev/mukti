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
 * Property-Based Tests for Role Assignment
 *
 * Feature: auth-system, Property 17: Role assignment updates permissions
 * Validates: Requirements 6.2, 6.4
 */
describe('AuthService - Role Assignment Property', () => {
  let service: AuthService;
  let mockUserModel: any;
  let mockPasswordService: any;
  let mockJwtService: any;
  let mockTokenService: any;
  let mockEmailService: any;
  let mockRateLimitService: any;

  // Arbitraries for generating test data
  const userIdArb = fc.string().map(() => new Types.ObjectId().toString());
  const validRoleArb = fc.constantFrom('user', 'moderator', 'admin');
  const invalidRoleArb = fc
    .string()
    .filter((s) => !['admin', 'moderator', 'user'].includes(s));

  beforeEach(async () => {
    // Create fresh mock implementations for each test
    mockUserModel = {
      create: jest.fn(),
      findById: jest.fn(),
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
   * Property 17: Role assignment updates permissions
   *
   * For any user and any valid role, assigning that role to the user should
   * immediately update their permissions to match the role's permissions.
   */
  describe('Property 17: Role assignment updates permissions', () => {
    it('should update user role for any valid role assignment', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, validRoleArb, async (userId, newRole) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          // Setup: Create a user with a different role
          const currentRole = newRole === 'user' ? 'moderator' : 'user';
          const mockUser = {
            _id: new Types.ObjectId(userId),
            email: 'test@example.com',
            firstName: 'Test',
            isActive: true,
            lastName: 'User',
            role: currentRole,
            save: jest.fn().mockResolvedValue(true),
          };

          mockUserModel.findById.mockResolvedValue(mockUser);

          // Execute
          const result = await service.assignRole(userId, newRole as any);

          // Verify user was found
          expect(mockUserModel.findById).toHaveBeenCalledWith(userId);

          // Verify role was updated
          expect(mockUser.role).toBe(newRole);
          expect(mockUser.save).toHaveBeenCalled();

          // Verify result contains updated role
          expect(result.role).toBe(newRole);
        }),
        { numRuns: 100 },
      );
    });

    it('should accept all valid roles (user, moderator, admin)', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, validRoleArb, async (userId, role) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          const mockUser = {
            _id: new Types.ObjectId(userId),
            email: 'test@example.com',
            firstName: 'Test',
            isActive: true,
            lastName: 'User',
            role: 'user',
            save: jest.fn().mockResolvedValue(true),
          };

          mockUserModel.findById.mockResolvedValue(mockUser);

          // Execute - should not throw
          await expect(
            service.assignRole(userId, role as any),
          ).resolves.toBeDefined();

          // Verify role was set correctly
          expect(mockUser.role).toBe(role);
        }),
        { numRuns: 100 },
      );
    });

    it('should reject invalid roles', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, invalidRoleArb, async (userId, role) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          const mockUser = {
            _id: new Types.ObjectId(userId),
            email: 'test@example.com',
            firstName: 'Test',
            isActive: true,
            lastName: 'User',
            role: 'user',
            save: jest.fn().mockResolvedValue(true),
          };

          mockUserModel.findById.mockResolvedValue(mockUser);

          // Execute - should throw BadRequestException
          await expect(service.assignRole(userId, role as any)).rejects.toThrow(
            BadRequestException,
          );

          // Verify role was not changed
          expect(mockUser.role).toBe('user');
          expect(mockUser.save).not.toHaveBeenCalled();
        }),
        { numRuns: 50 },
      );
    });

    it('should throw NotFoundException for non-existent users', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, validRoleArb, async (userId, role) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          // Setup: User doesn't exist
          mockUserModel.findById.mockResolvedValue(null);

          // Execute - should throw NotFoundException
          await expect(service.assignRole(userId, role as any)).rejects.toThrow(
            NotFoundException,
          );
          await expect(service.assignRole(userId, role as any)).rejects.toThrow(
            'User not found',
          );
        }),
        { numRuns: 100 },
      );
    });

    it('should allow role changes in any direction', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validRoleArb,
          validRoleArb,
          async (userId, fromRole, toRole) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            const mockUser = {
              _id: new Types.ObjectId(userId),
              email: 'test@example.com',
              firstName: 'Test',
              isActive: true,
              lastName: 'User',
              role: fromRole,
              save: jest.fn().mockResolvedValue(true),
            };

            mockUserModel.findById.mockResolvedValue(mockUser);

            // Execute
            await service.assignRole(userId, toRole as any);

            // Verify role changed from fromRole to toRole
            expect(mockUser.role).toBe(toRole);
            expect(mockUser.save).toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should persist role changes to database', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, validRoleArb, async (userId, newRole) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          const mockUser = {
            _id: new Types.ObjectId(userId),
            email: 'test@example.com',
            firstName: 'Test',
            isActive: true,
            lastName: 'User',
            role: 'user',
            save: jest.fn().mockResolvedValue(true),
          };

          mockUserModel.findById.mockResolvedValue(mockUser);

          // Execute
          await service.assignRole(userId, newRole as any);

          // Verify save was called to persist changes
          expect(mockUser.save).toHaveBeenCalledTimes(1);
        }),
        { numRuns: 100 },
      );
    });

    it('should return the updated user object', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, validRoleArb, async (userId, newRole) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          const mockUser = {
            _id: new Types.ObjectId(userId),
            email: 'test@example.com',
            firstName: 'Test',
            isActive: true,
            lastName: 'User',
            role: 'user',
            save: jest.fn().mockResolvedValue(true),
          };

          mockUserModel.findById.mockResolvedValue(mockUser);

          // Execute
          const result = await service.assignRole(userId, newRole as any);

          // Verify result is the user object with updated role
          expect(result).toBeDefined();
          expect(result._id).toEqual(mockUser._id);
          expect(result.email).toBe(mockUser.email);
          expect(result.role).toBe(newRole);
        }),
        { numRuns: 100 },
      );
    });
  });
});
