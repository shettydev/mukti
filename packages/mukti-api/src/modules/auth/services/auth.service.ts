import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';

import { User, UserDocument } from '../../../schemas/user.schema';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { TokenResponseDto } from '../dto/token-response.dto';
import { EmailService } from './email.service';
import { JwtTokenService } from './jwt.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

/**
 * Service responsible for core authentication operations.
 * Handles user registration, login, token refresh, and logout.
 *
 * @remarks
 * This service implements secure authentication with:
 * - Password hashing using bcrypt
 * - Email verification for new accounts
 * - JWT-based token authentication
 * - Refresh token rotation
 * - Session management
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtTokenService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Authenticates a user with email and password.
   *
   * @param dto - Login credentials
   * @returns Authentication response with tokens and user data
   * @throws {UnauthorizedException} If credentials are invalid
   *
   * @example
   * ```typescript
   * const response = await authService.login({
   *   email: 'user@example.com',
   *   password: 'SecurePass123!'
   * });
   * ```
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    this.logger.log(`Login attempt for user: ${dto.email}`);

    // Find user with password field
    const user = await this.userModel
      .findOne({ email: dto.email })
      .select('+password');

    if (!user) {
      this.logger.warn(`Login failed: User ${dto.email} not found`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user has a password (OAuth users might not)
    if (!user.password) {
      this.logger.warn(
        `Login failed: User ${dto.email} has no password (OAuth account)`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.comparePassword(
      dto.password,
      user.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Invalid password for user ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login info
    user.lastLoginAt = new Date();
    await user.save();

    this.logger.log(`User logged in successfully: ${user._id.toString()}`);

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
      user._id,
      refreshToken,
      refreshTokenExpires,
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
        lastLoginAt: user.lastLoginAt,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        updatedAt: user.updatedAt,
      },
    };
  }

  /**
   * Logs out a user by revoking their refresh token.
   *
   * @param userId - The user ID
   * @param refreshToken - The refresh token to revoke
   * @returns Promise that resolves when logout is complete
   *
   * @example
   * ```typescript
   * await authService.logout('user-id', 'refresh-token-string');
   * ```
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    this.logger.log(`Logout attempt for user ${userId}`);

    // Revoke the refresh token
    const revoked = await this.tokenService.revokeRefreshToken(refreshToken);

    if (!revoked) {
      this.logger.warn(`Logout: Refresh token not found or already revoked`);
      // Don't throw error - logout should be idempotent
    }

    this.logger.log(`User ${userId} logged out successfully`);
  }

  /**
   * Refreshes an access token using a valid refresh token.
   *
   * @param refreshToken - The refresh token string
   * @returns New access token
   * @throws {UnauthorizedException} If refresh token is invalid or revoked
   *
   * @example
   * ```typescript
   * const response = await authService.refresh('refresh-token-string');
   * ```
   */
  async refresh(refreshToken: string): Promise<TokenResponseDto> {
    this.logger.log('Token refresh attempt');

    // Verify refresh token
    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    // Check if token exists in database and is not revoked
    const storedToken = await this.tokenService.findRefreshToken(refreshToken);

    if (!storedToken) {
      this.logger.warn('Token refresh failed: Token not found in database');
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.isRevoked) {
      this.logger.warn('Token refresh failed: Token has been revoked');
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (storedToken.expiresAt < new Date()) {
      this.logger.warn('Token refresh failed: Token has expired');
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Get user to ensure they still exist and are active
    const userId = payload.sub;
    const user = await this.userModel.findById(userId);

    if (!user || !user.isActive) {
      this.logger.warn(
        `Token refresh failed: User ${userId} not found or inactive`,
      );
      throw new UnauthorizedException('User not found or inactive');
    }

    // Generate new access token
    const accessToken = this.jwtService.generateAccessToken({
      email: user.email,
      role: user.role,
      sub: user._id.toString(),
    });

    this.logger.log(`Access token refreshed for user ${user._id.toString()}`);

    return {
      accessToken,
    };
  }

  /**
   * Registers a new user with email and password.
   *
   * @param dto - User registration data
   * @returns Authentication response with tokens and user data
   * @throws {ConflictException} If email already exists
   *
   * @example
   * ```typescript
   * const response = await authService.register({
   *   email: 'user@example.com',
   *   password: 'SecurePass123!',
   *   firstName: 'John',
   *   lastName: 'Doe'
   * });
   * ```
   */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    this.logger.log(`Registering new user: ${dto.email}`);

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      this.logger.warn(
        `Registration failed: Email ${dto.email} already exists`,
      );
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.passwordService.hashPassword(
      dto.password,
    );

    // Generate email verification token
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await this.userModel.create({
      email: dto.email,
      emailVerificationExpires: verificationExpires,
      emailVerificationToken: verificationToken,
      emailVerified: false,
      firstName: dto.firstName,
      isActive: true,
      lastName: dto.lastName,
      password: hashedPassword,
      phone: dto.phone,
      role: 'user',
    });

    this.logger.log(`User created successfully: ${user._id.toString()}`);

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(
        user.email,
        verificationToken,
      );
      this.logger.log(`Verification email sent to ${user.email}`);
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `Failed to send verification email: ${error.message}`,
        error.stack,
      );
      // Don't fail registration if email fails
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
      user._id,
      refreshToken,
      refreshTokenExpires,
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
}
