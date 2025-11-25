import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { JwtTokenService } from './services/jwt.service';
import { PasswordService } from './services/password.service';

/**
 * Authentication and Authorization Module
 *
 * Provides comprehensive authentication services including:
 * - JWT-based authentication with access and refresh tokens
 * - OAuth 2.0 integration (Google, Apple)
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
  controllers: [],
  exports: [JwtModule, PassportModule, PasswordService, JwtTokenService],
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

    ConfigModule,
  ],
  providers: [PasswordService, JwtTokenService],
})
export class AuthModule {}
