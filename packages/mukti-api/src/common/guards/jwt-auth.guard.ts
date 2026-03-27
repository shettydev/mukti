import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Guard that protects routes requiring JWT authentication.
 *
 * @remarks
 * This guard:
 * - Checks for JWT token in Authorization header
 * - Validates token using JwtStrategy
 * - Allows public routes marked with @Public() decorator
 * - Attaches authenticated user to request object
 *
 * Apply this guard globally in main.ts or on specific controllers/routes.
 *
 * @example
 * ```typescript
 * // Global application
 * app.useGlobalGuards(new JwtAuthGuard(reflector));
 *
 * // Controller level
 * @UseGuards(JwtAuthGuard)
 * @Controller('conversations')
 * export class ConversationController {}
 *
 * // Route level
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile() {}
 *
 * // Public route (bypasses guard)
 * @Public()
 * @Get('health')
 * healthCheck() {}
 * ```
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Determines if the current request can proceed.
   *
   * @param context - Execution context containing request information
   * @returns Boolean or Promise/Observable indicating if request is authorized
   *
   * @remarks
   * This method:
   * 1. Checks if route is marked as public with @Public() decorator
   * 2. If public, allows request without authentication
   * 3. If not public, delegates to parent AuthGuard for JWT validation
   * 4. Logs authentication attempts for security monitoring
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Observable<boolean> | Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.debug('Public route accessed, skipping authentication');
      return true;
    }

    // Log authentication attempt
    const request = context.switchToHttp().getRequest();
    this.logger.debug(
      `Authenticating request to ${request.method} ${request.url}`,
    );

    // Delegate to parent AuthGuard for JWT validation
    return super.canActivate(context);
  }

  /**
   * Handles authentication errors.
   *
   * @param err - Error thrown during authentication
   * @param user - User object (if authentication succeeded)
   * @param info - Additional information about the authentication attempt
   * @returns User object if authentication succeeded
   * @throws {UnauthorizedException} If authentication failed
   *
   * @remarks
   * This method provides detailed error messages for different failure scenarios:
   * - Missing token
   * - Invalid token
   * - Expired token
   * - Other authentication errors
   */
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): TUser {
    // Log authentication failure
    if (err || !user) {
      const request = context.switchToHttp().getRequest();
      this.logger.warn(
        `Authentication failed for ${request.method} ${request.url}: ${info?.message ?? 'Unknown error'}`,
      );
    }

    // Handle specific error cases
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException('Access token has expired');
    }

    if (info?.name === 'JsonWebTokenError') {
      throw new UnauthorizedException('Invalid access token');
    }

    if (info?.message === 'No auth token') {
      throw new UnauthorizedException('No authentication token provided');
    }

    if (err || !user) {
      throw err || new UnauthorizedException('Authentication failed');
    }

    this.logger.debug(`User authenticated successfully: ${user._id}`);
    return user;
  }
}
