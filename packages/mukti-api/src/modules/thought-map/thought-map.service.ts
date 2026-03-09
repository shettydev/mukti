import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ThoughtMap,
  ThoughtMapDocument,
} from '../../schemas/thought-map.schema';
import {
  ThoughtNode,
  ThoughtNodeDocument,
  ThoughtNodeType,
} from '../../schemas/thought-node.schema';
import { CreateThoughtMapDto } from './dto/create-thought-map.dto';
import { CreateThoughtNodeDto } from './dto/create-thought-node.dto';
import { UpdateThoughtNodeDto } from './dto/update-thought-node.dto';

/**
 * Service for managing Thought Maps and their nodes.
 *
 * @remarks
 * Handles all CRUD operations for ThoughtMap documents and their
 * associated ThoughtNode tree. Enforces ownership validation on
 * every map-level operation.
 */
@Injectable()
export class ThoughtMapService {
  private readonly logger = new Logger(ThoughtMapService.name);

  constructor(
    @InjectModel(ThoughtMap.name)
    private readonly thoughtMapModel: Model<ThoughtMapDocument>,
    @InjectModel(ThoughtNode.name)
    private readonly thoughtNodeModel: Model<ThoughtNodeDocument>,
  ) {}

  /**
   * Adds a new ThoughtNode as a child of an existing node in the map.
   *
   * @param mapId - The ThoughtMap ID
   * @param userId - The ID of the requesting user
   * @param dto - Node creation data
   * @returns The newly created ThoughtNode
   * @throws {NotFoundException} If the map or parent node doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the map
   *
   * @example
   * ```typescript
   * const node = await thoughtMapService.addNode(mapId, userId, {
   *   parentId: 'topic-0',
   *   label: 'Is the process unclear?',
   *   type: 'question',
   * });
   * ```
   */
  async addNode(
    mapId: string,
    userId: string | Types.ObjectId,
    dto: CreateThoughtNodeDto,
  ): Promise<ThoughtNode> {
    const userIdStr = userId.toString();
    this.logger.log(`Adding node to map ${mapId} by user ${userIdStr}`);

    // Validate ownership
    await this.findMapById(mapId, userId);

    // Validate that the parent node exists in this map
    const parentNode = await this.thoughtNodeModel.findOne({
      mapId: new Types.ObjectId(mapId),
      nodeId: dto.parentId,
    });

    if (!parentNode) {
      this.logger.warn(`Parent node ${dto.parentId} not found in map ${mapId}`);
      throw new NotFoundException(
        `Parent node with nodeId "${dto.parentId}" not found in this map`,
      );
    }

    // Determine node type (default: 'thought')
    const nodeType: ThoughtNodeType = dto.type ?? 'thought';

    // Auto-generate nodeId: count existing nodes of this type, then append index
    const existingCount = await this.thoughtNodeModel.countDocuments({
      mapId: new Types.ObjectId(mapId),
      type: nodeType,
    });
    const nodeId = `${nodeType}-${existingCount}`;

    // Create the node at parent depth + 1
    const node = await this.thoughtNodeModel.create({
      depth: parentNode.depth + 1,
      fromSuggestion: dto.fromSuggestion ?? false,
      label: dto.label.trim(),
      mapId: new Types.ObjectId(mapId),
      nodeId,
      parentId: dto.parentId,
      position: { x: 0, y: 0 },
      type: nodeType,
    });

    this.logger.log(`Node ${nodeId} added to map ${mapId}`);
    return node;
  }

  /**
   * Creates a new ThoughtMap with an initial root topic node.
   *
   * @param userId - The ID of the owning user
   * @param dto - Map creation data
   * @returns The created ThoughtMap and its root ThoughtNode
   *
   * @example
   * ```typescript
   * const result = await thoughtMapService.createMap(userId, {
   *   title: 'Why is our team losing motivation?',
   * });
   * ```
   */
  async createMap(
    userId: string | Types.ObjectId,
    dto: CreateThoughtMapDto,
  ): Promise<{ map: ThoughtMap; rootNode: ThoughtNode }> {
    const userIdStr = userId.toString();
    this.logger.log(`Creating Thought Map for user ${userIdStr}`);

    // Generate the root node ID (always topic-0 for a fresh map)
    const rootNodeId = 'topic-0';

    // Create the ThoughtMap document
    const map = await this.thoughtMapModel.create({
      rootNodeId,
      title: dto.title.trim(),
      userId: new Types.ObjectId(userIdStr),
    });

    // Create the root ThoughtNode at depth 0 with position {x:0, y:0}
    const rootNode = await this.thoughtNodeModel.create({
      depth: 0,
      label: dto.title.trim(),
      mapId: map._id,
      nodeId: rootNodeId,
      position: { x: 0, y: 0 },
      type: 'topic' as ThoughtNodeType,
    });

    this.logger.log(
      `Thought Map created: ${map._id.toString()} with root node ${rootNodeId}`,
    );
    return { map, rootNode };
  }

