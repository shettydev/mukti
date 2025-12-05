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
import { CreateCanvasSessionDto } from './dto/create-canvas-session.dto';
import { UpdateCanvasSessionDto } from './dto/update-canvas-session.dto';

/**
 * Service for managing Thinking Canvas sessions.
 *
 * @remarks
 * Handles CRUD operations for canvas sessions, including
 * problem structure management and user association.
 */
@Injectable()
export class CanvasService {
  private readonly logger = new Logger(CanvasService.name);

  constructor(
    @InjectModel(CanvasSession.name)
    private readonly canvasSessionModel: Model<CanvasSessionDocument>,
  ) {}

  /**
   * Creates a new canvas session with the given problem structure.
   *
   * @param userId - The ID of the user creating the session
   * @param dto - The canvas session creation data
   * @returns The newly created canvas session
   *
   * @example
   * ```typescript
   * const session = await canvasService.createSession(userId, {
   *   seed: 'My team is burned out',
   *   soil: ['Budget is tight', 'Deadline in 2 weeks'],
   *   roots: ['We need to hire more people'],
   * });
   * ```
   */
  async createSession(
    userId: string | Types.ObjectId,
    dto: CreateCanvasSessionDto,
  ): Promise<CanvasSession> {
    const userIdStr = userId.toString();
    this.logger.log(`Creating canvas session for user ${userIdStr}`);

    const session = await this.canvasSessionModel.create({
      problemStructure: {
        roots: dto.roots.map((item) => item.trim()),
        seed: dto.seed.trim(),
        soil: dto.soil.map((item) => item.trim()),
      },
      userId: new Types.ObjectId(userIdStr),
    });

    this.logger.log(`Canvas session created: ${session._id.toString()}`);
    return session;
  }

  /**
   * Finds all canvas sessions for a user.
   *
   * @param userId - The ID of the user
   * @returns Array of canvas sessions owned by the user, sorted by creation date (newest first)
   *
   * @example
   * ```typescript
   * const sessions = await canvasService.findAllByUser(userId);
   * ```
   */
  async findAllByUser(
    userId: string | Types.ObjectId,
  ): Promise<CanvasSession[]> {
    const userIdStr = userId.toString();
    this.logger.log(`Finding all canvas sessions for user ${userIdStr}`);

    const sessions = await this.canvasSessionModel
      .find({ userId: new Types.ObjectId(userIdStr) })
      .sort({ createdAt: -1 })
      .exec();

    this.logger.log(
      `Found ${sessions.length} canvas sessions for user ${userIdStr}`,
    );
    return sessions;
  }

  /**
   * Finds a canvas session by ID with ownership validation.
   *
   * @param sessionId - The canvas session ID
   * @param userId - The ID of the user requesting the session
   * @returns The canvas session if found and owned by the user
   * @throws {NotFoundException} If the session doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the session
   */
  async findSessionById(
    sessionId: string,
    userId: string | Types.ObjectId,
  ): Promise<CanvasSession> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Finding canvas session ${sessionId} for user ${userIdStr}`,
    );

    const session = await this.canvasSessionModel.findById(sessionId);

    if (!session) {
      this.logger.warn(`Canvas session ${sessionId} not found`);
      throw new NotFoundException(
        `Canvas session with ID ${sessionId} not found`,
      );
    }

    // Validate ownership
    if (session.userId.toString() !== userIdStr) {
      this.logger.warn(
        `User ${userIdStr} attempted to access canvas session ${sessionId} owned by ${session.userId.toString()}`,
      );
      throw new ForbiddenException(
        'You do not have permission to access this canvas session',
      );
    }

    return session;
  }

  /**
   * Updates a canvas session with new node positions or explored nodes.
   *
   * @param sessionId - The canvas session ID
   * @param userId - The ID of the user requesting the update
   * @param dto - The update data containing nodePositions and/or exploredNodes
   * @returns The updated canvas session
   * @throws {NotFoundException} If the session doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the session
   *
   * @example
   * ```typescript
   * const session = await canvasService.updateSession(sessionId, userId, {
   *   nodePositions: [{ nodeId: 'seed', x: 0, y: 0 }],
   *   exploredNodes: ['seed', 'root-0'],
   * });
   * ```
   */
  async updateSession(
    sessionId: string,
    userId: string | Types.ObjectId,
    dto: UpdateCanvasSessionDto,
  ): Promise<CanvasSession> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Updating canvas session ${sessionId} for user ${userIdStr}`,
    );

    // First validate ownership
    await this.findSessionById(sessionId, userId);

    // Build update object with only provided fields
    const updateData: Partial<CanvasSession> = {};

    if (dto.nodePositions !== undefined) {
      updateData.nodePositions = dto.nodePositions;
    }

    if (dto.exploredNodes !== undefined) {
      updateData.exploredNodes = dto.exploredNodes;
    }

    const updatedSession = await this.canvasSessionModel.findByIdAndUpdate(
      sessionId,
      { $set: updateData },
      { new: true },
    );

    if (!updatedSession) {
      throw new NotFoundException(
        `Canvas session with ID ${sessionId} not found`,
      );
    }

    this.logger.log(`Canvas session ${sessionId} updated successfully`);
    return updatedSession;
  }
}
