import {
  BadRequestException,
  ConflictException,
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
} from '../../../schemas/canvas-session.schema';
import {
  ThoughtMapShareLink,
  ThoughtMapShareLinkDocument,
} from '../../../schemas/thought-map-share-link.schema';
import {
  ThoughtMap,
  ThoughtMapDocument,
} from '../../../schemas/thought-map.schema';
import {
  ThoughtNode,
  ThoughtNodeDocument,
  ThoughtNodeType,
} from '../../../schemas/thought-node.schema';
import { CreateThoughtMapDto } from '../dto/create-thought-map.dto';
import { CreateThoughtNodeDto } from '../dto/create-thought-node.dto';
import { UpdateThoughtMapSettingsDto } from '../dto/update-thought-map-settings.dto';
import { UpdateThoughtNodeDto } from '../dto/update-thought-node.dto';

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
  private static readonly MAX_NODES_PER_MAP = 100;

  private readonly logger = new Logger(ThoughtMapService.name);

  constructor(
    @InjectModel(ThoughtMap.name)
    private readonly thoughtMapModel: Model<ThoughtMapDocument>,
    @InjectModel(ThoughtNode.name)
    private readonly thoughtNodeModel: Model<ThoughtNodeDocument>,
    @InjectModel(CanvasSession.name)
    private readonly canvasSessionModel: Model<CanvasSessionDocument>,
    @InjectModel(ThoughtMapShareLink.name)
    private readonly shareLinkModel: Model<ThoughtMapShareLinkDocument>,
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
    const map = await this.findMapById(mapId, userId);

    const totalNodes = await this.thoughtNodeModel.countDocuments({
      mapId: new Types.ObjectId(mapId),
    });

    if (totalNodes >= ThoughtMapService.MAX_NODES_PER_MAP) {
      throw new ConflictException(
        `Thought Maps are limited to ${ThoughtMapService.MAX_NODES_PER_MAP} nodes in Phase 1.`,
      );
    }

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

    if (nodeType === 'topic') {
      throw new BadRequestException(
        'Only the root node can use the topic type.',
      );
    }

    const nodeId = await this.getNextNodeId(mapId, nodeType);

    // Create the node at parent depth + 1
    const node = await this.thoughtNodeModel.create({
      depth: parentNode.depth + 1,
      fromSuggestion: dto.fromSuggestion ?? false,
      label: dto.label.trim(),
      mapId: map._id,
      nodeId,
      parentId: dto.parentId,
      position: { x: 0, y: 0 },
      type: nodeType,
    });

    this.logger.log(`Node ${nodeId} added to map ${mapId}`);
    return node;
  }

  /**
   * Confirms a draft ThoughtMap, transitioning its status from 'draft' → 'active'.
   *
   * @param mapId - The ThoughtMap ID
   * @param userId - The ID of the requesting user
   * @returns The updated ThoughtMap
   * @throws {NotFoundException} If the map doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the map
   * @throws {BadRequestException} If the map is not in 'draft' status
   */
  async confirmMap(
    mapId: string,
    userId: string | Types.ObjectId,
  ): Promise<ThoughtMap> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Confirming draft Thought Map ${mapId} for user ${userIdStr}`,
    );

    const map = await this.findMapById(mapId, userId);

    if (map.status !== 'draft') {
      throw new BadRequestException(
        `Only draft maps can be confirmed. Current status: ${map.status}`,
      );
    }

    const confirmed = await this.thoughtMapModel.findByIdAndUpdate(
      mapId,
      {
        $set: {
          confirmedAt: new Date(),
          status: 'active',
        },
      },
      { new: true },
    );

    if (!confirmed) {
      throw new NotFoundException(`Thought Map with ID ${mapId} not found`);
    }

    this.logger.log(`Thought Map ${mapId} confirmed — status set to active`);
    return confirmed;
  }

  /**
   * Converts a CanvasSession into a new ThoughtMap.
   *
   * @remarks
   * Mapping rules:
   *  - seed         → root 'topic' node at depth 0  (nodeId: 'topic-0')
   *  - roots[i]     → 'thought' node at depth 1      (nodeId: 'thought-{i}')
   *  - soil[i]      → 'thought' node at depth 1      (nodeId: 'thought-{roots.length + i}')
   *
   * The resulting ThoughtMap is created with status 'active' and
   * `sourceCanvasSessionId` set to the CanvasSession _id.
   *
   * @param sessionId - The CanvasSession ID to convert
   * @param userId    - The ID of the requesting user (must own the session)
   * @param titleOverride - Optional title; defaults to session seed text
   * @returns The newly created ThoughtMap and its nodes
   * @throws {NotFoundException}  If the session doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the session
   */
  async convertFromCanvas(
    sessionId: string,
    userId: string | Types.ObjectId,
    titleOverride?: string,
  ): Promise<{ map: ThoughtMap; nodes: ThoughtNode[] }> {
    const userIdStr = userId.toString();
    this.logger.log(
      `Converting canvas session ${sessionId} to Thought Map for user ${userIdStr}`,
    );

    const session = await this.canvasSessionModel.findById(sessionId).lean();

    if (!session) {
      throw new NotFoundException(
        `Canvas session with ID ${sessionId} not found`,
      );
    }

    if (session.userId.toString() !== userIdStr) {
      throw new ForbiddenException(
        'You do not have permission to convert this canvas session',
      );
    }

    const { roots, seed, soil } = session.problemStructure;
    // Intentional || — empty/whitespace-only titleOverride must fall back to seed
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const title = (titleOverride?.trim() || seed).slice(0, 500);
    const rootNodeId = 'topic-0';

    // Create the ThoughtMap
    const map = await this.thoughtMapModel.create({
      rootNodeId,
      sourceCanvasSessionId: session._id,
      status: 'active',
      title,
      userId: new Types.ObjectId(userIdStr),
    });

    const mapObjectId = map._id;

    // Build all nodes in one batch
    const nodeDocs: Parameters<typeof this.thoughtNodeModel.create>[0][] = [];

    // Root topic node (seed)
    nodeDocs.push({
      depth: 0,
      fromSuggestion: false,
      label: title,
      mapId: mapObjectId,
      nodeId: rootNodeId,
      position: { x: 0, y: 0 },
      type: 'topic' as ThoughtNodeType,
    });

    // Root assumption nodes (roots[])
    for (let i = 0; i < roots.length; i++) {
      nodeDocs.push({
        depth: 1,
        fromSuggestion: false,
        label: roots[i].trim(),
        mapId: mapObjectId,
        nodeId: `thought-${i}`,
        parentId: rootNodeId,
        position: { x: 0, y: 0 },
        type: 'thought' as ThoughtNodeType,
      });
    }

    // Soil constraint nodes (soil[])
    for (let i = 0; i < soil.length; i++) {
      nodeDocs.push({
        depth: 1,
        fromSuggestion: false,
        label: soil[i].trim(),
        mapId: mapObjectId,
        nodeId: `thought-${roots.length + i}`,
        parentId: rootNodeId,
        position: { x: 0, y: 0 },
        type: 'thought' as ThoughtNodeType,
      });
    }

    const nodes = await this.thoughtNodeModel.insertMany(nodeDocs);

    this.logger.log(
      `Canvas session ${sessionId} converted to Thought Map ${map._id.toString()} with ${nodes.length} nodes`,
    );

    return { map, nodes: nodes as unknown as ThoughtNode[] };
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
   * Deletes a ThoughtMap and all associated data (nodes, share links).
   *
   * @param mapId - The ThoughtMap ID
   * @param userId - The ID of the requesting user
   * @throws {NotFoundException} If the map doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the map
   *
   * @example
   * ```typescript
   * await thoughtMapService.deleteMap(mapId, userId);
   * ```
   */
  async deleteMap(
    mapId: string,
    userId: string | Types.ObjectId,
  ): Promise<void> {
    const userIdStr = userId.toString();
    this.logger.log(`Deleting Thought Map ${mapId} by user ${userIdStr}`);

    // Validate ownership (throws NotFoundException or ForbiddenException)
    await this.findMapById(mapId, userId);

    const mapObjectId = new Types.ObjectId(mapId);

    // Delete all associated nodes
    const deleteNodesResult = await this.thoughtNodeModel.deleteMany({
      mapId: mapObjectId,
    });

    this.logger.log(
      `Deleted ${deleteNodesResult.deletedCount} nodes for map ${mapId}`,
    );

    // Delete all associated share links
    const deleteShareLinksResult = await this.shareLinkModel.deleteMany({
      thoughtMapId: mapObjectId,
    });

    this.logger.log(
      `Deleted ${deleteShareLinksResult.deletedCount} share links for map ${mapId}`,
    );

    // Delete the thought map itself
    const deleteMapResult = await this.thoughtMapModel.findByIdAndDelete(mapId);

    if (!deleteMapResult) {
      throw new NotFoundException(`Thought Map with ID ${mapId} not found`);
    }

    this.logger.log(`Thought Map ${mapId} deleted successfully`);
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
    const map = await this.findMapById(mapId, userId);

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

    if (
      nodeId === map.rootNodeId ||
      targetNode.depth === 0 ||
      targetNode.type === 'topic'
    ) {
      throw new BadRequestException('The root topic node cannot be deleted.');
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
   * Retrieves a ThoughtMap with all its nodes WITHOUT ownership check.
   * Used exclusively by the public share token endpoint.
   *
   * @param mapId - The ThoughtMap ID
   * @returns The ThoughtMap and its sorted node list
   * @throws {NotFoundException} If the map doesn't exist
   */
  async getPublicMap(
    mapId: string,
  ): Promise<{ map: ThoughtMap; nodes: ThoughtNode[] }> {
    this.logger.log(`Getting public Thought Map ${mapId}`);

    const map = await this.thoughtMapModel.findById(mapId);

    if (!map) {
      throw new NotFoundException(`Thought Map with ID ${mapId} not found`);
    }

    const nodes = await this.thoughtNodeModel
      .find({ mapId: new Types.ObjectId(mapId) })
      .sort({ createdAt: 1, depth: 1 })
      .exec();

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
      const trimmedLabel = dto.label.trim();

      if (!trimmedLabel) {
        throw new BadRequestException('Node label cannot be empty.');
      }

      setOp.label = trimmedLabel;
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
   * Updates the auto-suggestion settings on an existing ThoughtMap.
   *
   * @param mapId  - The ThoughtMap ID
   * @param userId - The ID of the requesting user
   * @param dto    - Partial settings to update (all fields optional)
   * @returns The updated ThoughtMap
   * @throws {NotFoundException}  If the map doesn't exist
   * @throws {ForbiddenException} If the user doesn't own the map
   */
  async updateSettings(
    mapId: string,
    userId: string | Types.ObjectId,
    dto: UpdateThoughtMapSettingsDto,
  ): Promise<ThoughtMap> {
    const userIdStr = userId.toString();
    this.logger.log(`Updating settings for map ${mapId} by user ${userIdStr}`);

    // Validate ownership
    await this.findMapById(mapId, userId);

    const setOp: Record<string, unknown> = {};

    if (dto.autoSuggestEnabled !== undefined) {
      setOp['settings.autoSuggestEnabled'] = dto.autoSuggestEnabled;
    }
    if (dto.autoSuggestIdleSeconds !== undefined) {
      setOp['settings.autoSuggestIdleSeconds'] = dto.autoSuggestIdleSeconds;
    }
    if (dto.maxSuggestionsPerNode !== undefined) {
      setOp['settings.maxSuggestionsPerNode'] = dto.maxSuggestionsPerNode;
    }

    const updated = await this.thoughtMapModel.findByIdAndUpdate(
      mapId,
      { $set: setOp },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Thought Map with ID ${mapId} not found`);
    }

    this.logger.log(`Settings updated for map ${mapId}`);
    return updated;
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

  /**
   * Allocates the next stable nodeId for a given type within a map.
   *
   * @remarks
   * We intentionally derive this from the maximum numeric suffix rather than
   * `countDocuments()` so deletions do not cause duplicate nodeId reuse.
   */
  private async getNextNodeId(
    mapId: string,
    nodeType: Exclude<ThoughtNodeType, 'topic'>,
  ): Promise<string> {
    const existingNodes = await this.thoughtNodeModel
      .find(
        { mapId: new Types.ObjectId(mapId), type: nodeType },
        { _id: 0, nodeId: 1 },
      )
      .lean();

    const nodeIdPattern = new RegExp(`^${nodeType}-(\\d+)$`);
    let maxSuffix = -1;

    for (const node of existingNodes) {
      const match = node.nodeId.match(nodeIdPattern);
      if (!match) {
        continue;
      }

      const suffix = Number.parseInt(match[1], 10);
      if (Number.isNaN(suffix)) {
        continue;
      }

      maxSuffix = Math.max(maxSuffix, suffix);
    }

    return `${nodeType}-${maxSuffix + 1}`;
  }
}
