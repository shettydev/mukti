import {
  BadRequestException,
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
import { RelationshipEdge } from '../../schemas/canvas-session.schema';
import {
  InsightNode,
  InsightNodeDocument,
} from '../../schemas/insight-node.schema';
import { AddAssumptionDto } from './dto/add-assumption.dto';
import { AddContextDto } from './dto/add-context.dto';
import { CreateCanvasSessionDto } from './dto/create-canvas-session.dto';
import { CreateInsightNodeDto } from './dto/create-insight-node.dto';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { UpdateCanvasSessionDto } from './dto/update-canvas-session.dto';
import { UpdateInsightNodeDto } from './dto/update-insight-node.dto';

/** Maximum number of assumptions (roots) allowed per canvas session */
const MAX_ASSUMPTIONS = 8;

/** Maximum number of context items (soil) allowed per canvas session */
const MAX_CONTEXT_ITEMS = 10;

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
    @InjectModel(InsightNode.name)
    private readonly insightNodeModel: Model<InsightNodeDocument>,
  ) {}

  /**
   * Adds a new assumption (Root node) to a canvas session.
   *
   * @param sessionId - The canvas session ID
   * @param userId - The ID of the user adding the assumption
   * @param dto - The assumption data
   * @returns The updated canvas session with the new assumption
   * @throws {NotFoundException} If the session doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the session
   * @throws {BadRequestException} If the maximum assumption limit (8) is reached
   *
   * @example
   * ```typescript
   * const session = await canvasService.addAssumption(sessionId, userId, {
   *   assumption: 'We need better communication tools',
   * });
   * ```
   */
  async addAssumption(
    sessionId: string,
    userId: string | Types.ObjectId,
    dto: AddAssumptionDto,
  ): Promise<{ nodeId: string; session: CanvasSession }> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Adding assumption to session ${sessionId} by user ${userIdStr}`,
    );

    // Validate session ownership
    const session = await this.findSessionById(sessionId, userId);

    // Check assumption limit (Requirements 2.6)
    const currentCount = session.problemStructure.roots.length;
    if (currentCount >= MAX_ASSUMPTIONS) {
      this.logger.warn(
        `Maximum assumption limit (${MAX_ASSUMPTIONS}) reached for session ${sessionId}`,
      );
      throw new BadRequestException(
        `Maximum assumption limit of ${MAX_ASSUMPTIONS} reached`,
      );
    }

    // Generate the new node ID
    const newNodeId = `root-${currentCount}`;
    const trimmedAssumption = dto.assumption.trim();

    // Update the session with the new assumption (Requirements 2.5)
    const updatedSession = await this.canvasSessionModel.findByIdAndUpdate(
      sessionId,
      {
        $push: {
          dynamicNodeIds: newNodeId,
          'problemStructure.roots': trimmedAssumption,
        },
      },
      { new: true },
    );

    if (!updatedSession) {
      throw new NotFoundException(
        `Canvas session with ID ${sessionId} not found`,
      );
    }

    this.logger.log(
      `Assumption added to session ${sessionId} with nodeId ${newNodeId}`,
    );
    return { nodeId: newNodeId, session: updatedSession };
  }

  /**
   * Adds a new context item (Soil node) to a canvas session.
   *
   * @param sessionId - The canvas session ID
   * @param userId - The ID of the user adding the context
   * @param dto - The context data
   * @returns The updated canvas session with the new context
   * @throws {NotFoundException} If the session doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the session
   * @throws {BadRequestException} If the maximum context limit (10) is reached
   *
   * @example
   * ```typescript
   * const session = await canvasService.addContext(sessionId, userId, {
   *   context: 'Budget constraints for Q4',
   * });
   * ```
   */
  async addContext(
    sessionId: string,
    userId: string | Types.ObjectId,
    dto: AddContextDto,
  ): Promise<{ nodeId: string; session: CanvasSession }> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Adding context to session ${sessionId} by user ${userIdStr}`,
    );

    // Validate session ownership
    const session = await this.findSessionById(sessionId, userId);

    // Check context limit (Requirements 5.6)
    const currentCount = session.problemStructure.soil.length;
    if (currentCount >= MAX_CONTEXT_ITEMS) {
      this.logger.warn(
        `Maximum context limit (${MAX_CONTEXT_ITEMS}) reached for session ${sessionId}`,
      );
      throw new BadRequestException(
        `Maximum context limit of ${MAX_CONTEXT_ITEMS} reached`,
      );
    }

    // Generate the new node ID
    const newNodeId = `soil-${currentCount}`;
    const trimmedContext = dto.context.trim();

    // Update the session with the new context (Requirements 5.5)
    const updatedSession = await this.canvasSessionModel.findByIdAndUpdate(
      sessionId,
      {
        $push: {
          dynamicNodeIds: newNodeId,
          'problemStructure.soil': trimmedContext,
        },
      },
      { new: true },
    );

    if (!updatedSession) {
      throw new NotFoundException(
        `Canvas session with ID ${sessionId} not found`,
      );
    }

    this.logger.log(
      `Context added to session ${sessionId} with nodeId ${newNodeId}`,
    );
    return { nodeId: newNodeId, session: updatedSession };
  }

  /**
   * Creates a new insight node for a canvas session with parent validation.
   *
   * @param sessionId - The canvas session ID
   * @param userId - The ID of the user creating the insight
   * @param dto - The insight node creation data
   * @returns The newly created insight node
   * @throws {NotFoundException} If the session doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the session
   * @throws {BadRequestException} If the parent node doesn't exist
   *
   * @example
   * ```typescript
   * const insight = await canvasService.createInsightNode(sessionId, userId, {
   *   label: 'The real issue might be communication',
   *   parentNodeId: 'root-0',
   *   x: 150,
   *   y: 200,
   * });
   * ```
   */
  async createInsightNode(
    sessionId: string,
    userId: string | Types.ObjectId,
    dto: CreateInsightNodeDto,
  ): Promise<InsightNode> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Creating insight node for session ${sessionId} by user ${userIdStr}`,
    );

    // Validate session ownership
    const session = await this.findSessionById(sessionId, userId);

    // Validate parent node exists (Requirements 1.5)
    const validParentNodeIds = await this.getValidNodeIdsWithInsights(
      sessionId,
      session,
    );
    if (!validParentNodeIds.includes(dto.parentNodeId)) {
      this.logger.warn(
        `Invalid parent node ID: ${dto.parentNodeId} for session ${sessionId}`,
      );
      throw new BadRequestException(
        `Parent node with ID ${dto.parentNodeId} does not exist in this session`,
      );
    }

    // Generate unique nodeId for the insight
    const existingInsights = await this.insightNodeModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .select('nodeId')
      .lean();

    const insightCount = existingInsights.length;
    const nodeId = `insight-${insightCount}`;

    // Create the insight node
    const insightNode = await this.insightNodeModel.create({
      label: dto.label.trim(),
      nodeId,
      parentNodeId: dto.parentNodeId,
      position: { x: dto.x, y: dto.y },
      sessionId: new Types.ObjectId(sessionId),
    });

    this.logger.log(
      `Insight node created: ${insightNode._id.toString()} with nodeId ${nodeId}`,
    );
    return insightNode;
  }

  /**
   * Creates a relationship edge between an assumption (Root) and a constraint (Soil).
   *
   * @param sessionId - The canvas session ID
   * @param userId - The ID of the user creating the relationship
   * @param dto - The relationship creation data containing sourceNodeId and targetNodeId
   * @returns The created relationship edge and updated session
   * @throws {NotFoundException} If the session doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the session
   * @throws {BadRequestException} If the source or target node doesn't exist, or relationship already exists
   *
   * @example
   * ```typescript
   * const result = await canvasService.createRelationship(sessionId, userId, {
   *   sourceNodeId: 'root-0',
   *   targetNodeId: 'soil-1',
   * });
   * ```
   */
  async createRelationship(
    sessionId: string,
    userId: string | Types.ObjectId,
    dto: CreateRelationshipDto,
  ): Promise<{ relationship: RelationshipEdge; session: CanvasSession }> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Creating relationship from ${dto.sourceNodeId} to ${dto.targetNodeId} in session ${sessionId} by user ${userIdStr}`,
    );

    // Validate session ownership
    const session = await this.findSessionById(sessionId, userId);

    // Validate source node exists (must be a root node)
    const rootIndex = parseInt(dto.sourceNodeId.split('-')[1], 10);
    if (rootIndex < 0 || rootIndex >= session.problemStructure.roots.length) {
      this.logger.warn(
        `Invalid source node ${dto.sourceNodeId} for session ${sessionId}`,
      );
      throw new BadRequestException(
        `Source node ${dto.sourceNodeId} does not exist in this session`,
      );
    }

    // Validate target node exists (must be a soil node)
    const soilIndex = parseInt(dto.targetNodeId.split('-')[1], 10);
    if (soilIndex < 0 || soilIndex >= session.problemStructure.soil.length) {
      this.logger.warn(
        `Invalid target node ${dto.targetNodeId} for session ${sessionId}`,
      );
      throw new BadRequestException(
        `Target node ${dto.targetNodeId} does not exist in this session`,
      );
    }

    // Check if relationship already exists
    const existingRelationship = session.relationshipEdges.find(
      (edge) =>
        edge.sourceNodeId === dto.sourceNodeId &&
        edge.targetNodeId === dto.targetNodeId,
    );

    if (existingRelationship) {
      this.logger.warn(
        `Relationship from ${dto.sourceNodeId} to ${dto.targetNodeId} already exists in session ${sessionId}`,
      );
      throw new BadRequestException(
        `Relationship from ${dto.sourceNodeId} to ${dto.targetNodeId} already exists`,
      );
    }

    // Generate unique relationship ID
    const relationshipId = `rel-${dto.sourceNodeId}-${dto.targetNodeId}`;

    const newRelationship: RelationshipEdge = {
      id: relationshipId,
      sourceNodeId: dto.sourceNodeId,
      targetNodeId: dto.targetNodeId,
    };

    // Add the relationship to the session (Requirements 3.5)
    const updatedSession = await this.canvasSessionModel.findByIdAndUpdate(
      sessionId,
      {
        $push: {
          relationshipEdges: newRelationship,
        },
      },
      { new: true },
    );

    if (!updatedSession) {
      throw new NotFoundException(
        `Canvas session with ID ${sessionId} not found`,
      );
    }

    this.logger.log(
      `Relationship ${relationshipId} created in session ${sessionId}`,
    );
    return { relationship: newRelationship, session: updatedSession };
  }

  // ============================================
  // Insight Node Methods (Requirements 1.1, 1.3, 1.5)
  // ============================================

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
   * Deletes a dynamically-added assumption (Root node) from a canvas session.
   *
   * @param sessionId - The canvas session ID
   * @param index - The index of the assumption to delete (0-based)
   * @param userId - The ID of the user requesting the deletion
   * @returns The updated canvas session
   * @throws {NotFoundException} If the session doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the session
   * @throws {BadRequestException} If the assumption is an original node or index is invalid
   *
   * @example
   * ```typescript
   * const session = await canvasService.deleteAssumption(sessionId, 3, userId);
   * ```
   */
  async deleteAssumption(
    sessionId: string,
    index: number,
    userId: string | Types.ObjectId,
  ): Promise<CanvasSession> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Deleting assumption at index ${index} from session ${sessionId} by user ${userIdStr}`,
    );

    // Validate session ownership
    const session = await this.findSessionById(sessionId, userId);

    // Validate index
    if (index < 0 || index >= session.problemStructure.roots.length) {
      this.logger.warn(
        `Invalid assumption index ${index} for session ${sessionId}`,
      );
      throw new BadRequestException(
        `Invalid assumption index: ${index}. Valid range is 0-${session.problemStructure.roots.length - 1}`,
      );
    }

    // Check if this is an original node (Requirements 6.2)
    const nodeId = `root-${index}`;
    if (!session.dynamicNodeIds.includes(nodeId)) {
      this.logger.warn(
        `Attempted to delete original assumption ${nodeId} from session ${sessionId}`,
      );
      throw new BadRequestException(
        'Cannot delete original setup nodes. Only dynamically-added assumptions can be deleted.',
      );
    }

    // Remove the assumption and update dynamicNodeIds
    const updatedRoots = [...session.problemStructure.roots];
    updatedRoots.splice(index, 1);

    // Recalculate dynamicNodeIds after removal (shift indices)
    const updatedDynamicNodeIds = session.dynamicNodeIds
      .filter((id) => id !== nodeId)
      .map((id) => {
        if (id.startsWith('root-')) {
          const nodeIndex = parseInt(id.split('-')[1], 10);
          if (nodeIndex > index) {
            return `root-${nodeIndex - 1}`;
          }
        }
        return id;
      });

    const updatedSession = await this.canvasSessionModel.findByIdAndUpdate(
      sessionId,
      {
        $set: {
          dynamicNodeIds: updatedDynamicNodeIds,
          'problemStructure.roots': updatedRoots,
        },
      },
      { new: true },
    );

    if (!updatedSession) {
      throw new NotFoundException(
        `Canvas session with ID ${sessionId} not found`,
      );
    }

    this.logger.log(
      `Assumption at index ${index} deleted from session ${sessionId}`,
    );
    return updatedSession;
  }

  /**
   * Deletes a dynamically-added context item (Soil node) from a canvas session.
   *
   * @param sessionId - The canvas session ID
   * @param index - The index of the context to delete (0-based)
   * @param userId - The ID of the user requesting the deletion
   * @returns The updated canvas session
   * @throws {NotFoundException} If the session doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the session
   * @throws {BadRequestException} If the context is an original node or index is invalid
   *
   * @example
   * ```typescript
   * const session = await canvasService.deleteContext(sessionId, 2, userId);
   * ```
   */
  async deleteContext(
    sessionId: string,
    index: number,
    userId: string | Types.ObjectId,
  ): Promise<CanvasSession> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Deleting context at index ${index} from session ${sessionId} by user ${userIdStr}`,
    );

    // Validate session ownership
    const session = await this.findSessionById(sessionId, userId);

    // Validate index
    if (index < 0 || index >= session.problemStructure.soil.length) {
      this.logger.warn(
        `Invalid context index ${index} for session ${sessionId}`,
      );
      throw new BadRequestException(
        `Invalid context index: ${index}. Valid range is 0-${session.problemStructure.soil.length - 1}`,
      );
    }

    // Check if this is an original node (Requirements 6.2)
    const nodeId = `soil-${index}`;
    if (!session.dynamicNodeIds.includes(nodeId)) {
      this.logger.warn(
        `Attempted to delete original context ${nodeId} from session ${sessionId}`,
      );
      throw new BadRequestException(
        'Cannot delete original setup nodes. Only dynamically-added context items can be deleted.',
      );
    }

    // Remove the context and update dynamicNodeIds
    const updatedSoil = [...session.problemStructure.soil];
    updatedSoil.splice(index, 1);

    // Recalculate dynamicNodeIds after removal (shift indices)
    const updatedDynamicNodeIds = session.dynamicNodeIds
      .filter((id) => id !== nodeId)
      .map((id) => {
        if (id.startsWith('soil-')) {
          const nodeIndex = parseInt(id.split('-')[1], 10);
          if (nodeIndex > index) {
            return `soil-${nodeIndex - 1}`;
          }
        }
        return id;
      });

    const updatedSession = await this.canvasSessionModel.findByIdAndUpdate(
      sessionId,
      {
        $set: {
          dynamicNodeIds: updatedDynamicNodeIds,
          'problemStructure.soil': updatedSoil,
        },
      },
      { new: true },
    );

    if (!updatedSession) {
      throw new NotFoundException(
        `Canvas session with ID ${sessionId} not found`,
      );
    }

    this.logger.log(
      `Context at index ${index} deleted from session ${sessionId}`,
    );
    return updatedSession;
  }

  /**
   * Deletes an insight node from a canvas session.
   *
   * @param sessionId - The canvas session ID
   * @param nodeId - The insight node ID to delete (e.g., 'insight-0')
   * @param userId - The ID of the user requesting the deletion
   * @returns The deleted insight node
   * @throws {NotFoundException} If the session or insight doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the session
   *
   * @example
   * ```typescript
   * const deleted = await canvasService.deleteInsightNode(sessionId, 'insight-0', userId);
   * ```
   */
  async deleteInsightNode(
    sessionId: string,
    nodeId: string,
    userId: string | Types.ObjectId,
  ): Promise<InsightNode> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Deleting insight node ${nodeId} from session ${sessionId} by user ${userIdStr}`,
    );

    // Validate session ownership
    await this.findSessionById(sessionId, userId);

    // Find and delete the insight node
    const deletedInsight = await this.insightNodeModel.findOneAndDelete({
      nodeId,
      sessionId: new Types.ObjectId(sessionId),
    });

    if (!deletedInsight) {
      this.logger.warn(
        `Insight node ${nodeId} not found in session ${sessionId}`,
      );
      throw new NotFoundException(
        `Insight node with ID ${nodeId} not found in this session`,
      );
    }

    this.logger.log(`Insight node ${nodeId} deleted from session ${sessionId}`);
    return deletedInsight;
  }

  /**
   * Deletes a relationship edge from a canvas session.
   *
   * @param sessionId - The canvas session ID
   * @param relationshipId - The relationship ID to delete (e.g., 'rel-root-0-soil-1')
   * @param userId - The ID of the user requesting the deletion
   * @returns The updated canvas session
   * @throws {NotFoundException} If the session or relationship doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the session
   *
   * @example
   * ```typescript
   * const session = await canvasService.deleteRelationship(
   *   sessionId,
   *   'rel-root-0-soil-1',
   *   userId
   * );
   * ```
   */
  async deleteRelationship(
    sessionId: string,
    relationshipId: string,
    userId: string | Types.ObjectId,
  ): Promise<CanvasSession> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Deleting relationship ${relationshipId} from session ${sessionId} by user ${userIdStr}`,
    );

    // Validate session ownership
    const session = await this.findSessionById(sessionId, userId);

    // Check if relationship exists
    const relationshipExists = session.relationshipEdges.some(
      (edge) => edge.id === relationshipId,
    );

    if (!relationshipExists) {
      this.logger.warn(
        `Relationship ${relationshipId} not found in session ${sessionId}`,
      );
      throw new NotFoundException(
        `Relationship with ID ${relationshipId} not found in this session`,
      );
    }

    // Remove the relationship
    const updatedSession = await this.canvasSessionModel.findByIdAndUpdate(
      sessionId,
      {
        $pull: {
          relationshipEdges: { id: relationshipId },
        },
      },
      { new: true },
    );

    if (!updatedSession) {
      throw new NotFoundException(
        `Canvas session with ID ${sessionId} not found`,
      );
    }

    this.logger.log(
      `Relationship ${relationshipId} deleted from session ${sessionId}`,
    );
    return updatedSession;
  }

  // ============================================
  // Dynamic Node Methods (Requirements 2.3, 2.5, 2.6, 5.3, 5.5, 5.6, 6.2)
  // ============================================

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
   * Retrieves all insight nodes for a canvas session.
   *
   * @param sessionId - The canvas session ID
   * @param userId - The ID of the user requesting the insights
   * @returns Array of insight nodes for the session
   * @throws {NotFoundException} If the session doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the session
   *
   * @example
   * ```typescript
   * const insights = await canvasService.getInsightsBySession(sessionId, userId);
   * ```
   */
  async getInsightsBySession(
    sessionId: string,
    userId: string | Types.ObjectId,
  ): Promise<InsightNode[]> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Getting insights for session ${sessionId} by user ${userIdStr}`,
    );

    // Validate session ownership
    await this.findSessionById(sessionId, userId);

    // Retrieve all insights for the session (Requirements 7.3)
    const insights = await this.insightNodeModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .sort({ createdAt: 1 })
      .exec();

    this.logger.log(
      `Found ${insights.length} insight nodes for session ${sessionId}`,
    );
    return insights;
  }

  // ============================================
  // Relationship Methods (Requirements 3.3, 3.5, 3.6)
  // ============================================

  /**
   * Retrieves all relationship edges for a canvas session.
   *
   * @param sessionId - The canvas session ID
   * @param userId - The ID of the user requesting the relationships
   * @returns Array of relationship edges for the session
   * @throws {NotFoundException} If the session doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the session
   *
   * @example
   * ```typescript
   * const relationships = await canvasService.getRelationshipsBySession(sessionId, userId);
   * ```
   */
  async getRelationshipsBySession(
    sessionId: string,
    userId: string | Types.ObjectId,
  ): Promise<RelationshipEdge[]> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Getting relationships for session ${sessionId} by user ${userIdStr}`,
    );

    // Validate session ownership
    const session = await this.findSessionById(sessionId, userId);

    this.logger.log(
      `Found ${session.relationshipEdges.length} relationships for session ${sessionId}`,
    );
    return session.relationshipEdges;
  }

  /**
   * Gets all valid node IDs including existing insight nodes.
   * Used for validating parent nodes when creating new insights.
   *
   * @param sessionId - The canvas session ID
   * @param session - The canvas session
   * @returns Array of valid node IDs including insights
   */
  async getValidNodeIdsWithInsights(
    sessionId: string,
    session: CanvasSession,
  ): Promise<string[]> {
    const validIds = this.getValidNodeIds(session);

    // Add existing insight node IDs
    const existingInsights = await this.insightNodeModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .select('nodeId')
      .lean();

    existingInsights.forEach((insight) => {
      validIds.push(insight.nodeId);
    });

    return validIds;
  }

  /**
   * Updates an insight node (label, position, isExplored).
   *
   * @param sessionId - The canvas session ID
   * @param nodeId - The insight node ID (e.g., 'insight-0')
   * @param userId - The ID of the user requesting the update
   * @param dto - The update data
   * @returns The updated insight node
   * @throws {NotFoundException} If the session or insight doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the session
   */
  async updateInsightNode(
    sessionId: string,
    nodeId: string,
    userId: string | Types.ObjectId,
    dto: UpdateInsightNodeDto,
  ): Promise<InsightNode> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Updating insight node ${nodeId} in session ${sessionId} by user ${userIdStr}`,
    );

    // Validate session ownership
    await this.findSessionById(sessionId, userId);

    const updateData: any = {};
    if (dto.label !== undefined) {
      updateData.label = dto.label;
    }
    if (dto.isExplored !== undefined) {
      updateData.isExplored = dto.isExplored;
    }

    // Construct the $set object for mongo update
    const setOp: any = {};
    if (dto.label !== undefined) {
      setOp.label = dto.label;
    }
    if (dto.isExplored !== undefined) {
      setOp.isExplored = dto.isExplored;
    }
    if (dto.x !== undefined) {
      setOp['position.x'] = dto.x;
    }
    if (dto.y !== undefined) {
      setOp['position.y'] = dto.y;
    }

    const updatedInsight = await this.insightNodeModel.findOneAndUpdate(
      { nodeId, sessionId: new Types.ObjectId(sessionId) },
      { $set: setOp },
      { new: true },
    );

    if (!updatedInsight) {
      this.logger.warn(
        `Insight node ${nodeId} not found in session ${sessionId}`,
      );
      throw new NotFoundException(
        `Insight node with ID ${nodeId} not found in this session`,
      );
    }

    this.logger.log(`Insight node ${nodeId} updated in session ${sessionId}`);
    return updatedInsight;
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

  /**
   * Gets all valid node IDs for a canvas session.
   * Includes seed, soil nodes, root nodes, and existing insight nodes.
   *
   * @param session - The canvas session
   * @returns Array of valid node IDs
   */
  private getValidNodeIds(session: CanvasSession): string[] {
    const validIds: string[] = ['seed'];

    // Add soil node IDs
    session.problemStructure.soil.forEach((_, index) => {
      validIds.push(`soil-${index}`);
    });

    // Add root node IDs
    session.problemStructure.roots.forEach((_, index) => {
      validIds.push(`root-${index}`);
    });

    return validIds;
  }
}
