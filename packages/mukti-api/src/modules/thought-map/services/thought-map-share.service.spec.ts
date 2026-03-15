import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { ThoughtMapShareLink } from '../../../schemas/thought-map-share-link.schema';
import { ThoughtMapShareService } from './thought-map-share.service';

describe('ThoughtMapShareService', () => {
  let service: ThoughtMapShareService;

  const mockShareLinkModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    updateMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThoughtMapShareService,
        {
          provide: getModelToken(ThoughtMapShareLink.name),
          useValue: mockShareLinkModel,
        },
      ],
    }).compile();

    service = module.get<ThoughtMapShareService>(ThoughtMapShareService);
    jest.clearAllMocks();
  });

  it('returns the winning active link when a concurrent create hits the unique index', async () => {
    const mapId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    const activeLink = {
      _id: new Types.ObjectId(),
      isActive: true,
      thoughtMapId: mapId,
      token: 'active-token',
    };

    mockShareLinkModel.updateMany.mockResolvedValue({ modifiedCount: 1 });
    mockShareLinkModel.create.mockRejectedValue({ code: 11000 });
    mockShareLinkModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(activeLink),
    });

    await expect(
      service.createShareLink(mapId.toString(), userId, {}),
    ).resolves.toEqual(activeLink);

    expect(mockShareLinkModel.updateMany).toHaveBeenCalledWith(
      { isActive: true, thoughtMapId: mapId },
      { $set: { isActive: false } },
    );
    expect(mockShareLinkModel.findOne).toHaveBeenCalledWith({
      isActive: true,
      thoughtMapId: mapId,
    });
  });
});
