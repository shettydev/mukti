import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  CanvasSession,
  CanvasSessionDocument,
} from '../../schemas/canvas-session.schema';
import {
  DialogueMessage,
  DialogueMessageDocument,
  MessageRole,
} from '../../schemas/dialogue-message.schema';
import {
  NodeDialogue,
  NodeDialogueDocument,
  NodeType,
} from '../../schemas/node-dialogue.schema';

/**
 * Paginated result for messages.
 */
export interface PaginatedMessages {
  dialogue: NodeDialogue;
  messages: DialogueMessage[];
  pagination: {
    hasMore: boolean;
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Pagination options for message retrieval.
 */
export interface PaginationOptions {
  /** Number of items per page */
  limit?: number;
  /** Page number (1-indexed) */
  page?: number;
}

/**
 * Service for managing node dialogues and messages.
 *
 * @remarks
 * Handles CRUD operations for dialogues and messages,
 * including lazy loading and pagination for efficient retrieval.
 */
@Injectable()
export class DialogueService {
  /** Default page size for message pagination */
  private readonly DEFAULT_PAGE_SIZE = 20;

  private readonly logger = new Logger(DialogueService.name);
  /** Maximum page size for message pagination */
  private readonly MAX_PAGE_SIZE = 100;

  constructor(
    @InjectModel(CanvasSession.name)
    private readonly canvasSessionModel: Model<CanvasSessionDocument>,
    @InjectModel(NodeDialogue.name)
    private readonly nodeDialogueModel: Model<NodeDialogueDocument>,
    @InjectModel(DialogueMessage.name)
    private readonly dialogueMessageModel: Model<DialogueMessageDocument>,
  ) {}

  /**
   * Adds a message to a dialogue.
   *
   * @param dialogueId - The dialogue ID
   * @param role - The message role ('user' or 'assistant')
   * @param content - The message content
   * @param metadata - Optional metadata for AI messages
   * @returns The created message
   */
  async addMessage(
    dialogueId: string | Types.ObjectId,
    role: MessageRole,
    content: string,
    metadata?: {
      latencyMs?: number;
      model?: string;
      tokens?: number;
    },
  ): Promise<DialogueMessage> {
    const dialogueObjectId =
      typeof dialogueId === 'string'
        ? new Types.ObjectId(dialogueId)
        : dialogueId;

    this.logger.log(
      `Adding ${role} message to dialogue ${dialogueObjectId.toString()}`,
    );

    // Get current message count for sequence
    const dialogue = await this.nodeDialogueModel.findById(dialogueObjectId);
    if (!dialogue) {
      throw new NotFoundException(
        `Dialogue with ID ${dialogueObjectId.toString()} not found`,
      );
    }

    const sequence = dialogue.messageCount;

    // Create the message
    const message = await this.dialogueMessageModel.create({
      content,
      dialogueId: dialogueObjectId,
      metadata,
      role,
      sequence,
    });

    // Update dialogue message count and last message timestamp
    await this.nodeDialogueModel.findByIdAndUpdate(dialogueObjectId, {
      $inc: { messageCount: 1 },
      $set: { lastMessageAt: message.createdAt },
    });

    this.logger.log(
      `Message ${message._id.toString()} added to dialogue ${dialogueObjectId.toString()}`,
    );
    return message;
  }

  /**
   * Gets a dialogue by session and node ID.
   *
   * @param sessionId - The canvas session ID
   * @param nodeId - The node identifier
   * @returns The dialogue if found, null otherwise
   */
  async getDialogue(
    sessionId: string,
    nodeId: string,
  ): Promise<NodeDialogue | null> {
    return this.nodeDialogueModel.findOne({
      nodeId,
      sessionId: new Types.ObjectId(sessionId),
    });
  }

  /**
   * Gets all dialogues for a canvas session.
   *
   * @param sessionId - The canvas session ID
   * @returns Array of dialogues for the session
   */
  async getDialoguesBySession(sessionId: string): Promise<NodeDialogue[]> {
    return this.nodeDialogueModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .sort({ lastMessageAt: -1 })
      .exec();
  }

  /**
   * Gets messages for a dialogue with pagination.
   *
   * @param dialogueId - The dialogue ID
   * @param options - Pagination options
   * @returns Paginated messages with dialogue info
   */
  async getMessages(
    dialogueId: string | Types.ObjectId,
    options: PaginationOptions = {},
  ): Promise<PaginatedMessages> {
    const dialogueObjectId =
      typeof dialogueId === 'string'
        ? new Types.ObjectId(dialogueId)
        : dialogueId;

    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(
      this.MAX_PAGE_SIZE,
      Math.max(1, options.limit ?? this.DEFAULT_PAGE_SIZE),
    );
    const skip = (page - 1) * limit;

    this.logger.debug(
      `Getting messages for dialogue ${dialogueObjectId.toString()}, page ${page}, limit ${limit}`,
    );

    // Get dialogue info
    const dialogue = await this.nodeDialogueModel.findById(dialogueObjectId);
    if (!dialogue) {
      throw new NotFoundException(
        `Dialogue with ID ${dialogueObjectId.toString()} not found`,
      );
    }

    // Get messages with pagination
    const [messages, total] = await Promise.all([
      this.dialogueMessageModel
        .find({ dialogueId: dialogueObjectId })
        .sort({ sequence: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.dialogueMessageModel.countDocuments({
        dialogueId: dialogueObjectId,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      dialogue,
      messages,
      pagination: {
        hasMore: page < totalPages,
        limit,
        page,
        total,
        totalPages,
      },
    };
  }

  /**
   * Gets messages for a node by session and node ID with pagination.
   *
   * @param sessionId - The canvas session ID
   * @param nodeId - The node identifier
   * @param options - Pagination options
   * @returns Paginated messages with dialogue info, or empty result if no dialogue exists
   */
  async getMessagesByNode(
    sessionId: string,
    nodeId: string,
    options: PaginationOptions = {},
  ): Promise<null | PaginatedMessages> {
    const dialogue = await this.getDialogue(sessionId, nodeId);

    if (!dialogue) {
      return null;
    }

    return this.getMessages(dialogue._id, options);
  }

  /**
   * Gets or creates a dialogue for a specific node.
   *
   * @param sessionId - The canvas session ID
   * @param nodeId - The node identifier (e.g., 'seed', 'soil-0', 'root-1')
   * @param nodeType - The type of node
   * @param nodeLabel - The node's content/label
   * @returns The existing or newly created dialogue
   */
  async getOrCreateDialogue(
    sessionId: string,
    nodeId: string,
    nodeType: NodeType,
    nodeLabel: string,
  ): Promise<NodeDialogue> {
    this.logger.log(
      `Getting or creating dialogue for session ${sessionId}, node ${nodeId}`,
    );

    const sessionObjectId = new Types.ObjectId(sessionId);

    // Try to find existing dialogue
    let dialogue = await this.nodeDialogueModel.findOne({
      nodeId,
      sessionId: sessionObjectId,
    });

    if (dialogue) {
      this.logger.debug(`Found existing dialogue ${dialogue._id.toString()}`);
      return dialogue;
    }

    // Create new dialogue
    dialogue = await this.nodeDialogueModel.create({
      messageCount: 0,
      nodeId,
      nodeLabel,
      nodeType,
      sessionId: sessionObjectId,
    });

    this.logger.log(
      `Created new dialogue ${dialogue._id.toString()} for node ${nodeId}`,
    );
    return dialogue;
  }

  /**
   * Validates that a canvas session exists and is owned by the user.
   *
   * @param sessionId - The canvas session ID
   * @param userId - The user ID to validate ownership
   * @returns The canvas session if valid
   * @throws {NotFoundException} If session doesn't exist
   * @throws {ForbiddenException} If user doesn't own the session
   */
  async validateSessionOwnership(
    sessionId: string,
    userId: string | Types.ObjectId,
  ): Promise<CanvasSession> {
    const userIdStr = userId.toString();
    this.logger.debug(
      `Validating session ${sessionId} ownership for user ${userIdStr}`,
    );

    const session = await this.canvasSessionModel.findById(sessionId);

    if (!session) {
      this.logger.warn(`Canvas session ${sessionId} not found`);
      throw new NotFoundException(
        `Canvas session with ID ${sessionId} not found`,
      );
    }

    if (session.userId.toString() !== userIdStr) {
      this.logger.warn(
        `User ${userIdStr} attempted to access session ${sessionId} owned by ${session.userId.toString()}`,
      );
      throw new ForbiddenException(
        'You do not have permission to access this canvas session',
      );
    }

    return session;
  }
}
