import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';

import { RateLimit, RateLimitSchema } from '../../schemas/rate-limit.schema';
import {
  RefreshToken,
  RefreshTokenSchema,
} from '../../schemas/refresh-token.schema';
import { Session, SessionSchema } from '../../schemas/session.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { AuthController } from './auth.controller';
import { EmailVerifiedGuard } from './guards/email-verified.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard';
import { PasswordResetRateLimitGuard } from './guards/password-reset-rate-limit.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/email.service';
import { JwtTokenService } from './services/jwt.service';
import { OAuthService } from './services/oauth.service';
import { PasswordService } from './services/password.service';
import { RateLimitService } from './services/rate-limit.service';
import { SessionService } from './services/session.service';
import { TokenService } from './services/token.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Authentication and Authorization Module
 *
 * Provides comprehensive authentication services including:
 * - JWT-based authentication with access and refresh tokens
 * - OAuth 2.0 integration (Google)
 * - Password management (hashing, reset, validation)
 * - Email verification
 * - Session management
 * - Role-based access control (RBAC)
 *
 * @remarks
 * This module implements secure authentication following industry best practices:
 * - Bcrypt password hashing with cost factor 12
 * - Short-lived access tokens (15 minutes)
 * - Long-lived refresh tokens (7 days) stored in httpOnly cookies
 * - Rate limiting on authentication endpoints
 * - CSRF protection for state-changing operations
 */
@Module({
  controllers: [AuthController],
  exports: [
    JwtModule,
    PassportModule,
    PasswordService,
    JwtTokenService,
    TokenService,
    SessionService,
    EmailService,
    RateLimitService,
    OAuthService,
    JwtAuthGuard,
    RolesGuard,
    EmailVerifiedGuard,
    LoginRateLimitGuard,
    PasswordResetRateLimitGuard,
  ],
  imports: [
    // Passport for authentication strategies
    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false,
    }),

    // JWT module with async configuration
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret:
          configService.get<string>('JWT_SECRET') ?? 'development-secret-key',
        signOptions: {
          expiresIn: configService.get<number>('JWT_EXPIRES_IN') ?? '15m',
        },
      }),
    }),

    // Mongoose models
    MongooseModule.forFeature([
      { name: RateLimit.name, schema: RateLimitSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: Session.name, schema: SessionSchema },
      { name: User.name, schema: UserSchema },
    ]),

    ConfigModule,
  ],
  providers: [
    AuthService,
    PasswordService,
    JwtTokenService,
    TokenService,
    SessionService,
    EmailService,
    RateLimitService,
    OAuthService,
    JwtStrategy,
    GoogleStrategy,
    JwtAuthGuard,
    RolesGuard,
    EmailVerifiedGuard,
    LoginRateLimitGuard,
    PasswordResetRateLimitGuard,
  ],
})
export class AuthModule {}