  /**
   * Deletes a ThoughtNode, with optional recursive cascade for descendant nodes.
   *
   * @param mapId - The ThoughtMap ID
   * @param nodeId - The stable nodeId to delete
   * @param userId - The ID of the requesting user
   * @param cascade - If true, recursively deletes all descendants; if false, rejects when children exist
   * @throws {NotFoundException} If the map or node doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the map
   * @throws {ConflictException} If cascade=false and the node has children
   */
  async deleteNode(
    mapId: string,
    nodeId: string,
    userId: string | Types.ObjectId,
    cascade: boolean,
  ): Promise<void> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Deleting node ${nodeId} in map ${mapId} by user ${userIdStr} (cascade=${cascade})`,
    );

    // Validate ownership
    await this.findMapById(mapId, userId);

    // Confirm the target node exists
    const targetNode = await this.thoughtNodeModel.findOne({
      mapId: new Types.ObjectId(mapId),
      nodeId,
    });

    if (!targetNode) {
      this.logger.warn(`Node ${nodeId} not found in map ${mapId}`);
      throw new NotFoundException(
        `Node with nodeId "${nodeId}" not found in this map`,
      );
    }

    // Check for direct children
    const childCount = await this.thoughtNodeModel.countDocuments({
      mapId: new Types.ObjectId(mapId),
      parentId: nodeId,
    });

    if (childCount > 0 && !cascade) {
      this.logger.warn(
        `Node ${nodeId} in map ${mapId} has ${childCount} children — cascade required`,
      );
      throw new ConflictException(
        'Node has children. Use ?cascade=true to delete them recursively.',
      );
    }

    if (cascade) {
      // Recursively collect all descendant nodeIds via BFS, then delete in one batch
      const nodeIdsToDelete = await this.collectDescendantNodeIds(
        mapId,
        nodeId,
      );
      nodeIdsToDelete.push(nodeId);

      const result = await this.thoughtNodeModel.deleteMany({
        mapId: new Types.ObjectId(mapId),
        nodeId: { $in: nodeIdsToDelete },
      });

      this.logger.log(
        `Cascade delete: removed ${result.deletedCount} nodes from map ${mapId}`,
      );
    } else {
      // No children — safe to delete directly
      await this.thoughtNodeModel.deleteOne({
        mapId: new Types.ObjectId(mapId),
        nodeId,
      });

      this.logger.log(`Node ${nodeId} deleted from map ${mapId}`);
    }
  }

  /**
   * Finds a ThoughtMap by ID with ownership validation.
   *
   * @param mapId - The ThoughtMap ID
   * @param userId - The ID of the requesting user
   * @returns The ThoughtMap document
   * @throws {NotFoundException} If the map doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the map
   */
  async findMapById(
    mapId: string,
    userId: string | Types.ObjectId,
  ): Promise<ThoughtMap> {
    const userIdStr = userId.toString();
    this.logger.log(`Finding Thought Map ${mapId} for user ${userIdStr}`);

    const map = await this.thoughtMapModel.findById(mapId);

    if (!map) {
      this.logger.warn(`Thought Map ${mapId} not found`);
      throw new NotFoundException(`Thought Map with ID ${mapId} not found`);
    }

    if (map.userId.toString() !== userIdStr) {
      this.logger.warn(
        `User ${userIdStr} attempted to access Thought Map ${mapId} owned by ${map.userId.toString()}`,
      );
      throw new ForbiddenException(
        'You do not have permission to access this Thought Map',
      );
    }

    return map;
  }

  /**
   * Retrieves a ThoughtMap with all its nodes, validating ownership.
   *
   * @param mapId - The ThoughtMap ID
   * @param userId - The ID of the requesting user
   * @returns The ThoughtMap and its sorted node list
   * @throws {NotFoundException} If the map doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the map
   */
  async getMap(
    mapId: string,
    userId: string | Types.ObjectId,
  ): Promise<{ map: ThoughtMap; nodes: ThoughtNode[] }> {
    const userIdStr = userId.toString();
    this.logger.log(`Getting Thought Map ${mapId} for user ${userIdStr}`);

    const map = await this.findMapById(mapId, userId);

    const nodes = await this.thoughtNodeModel
      .find({ mapId: new Types.ObjectId(mapId) })
      .sort({ createdAt: 1, depth: 1 })
      .exec();

    this.logger.log(
      `Thought Map ${mapId} retrieved with ${nodes.length} nodes`,
    );
    return { map, nodes };
  }

  /**
   * Lists all ThoughtMaps owned by the given user, sorted newest-first.
   *
   * @param userId - The ID of the owning user
   * @returns Array of ThoughtMap documents
   */
  async listMaps(userId: string | Types.ObjectId): Promise<ThoughtMap[]> {
    const userIdStr = userId.toString();
    this.logger.log(`Listing Thought Maps for user ${userIdStr}`);

    const maps = await this.thoughtMapModel
      .find({ userId: new Types.ObjectId(userIdStr) })
      .sort({ createdAt: -1 })
      .exec();

    this.logger.log(`Found ${maps.length} Thought Maps for user ${userIdStr}`);
    return maps;
  }

  /**
   * Updates label, position, or collapsed state on an existing ThoughtNode.
   *
   * @param mapId - The ThoughtMap ID
   * @param nodeId - The stable nodeId (e.g., 'thought-0')
   * @param userId - The ID of the requesting user
   * @param dto - Fields to update (all optional)
   * @returns The updated ThoughtNode
   * @throws {NotFoundException} If the map or node doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the map
   */
  async updateNode(
    mapId: string,
    nodeId: string,
    userId: string | Types.ObjectId,
    dto: UpdateThoughtNodeDto,
  ): Promise<ThoughtNode> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Updating node ${nodeId} in map ${mapId} by user ${userIdStr}`,
    );

    // Validate ownership
    await this.findMapById(mapId, userId);

    // Build the $set payload from only provided fields
    const setOp: Record<string, unknown> = {};

    if (dto.label !== undefined) {
      setOp.label = dto.label.trim();
    }
    if (dto.isCollapsed !== undefined) {
      setOp.isCollapsed = dto.isCollapsed;
    }
    if (dto.position !== undefined) {
      if (dto.position.x !== undefined) {
        setOp['position.x'] = dto.position.x;
      }
      if (dto.position.y !== undefined) {
        setOp['position.y'] = dto.position.y;
      }
    }

    const updatedNode = await this.thoughtNodeModel.findOneAndUpdate(
      { mapId: new Types.ObjectId(mapId), nodeId },
      { $set: setOp },
      { new: true },
    );

    if (!updatedNode) {
      this.logger.warn(`Node ${nodeId} not found in map ${mapId}`);
      throw new NotFoundException(
        `Node with nodeId "${nodeId}" not found in this map`,
      );
    }

    this.logger.log(`Node ${nodeId} updated in map ${mapId}`);
    return updatedNode;
  }

  /**
   * Collects all descendant nodeIds of a given node via BFS.
   *
   * @param mapId - The ThoughtMap ID
   * @param rootNodeId - The nodeId whose descendants should be collected
   * @returns Array of descendant nodeIds (does NOT include rootNodeId itself)
   */
  private async collectDescendantNodeIds(
    mapId: string,
    rootNodeId: string,
  ): Promise<string[]> {
    const descendants: string[] = [];
    const queue: string[] = [rootNodeId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      // Find direct children of the current node
      const children = await this.thoughtNodeModel
        .find(
          { mapId: new Types.ObjectId(mapId), parentId: currentId },
          { nodeId: 1 },
        )
        .lean();

      for (const child of children) {
        descendants.push(child.nodeId);
        queue.push(child.nodeId);
      }
    }

    return descendants;
  }
}
