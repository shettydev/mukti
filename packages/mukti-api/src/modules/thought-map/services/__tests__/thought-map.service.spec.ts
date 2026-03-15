import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { CanvasSession } from '../../../../schemas/canvas-session.schema';
import { ThoughtMap } from '../../../../schemas/thought-map.schema';
import { ThoughtNode } from '../../../../schemas/thought-node.schema';
import { ThoughtMapService } from '../thought-map.service';

describe('ThoughtMapService', () => {
  let service: ThoughtMapService;

  const mockThoughtMapModel = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockThoughtNodeModel = {
    countDocuments: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    insertMany: jest.fn(),
  };

  const mockCanvasSessionModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThoughtMapService,
        {
          provide: getModelToken(ThoughtMap.name),
          useValue: mockThoughtMapModel,
        },
        {
          provide: getModelToken(ThoughtNode.name),
          useValue: mockThoughtNodeModel,
        },
        {
          provide: getModelToken(CanvasSession.name),
          useValue: mockCanvasSessionModel,
        },
      ],
    }).compile();

    service = module.get<ThoughtMapService>(ThoughtMapService);
    jest.clearAllMocks();
  });

  const createExecQuery = <T>(value: T) => ({
    exec: jest.fn().mockResolvedValue(value),
    sort: jest.fn().mockReturnThis(),
  });

  const createLeanQuery = <T>(value: T) => ({
    lean: jest.fn().mockResolvedValue(value),
    select: jest.fn().mockReturnThis(),
  });

  function createOwnedMap(
    userId: Types.ObjectId,
    overrides: Partial<Record<string, unknown>> = {},
  ) {
    return {
      _id: new Types.ObjectId(),
      rootNodeId: 'topic-0',
      settings: {
        autoSuggestEnabled: true,
        autoSuggestIdleSeconds: 10,
        maxSuggestionsPerNode: 4,
      },
      status: 'active',
      title: 'Systems thinking',
      userId,
      ...overrides,
    };
  }

  describe('createMap', () => {
    it('creates a thought map and root topic node with a trimmed title', async () => {
      const userId = new Types.ObjectId();
      const map = {
        _id: new Types.ObjectId(),
        rootNodeId: 'topic-0',
        title: 'Systems thinking',
        userId,
      };
      const rootNode = {
        _id: new Types.ObjectId(),
        depth: 0,
        label: 'Systems thinking',
        mapId: map._id,
        nodeId: 'topic-0',
        position: { x: 0, y: 0 },
        type: 'topic',
      };

      mockThoughtMapModel.create.mockResolvedValue(map);
      mockThoughtNodeModel.create.mockResolvedValue(rootNode);

      const result = await service.createMap(userId, {
        title: '  Systems thinking  ',
      });

      expect(mockThoughtMapModel.create).toHaveBeenCalledWith({
        rootNodeId: 'topic-0',
        title: 'Systems thinking',
        userId,
      });
      expect(mockThoughtNodeModel.create).toHaveBeenCalledWith({
        depth: 0,
        label: 'Systems thinking',
        mapId: map._id,
        nodeId: 'topic-0',
        position: { x: 0, y: 0 },
        type: 'topic',
      });
      expect(result).toEqual({ map, rootNode });
    });
  });

  describe('addNode', () => {
    it('adds a default thought child under the parent node', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);
      const parentNode = {
        depth: 1,
        nodeId: 'thought-0',
      };
      const createdNode = {
        _id: new Types.ObjectId(),
        depth: 2,
        fromSuggestion: false,
        label: 'Next question',
        mapId: map._id,
        nodeId: 'thought-4',
        parentId: 'thought-0',
        position: { x: 0, y: 0 },
        type: 'thought',
      };

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtNodeModel.countDocuments
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(4);
      mockThoughtNodeModel.findOne.mockResolvedValue(parentNode);
      mockThoughtNodeModel.create.mockResolvedValue(createdNode);

      const result = await service.addNode(map._id.toString(), userId, {
        label: '  Next question  ',
        parentId: 'thought-0',
      });

      expect(mockThoughtNodeModel.create).toHaveBeenCalledWith({
        depth: 2,
        fromSuggestion: false,
        label: 'Next question',
        mapId: map._id,
        nodeId: 'thought-4',
        parentId: 'thought-0',
        position: { x: 0, y: 0 },
        type: 'thought',
      });
      expect(result).toBe(createdNode);
    });

    it('adds a custom type and preserves fromSuggestion', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtNodeModel.countDocuments
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);
      mockThoughtNodeModel.findOne.mockResolvedValue({
        depth: 0,
        nodeId: 'topic-0',
      });
      mockThoughtNodeModel.create.mockResolvedValue({
        nodeId: 'question-1',
      });

      await service.addNode(map._id.toString(), userId, {
        fromSuggestion: true,
        label: 'Why now?',
        parentId: 'topic-0',
        type: 'question',
      });

      expect(mockThoughtNodeModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fromSuggestion: true,
          nodeId: 'question-1',
          type: 'question',
        }),
      );
    });

    it('rejects creation when the parent node is missing', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtNodeModel.countDocuments.mockResolvedValue(1);
      mockThoughtNodeModel.findOne.mockResolvedValue(null);

      await expect(
        service.addNode(map._id.toString(), userId, {
          label: 'Missing parent',
          parentId: 'thought-404',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects the topic type for non-root nodes', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtNodeModel.countDocuments.mockResolvedValue(1);
      mockThoughtNodeModel.findOne.mockResolvedValue({
        depth: 0,
        nodeId: 'topic-0',
      });

      await expect(
        service.addNode(map._id.toString(), userId, {
          label: 'Sub topic',
          parentId: 'topic-0',
          type: 'topic',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects node creation once the Phase 1 node limit is reached', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtNodeModel.countDocuments.mockResolvedValue(100);

      await expect(
        service.addNode(map._id.toString(), userId, {
          label: 'Too many nodes',
          parentId: 'topic-0',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('confirmMap', () => {
    it('transitions a draft map to active', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId, { status: 'draft' });
      const confirmed = {
        ...map,
        confirmedAt: new Date(),
        status: 'active',
      };

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtMapModel.findByIdAndUpdate.mockResolvedValue(confirmed);

      const result = await service.confirmMap(map._id.toString(), userId);

      expect(mockThoughtMapModel.findByIdAndUpdate).toHaveBeenCalledWith(
        map._id.toString(),
        {
          $set: {
            confirmedAt: expect.any(Date),
            status: 'active',
          },
        },
        { new: true },
      );
      expect(result).toBe(confirmed);
    });

    it('rejects confirming a non-draft map', async () => {
      const userId = new Types.ObjectId();

      mockThoughtMapModel.findById.mockResolvedValue(createOwnedMap(userId));

      await expect(
        service.confirmMap(new Types.ObjectId().toString(), userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when the updated map cannot be loaded after validation', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId, { status: 'draft' });

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtMapModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.confirmMap(map._id.toString(), userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('convertFromCanvas', () => {
    it('converts a canvas session into a thought map using the seed by default', async () => {
      const userId = new Types.ObjectId();
      const sessionId = new Types.ObjectId();
      const session = {
        _id: sessionId,
        problemStructure: {
          roots: ['  Root A  ', 'Root B'],
          seed: 'Big question',
          soil: ['Constraint'],
        },
        userId,
      };
      const map = {
        _id: new Types.ObjectId(),
        rootNodeId: 'topic-0',
        title: 'Big question',
      };
      const nodes = [
        { nodeId: 'topic-0' },
        { nodeId: 'thought-0' },
        { nodeId: 'thought-1' },
        { nodeId: 'thought-2' },
      ];

      mockCanvasSessionModel.findById.mockReturnValue(createLeanQuery(session));
      mockThoughtMapModel.create.mockResolvedValue(map);
      mockThoughtNodeModel.insertMany.mockResolvedValue(nodes);

      const result = await service.convertFromCanvas(
        sessionId.toString(),
        userId,
      );

      expect(mockThoughtMapModel.create).toHaveBeenCalledWith({
        rootNodeId: 'topic-0',
        sourceCanvasSessionId: sessionId,
        status: 'active',
        title: 'Big question',
        userId,
      });
      expect(mockThoughtNodeModel.insertMany).toHaveBeenCalledWith([
        {
          depth: 0,
          fromSuggestion: false,
          label: 'Big question',
          mapId: map._id,
          nodeId: 'topic-0',
          position: { x: 0, y: 0 },
          type: 'topic',
        },
        {
          depth: 1,
          fromSuggestion: false,
          label: 'Root A',
          mapId: map._id,
          nodeId: 'thought-0',
          parentId: 'topic-0',
          position: { x: 0, y: 0 },
          type: 'thought',
        },
        {
          depth: 1,
          fromSuggestion: false,
          label: 'Root B',
          mapId: map._id,
          nodeId: 'thought-1',
          parentId: 'topic-0',
          position: { x: 0, y: 0 },
          type: 'thought',
        },
        {
          depth: 1,
          fromSuggestion: false,
          label: 'Constraint',
          mapId: map._id,
          nodeId: 'thought-2',
          parentId: 'topic-0',
          position: { x: 0, y: 0 },
          type: 'thought',
        },
      ]);
      expect(result).toEqual({ map, nodes });
    });

    it('uses a trimmed title override when provided', async () => {
      const userId = new Types.ObjectId();
      const sessionId = new Types.ObjectId();
      const session = {
        _id: sessionId,
        problemStructure: {
          roots: [],
          seed: 'Original seed',
          soil: [],
        },
        userId,
      };
      const map = { _id: new Types.ObjectId() };

      mockCanvasSessionModel.findById.mockReturnValue(createLeanQuery(session));
      mockThoughtMapModel.create.mockResolvedValue(map);
      mockThoughtNodeModel.insertMany.mockResolvedValue([]);

      await service.convertFromCanvas(
        sessionId.toString(),
        userId,
        '  Override title  ',
      );

      expect(mockThoughtMapModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Override title',
        }),
      );
      expect(mockThoughtNodeModel.insertMany).toHaveBeenCalledWith([
        expect.objectContaining({
          label: 'Override title',
        }),
      ]);
    });

    it('throws when the canvas session is missing', async () => {
      mockCanvasSessionModel.findById.mockReturnValue(createLeanQuery(null));

      await expect(
        service.convertFromCanvas(
          new Types.ObjectId().toString(),
          new Types.ObjectId(),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when the canvas session belongs to another user', async () => {
      const ownerId = new Types.ObjectId();
      const userId = new Types.ObjectId();

      mockCanvasSessionModel.findById.mockReturnValue(
        createLeanQuery({
          _id: new Types.ObjectId(),
          problemStructure: {
            roots: [],
            seed: 'Seed',
            soil: [],
          },
          userId: ownerId,
        }),
      );

      await expect(
        service.convertFromCanvas(new Types.ObjectId().toString(), userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteNode', () => {
    it('rejects root topic deletion', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtNodeModel.findOne.mockResolvedValue({
        depth: 0,
        nodeId: 'topic-0',
        type: 'topic',
      });

      await expect(
        service.deleteNode(map._id.toString(), 'topic-0', userId, false),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when the target node is missing', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtNodeModel.findOne.mockResolvedValue(null);

      await expect(
        service.deleteNode(map._id.toString(), 'thought-404', userId, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects deleting a node with children unless cascade is enabled', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtNodeModel.findOne.mockResolvedValue({
        depth: 1,
        nodeId: 'thought-1',
        type: 'thought',
      });
      mockThoughtNodeModel.countDocuments.mockResolvedValue(2);

      await expect(
        service.deleteNode(map._id.toString(), 'thought-1', userId, false),
      ).rejects.toThrow(ConflictException);
    });

    it('deletes a leaf node directly when cascade is false', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtNodeModel.findOne.mockResolvedValue({
        depth: 1,
        nodeId: 'thought-2',
        type: 'thought',
      });
      mockThoughtNodeModel.countDocuments.mockResolvedValue(0);
      mockThoughtNodeModel.deleteOne.mockResolvedValue({ deletedCount: 1 });

      await service.deleteNode(map._id.toString(), 'thought-2', userId, false);

      expect(mockThoughtNodeModel.deleteOne).toHaveBeenCalledWith({
        mapId: expect.any(Types.ObjectId),
        nodeId: 'thought-2',
      });
    });

    it('cascade deletes the node and all descendants', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtNodeModel.findOne.mockResolvedValue({
        depth: 1,
        nodeId: 'thought-1',
        type: 'thought',
      });
      mockThoughtNodeModel.countDocuments.mockResolvedValue(1);
      mockThoughtNodeModel.find
        .mockReturnValueOnce(
          createLeanQuery([{ nodeId: 'thought-2' }, { nodeId: 'question-0' }]),
        )
        .mockReturnValueOnce(createLeanQuery([{ nodeId: 'insight-0' }]))
        .mockReturnValueOnce(createLeanQuery([]))
        .mockReturnValueOnce(createLeanQuery([]));
      mockThoughtNodeModel.deleteMany.mockResolvedValue({ deletedCount: 4 });

      await service.deleteNode(map._id.toString(), 'thought-1', userId, true);

      expect(mockThoughtNodeModel.deleteMany).toHaveBeenCalledWith({
        mapId: expect.any(Types.ObjectId),
        nodeId: {
          $in: ['thought-2', 'question-0', 'insight-0', 'thought-1'],
        },
      });
    });
  });

  describe('findMapById', () => {
    it('returns the map for the owner', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);

      mockThoughtMapModel.findById.mockResolvedValue(map);

      await expect(
        service.findMapById(map._id.toString(), userId),
      ).resolves.toBe(map);
    });

    it('throws NotFoundException when the map does not exist', async () => {
      const userId = new Types.ObjectId();

      mockThoughtMapModel.findById.mockResolvedValue(null);

      await expect(
        service.findMapById(new Types.ObjectId().toString(), userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the map belongs to another user', async () => {
      const userId = new Types.ObjectId();
      const otherUserId = new Types.ObjectId();

      mockThoughtMapModel.findById.mockResolvedValue(
        createOwnedMap(otherUserId),
      );

      await expect(
        service.findMapById(new Types.ObjectId().toString(), userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMap', () => {
    it('returns the map and sorted nodes for the owner', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);
      const nodes = [{ nodeId: 'topic-0' }, { nodeId: 'thought-0' }];

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtNodeModel.find.mockReturnValue(createExecQuery(nodes));

      const result = await service.getMap(map._id.toString(), userId);

      expect(mockThoughtNodeModel.find).toHaveBeenCalledWith({
        mapId: expect.any(Types.ObjectId),
      });
      expect(result).toEqual({ map, nodes });
    });
  });

  describe('getPublicMap', () => {
    it('returns a public map without ownership validation', async () => {
      const map = createOwnedMap(new Types.ObjectId());
      const nodes = [{ nodeId: 'topic-0' }];

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtNodeModel.find.mockReturnValue(createExecQuery(nodes));

      await expect(service.getPublicMap(map._id.toString())).resolves.toEqual({
        map,
        nodes,
      });
    });

    it('throws when the public map is missing', async () => {
      mockThoughtMapModel.findById.mockResolvedValue(null);

      await expect(
        service.getPublicMap(new Types.ObjectId().toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listMaps', () => {
    it('lists maps newest-first for the user', async () => {
      const userId = new Types.ObjectId();
      const maps = [createOwnedMap(userId), createOwnedMap(userId)];

      mockThoughtMapModel.find.mockReturnValue(createExecQuery(maps));

      await expect(service.listMaps(userId)).resolves.toEqual(maps);
      expect(mockThoughtMapModel.find).toHaveBeenCalledWith({ userId });
    });
  });

  describe('updateNode', () => {
    it('updates only the provided fields and trims labels', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);
      const updatedNode = { label: 'Sharper label', nodeId: 'thought-1' };

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtNodeModel.findOneAndUpdate.mockResolvedValue(updatedNode);

      const result = await service.updateNode(
        map._id.toString(),
        'thought-1',
        userId,
        {
          isCollapsed: true,
          label: '  Sharper label  ',
          position: { x: 12 },
        },
      );

      expect(mockThoughtNodeModel.findOneAndUpdate).toHaveBeenCalledWith(
        { mapId: expect.any(Types.ObjectId), nodeId: 'thought-1' },
        {
          $set: {
            isCollapsed: true,
            label: 'Sharper label',
            'position.x': 12,
          },
        },
        { new: true },
      );
      expect(result).toBe(updatedNode);
    });

    it('rejects blank labels during updates after trimming whitespace', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);

      mockThoughtMapModel.findById.mockResolvedValue(map);

      await expect(
        service.updateNode(map._id.toString(), 'thought-1', userId, {
          label: '   ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when the node to update does not exist', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtNodeModel.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        service.updateNode(map._id.toString(), 'thought-1', userId, {
          isCollapsed: false,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSettings', () => {
    it('updates only the provided map settings', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);
      const updatedMap = createOwnedMap(userId, {
        settings: {
          autoSuggestEnabled: false,
          autoSuggestIdleSeconds: 25,
          maxSuggestionsPerNode: 6,
        },
      });

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtMapModel.findByIdAndUpdate.mockResolvedValue(updatedMap);

      const result = await service.updateSettings(map._id.toString(), userId, {
        autoSuggestEnabled: false,
        autoSuggestIdleSeconds: 25,
        maxSuggestionsPerNode: 6,
      });

      expect(mockThoughtMapModel.findByIdAndUpdate).toHaveBeenCalledWith(
        map._id.toString(),
        {
          $set: {
            'settings.autoSuggestEnabled': false,
            'settings.autoSuggestIdleSeconds': 25,
            'settings.maxSuggestionsPerNode': 6,
          },
        },
        { new: true },
      );
      expect(result).toBe(updatedMap);
    });

    it('throws when the map vanishes before settings are updated', async () => {
      const userId = new Types.ObjectId();
      const map = createOwnedMap(userId);

      mockThoughtMapModel.findById.mockResolvedValue(map);
      mockThoughtMapModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.updateSettings(map._id.toString(), userId, {
          autoSuggestEnabled: false,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
