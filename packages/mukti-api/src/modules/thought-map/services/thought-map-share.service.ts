import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ThoughtMapShareLink,
  ThoughtMapShareLinkDocument,
} from '../../../schemas/thought-map-share-link.schema';
import { CreateShareLinkDto } from '../dto/create-share-link.dto';

/**
 * Service for managing public share links for Thought Maps.
 *
 * @remarks
 * Each ThoughtMap may have at most one active share link at a time.
 * Creating a new link revokes any existing active link before inserting.
 * The public viewer uses getSharedMap() which does NOT require authentication.
 */
@Injectable()
export class ThoughtMapShareService {
  private readonly logger = new Logger(ThoughtMapShareService.name);

  constructor(
    @InjectModel(ThoughtMapShareLink.name)
    private readonly shareLinkModel: Model<ThoughtMapShareLinkDocument>,
  ) {}

  /**
   * Creates (or replaces) an active share link for the given Thought Map.
   *
   * @param mapId - The ThoughtMap ID
   * @param userId - The ID of the requesting user (becomes createdBy)
   * @param dto - Optional expiry date
   * @returns The newly created ThoughtMapShareLink
   */
  async createShareLink(
    mapId: string,
    userId: string | Types.ObjectId,
    dto: CreateShareLinkDto,
  ): Promise<ThoughtMapShareLink> {
    const userIdStr = userId.toString();
    const thoughtMapId = new Types.ObjectId(mapId);

    this.logger.log(
      `Creating share link for map ${mapId} by user ${userIdStr}`,
    );

    // Deactivate any existing active links for this map
    await this.shareLinkModel.updateMany(
      { isActive: true, thoughtMapId },
      { $set: { isActive: false } },
    );

    const token = this.generateToken();

    let link: ThoughtMapShareLink;

    try {
      link = await this.shareLinkModel.create({
        createdBy: new Types.ObjectId(userId.toString()),
        ...(dto.expiresAt && { expiresAt: new Date(dto.expiresAt) }),
        isActive: true,
        thoughtMapId,
        token,
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        const existingLink = await this.shareLinkModel
          .findOne({ isActive: true, thoughtMapId })
          .exec();

        if (existingLink) {
          this.logger.warn(
            `Concurrent share-link creation detected for map ${mapId}; returning the active link`,
          );
          return existingLink;
        }
      }

      throw error;
    }

    this.logger.log(`Share link created: token=${token} for map ${mapId}`);
    return link;
  }

  /**
   * Returns the active share link for a Thought Map, if one exists.
   *
   * @param mapId - The ThoughtMap ID
   * @returns The active ThoughtMapShareLink, or null
   */
  async getActiveShareLink(mapId: string): Promise<null | ThoughtMapShareLink> {
    return this.shareLinkModel
      .findOne({
        isActive: true,
        thoughtMapId: new Types.ObjectId(mapId),
      })
      .exec();
  }

  /**
   * Resolves a share token to its ThoughtMap ID, validating that the link
   * is active and not expired.
   *
   * @param token - The URL-safe share token
   * @returns The ThoughtMapShareLink document
   * @throws {NotFoundException} If the token is invalid, inactive, or expired
   */
  async getShareLinkByToken(token: string): Promise<ThoughtMapShareLink> {
    const link = await this.shareLinkModel
      .findOne({ isActive: true, token })
      .exec();

    if (!link) {
      throw new NotFoundException('Share link not found or has been revoked');
    }

    if (link.expiresAt && new Date() > link.expiresAt) {
      throw new NotFoundException('Share link has expired');
    }

    // Increment view count and update lastViewedAt (fire-and-forget)
    this.shareLinkModel
      .updateOne(
        { _id: link._id },
        { $inc: { viewCount: 1 }, $set: { lastViewedAt: new Date() } },
      )
      .exec()
      .catch((err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Failed to increment view count for token ${token}: ${errorMessage}`,
        );
      });

    return link;
  }

  /**
   * Deactivates the active share link for a Thought Map.
   *
   * @param mapId - The ThoughtMap ID
   * @throws {NotFoundException} If no active share link exists
   */
  async revokeShareLink(mapId: string): Promise<void> {
    const result = await this.shareLinkModel.updateOne(
      { isActive: true, thoughtMapId: new Types.ObjectId(mapId) },
      { $set: { isActive: false } },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException(
        'No active share link found for this Thought Map',
      );
    }

    this.logger.log(`Share link revoked for map ${mapId}`);
  }

  /**
   * Generates a 24-character URL-safe random token.
   */
  private generateToken(length = 24): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  private isDuplicateKeyError(error: unknown): error is { code: number } {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }
}
