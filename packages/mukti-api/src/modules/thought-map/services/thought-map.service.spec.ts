import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { ThoughtMap } from '../../../schemas/thought-map.schema';
import { ThoughtNode } from '../../../schemas/thought-node.schema';
import { ThoughtMapService } from './thought-map.service';

describe('ThoughtMapService', () => {
  let service: ThoughtMapService;

  const mockThoughtMapModel = {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  };

  const mockThoughtNodeModel = {
    countDocuments: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
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
      ],
    }).compile();

    service = module.get<ThoughtMapService>(ThoughtMapService);
    jest.clearAllMocks();
  });

  function createOwnedMap(userId: Types.ObjectId) {
    return {
      _id: new Types.ObjectId(),
      rootNodeId: 'topic-0',
      userId,
    };
  }

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

    mockThoughtMapModel.findById.mockResolvedValue(createOwnedMap(otherUserId));

    await expect(
      service.findMapById(new Types.ObjectId().toString(), userId),
    ).rejects.toThrow(ForbiddenException);
  });
});
