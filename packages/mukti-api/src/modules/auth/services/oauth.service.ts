import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from '../../../schemas/user.schema';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { JwtTokenService } from './jwt.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';

/**
 * OAuth Profile from Google
 */
export interface OAuthProfile {
  email: string;
  firstName: string;
  googleId?: string;
  lastName: string;
  photo?: string;
}

/**
 * OAuth Service
 *
 * Handles OAuth authentication flows for Google.
 * Manages account creation and linking logic.
 *
 * @remarks
 * This service implements the following OAuth patterns:
 * - Create new account if user doesn't exist
 * - Link OAuth provider to existing account
 * - Prevent duplicate OAuth accounts
 * - Generate JWT tokens for authenticated users
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtTokenService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Authenticates user with Google OAuth
   *
   * @param profile - Google user profile
   * @param deviceInfo - Device information from request
   * @param ipAddress - IP address from request
   * @returns Authentication response with tokens
   * @throws {UnauthorizedException} If email is missing from profile
   * @throws {ConflictException} If Google account is already linked to another user
   *
   * @example
   * ```typescript
   * const authResponse = await oauthService.authenticateWithGoogle(
   *   { email: 'user@example.com', firstName: 'John', lastName: 'Doe', googleId: '123' },
   *   'Chrome on MacOS',
   *   '192.168.1.1'
   * );
   * ```
   */
  async authenticateWithGoogle(
    profile: OAuthProfile,
    deviceInfo: string,
    ipAddress: string,
  ): Promise<AuthResponseDto> {
    this.logger.log(
      `Authenticating with Google: ${profile.email} (${profile.googleId})`,
    );

    if (!profile.email) {
      throw new UnauthorizedException('Email not provided by Google');
    }

    if (!profile.googleId) {
      throw new UnauthorizedException('Google ID not provided');
    }

    // Check if user exists with this Google ID
    let user = await this.userModel.findOne({ googleId: profile.googleId });

    if (user) {
      // User exists with this Google ID - update last login
      this.logger.log(`Existing Google user found: ${user._id.toString()}`);
      user.lastLoginAt = new Date();
      user.lastLoginDevice = deviceInfo;
      user.lastLoginIp = ipAddress;
      await user.save();
    } else {
      // Check if user exists with this email
      user = await this.userModel.findOne({ email: profile.email });

      if (user) {
        // User exists with email but no Google ID - link account
        if (user.googleId && user.googleId !== profile.googleId) {
          throw new ConflictException(
            'This Google account is already linked to another user',
          );
        }

        this.logger.log(
          `Linking Google account to existing user: ${user._id.toString()}`,
        );
        user.googleId = profile.googleId;
        user.emailVerified = true; // Google verifies emails
        user.lastLoginAt = new Date();
        user.lastLoginDevice = deviceInfo;
        user.lastLoginIp = ipAddress;
        await user.save();
      } else {
        // Create new user
        this.logger.log(
          `Creating new user from Google profile: ${profile.email}`,
        );
        user = await this.userModel.create({
          email: profile.email,
          emailVerified: true, // Google verifies emails
          firstName: profile.firstName,
          googleId: profile.googleId,
          isActive: true,
          lastLoginAt: new Date(),
          lastLoginDevice: deviceInfo,
          lastLoginIp: ipAddress,
          lastName: profile.lastName,
          password: undefined, // No password for OAuth users
          role: 'user',
        });
      }
    }

    // Generate tokens
    const accessToken = this.jwtService.generateAccessToken({
      email: user.email,
      role: user.role,
      sub: user._id.toString(),
    });

    const refreshToken = this.jwtService.generateRefreshToken({
      email: user.email,
      role: user.role,
      sub: user._id.toString(),
    });

    // Store refresh token
    const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.tokenService.createRefreshToken(
      user._id.toString(),
      refreshToken,
      refreshTokenExpires,
      deviceInfo,
      ipAddress,
    );

    // Create session
    await this.sessionService.createSession({
      deviceInfo,
      expiresAt: refreshTokenExpires,
      ipAddress,
      refreshToken,
      userAgent: deviceInfo,
      userId: user._id.toString(),
    });

    this.logger.log(
      `Google authentication successful for user: ${user._id.toString()}`,
    );

    return {
      accessToken,
      refreshToken,
      user: {
        createdAt: user.createdAt,
        email: user.email,
        emailVerified: user.emailVerified,
        firstName: user.firstName,
        id: user._id.toString(),
        isActive: user.isActive,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        updatedAt: user.updatedAt,
      },
    };
  }

  /**
   * Links a Google account to an existing user
   *
   * @param userId - User ID to link account to
   * @param googleId - Google ID to link
   * @throws {ConflictException} If Google ID is already linked to another user
   *
   * @example
   * ```typescript
   * await oauthService.linkGoogleAccount('507f1f77bcf86cd799439011', 'google-123');
   * ```
   */
  async linkGoogleAccount(userId: string, googleId: string): Promise<void> {
    this.logger.log(`Linking Google account ${googleId} to user ${userId}`);

    // Check if Google ID is already linked to another user
    const existingUser = await this.userModel.findOne({ googleId });
    if (existingUser && existingUser._id.toString() !== userId) {
      throw new ConflictException(
        'This Google account is already linked to another user',
      );
    }

    // Link Google account
    await this.userModel.findByIdAndUpdate(userId, {
      googleId,
    });

    this.logger.log(`Google account linked successfully to user ${userId}`);
  }
}
