import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';

import { RolesGuard } from '../../roles.guard';

/**
 * Property-Based Tests for Role Hierarchy
 *
 * **Feature: auth-system, Property 19: Role hierarchy is enforced**
 * **Validates: Requirements 6.5**
 *
 * These tests verify that the authorization system correctly enforces hierarchical
 * roles where higher roles inherit permissions from lower roles:
 * admin > moderator > user
 */
describe('Role Hierarchy Property Tests', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  // Define role hierarchy
  const ROLE_HIERARCHY: Record<string, number> = {
    admin: 3,
    moderator: 2,
    user: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  /**
   * Property 19: Role hierarchy is enforced
   *
   * For any resource accessible by a lower role, users with higher roles
   * (admin > moderator > user) should also have access to that resource.
   */
  it('should grant higher roles access to lower role resources', () => {
    fc.assert(
      fc.property(
        // Generate a required role for the resource
        fc.constantFrom('user', 'moderator', 'admin'),
        // Generate a user role that is higher or equal
        fc.constantFrom('user', 'moderator', 'admin'),
        // Generate user ID
        fc.uuid(),
        (requiredRole, userRole, userId) => {
          // Setup mock execution context
          const mockContext = createMockExecutionContext(userId, userRole);

          // Setup reflector to return required role
          jest
            .spyOn(reflector, 'getAllAndOverride')
            .mockReturnValue([requiredRole]);

          const userRoleLevel = ROLE_HIERARCHY[userRole] ?? 0;
          const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] ?? 0;

          // Test authorization based on hierarchy
          if (userRoleLevel >= requiredRoleLevel) {
            // Higher or equal role should be granted access
            const result = guard.canActivate(mockContext);
            expect(result).toBe(true);
          } else {
            // Lower role should be denied access
            expect(() => guard.canActivate(mockContext)).toThrow(
              'Insufficient permissions to access this resource',
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Admin role can access all resources
   *
   * For any resource with any role requirement, admin users should always
   * have access due to being at the top of the hierarchy.
   */
  it('should grant admin access to resources requiring any role', () => {
    fc.assert(
      fc.property(
        // Generate required role
        fc.constantFrom('user', 'moderator', 'admin'),
        // Generate user ID
        fc.uuid(),
        (requiredRole, userId) => {
          // Setup mock execution context with admin role
          const mockContext = createMockExecutionContext(userId, 'admin');

          // Setup reflector to return required role
          jest
            .spyOn(reflector, 'getAllAndOverride')
            .mockReturnValue([requiredRole]);

          // Admin should always be granted access
          const result = guard.canActivate(mockContext);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Moderator role can access user resources
   *
   * For any resource requiring user role, moderator users should have access
   * due to being higher in the hierarchy.
   */
  it('should grant moderator access to user-level resources', () => {
    fc.assert(
      fc.property(
        // Generate user ID
        fc.uuid(),
        (userId) => {
          // Setup mock execution context with moderator role
          const mockContext = createMockExecutionContext(userId, 'moderator');

          // Setup reflector to return user role requirement
          jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['user']);

          // Moderator should be granted access to user resources
          const result = guard.canActivate(mockContext);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: User role cannot access higher role resources
   *
   * For any resource requiring moderator or admin role, user-level users
   * should be denied access.
   */
  it('should deny user access to higher role resources', () => {
    fc.assert(
      fc.property(
        // Generate higher role requirement
        fc.constantFrom('moderator', 'admin'),
        // Generate user ID
        fc.uuid(),
        (requiredRole, userId) => {
          // Setup mock execution context with user role
          const mockContext = createMockExecutionContext(userId, 'user');

          // Setup reflector to return higher role requirement
          jest
            .spyOn(reflector, 'getAllAndOverride')
            .mockReturnValue([requiredRole]);

          // User should be denied access to higher role resources
          expect(() => guard.canActivate(mockContext)).toThrow(
            'Insufficient permissions to access this resource',
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Moderator role cannot access admin resources
   *
   * For any resource requiring admin role, moderator users should be denied access.
   */
  it('should deny moderator access to admin-only resources', () => {
    fc.assert(
      fc.property(
        // Generate user ID
        fc.uuid(),
        (userId) => {
          // Setup mock execution context with moderator role
          const mockContext = createMockExecutionContext(userId, 'moderator');

          // Setup reflector to return admin role requirement
          jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

          // Moderator should be denied access to admin resources
          expect(() => guard.canActivate(mockContext)).toThrow(
            'Insufficient permissions to access this resource',
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Role hierarchy is transitive
   *
   * If role A > role B and role B > role C, then role A should have access
   * to resources requiring role C.
   */
  it('should enforce transitive role hierarchy', () => {
    fc.assert(
      fc.property(
        // Generate user ID
        fc.uuid(),
        (userId) => {
          // Admin > Moderator > User (transitive)
          // Admin should have access to user resources

          // Setup mock execution context with admin role
          const mockContext = createMockExecutionContext(userId, 'admin');

          // Setup reflector to return user role requirement
          jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['user']);

          // Admin should be granted access to user resources (transitive)
          const result = guard.canActivate(mockContext);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Multiple role requirements respect hierarchy
   *
   * For any resource with multiple role requirements, users with a role that
   * meets or exceeds any of the required roles should have access.
   */
  it('should grant access when user role meets any required role in hierarchy', () => {
    fc.assert(
      fc.property(
        // Generate user role
        fc.constantFrom('user', 'moderator', 'admin'),
        // Generate multiple required roles
        fc
          .array(fc.constantFrom('user', 'moderator', 'admin'), {
            maxLength: 3,
            minLength: 2,
          })
          .map((roles) => [...new Set(roles)]), // Remove duplicates
        // Generate user ID
        fc.uuid(),
        (userRole, requiredRoles, userId) => {
          // Setup mock execution context
          const mockContext = createMockExecutionContext(userId, userRole);

          // Setup reflector to return required roles
          jest
            .spyOn(reflector, 'getAllAndOverride')
            .mockReturnValue(requiredRoles);

          const userRoleLevel = ROLE_HIERARCHY[userRole] ?? 0;

          // Check if user meets any of the required roles
          const meetsRequirement = requiredRoles.some((requiredRole) => {
            const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
            return userRoleLevel >= requiredRoleLevel;
          });

          if (meetsRequirement) {
            // User should be granted access
            const result = guard.canActivate(mockContext);
            expect(result).toBe(true);
          } else {
            // User should be denied access
            expect(() => guard.canActivate(mockContext)).toThrow(
              'Insufficient permissions to access this resource',
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Helper function to create a mock ExecutionContext
 */
function createMockExecutionContext(
  userId: string,
  role: string,
): ExecutionContext {
  return {
    getClass: jest.fn(),
    getHandler: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        user: {
          _id: userId,
          role,
        },
      }),
    }),
  } as unknown as ExecutionContext;
}
