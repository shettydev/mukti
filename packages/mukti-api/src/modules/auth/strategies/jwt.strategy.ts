import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { JwtPayload } from '../services/jwt.service';

import { User, UserDocument } from '../../../schemas/user.schema';

/**
 * Passport JWT strategy for authenticating requests with JWT access tokens.
 *
 * @remarks
 * This strategy:
 * - Extracts JWT from Authorization header (Bearer token) OR query parameter (token)
 * - Query parameter support is needed for SSE connections (EventSource doesn't support custom headers)
 * - Verifies token signature and expiration
 * - Validates user exists and is active
 * - Attaches user object to request for use in guards and controllers
 *
 * The strategy is automatically invoked by JwtAuthGuard on protected routes.
 *
 * @example
 * ```typescript
 * // In controller with Authorization header
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 *
 * // SSE endpoint with query parameter
 * @Sse(':id/stream')
 * streamConversation(@Param('id') id: string, @CurrentUser() user: User) {
 *   // Token extracted from ?token=xxx query parameter
 * }
 * ```
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super({
      ignoreExpiration: false,
      // Support both Authorization header and query parameter for SSE connections
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      secretOrKey:
        configService.get<string>('JWT_SECRET') ?? 'development-secret',
    });

    this.logger.log('JWT Strategy initialized');
  }

  /**
   * Validates the JWT payload and retrieves the associated user.
   *
   * @param payload - Decoded JWT payload containing user information
   * @returns User document if valid, throws UnauthorizedException otherwise
   * @throws {UnauthorizedException} If user not found or account is inactive
   *
   * @remarks
   * This method is called automatically by Passport after JWT verification.
   * It performs additional validation:
   * - Checks if user exists in database
   * - Verifies user account is active
   * - Returns full user object for request context
   *
   * The returned user object is attached to the request as `req.user`.
   */
  async validate(payload: JwtPayload): Promise<User> {
    this.logger.debug(`Validating JWT payload for user ${payload.sub}`);

    // Find user by ID from JWT payload
    const user = await this.userModel
      .findById(payload.sub)
      .select('+password') // Include password field for potential use
      .lean();

    if (!user) {
      this.logger.warn(`User not found for ID: ${payload.sub}`);
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      this.logger.warn(`Inactive user attempted access: ${payload.sub}`);
      throw new UnauthorizedException('Account is inactive');
    }

    this.logger.debug(`User validated successfully: ${payload.sub}`);

    // Return user object (will be attached to request as req.user)
    return user as unknown as User;
  }
}
