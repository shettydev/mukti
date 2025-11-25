import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';

/**
 * Guard that ensures user has verified their email address.
 *
 * @remarks
 * This guard:
 * - Checks if user's email is verified
 * - Must be used after JwtAuthGuard to ensure user is authenticated
 * - Throws ForbiddenException if email is not verified
 * - Useful for protecting premium features or sensitive operations
 *
 * Apply this guard to routes that require email verification.
 *
 * @example
 * ```typescript
 * // Require email verification for premium features
 * @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
 * @Post('conversations/premium')
 * createPremiumConversation() {}
 *
 * // Require email verification for sensitive operations
 * @UseGuards(JwtAuthGuard, EmailVerifiedGuard)
 * @Delete('account')
 * deleteAccount() {}
 *
 * // Multiple guards can be combined
 * @UseGuards(JwtAuthGuard, EmailVerifiedGuard, RolesGuard)
 * @Roles('admin')
 * @Post('admin/settings')
 * updateSettings() {}
 * ```
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  private readonly logger = new Logger(EmailVerifiedGuard.name);

  /**
   * Determines if the current user has verified their email.
   *
   * @param context - Execution context containing request and user information
   * @returns True if email is verified, throws exception otherwise
   * @throws {ForbiddenException} If email is not verified
   *
   * @remarks
   * This method:
   * 1. Retrieves user from request (set by JwtAuthGuard)
   * 2. Checks emailVerified flag on user object
   * 3. Logs verification status for security monitoring
   * 4. Provides helpful error message directing user to verify email
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('No user found in request, denying access');
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.emailVerified) {
      this.logger.warn(
        `User ${user._id} attempted to access email-verified route without verification`,
      );
      throw new ForbiddenException(
        'Email verification required. Please verify your email address to access this feature.',
      );
    }

    this.logger.debug(
      `User ${user._id} email verification confirmed, allowing access`,
    );

    return true;
  }
}
