import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { ThoughtMapShareLink } from '../../../../schemas/thought-map-share-link.schema';
import { ThoughtMapShareService } from '../thought-map-share.service';

describe('ThoughtMapShareService', () => {
  let service: ThoughtMapShareService;

  const mockShareLinkModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    updateMany: jest.fn(),
    updateOne: jest.fn(),
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

  const execQuery = <T>(value: T) => ({
    exec: jest.fn().mockResolvedValue(value),
  });

  describe('createShareLink', () => {
    it('creates a basic active share link', async () => {
      const mapId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const created = {
        _id: new Types.ObjectId(),
        isActive: true,
        thoughtMapId: mapId,
        token: 'created-token',
      };

      jest.spyOn(Math, 'random').mockReturnValue(0.1);
      mockShareLinkModel.updateMany.mockResolvedValue({ modifiedCount: 0 });
      mockShareLinkModel.create.mockResolvedValue(created);

      const result = await service.createShareLink(
        mapId.toString(),
        userId,
        {},
      );

      expect(mockShareLinkModel.updateMany).toHaveBeenCalledWith(
        { isActive: true, thoughtMapId: mapId },
        { $set: { isActive: false } },
      );
      expect(mockShareLinkModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: userId,
          isActive: true,
          thoughtMapId: mapId,
        }),
      );
      expect(result).toBe(created);
      jest.restoreAllMocks();
    });

    it('persists an expiry timestamp when provided', async () => {
      const mapId = new Types.ObjectId();
      const userId = new Types.ObjectId();

      mockShareLinkModel.updateMany.mockResolvedValue({ modifiedCount: 0 });
      mockShareLinkModel.create.mockResolvedValue({ token: 'token' });

      await service.createShareLink(mapId.toString(), userId, {
        expiresAt: '2027-01-01T00:00:00.000Z',
      });

      expect(mockShareLinkModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: new Date('2027-01-01T00:00:00.000Z'),
        }),
      );
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
      mockShareLinkModel.findOne.mockReturnValue(execQuery(activeLink));

      await expect(
        service.createShareLink(mapId.toString(), userId, {}),
      ).resolves.toEqual(activeLink);
    });

    it('rethrows duplicate-key errors when no active link can be recovered', async () => {
      const mapId = new Types.ObjectId();
      const userId = new Types.ObjectId();
      const duplicateError = { code: 11000 };

      mockShareLinkModel.updateMany.mockResolvedValue({ modifiedCount: 0 });
      mockShareLinkModel.create.mockRejectedValue(duplicateError);
      mockShareLinkModel.findOne.mockReturnValue(execQuery(null));

      await expect(
        service.createShareLink(mapId.toString(), userId, {}),
      ).rejects.toBe(duplicateError);
    });
  });

  describe('getActiveShareLink', () => {
    it('returns the active link when present', async () => {
      const mapId = new Types.ObjectId();
      const link = { token: 'active' };

      mockShareLinkModel.findOne.mockReturnValue(execQuery(link));

      await expect(service.getActiveShareLink(mapId.toString())).resolves.toBe(
        link,
      );
    });

    it('returns null when there is no active link', async () => {
      mockShareLinkModel.findOne.mockReturnValue(execQuery(null));

      await expect(
        service.getActiveShareLink(new Types.ObjectId().toString()),
      ).resolves.toBeNull();
    });
  });

  describe('getShareLinkByToken', () => {
    it('throws when the token cannot be resolved', async () => {
      mockShareLinkModel.findOne.mockReturnValue(execQuery(null));

      await expect(service.getShareLinkByToken('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws when the share link has expired', async () => {
      mockShareLinkModel.findOne.mockReturnValue(
        execQuery({
          expiresAt: new Date('2000-01-01T00:00:00.000Z'),
          token: 'expired',
        }),
      );

      await expect(service.getShareLinkByToken('expired')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the link and schedules a view-count increment', async () => {
      const link = {
        _id: new Types.ObjectId(),
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        token: 'token',
      };
      const updateExec = jest.fn().mockResolvedValue({ modifiedCount: 1 });

      mockShareLinkModel.findOne.mockReturnValue(execQuery(link));
      mockShareLinkModel.updateOne.mockReturnValue({ exec: updateExec });

      const result = await service.getShareLinkByToken('token');
      await Promise.resolve();

      expect(result).toBe(link);
      expect(mockShareLinkModel.updateOne).toHaveBeenCalledWith(
        { _id: link._id },
        { $inc: { viewCount: 1 }, $set: { lastViewedAt: expect.any(Date) } },
      );
      expect(updateExec).toHaveBeenCalled();
    });

    it('swallows asynchronous view-count update failures', async () => {
      const warnSpy = jest.spyOn((service as any).logger, 'warn');
      const link = {
        _id: new Types.ObjectId(),
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        token: 'token',
      };

      mockShareLinkModel.findOne.mockReturnValue(execQuery(link));
      mockShareLinkModel.updateOne.mockReturnValue({
        exec: jest.fn().mockRejectedValue(new Error('write failed')),
      });

      await expect(service.getShareLinkByToken('token')).resolves.toBe(link);
      await Promise.resolve();

      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('revokeShareLink', () => {
    it('deactivates the active share link', async () => {
      mockShareLinkModel.updateOne.mockResolvedValue({ matchedCount: 1 });

      await expect(
        service.revokeShareLink(new Types.ObjectId().toString()),
      ).resolves.toBeUndefined();
    });

    it('throws when there is no active share link to revoke', async () => {
      mockShareLinkModel.updateOne.mockResolvedValue({ matchedCount: 0 });

      await expect(
        service.revokeShareLink(new Types.ObjectId().toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
