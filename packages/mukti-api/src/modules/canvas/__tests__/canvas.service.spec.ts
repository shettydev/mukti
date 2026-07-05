import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { CanvasSession } from '../../../schemas/canvas-session.schema';
import { InsightNode } from '../../../schemas/insight-node.schema';
import { CanvasService } from '../canvas.service';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const userId = new Types.ObjectId('507f1f77bcf86cd799439011');
const sessionId = new Types.ObjectId('507f1f77bcf86cd799439012').toString();

function makeCanvasSessionModel(sessionData?: ReturnType<typeof makeSession>) {
  return {
    create: jest.fn().mockResolvedValue(sessionData ?? makeSession()),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    findById: jest.fn().mockResolvedValue(sessionData ?? makeSession()),
    findByIdAndDelete: jest
      .fn()
      .mockResolvedValue(sessionData ?? makeSession()),
    findByIdAndUpdate: jest
      .fn()
      .mockResolvedValue(sessionData ?? makeSession()),
    findOne: jest.fn().mockResolvedValue(sessionData ?? makeSession()),
  };
}

// ---------------------------------------------------------------------------
// Mock model factory helpers
// ---------------------------------------------------------------------------

function makeInsightNodeModel() {
  return {
    create: jest.fn(),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    find: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
      lean: jest.fn().mockResolvedValue([]),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
    }),
    findOneAndDelete: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };
}

