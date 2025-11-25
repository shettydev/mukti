import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { User } from '../../../schemas/user.schema';

/**
 * Parameter decorator that extracts the authenticated user from the request.
 *
 * @remarks
 * This decorator:
 * - Retrieves the user object attached by JwtAuthGuard
 * - Can be used in any controller method protected by JwtAuthGuard
 * - Provides type-safe access to user information
 * - Simplifies controller code by eliminating manual request.user access
 *
 * The user object is populated by the JWT strategy after successful authentication.
 *
 * @example
 * ```typescript
 * // Basic usage
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return {
 *     id: user._id,
 *     email: user.email,
 *     role: user.role
 *   };
 * }
 *
 * // Access specific user property
 * @UseGuards(JwtAuthGuard)
 * @Get('conversations')
 * getConversations(@CurrentUser('_id') userId: string) {
 *   return this.conversationService.findByUserId(userId);
 * }
 *
 * // With multiple guards
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin')
 * @Get('admin/users')
 * getAllUsers(@CurrentUser() admin: User) {
 *   this.logger.log(`Admin ${admin.email} accessed user list`);
 *   return this.userService.findAll();
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If specific property requested, return that property
    if (data) {
      return user?.[data];
    }

    // Otherwise return entire user object
    return user;
  },
);
