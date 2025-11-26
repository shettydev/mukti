import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Session, SessionDocument } from '../../../schemas/session.schema';

/**
 * Interface for session creation data
 */
export interface CreateSessionDto {
  deviceInfo?: string;
  expiresAt: Date;
  ipAddress?: string;
  location?: string;
  refreshToken: string;
  userAgent?: string;
  userId: string;
}

/**
 * Service responsible for managing user sessions.
 * Handles session creation, retrieval, and revocation for authentication tracking.
 *
 * @remarks
 * This service implements session management for the authentication system,
 * allowing users to view and manage their active sessions across devices.
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
  ) {}

  /**
   * Creates a new session record with device and location metadata.
   *
   * @param dto - The session creation data
   * @returns The newly created session
   *
   * @example
   * ```typescript
   * const session = await sessionService.createSession({
   *   userId: '507f1f77bcf86cd799439011',
   *   refreshToken: 'token-string',
   *   deviceInfo: 'Chrome on macOS',
   *   ipAddress: '192.168.1.1',
   *   location: 'San Francisco, CA',
   *   expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
   * });
   * ```
   */
  async createSession(dto: CreateSessionDto): Promise<Session> {
    this.logger.log(`Creating session for user ${dto.userId}`);

    try {
      const session = await this.sessionModel.create({
        deviceInfo: dto.deviceInfo,
        expiresAt: dto.expiresAt,
        ipAddress: dto.ipAddress,
        isActive: true,
        lastActivityAt: new Date(),
        location: dto.location,
        refreshToken: dto.refreshToken,
        userAgent: dto.userAgent,
        userId: new Types.ObjectId(dto.userId),
      });

      this.logger.log(`Session created: ${session._id.toString()}`);
      return session.toObject();
    } catch (error) {
      this.logger.error(
        `Failed to create session for user ${dto.userId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Finds a session by refresh token.
   *
   * @param refreshToken - The refresh token
   * @returns The session if found, null otherwise
   */
  async findSessionByToken(refreshToken: string): Promise<null | Session> {
    try {
      return await this.sessionModel
        .findOne({
          expiresAt: { $gt: new Date() },
          isActive: true,
          refreshToken,
        })
        .lean();
    } catch (error) {
      this.logger.error(
        `Failed to find session by token: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return null;
    }
  }

  /**
   * Retrieves all active sessions for a user.
   *
   * @param userId - The user ID
   * @returns Array of active sessions with device, location, and last activity information
   *
   * @example
   * ```typescript
   * const sessions = await sessionService.getUserSessions('507f1f77bcf86cd799439011');
   * ```
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    this.logger.log(`Retrieving sessions for user ${userId}`);

    try {
      const sessions = await this.sessionModel
        .find({
          expiresAt: { $gt: new Date() },
          isActive: true,
          userId: new Types.ObjectId(userId),
        })
        .sort({ lastActivityAt: -1 })
        .lean();

      this.logger.log(
        `Found ${sessions.length} active sessions for user ${userId}`,
      );
      return sessions;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve sessions for user ${userId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Revokes all sessions for a user except the current one.
   *
   * @param userId - The user ID
   * @param currentRefreshToken - The refresh token of the current session to keep active
   * @returns Number of sessions revoked
   *
   * @example
   * ```typescript
   * const count = await sessionService.revokeAllSessions('user-id', 'current-token');
   * ```
   */
  async revokeAllSessions(
    userId: string,
    currentRefreshToken?: string,
  ): Promise<number> {
    this.logger.log(`Revoking all sessions for user ${userId}`);

    try {
      const filter: Record<string, unknown> = {
        isActive: true,
        userId: new Types.ObjectId(userId),
      };

      // Exclude current session if token provided
      if (currentRefreshToken) {
        filter.refreshToken = { $ne: currentRefreshToken };
      }

      const result = await this.sessionModel.updateMany(filter, {
        $set: {
          isActive: false,
        },
      });

      this.logger.log(
        `Revoked ${result.modifiedCount} sessions for user ${userId}`,
      );
      return result.modifiedCount;
    } catch (error) {
      this.logger.error(
        `Failed to revoke all sessions for user ${userId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Revokes a specific session by ID.
   *
   * @param sessionId - The session ID to revoke
   * @param userId - The user ID (for authorization check)
   * @throws {NotFoundException} If session doesn't exist or doesn't belong to user
   *
   * @example
   * ```typescript
   * await sessionService.revokeSession('session-id', 'user-id');
   * ```
   */
  async revokeSession(sessionId: string, userId: string): Promise<void> {
    this.logger.log(`Revoking session ${sessionId} for user ${userId}`);

    try {
      const result = await this.sessionModel.updateOne(
        {
          _id: new Types.ObjectId(sessionId),
          userId: new Types.ObjectId(userId),
        },
        {
          $set: {
            isActive: false,
          },
        },
      );

      if (result.matchedCount === 0) {
        throw new NotFoundException(
          `Session ${sessionId} not found or does not belong to user ${userId}`,
        );
      }

      this.logger.log(`Session ${sessionId} revoked successfully`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Failed to revoke session ${sessionId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Revokes a session by refresh token.
   *
   * @param refreshToken - The refresh token
   */
  async revokeSessionByToken(refreshToken: string): Promise<void> {
    try {
      await this.sessionModel.updateOne(
        { refreshToken },
        {
          $set: {
            isActive: false,
          },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to revoke session by token: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Updates the last activity timestamp for a session.
   *
   * @param refreshToken - The refresh token identifying the session
   *
   * @example
   * ```typescript
   * await sessionService.updateLastActivity('refresh-token');
   * ```
   */
  async updateLastActivity(refreshToken: string): Promise<void> {
    try {
      await this.sessionModel.updateOne(
        { isActive: true, refreshToken },
        {
          $set: {
            lastActivityAt: new Date(),
          },
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to update last activity: ${(error as Error).message}`,
        (error as Error).stack,
      );
      // Don't throw - this is a non-critical operation
    }
  }
}
