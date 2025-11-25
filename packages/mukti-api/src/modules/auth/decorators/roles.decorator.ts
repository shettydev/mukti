import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for storing required roles.
 * Used by RolesGuard to retrieve role requirements.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator that specifies which roles are required to access a route.
 *
 * @param roles - One or more role names required for access
 * @returns Method or class decorator
 *
 * @remarks
 * This decorator:
 * - Works with RolesGuard to enforce role-based access control
 * - Supports role hierarchy (admin > moderator > user)
 * - Can be applied to controllers (all routes) or individual methods
 * - Requires JwtAuthGuard to be applied first for authentication
 *
 * Valid roles: 'user', 'moderator', 'admin'
 *
 * Role hierarchy means:
 * - Admin can access routes marked with any role
 * - Moderator can access routes marked 'moderator' or 'user'
 * - User can only access routes marked 'user'
 *
 * @example
 * ```typescript
 * // Single role requirement
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin')
 * @Delete('users/:id')
 * deleteUser(@Param('id') id: string) {
 *   return this.userService.delete(id);
 * }
 *
 * // Multiple roles (user needs one of them)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin', 'moderator')
 * @Patch('posts/:id/moderate')
 * moderatePost(@Param('id') id: string) {
 *   return this.postService.moderate(id);
 * }
 *
 * // Controller-level (applies to all routes)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin')
 * @Controller('admin')
 * export class AdminController {
 *   // All routes require admin role
 * }
 *
 * // Method-level overrides controller-level
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('moderator')
 * @Controller('content')
 * export class ContentController {
 *   // Requires moderator
 *   @Get()
 *   findAll() {}
 *
 *   // Overrides to require admin
 *   @Roles('admin')
 *   @Delete(':id')
 *   remove(@Param('id') id: string) {}
 * }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
