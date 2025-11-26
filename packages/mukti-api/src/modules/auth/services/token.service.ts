import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  RefreshToken,
  RefreshTokenDocument,
} from '../../../schemas/refresh-token.schema';

/**
 * Service responsible for managing refresh tokens in the database.
 * Handles token creation, retrieval, revocation, and cleanup operations.
 *
 * @remarks
 * This service implements secure refresh token management with support for
 * device tracking, token revocation, and automatic cleanup of expired tokens.
 * All tokens are stored with expiration dates and can be revoked individually
 * or in bulk for security purposes.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  /**
   * Deletes all expired refresh tokens from the database.
   *
   * @returns The number of tokens that were deleted
   *
   * @remarks
   * This is typically called by a scheduled job for cleanup.
   * Note: TTL index should handle most cleanup automatically.
   *
   * @example
   * ```typescript
   * const deletedCount = await tokenService.cleanupExpiredTokens();
   * console.log(`Cleaned up ${deletedCount} expired tokens`);
   * ```
   */
  async cleanupExpiredTokens(): Promise<number> {
    this.logger.log(`Cleaning up expired refresh tokens`);

    try {
      const result = await this.refreshTokenModel.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      this.logger.log(`Cleaned up ${result.deletedCount} expired tokens`);
      return result.deletedCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to cleanup expired tokens: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Creates and stores a new refresh token in the database.
   *
   * @param userId - The ID of the user this token belongs to
   * @param token - The refresh token string (should be hashed/encrypted)
   * @param expiresAt - The expiration date for this token
   * @param deviceInfo - Optional device information for tracking
   * @param ipAddress - Optional IP address for security tracking
   * @returns The created refresh token document
   *
   * @example
   * ```typescript
   * const refreshToken = await tokenService.createRefreshToken(
   *   userId,
   *   'hashed-token-string',
   *   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
   *   'Chrome on macOS',
   *   '192.168.1.1'
   * );
   * ```
   */
  async createRefreshToken(
    userId: string | Types.ObjectId,
    token: string,
    expiresAt: Date,
    deviceInfo?: string,
    ipAddress?: string,
  ): Promise<RefreshToken> {
    const userIdStr = userId.toString();
    this.logger.log(`Creating refresh token for user ${userIdStr}`);

    try {
      const refreshToken = await this.refreshTokenModel.create({
        deviceInfo,
        expiresAt,
        ipAddress,
        isRevoked: false,
        token,
        userId: new Types.ObjectId(userId),
      });

      this.logger.log(
        `Refresh token created successfully for user ${userIdStr}`,
      );
      return refreshToken.toObject();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to create refresh token for user ${userIdStr}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Retrieves all active (non-revoked, non-expired) refresh tokens for a user.
   *
   * @param userId - The ID of the user
   * @returns Array of active refresh token documents
   *
   * @remarks
   * Useful for displaying active sessions to users or for administrative purposes.
   *
   * @example
   * ```typescript
   * const activeTokens = await tokenService.findActiveTokensByUserId(userId);
   * console.log(`User has ${activeTokens.length} active sessions`);
   * ```
   */
  async findActiveTokensByUserId(
    userId: string | Types.ObjectId,
  ): Promise<RefreshToken[]> {
    const userIdStr = userId.toString();
    this.logger.debug(`Finding active tokens for user ${userIdStr}`);

    try {
      const tokens = await this.refreshTokenModel
        .find({
          expiresAt: { $gt: new Date() },
          isRevoked: false,
          userId: new Types.ObjectId(userId),
        })
        .sort({ createdAt: -1 })
        .lean();

      this.logger.debug(
        `Found ${tokens.length} active tokens for user ${userIdStr}`,
      );
      return tokens;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to find active tokens for user ${userIdStr}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Retrieves a refresh token from the database by token string.
   *
   * @param token - The refresh token string to find
   * @returns The refresh token document if found, null otherwise
   *
   * @example
   * ```typescript
   * const refreshToken = await tokenService.findRefreshToken('token-string');
   * if (refreshToken && !refreshToken.isRevoked) {
   *   // Token is valid
   * }
   * ```
   */
  async findRefreshToken(token: string): Promise<null | RefreshToken> {
    this.logger.debug(`Finding refresh token`);

    try {
      const refreshToken = await this.refreshTokenModel
        .findOne({ token })
        .lean();

      if (!refreshToken) {
        this.logger.debug(`Refresh token not found`);
        return null;
      }

      const userIdStr = refreshToken.userId.toString();
      this.logger.debug(`Refresh token found for user ${userIdStr}`);
      return refreshToken;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to find refresh token: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Revokes all refresh tokens for a specific user.
   *
   * @param userId - The ID of the user whose tokens should be revoked
   * @returns The number of tokens that were revoked
   *
   * @remarks
   * This is typically used when:
   * - User changes their password
   * - User requests to logout from all devices
   * - Security breach is detected
   *
   * @example
   * ```typescript
   * const revokedCount = await tokenService.revokeAllUserTokens(userId);
   * console.log(`Revoked ${revokedCount} tokens`);
   * ```
   */
  async revokeAllUserTokens(userId: string | Types.ObjectId): Promise<number> {
    const userIdStr = userId.toString();
    this.logger.log(`Revoking all refresh tokens for user ${userIdStr}`);

    try {
      const result = await this.refreshTokenModel.updateMany(
        {
          isRevoked: false,
          userId: new Types.ObjectId(userId),
        },
        { $set: { isRevoked: true } },
      );

      this.logger.log(
        `Revoked ${result.modifiedCount} refresh tokens for user ${userIdStr}`,
      );
      return result.modifiedCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to revoke all tokens for user ${userIdStr}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  /**
   * Revokes a single refresh token by marking it as revoked.
   *
   * @param token - The refresh token string to revoke
   * @returns True if token was revoked, false if token not found
   *
   * @remarks
   * Revoked tokens remain in the database but are marked as invalid.
   * They will be automatically cleaned up when they expire via TTL index.
   *
   * @example
   * ```typescript
   * const revoked = await tokenService.revokeRefreshToken('token-string');
   * if (revoked) {
   *   console.log('Token successfully revoked');
   * }
   * ```
   */
  async revokeRefreshToken(token: string): Promise<boolean> {
    this.logger.log(`Revoking refresh token`);

    try {
      const result = await this.refreshTokenModel.updateOne(
        { isRevoked: false, token },
        { $set: { isRevoked: true } },
      );

      if (result.modifiedCount === 0) {
        this.logger.warn(`Refresh token not found or already revoked`);
        return false;
      }

      this.logger.log(`Refresh token revoked successfully`);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to revoke refresh token: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }
}
