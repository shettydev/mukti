import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Role hierarchy for authorization.
 * Higher roles inherit permissions from lower roles.
 */
const ROLE_HIERARCHY: Record<string, number> = {
  admin: 3,
  moderator: 2,
  user: 1,
};

/**
 * Guard that enforces role-based access control (RBAC) on routes.
 *
 * @remarks
 * This guard:
 * - Checks if user has required role(s) specified by @Roles() decorator
 * - Supports role hierarchy (admin > moderator > user)
 * - Must be used after JwtAuthGuard to ensure user is authenticated
 * - Throws ForbiddenException if user lacks required permissions
 *
 * Role hierarchy means:
 * - Admin can access moderator and user routes
 * - Moderator can access user routes
 * - User can only access user routes
 *
 * @example
 * ```typescript
 * // Require specific role
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin')
 * @Delete('users/:id')
 * deleteUser() {}
 *
 * // Require one of multiple roles
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin', 'moderator')
 * @Patch('posts/:id')
 * moderatePost() {}
 *
 * // No @Roles() decorator = accessible to all authenticated users
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile() {}
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  /**
   * Determines if the current user has the required role(s).
   *
   * @param context - Execution context containing request and user information
   * @returns True if user has required role, false otherwise
   * @throws {ForbiddenException} If user lacks required permissions
   *
   * @remarks
   * This method:
   * 1. Extracts required roles from @Roles() decorator
   * 2. If no roles specified, allows access (route is role-agnostic)
   * 3. Retrieves user from request (set by JwtAuthGuard)
   * 4. Checks if user's role meets or exceeds required role level
   * 5. Logs authorization decisions for security auditing
   */
  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      this.logger.debug('No role requirements, allowing access');
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request, denying access');
      throw new ForbiddenException('User not authenticated');
    }

    // Get user's role level
    const userRoleLevel = ROLE_HIERARCHY[user.role] ?? 0;

    // Check if user's role meets any of the required roles
    const hasRequiredRole = requiredRoles.some((requiredRole) => {
      const requiredRoleLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
      return userRoleLevel >= requiredRoleLevel;
    });

    if (!hasRequiredRole) {
      this.logger.warn(
        `User ${user._id} with role '${user.role}' attempted to access route requiring roles: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        'Insufficient permissions to access this resource',
      );
    }

    this.logger.debug(
      `User ${user._id} with role '${user.role}' authorized for route requiring: ${requiredRoles.join(', ')}`,
    );

    return true;
  }
}
