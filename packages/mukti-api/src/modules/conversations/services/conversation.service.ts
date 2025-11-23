import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type FilterQuery, Model, Types } from 'mongoose';

import {
  ArchivedMessage,
  ArchivedMessageDocument,
} from '../../../schemas/archived-message.schema';
import {
  Conversation,
  ConversationDocument,
} from '../../../schemas/conversation.schema';
import {
  Technique,
  TechniqueDocument,
} from '../../../schemas/technique.schema';

/**
 * Service responsible for managing user conversations and Socratic inquiry sessions.
 * Handles CRUD operations, ownership validation, and conversation analytics.
 *
 * @remarks
 * This service implements the core Thinking Workspace paradigm, ensuring
 * conversations guide users through structured inquiry rather than providing
 * direct answers.
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  /**
   * Valid Socratic techniques that can be used for conversations.
   */
  private readonly VALID_TECHNIQUES = [
    'elenchus',
    'dialectic',
    'maieutics',
    'definitional',
    'analogical',
    'counterfactual',
  ];

  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(ArchivedMessage.name)
    private archivedMessageModel: Model<ArchivedMessageDocument>,
    @InjectModel(Technique.name)
    private techniqueModel: Model<TechniqueDocument>,
  ) {}

  /**
   * Creates a new conversation for a user with specified Socratic technique.
   *
   * @param userId - The ID of the user creating the conversation
   * @param title - The conversation title
   * @param technique - The Socratic technique to use
   * @param tags - Optional tags for organizing the conversation
   * @returns The newly created conversation
   * @throws {BadRequestException} If the technique is invalid
   *
   * @example
   * ```typescript
   * const conversation = await conversationService.createConversation(
   *   new Types.ObjectId('507f1f77bcf86cd799439011'),
   *   'React Performance',
   *   'elenchus',
   *   ['react', 'performance']
   * );
   * ```
   */
  async createConversation(
    userId: string | Types.ObjectId,
    title: string,
    technique: string,
    tags: string[] = [],
  ): Promise<ConversationDocument> {
    this.logger.log(
      `Creating conversation for user ${userId.toString()} with technique ${technique}`,
    );

    // Validate technique exists in allowed set
    if (!this.VALID_TECHNIQUES.includes(technique)) {
      this.logger.warn(
        `Invalid technique attempted: ${technique} by user ${userId.toString()}`,
      );
      throw new BadRequestException(
        `Invalid technique: ${technique}. Must be one of: ${this.VALID_TECHNIQUES.join(', ')}`,
      );
    }

    // Verify technique exists in database (optional check for built-in techniques)
    const techniqueExists = await this.techniqueModel.findOne({
      isActive: true,
      name: technique,
      status: 'approved',
    });

    if (!techniqueExists) {
      this.logger.warn(
        `Technique ${technique} not found in database or not approved`,
      );
      throw new BadRequestException(
        `Technique ${technique} is not available. Please ensure techniques are seeded.`,
      );
    }

    try {
      // Create conversation with default values
      const conversation = await this.conversationModel.create({
        hasArchivedMessages: false,
        isArchived: false,
        isFavorite: false,
        isShared: false,
        metadata: {
          estimatedCost: 0,
          messageCount: 0,
          totalTokens: 0,
        },
        recentMessages: [], // Initialize with empty array
        tags,
        technique,
        title: title.trim(),
        totalMessageCount: 0, // Start at zero
        userId: new Types.ObjectId(userId),
      });

      this.logger.log(`Conversation created: ${conversation._id.toString()}`);
      return conversation;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to create conversation: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Deletes a conversation and all associated archived messages.
   *
   * @param id - The conversation ID
   * @param userId - The ID of the user requesting the deletion
   * @throws {NotFoundException} If conversation doesn't exist
   * @throws {ForbiddenException} If user doesn't own the conversation
   *
   * @example
   * ```typescript
   * await conversationService.deleteConversation(
   *   '507f1f77bcf86cd799439011',
   *   new Types.ObjectId('507f1f77bcf86cd799439012')
   * );
   * ```
   */
  async deleteConversation(
    id: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<void> {
    const conversationId = this.formatId(id);
    const userIdString = this.formatId(userId);

    this.logger.log(
      `Deleting conversation ${conversationId} for user ${userIdString}`,
    );

    // First, verify conversation exists and user owns it
    await this.findConversationById(id, userId);

    try {
      // Delete conversation document
      const deletedConversation =
        await this.conversationModel.findByIdAndDelete(id);

      if (!deletedConversation) {
        throw new NotFoundException(
          `Conversation with ID ${conversationId} not found`,
        );
      }

      // Cascade delete all archived messages
      const deleteResult = await this.archivedMessageModel.deleteMany({
        conversationId: new Types.ObjectId(id),
      });

      this.logger.log(
        `Conversation ${conversationId} deleted successfully. Removed ${deleteResult.deletedCount} archived messages.`,
      );
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Error deleting conversation ${conversationId}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Retrieves a conversation by ID with ownership validation.
   *
   * @param id - The conversation ID
   * @param userId - The ID of the user requesting the conversation
   * @returns The conversation if found and owned by user
   * @throws {NotFoundException} If conversation doesn't exist
   * @throws {ForbiddenException} If user doesn't own the conversation
   *
   * @example
   * ```typescript
   * const conversation = await conversationService.findConversationById(
   *   '507f1f77bcf86cd799439011',
   *   new Types.ObjectId('507f1f77bcf86cd799439012')
   * );
   * ```
   */
  async findConversationById(
    id: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<ConversationDocument> {
    const conversationId = this.formatId(id);
    const userIdString = this.formatId(userId);

    this.logger.log(
      `Finding conversation ${conversationId} for user ${userIdString}`,
    );

    try {
      const conversation = await this.conversationModel.findById(id);

      // Return 404 if conversation doesn't exist
      if (!conversation) {
        this.logger.warn(`Conversation ${conversationId} not found`);
        throw new NotFoundException(
          `Conversation with ID ${conversationId} not found`,
        );
      }

      // Validate user ownership - Return 403 if user doesn't own conversation
      const ownerId = this.formatId(conversation.userId);
      if (ownerId !== userIdString) {
        this.logger.warn(
          `User ${userIdString} attempted to access conversation ${conversationId} owned by ${ownerId}`,
        );
        throw new ForbiddenException(
          `You do not have permission to access this conversation`,
        );
      }

      this.logger.log(`Conversation ${conversationId} retrieved successfully`);
      return conversation;
    } catch (error: unknown) {
      // Re-throw known exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.logger.error(
        `Error finding conversation ${conversationId}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Lists conversations for authenticated user with filtering, sorting, and pagination.
   *
   * @param userId - The ID of the user requesting conversations
   * @param filters - Optional filters (technique, tags, isArchived, isFavorite)
   * @param sort - Sort field (createdAt, updatedAt, lastMessageAt)
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 20)
   * @returns Paginated list of conversations with metadata
   *
   * @example
   * ```typescript
   * const result = await conversationService.findUserConversations(
   *   new Types.ObjectId('507f1f77bcf86cd799439011'),
   *   { technique: 'elenchus', isArchived: false },
   *   'updatedAt',
   *   1,
   *   20
   * );
   * ```
   */
  async findUserConversations(
    userId: string | Types.ObjectId,
    filters: {
      isArchived?: boolean;
      isFavorite?: boolean;
      tags?: string[];
      technique?: string;
    } = {},
    sort: 'createdAt' | 'lastMessageAt' | 'updatedAt' = 'updatedAt',
    page = 1,
    limit = 20,
  ): Promise<{
    data: ConversationDocument[];
    meta: {
      limit: number;
      page: number;
      total: number;
      totalPages: number;
    };
  }> {
    const userIdString = this.formatId(userId);

    this.logger.log(
      `Listing conversations for user ${userIdString} with filters: ${JSON.stringify(filters)}`,
    );

    try {
      // Build query - always filter by userId
      const query: FilterQuery<ConversationDocument> = {
        userId: new Types.ObjectId(userId),
      };

      // Apply filters
      if (filters.technique) {
        query.technique = filters.technique;
      }

      if (filters.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      if (filters.isArchived !== undefined) {
        query.isArchived = filters.isArchived;
      }

      if (filters.isFavorite !== undefined) {
        query.isFavorite = filters.isFavorite;
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Determine sort field
      let sortField: string;
      if (sort === 'lastMessageAt') {
        sortField = 'metadata.lastMessageAt';
      } else {
        sortField = sort;
      }

      // Execute query with pagination and sorting
      const [conversations, total] = await Promise.all([
        this.conversationModel
          .find(query)
          .sort({ [sortField]: -1 }) // Descending order
          .skip(skip)
          .limit(limit)
          .lean(),
        this.conversationModel.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      this.logger.log(
        `Found ${conversations.length} conversations (page ${page}/${totalPages})`,
      );

      return {
        data: conversations as unknown as ConversationDocument[],
        meta: {
          limit,
          page,
          total,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error listing conversations for user ${userIdString}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw error;
    }
  }

  /**
   * Updates conversation properties with validation.
   *
   * @param id - The conversation ID
   * @param userId - The ID of the user requesting the update
   * @param updates - Fields to update (title, tags, isFavorite, isArchived, technique)
   * @returns The updated conversation
   * @throws {NotFoundException} If conversation doesn't exist
   * @throws {ForbiddenException} If user doesn't own the conversation
   * @throws {BadRequestException} If validation fails
   *
   * @example
   * ```typescript
   * const updated = await conversationService.updateConversation(
   *   '507f1f77bcf86cd799439011',
   *   new Types.ObjectId('507f1f77bcf86cd799439012'),
   *   { title: 'Updated Title', isFavorite: true }
   * );
   * ```
   */
  async updateConversation(
    id: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    updates: {
      isArchived?: boolean;
      isFavorite?: boolean;
      tags?: string[];
      technique?: string;
      title?: string;
    },
  ): Promise<ConversationDocument> {
    const conversationId = this.formatId(id);
    const userIdString = this.formatId(userId);

    this.logger.log(
      `Updating conversation ${conversationId} for user ${userIdString} with updates: ${JSON.stringify(updates)}`,
    );

    // First, verify conversation exists and user owns it
    await this.findConversationById(id, userId);

    // Validate title is not empty if provided
    if (updates.title !== undefined) {
      const trimmedTitle = updates.title.trim();
      if (trimmedTitle.length === 0) {
        throw new BadRequestException('Title cannot be empty');
      }
      updates.title = trimmedTitle;
    }

    // Validate tags are array of strings if provided
    if (updates.tags !== undefined) {
      if (!Array.isArray(updates.tags)) {
        throw new BadRequestException('Tags must be an array');
      }
      if (!updates.tags.every((tag) => typeof tag === 'string')) {
        throw new BadRequestException('All tags must be strings');
      }
    }

    // Validate boolean flags are boolean type if provided
    if (
      updates.isFavorite !== undefined &&
      typeof updates.isFavorite !== 'boolean'
    ) {
      throw new BadRequestException('isFavorite must be a boolean');
    }

    if (
      updates.isArchived !== undefined &&
      typeof updates.isArchived !== 'boolean'
    ) {
      throw new BadRequestException('isArchived must be a boolean');
    }

    // Validate technique is in allowed set if provided
    if (updates.technique !== undefined) {
      if (!this.VALID_TECHNIQUES.includes(updates.technique)) {
        throw new BadRequestException(
          `Invalid technique: ${updates.technique}. Must be one of: ${this.VALID_TECHNIQUES.join(', ')}`,
        );
      }

      // Verify technique exists in database
      const techniqueExists = await this.techniqueModel.findOne({
        isActive: true,
        name: updates.technique,
        status: 'approved',
      });

      if (!techniqueExists) {
        throw new BadRequestException(
          `Technique ${updates.technique} is not available`,
        );
      }
    }

    try {
      // Update only allowed fields
      const updatedConversation =
        await this.conversationModel.findByIdAndUpdate(
          id,
          { $set: updates },
          { new: true }, // Return updated document
        );

      if (!updatedConversation) {
        throw new NotFoundException(
          `Conversation with ID ${conversationId} not found`,
        );
      }

      this.logger.log(`Conversation ${conversationId} updated successfully`);
      return updatedConversation;
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(
        `Error updating conversation ${conversationId}: ${this.getErrorMessage(error)}`,
        this.getErrorStack(error),
      );
      throw error;
    }
  }

  private formatId(id: string | Types.ObjectId): string {
    return typeof id === 'string' ? id : id.toString();
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private getErrorStack(error: unknown): string | undefined {
    return error instanceof Error ? error.stack : undefined;
  }
}
