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
}
