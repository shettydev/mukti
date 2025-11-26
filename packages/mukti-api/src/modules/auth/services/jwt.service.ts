import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';

/**
 * JWT payload structure for access and refresh tokens
 *
 * @property sub - User ID (subject)
 * @property email - User email address
 * @property role - User role for authorization
 * @property iat - Issued at timestamp (seconds since epoch)
 * @property exp - Expiration timestamp (seconds since epoch)
 */
export interface JwtPayload {
  email: string;
  exp: number;
  iat: number;
  role: string;
  sub: string;
}

/**
 * Service responsible for JWT token generation, verification, and decoding.
 *
 * @remarks
 * This service implements secure JWT-based authentication with:
 * - Short-lived access tokens (15 minutes) for API authentication
 * - Long-lived refresh tokens (7 days) for obtaining new access tokens
 * - Signature verification using HS256 algorithm
 * - Expiration validation
 * - Issuer validation for additional security
 *
 * Access tokens are stored in memory on the client, while refresh tokens
 * are stored in httpOnly, secure, sameSite cookies to prevent XSS attacks.
 */
@Injectable()
export class JwtTokenService {
  private readonly accessTokenExpiration: string;
  private readonly issuer: string;
  private readonly logger = new Logger(JwtTokenService.name);
  private readonly refreshTokenExpiration: string;
  private readonly refreshTokenSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: NestJwtService,
  ) {
    this.issuer = 'mukti-api';
    this.accessTokenExpiration =
      this.configService.get<string>('JWT_EXPIRES_IN') ?? '15m';
    this.refreshTokenExpiration =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    this.refreshTokenSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      'development-refresh-secret';
  }

  /**
   * Decodes a JWT token without verifying its signature.
   *
   * @param token - JWT token string to decode
   * @returns Decoded JWT payload or null if decoding fails
   *
   * @remarks
   * This method should be used with caution as it does NOT verify the token
   * signature or expiration. It's useful for:
   * - Extracting user information from expired tokens
   * - Debugging token issues
   * - Logging token metadata
   *
   * NEVER use this method for authentication or authorization decisions.
   * Always use verifyAccessToken or verifyRefreshToken for security-critical operations.
   *
   * @example
   * ```typescript
   * const payload = jwtService.decodeToken(token);
   * if (payload) {
   *   console.log(`Token issued for: ${payload.email}`);
   *   console.log(`Token expires at: ${new Date(payload.exp * 1000)}`);
   * }
   * ```
   */
  decodeToken(token: string): JwtPayload | null {
    this.logger.debug('Decoding token without verification');

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const payload = this.jwtService.decode(token);

      if (!payload || typeof payload === 'string') {
        this.logger.warn('Failed to decode token');
        return null;
      }

      return payload as JwtPayload;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Token decoding failed: ${err.message}`, err.stack);
      return null;
    }
  }

  /**
   * Generates a short-lived access token for API authentication.
   *
   * @param payload - Token payload containing user ID, email, and role
   * @returns Signed JWT access token string
   *
   * @remarks
   * Access tokens expire after 15 minutes and should be stored in memory
   * on the client side. They are included in the Authorization header
   * for authenticated API requests.
   *
   * @example
   * ```typescript
   * const accessToken = jwtService.generateAccessToken({
   *   sub: '507f1f77bcf86cd799439011',
   *   email: 'user@example.com',
   *   role: 'user'
   * });
   * ```
   */
  generateAccessToken(payload: Omit<JwtPayload, 'exp' | 'iat'>): string {
    this.logger.debug(`Generating access token for user ${payload.sub}`);

    try {
      const token = this.jwtService.sign(
        {
          email: payload.email,
          role: payload.role,
          sub: payload.sub,
        },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expiresIn: this.accessTokenExpiration as any,
          issuer: this.issuer,
        },
      );

      this.logger.log(`Access token generated for user ${payload.sub}`);
      return token;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to generate access token: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Generates a long-lived refresh token for obtaining new access tokens.
   *
   * @param payload - Token payload containing user ID, email, and role
   * @returns Signed JWT refresh token string
   *
   * @remarks
   * Refresh tokens expire after 7 days and should be stored in httpOnly,
   * secure, sameSite cookies on the client side. They are used exclusively
   * for the token refresh endpoint and should never be sent to other APIs.
   *
   * Refresh tokens use a separate secret key from access tokens for
   * additional security.
   *
   * @example
   * ```typescript
   * const refreshToken = jwtService.generateRefreshToken({
   *   sub: '507f1f77bcf86cd799439011',
   *   email: 'user@example.com',
   *   role: 'user'
   * });
   * ```
   */
  generateRefreshToken(payload: Omit<JwtPayload, 'exp' | 'iat'>): string {
    this.logger.debug(`Generating refresh token for user ${payload.sub}`);

    try {
      const token = this.jwtService.sign(
        {
          email: payload.email,
          role: payload.role,
          sub: payload.sub,
        },
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expiresIn: this.refreshTokenExpiration as any,
          issuer: this.issuer,
          secret: this.refreshTokenSecret,
        },
      );

      this.logger.log(`Refresh token generated for user ${payload.sub}`);
      return token;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to generate refresh token: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * Verifies and validates an access token.
   *
   * @param token - JWT access token string to verify
   * @returns Decoded and validated JWT payload
   * @throws {UnauthorizedException} If token is invalid, expired, or has wrong issuer
   *
   * @remarks
   * This method performs comprehensive validation:
   * - Verifies the token signature using the secret key
   * - Checks that the token hasn't expired
   * - Validates the issuer matches the expected value
   * - Ensures all required payload fields are present
   *
   * @example
   * ```typescript
   * try {
   *   const payload = jwtService.verifyAccessToken(token);
   *   console.log(`Authenticated user: ${payload.sub}`);
   * } catch (error) {
   *   console.error('Invalid token');
   * }
   * ```
   */
  verifyAccessToken(token: string): JwtPayload {
    this.logger.debug('Verifying access token');

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        issuer: this.issuer,
      });

      // Validate required fields
      if (!payload.sub || !payload.email || !payload.role) {
        this.logger.warn('Access token missing required fields');
        throw new UnauthorizedException('Invalid token payload');
      }

      this.logger.debug(`Access token verified for user ${payload.sub}`);
      return payload;
    } catch (error) {
      const err = error as { message: string; name: string };
      this.logger.warn(`Access token verification failed: ${err.message}`);

      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access token has expired');
      }

      if (err.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid access token');
      }

      throw new UnauthorizedException('Token verification failed');
    }
  }

  /**
   * Verifies and validates a refresh token.
   *
   * @param token - JWT refresh token string to verify
   * @returns Decoded and validated JWT payload
   * @throws {UnauthorizedException} If token is invalid, expired, or has wrong issuer
   *
   * @remarks
   * This method performs the same validation as verifyAccessToken but uses
   * the refresh token secret key. Refresh tokens should only be accepted
   * at the token refresh endpoint.
   *
   * @example
   * ```typescript
   * try {
   *   const payload = jwtService.verifyRefreshToken(refreshToken);
   *   const newAccessToken = jwtService.generateAccessToken({
   *     sub: payload.sub,
   *     email: payload.email,
   *     role: payload.role
   *   });
   * } catch (error) {
   *   console.error('Invalid refresh token');
   * }
   * ```
   */
  verifyRefreshToken(token: string): JwtPayload {
    this.logger.debug('Verifying refresh token');

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        issuer: this.issuer,
        secret: this.refreshTokenSecret,
      });

      // Validate required fields
      if (!payload.sub || !payload.email || !payload.role) {
        this.logger.warn('Refresh token missing required fields');
        throw new UnauthorizedException('Invalid token payload');
      }

      this.logger.debug(`Refresh token verified for user ${payload.sub}`);
      return payload;
    } catch (error) {
      const err = error as { message: string; name: string };
      this.logger.warn(`Refresh token verification failed: ${err.message}`);

      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token has expired');
      }

      if (err.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      throw new UnauthorizedException('Token verification failed');
    }
  }
}
