import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';

import { User, UserDocument } from '../../../schemas/user.schema';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
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
   * Initiates the password reset process by sending a reset email.
   *
   * @param dto - Forgot password request data
   * @returns Promise that resolves when email is sent
   * @throws {NotFoundException} If user with email doesn't exist
   *
   * @example
   * ```typescript
   * await authService.forgotPassword({ email: 'user@example.com' });
   * ```
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    this.logger.log(`Password reset requested for: ${dto.email}`);

    // Find user by email
    const user = await this.userModel.findOne({ email: dto.email });

    if (!user) {
      this.logger.warn(`Password reset failed: User ${dto.email} not found`);
      // Don't reveal if user exists - return success anyway for security
      // But still throw error to maintain consistent behavior
      throw new NotFoundException('User with this email does not exist');
    }

    // Check if user has a password (OAuth users might not)
    if (!user.password) {
      this.logger.warn(
        `Password reset failed: User ${dto.email} has no password (OAuth account)`,
      );
      throw new BadRequestException(
        'This account uses OAuth authentication. Please sign in with your OAuth provider.',
      );
    }

    // Generate password reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token and expiration in user document
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    this.logger.log(
      `Password reset token generated for user ${user._id.toString()}`,
    );

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (err) {
      const error = err as Error;
      this.logger.error(
        `Failed to send password reset email: ${error.message}`,
        error.stack,
      );
      // Clear the token if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      throw new Error('Failed to send password reset email');
    }
  }

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

  /**
   * Resets a user's password using a valid reset token.
   *
   * @param dto - Reset password request data with token and new password
   * @returns Promise that resolves when password is reset
   * @throws {BadRequestException} If token is invalid or expired
   * @throws {NotFoundException} If user with token doesn't exist
   *
   * @example
   * ```typescript
   * await authService.resetPassword({
   *   token: 'reset-token-string',
   *   newPassword: 'NewSecurePass123!'
   * });
   * ```
   */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    this.logger.log('Password reset attempt with token');

    // Find user by reset token
    const user = await this.userModel
      .findOne({
        passwordResetToken: dto.token,
      })
      .select('+password');

    if (!user) {
      this.logger.warn('Password reset failed: Invalid token');
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token has expired
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      this.logger.warn(
        `Password reset failed: Token expired for user ${user._id.toString()}`,
      );
      // Clear expired token
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      throw new BadRequestException('Reset token has expired');
    }

    // Validate new password strength
    const isPasswordValid = this.passwordService.validatePasswordStrength(
      dto.newPassword,
    );
    if (!isPasswordValid) {
      throw new BadRequestException(
        'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character',
      );
    }

    // Hash new password
    const hashedPassword = await this.passwordService.hashPassword(
      dto.newPassword,
    );

    // Update password and clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    this.logger.log(
      `Password reset successful for user ${user._id.toString()}`,
    );

    // Invalidate all existing sessions for security
    await this.tokenService.revokeAllUserTokens(user._id);
    this.logger.log(
      `All sessions invalidated for user ${user._id.toString()} after password reset`,
    );
  }
}
