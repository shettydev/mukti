import { type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';

import { RolesGuard } from '../../roles.guard';

/**
 * Property-Based Tests for Authorization
 *
 * **Feature: auth-system, Property 18: Authorization checks role requirements**
 * **Validates: Requirements 6.3**
 *
 * These tests verify that the authorization system correctly enforces role-based
 * access control by checking if users have the required roles to access protected resources.
 */
describe('Authorization Property Tests', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

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
   * Property 18: Authorization checks role requirements
   *
   * For any user with a specific role and any protected resource with role requirements,
   * the authorization system should only allow access if the user's role meets or exceeds
   * the required role level (considering role hierarchy: admin > moderator > user).
   */
  it('should enforce role requirements for protected resources', () => {
    fc.assert(
      fc.property(
        // Generate user role
        fc.constantFrom('user', 'moderator', 'admin'),
        // Generate required roles for the resource
        fc.array(fc.constantFrom('user', 'moderator', 'admin'), {
          maxLength: 3,
          minLength: 1,
        }),
        // Generate user ID
        fc.uuid(),
        (userRole, requiredRoles, userId) => {
          // Setup mock execution context
          const mockContext = createMockExecutionContext(userId, userRole);

          // Setup reflector to return required roles
          jest
            .spyOn(reflector, 'getAllAndOverride')
            .mockReturnValue(requiredRoles);

          // Define role hierarchy
          const roleHierarchy: Record<string, number> = {
            admin: 3,
            moderator: 2,
            user: 1,
          };

          // Determine if user should have access
          const userRoleLevel = roleHierarchy[userRole] ?? 0;
          const shouldHaveAccess = requiredRoles.some((requiredRole) => {
            const requiredRoleLevel = roleHierarchy[requiredRole] ?? 0;
            return userRoleLevel >= requiredRoleLevel;
          });

          // Test authorization
          if (shouldHaveAccess) {
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

  /**
   * Property: Users with no role should be denied access to protected resources
   *
   * For any protected resource with role requirements, users without a valid role
   * should always be denied access.
   */
  it('should deny access to users without valid roles', () => {
    fc.assert(
      fc.property(
        // Generate required roles
        fc.array(fc.constantFrom('user', 'moderator', 'admin'), {
          maxLength: 3,
          minLength: 1,
        }),
        // Generate user ID
        fc.uuid(),
        (requiredRoles, userId) => {
          // Setup mock execution context with invalid role
          const mockContext = createMockExecutionContext(userId, 'invalid');

          // Setup reflector to return required roles
          jest
            .spyOn(reflector, 'getAllAndOverride')
            .mockReturnValue(requiredRoles);

          // User with invalid role should be denied access
          expect(() => guard.canActivate(mockContext)).toThrow(
            'Insufficient permissions to access this resource',
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Routes without role requirements should be accessible to all authenticated users
   *
   * For any authenticated user, if a route has no role requirements specified,
   * the user should be granted access regardless of their role.
   */
  it('should allow access to routes without role requirements', () => {
    fc.assert(
      fc.property(
        // Generate user role
        fc.constantFrom('user', 'moderator', 'admin'),
        // Generate user ID
        fc.uuid(),
        (userRole, userId) => {
          // Setup mock execution context
          const mockContext = createMockExecutionContext(userId, userRole);

          // Setup reflector to return no required roles
          jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);

          // User should be granted access
          const result = guard.canActivate(mockContext);
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Admin role should have access to all protected resources
   *
   * For any protected resource with any role requirements, users with admin role
   * should always be granted access due to role hierarchy.
   */
  it('should grant admin access to all protected resources', () => {
    fc.assert(
      fc.property(
        // Generate required roles
        fc.array(fc.constantFrom('user', 'moderator', 'admin'), {
          maxLength: 3,
          minLength: 1,
        }),
        // Generate user ID
        fc.uuid(),
        (requiredRoles, userId) => {
          // Setup mock execution context with admin role
          const mockContext = createMockExecutionContext(userId, 'admin');

          // Setup reflector to return required roles
          jest
            .spyOn(reflector, 'getAllAndOverride')
            .mockReturnValue(requiredRoles);

          // Admin should always be granted access
          const result = guard.canActivate(mockContext);
          expect(result).toBe(true);
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