function makeSession(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _id: new Types.ObjectId(sessionId),
    dynamicNodeIds: [],
    exploredNodes: [],
    nodePositions: [],
    problemStructure: { roots: [], seed: 'Test seed', soil: [] },
    relationshipEdges: [],
    userId,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('CanvasService', () => {
  let service: CanvasService;
  let canvasSessionModel: ReturnType<typeof makeCanvasSessionModel>;
  let insightNodeModel: ReturnType<typeof makeInsightNodeModel>;

  async function createModule(sessionData?: ReturnType<typeof makeSession>) {
    canvasSessionModel = makeCanvasSessionModel(sessionData);
    insightNodeModel = makeInsightNodeModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CanvasService,
        {
          provide: getModelToken(CanvasSession.name),
          useValue: canvasSessionModel,
        },
        {
          provide: getModelToken(InsightNode.name),
          useValue: insightNodeModel,
        },
      ],
    }).compile();

    service = module.get<CanvasService>(CanvasService);
  }

  beforeEach(async () => {
    await createModule();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // createSession
  // -------------------------------------------------------------------------

  describe('createSession', () => {
    it('trims whitespace from seed, roots and soil before saving', async () => {
      const dto = {
        roots: ['  assumption  '],
        seed: '  my problem  ',
        soil: ['  context  '],
      };

      const expectedSession = makeSession({
        problemStructure: {
          roots: ['assumption'],
          seed: 'my problem',
          soil: ['context'],
        },
      });
      canvasSessionModel.create.mockResolvedValue(expectedSession);

      const result = await service.createSession(userId, dto);

      expect(canvasSessionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          problemStructure: {
            roots: ['assumption'],
            seed: 'my problem',
            soil: ['context'],
          },
        }),
      );
      expect(result).toBe(expectedSession);
    });

    it('accepts empty roots and soil arrays', async () => {
      const dto = { roots: [], seed: 'minimal seed', soil: [] };
      const session = makeSession({
        problemStructure: { roots: [], seed: 'minimal seed', soil: [] },
      });
      canvasSessionModel.create.mockResolvedValue(session);

      const result = await service.createSession(userId, dto);
      expect(result).toBe(session);
    });
  });

  // -------------------------------------------------------------------------
  // findSessionById
  // -------------------------------------------------------------------------

  describe('findSessionById', () => {
    it('returns the session when it exists and belongs to the user', async () => {
      const session = makeSession();
      canvasSessionModel.findById.mockResolvedValue(session);

      const result = await service.findSessionById(sessionId, userId);
      expect(result).toBe(session);
    });

    it('throws NotFoundException when session does not exist', async () => {
      canvasSessionModel.findById.mockResolvedValue(null);

      await expect(service.findSessionById(sessionId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when session belongs to a different user', async () => {
      const otherUserId = new Types.ObjectId('507f1f77bcf86cd799439099');
      const session = makeSession({ userId: otherUserId });
      canvasSessionModel.findById.mockResolvedValue(session);

      await expect(service.findSessionById(sessionId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // findAllByUser
  // -------------------------------------------------------------------------

  describe('findAllByUser', () => {
    it('returns sessions sorted by creation date descending', async () => {
      const sessions = [makeSession(), makeSession()];
      const sortMock = { exec: jest.fn().mockResolvedValue(sessions) };
      const findMock = { sort: jest.fn().mockReturnValue(sortMock) };
      canvasSessionModel.find.mockReturnValue(findMock);

      const result = await service.findAllByUser(userId);

      expect(findMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toBe(sessions);
    });

    it('returns empty array when user has no sessions', async () => {
      const sortMock = { exec: jest.fn().mockResolvedValue([]) };
      const findMock = { sort: jest.fn().mockReturnValue(sortMock) };
      canvasSessionModel.find.mockReturnValue(findMock);

      const result = await service.findAllByUser(userId);
      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // addAssumption
  // -------------------------------------------------------------------------

  describe('addAssumption', () => {
    it('adds assumption and returns nodeId with updated session', async () => {
      const session = makeSession({
        problemStructure: { roots: ['existing'], seed: 'seed', soil: [] },
      });
      const updatedSession = makeSession({
        dynamicNodeIds: ['root-1'],
        problemStructure: {
          roots: ['existing', 'new assumption'],
          seed: 'seed',
          soil: [],
        },
      });
      canvasSessionModel.findById.mockResolvedValue(session);
      canvasSessionModel.findByIdAndUpdate.mockResolvedValue(updatedSession);

      const result = await service.addAssumption(sessionId, userId, {
        assumption: '  new assumption  ',
      });

      expect(result.nodeId).toBe('root-1');
      expect(result.session).toBe(updatedSession);
      expect(canvasSessionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          $push: expect.objectContaining({
            'problemStructure.roots': 'new assumption',
          }),
        }),
        { new: true },
      );
    });

    it('throws BadRequestException when assumption limit (8) is reached', async () => {
      const session = makeSession({
        problemStructure: {
          roots: Array.from({ length: 8 }, (_, i) => `root-${i}`),
          seed: 'seed',
          soil: [],
        },
      });
      canvasSessionModel.findById.mockResolvedValue(session);

      await expect(
        service.addAssumption(sessionId, userId, { assumption: 'one more' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when session not found after update', async () => {
      const session = makeSession();
      canvasSessionModel.findById.mockResolvedValue(session);
      canvasSessionModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(
        service.addAssumption(sessionId, userId, { assumption: 'assumption' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // addContext
  // -------------------------------------------------------------------------

  describe('addContext', () => {
    it('adds context item and returns nodeId with updated session', async () => {
      const session = makeSession({
        problemStructure: { roots: [], seed: 'seed', soil: ['existing'] },
      });
      const updatedSession = makeSession({
        dynamicNodeIds: ['soil-1'],
        problemStructure: {
          roots: [],
          seed: 'seed',
          soil: ['existing', 'new context'],
        },
      });
      canvasSessionModel.findById.mockResolvedValue(session);
      canvasSessionModel.findByIdAndUpdate.mockResolvedValue(updatedSession);

      const result = await service.addContext(sessionId, userId, {
        context: '  new context  ',
      });

      expect(result.nodeId).toBe('soil-1');
      expect(result.session).toBe(updatedSession);
    });

    it('throws BadRequestException when context limit (10) is reached', async () => {
      const session = makeSession({
        problemStructure: {
          roots: [],
          seed: 'seed',
          soil: Array.from({ length: 10 }, (_, i) => `context-${i}`),
        },
      });
      canvasSessionModel.findById.mockResolvedValue(session);

      await expect(
        service.addContext(sessionId, userId, { context: 'one more' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // createInsightNode
  // -------------------------------------------------------------------------

  describe('createInsightNode', () => {
    it('creates an insight node with a valid parent nodeId', async () => {
      const session = makeSession({
        problemStructure: { roots: ['root'], seed: 'seed', soil: ['soil'] },
      });
      canvasSessionModel.findById.mockResolvedValue(session);

      // insightNodeModel.find for existing insights
      insightNodeModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
        select: jest.fn().mockReturnThis(),
      });

      const insightDoc = {
        _id: new Types.ObjectId(),
        label: 'my insight',
        nodeId: 'insight-0',
        parentNodeId: 'seed',
        position: { x: 100, y: 200 },
        sessionId: new Types.ObjectId(sessionId),
      };
      insightNodeModel.create.mockResolvedValue(insightDoc);

      const result = await service.createInsightNode(sessionId, userId, {
        label: '  my insight  ',
        parentNodeId: 'seed',
        x: 100,
        y: 200,
      });

      expect(result.nodeId).toBe('insight-0');
      expect(insightNodeModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'my insight',
          parentNodeId: 'seed',
        }),
      );
    });

    it('throws BadRequestException for an invalid parentNodeId', async () => {
      const session = makeSession({
        problemStructure: { roots: [], seed: 'seed', soil: [] },
      });
      canvasSessionModel.findById.mockResolvedValue(session);
      insightNodeModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
        select: jest.fn().mockReturnThis(),
      });

      await expect(
        service.createInsightNode(sessionId, userId, {
          label: 'orphan',
          parentNodeId: 'nonexistent-99',
          x: 0,
          y: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sequences insight nodeIds from insight-0 onward', async () => {
      const session = makeSession({
        problemStructure: { roots: [], seed: 'seed', soil: [] },
      });
      canvasSessionModel.findById.mockResolvedValue(session);

      insightNodeModel.find.mockReturnValue({
        lean: jest
          .fn()
          .mockResolvedValue([
            { nodeId: 'insight-0' },
            { nodeId: 'insight-1' },
          ]),
        select: jest.fn().mockReturnThis(),
      });

      const insightDoc = {
        _id: new Types.ObjectId(),
        nodeId: 'insight-2',
        parentNodeId: 'seed',
      };
      insightNodeModel.create.mockResolvedValue(insightDoc);

      await service.createInsightNode(sessionId, userId, {
        label: 'third insight',
        parentNodeId: 'seed',
        x: 0,
        y: 0,
      });

      expect(insightNodeModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ nodeId: 'insight-2' }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // createRelationship
  // -------------------------------------------------------------------------

  describe('createRelationship', () => {
    it('creates a relationship between a root and soil node', async () => {
      const session = makeSession({
        problemStructure: { roots: ['root'], seed: 'seed', soil: ['context'] },
        relationshipEdges: [],
      });
      const updatedSession = makeSession({
        ...session,
        relationshipEdges: [
          {
            id: 'rel-root-0-soil-0',
            sourceNodeId: 'root-0',
            targetNodeId: 'soil-0',
          },
        ],
      });
      canvasSessionModel.findById.mockResolvedValue(session);
      canvasSessionModel.findByIdAndUpdate.mockResolvedValue(updatedSession);

      const result = await service.createRelationship(sessionId, userId, {
        sourceNodeId: 'root-0',
        targetNodeId: 'soil-0',
      });

      expect(result.relationship.id).toBe('rel-root-0-soil-0');
    });

    it('throws BadRequestException for an invalid source (root) node', async () => {
      const session = makeSession({
        problemStructure: { roots: [], seed: 'seed', soil: ['context'] },
        relationshipEdges: [],
      });
      canvasSessionModel.findById.mockResolvedValue(session);

      await expect(
        service.createRelationship(sessionId, userId, {
          sourceNodeId: 'root-99',
          targetNodeId: 'soil-0',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for an invalid target (soil) node', async () => {
      const session = makeSession({
        problemStructure: { roots: ['root'], seed: 'seed', soil: [] },
        relationshipEdges: [],
      });
      canvasSessionModel.findById.mockResolvedValue(session);

      await expect(
        service.createRelationship(sessionId, userId, {
          sourceNodeId: 'root-0',
          targetNodeId: 'soil-99',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when relationship already exists', async () => {
      const session = makeSession({
        problemStructure: { roots: ['root'], seed: 'seed', soil: ['context'] },
        relationshipEdges: [
          {
            id: 'rel-root-0-soil-0',
            sourceNodeId: 'root-0',
            targetNodeId: 'soil-0',
          },
        ],
      });
      canvasSessionModel.findById.mockResolvedValue(session);

      await expect(
        service.createRelationship(sessionId, userId, {
          sourceNodeId: 'root-0',
          targetNodeId: 'soil-0',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -------------------------------------------------------------------------
  // deleteAssumption
  // -------------------------------------------------------------------------

  describe('deleteAssumption', () => {
    it('deletes a dynamically-added assumption', async () => {
      const session = makeSession({
        dynamicNodeIds: ['root-1'],
        problemStructure: {
          roots: ['original', 'dynamic'],
          seed: 'seed',
          soil: [],
        },
      });
      const updated = makeSession({
        dynamicNodeIds: [],
        problemStructure: { roots: ['original'], seed: 'seed', soil: [] },
      });
      canvasSessionModel.findById.mockResolvedValue(session);
      canvasSessionModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.deleteAssumption(sessionId, 1, userId);
      expect(result).toBe(updated);
    });

    it('throws BadRequestException when trying to delete an original (non-dynamic) node', async () => {
      // root-0 is NOT in dynamicNodeIds
      const session = makeSession({
        dynamicNodeIds: [],
        problemStructure: { roots: ['original'], seed: 'seed', soil: [] },
      });
      canvasSessionModel.findById.mockResolvedValue(session);

      await expect(
        service.deleteAssumption(sessionId, 0, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for an out-of-range index', async () => {
      const session = makeSession({
        dynamicNodeIds: ['root-0'],
        problemStructure: { roots: ['only'], seed: 'seed', soil: [] },
      });
      canvasSessionModel.findById.mockResolvedValue(session);

      await expect(
        service.deleteAssumption(sessionId, 5, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('shifts dynamicNodeIds after deletion to keep indices consistent', async () => {
      // root-1 is dynamic; deleting index 1 should shift root-2 → root-1
      const session = makeSession({
        dynamicNodeIds: ['root-1', 'root-2'],
        problemStructure: { roots: ['r0', 'r1', 'r2'], seed: 'seed', soil: [] },
      });
      canvasSessionModel.findById.mockResolvedValue(session);
      const updatedSession = makeSession();
      canvasSessionModel.findByIdAndUpdate.mockResolvedValue(updatedSession);

      await service.deleteAssumption(sessionId, 1, userId);

      expect(canvasSessionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          $set: expect.objectContaining({
            dynamicNodeIds: ['root-1'], // root-2 shifted to root-1
          }),
        }),
        { new: true },
      );
    });
  });

  // -------------------------------------------------------------------------
  // deleteContext
  // -------------------------------------------------------------------------

  describe('deleteContext', () => {
    it('deletes a dynamically-added context item', async () => {
      const session = makeSession({
        dynamicNodeIds: ['soil-1'],
        problemStructure: {
          roots: [],
          seed: 'seed',
          soil: ['original', 'dynamic'],
        },
      });
      const updated = makeSession({
        dynamicNodeIds: [],
        problemStructure: { roots: [], seed: 'seed', soil: ['original'] },
      });
      canvasSessionModel.findById.mockResolvedValue(session);
      canvasSessionModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.deleteContext(sessionId, 1, userId);
      expect(result).toBe(updated);
    });

    it('throws BadRequestException for an original context node', async () => {
      const session = makeSession({
        dynamicNodeIds: [],
        problemStructure: { roots: [], seed: 'seed', soil: ['original'] },
      });
      canvasSessionModel.findById.mockResolvedValue(session);

      await expect(service.deleteContext(sessionId, 0, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // deleteInsightNode
  // -------------------------------------------------------------------------

  describe('deleteInsightNode', () => {
    it('deletes insight node and returns it', async () => {
      const session = makeSession();
      const insight = { _id: new Types.ObjectId(), nodeId: 'insight-0' };
      canvasSessionModel.findById.mockResolvedValue(session);
      insightNodeModel.findOneAndDelete.mockResolvedValue(insight);

      const result = await service.deleteInsightNode(
        sessionId,
        'insight-0',
        userId,
      );
      expect(result).toBe(insight);
    });

    it('throws NotFoundException when insight does not exist', async () => {
      const session = makeSession();
      canvasSessionModel.findById.mockResolvedValue(session);
      insightNodeModel.findOneAndDelete.mockResolvedValue(null);

      await expect(
        service.deleteInsightNode(sessionId, 'insight-99', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // deleteRelationship
  // -------------------------------------------------------------------------

  describe('deleteRelationship', () => {
    it('deletes an existing relationship', async () => {
      const session = makeSession({
        relationshipEdges: [
          {
            id: 'rel-root-0-soil-0',
            sourceNodeId: 'root-0',
            targetNodeId: 'soil-0',
          },
        ],
      });
      const updated = makeSession({ relationshipEdges: [] });
      canvasSessionModel.findById.mockResolvedValue(session);
      canvasSessionModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.deleteRelationship(
        sessionId,
        'rel-root-0-soil-0',
        userId,
      );
      expect(result).toBe(updated);
    });

    it('throws NotFoundException for a non-existent relationship', async () => {
      const session = makeSession({ relationshipEdges: [] });
      canvasSessionModel.findById.mockResolvedValue(session);

      await expect(
        service.deleteRelationship(sessionId, 'rel-root-99-soil-99', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // deleteSession
  // -------------------------------------------------------------------------

  describe('deleteSession', () => {
    it('deletes all insight nodes and then the session', async () => {
      const session = makeSession();
      canvasSessionModel.findById.mockResolvedValue(session);
      canvasSessionModel.findByIdAndDelete.mockResolvedValue(session);
      insightNodeModel.deleteMany.mockResolvedValue({ deletedCount: 3 });

      await service.deleteSession(sessionId, userId);

      expect(insightNodeModel.deleteMany).toHaveBeenCalledWith({
        sessionId: new Types.ObjectId(sessionId),
      });
      expect(canvasSessionModel.findByIdAndDelete).toHaveBeenCalledWith(
        sessionId,
      );
    });

    it('throws NotFoundException when session does not exist during final delete', async () => {
      const session = makeSession();
      canvasSessionModel.findById.mockResolvedValue(session);
      insightNodeModel.deleteMany.mockResolvedValue({ deletedCount: 0 });
      canvasSessionModel.findByIdAndDelete.mockResolvedValue(null);

      await expect(service.deleteSession(sessionId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // getInsightsBySession
  // -------------------------------------------------------------------------

  describe('getInsightsBySession', () => {
    it('returns insights sorted by creation date ascending', async () => {
      const session = makeSession();
      const insights = [{ nodeId: 'insight-0' }, { nodeId: 'insight-1' }];
      canvasSessionModel.findById.mockResolvedValue(session);

      const sortMock = { exec: jest.fn().mockResolvedValue(insights) };
      insightNodeModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue(sortMock),
      });

      const result = await service.getInsightsBySession(sessionId, userId);
      expect(result).toBe(insights);
    });
  });

  // -------------------------------------------------------------------------
  // getRelationshipsBySession
  // -------------------------------------------------------------------------

  describe('getRelationshipsBySession', () => {
    it('returns relationship edges from the session', async () => {
      const edges = [
        {
          id: 'rel-root-0-soil-0',
          sourceNodeId: 'root-0',
          targetNodeId: 'soil-0',
        },
      ];
      const session = makeSession({ relationshipEdges: edges });
      canvasSessionModel.findById.mockResolvedValue(session);

      const result = await service.getRelationshipsBySession(sessionId, userId);
      expect(result).toEqual(edges);
    });
  });

  // -------------------------------------------------------------------------
  // updateSession
  // -------------------------------------------------------------------------

  describe('updateSession', () => {
    it('updates nodePositions and exploredNodes', async () => {
      const session = makeSession();
      const updated = makeSession({
        exploredNodes: ['seed'],
        nodePositions: [{ nodeId: 'seed', x: 0, y: 0 }],
      });
      canvasSessionModel.findById.mockResolvedValue(session);
      canvasSessionModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.updateSession(sessionId, userId, {
        exploredNodes: ['seed'],
        nodePositions: [{ nodeId: 'seed', x: 0, y: 0 }],
      });

      expect(result).toBe(updated);
      expect(canvasSessionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        sessionId,
        {
          $set: {
            exploredNodes: ['seed'],
            nodePositions: [{ nodeId: 'seed', x: 0, y: 0 }],
          },
        },
        { new: true },
      );
    });

    it('only sets fields that are provided (partial update)', async () => {
      const session = makeSession();
      const updated = makeSession({ exploredNodes: ['seed'] });
      canvasSessionModel.findById.mockResolvedValue(session);
      canvasSessionModel.findByIdAndUpdate.mockResolvedValue(updated);

      await service.updateSession(sessionId, userId, {
        exploredNodes: ['seed'],
      });

      expect(canvasSessionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        sessionId,
        { $set: { exploredNodes: ['seed'] } },
        { new: true },
      );
    });
  });

  // -------------------------------------------------------------------------
  // updateInsightNode
  // -------------------------------------------------------------------------

  describe('updateInsightNode', () => {
    it('updates label, position, and isExplored', async () => {
      const session = makeSession();
      const updatedInsight = {
        _id: new Types.ObjectId(),
        isExplored: true,
        label: 'updated',
        nodeId: 'insight-0',
      };
      canvasSessionModel.findById.mockResolvedValue(session);
      insightNodeModel.findOneAndUpdate.mockResolvedValue(updatedInsight);

      const result = await service.updateInsightNode(
        sessionId,
        'insight-0',
        userId,
        {
          isExplored: true,
          label: 'updated',
          x: 10,
          y: 20,
        },
      );

      expect(result).toBe(updatedInsight);
      expect(insightNodeModel.findOneAndUpdate).toHaveBeenCalledWith(
        { nodeId: 'insight-0', sessionId: new Types.ObjectId(sessionId) },
        {
          $set: {
            isExplored: true,
            label: 'updated',
            'position.x': 10,
            'position.y': 20,
          },
        },
        { new: true },
      );
    });

    it('throws NotFoundException when insight node does not exist', async () => {
      const session = makeSession();
      canvasSessionModel.findById.mockResolvedValue(session);
      insightNodeModel.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        service.updateInsightNode(sessionId, 'insight-99', userId, {
          label: 'x',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
