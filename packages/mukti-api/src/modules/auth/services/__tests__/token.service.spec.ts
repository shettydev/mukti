import type { TestingModule } from '@nestjs/testing';

import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';

import { RefreshToken } from '../../../../schemas/refresh-token.schema';
import { TokenService } from '../token.service';

describe('TokenService', () => {
  let service: TokenService;
  let mockRefreshTokenModel: any;

  const mockUserId = new Types.ObjectId();
  const mockToken = 'test-refresh-token';
  const mockExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  beforeEach(async () => {
    mockRefreshTokenModel = {
      create: jest.fn(),
      deleteMany: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      updateMany: jest.fn(),
      updateOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: getModelToken(RefreshToken.name),
          useValue: mockRefreshTokenModel,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRefreshToken', () => {
    it('should create a refresh token successfully', async () => {
      const mockCreatedToken = {
        _id: new Types.ObjectId(),
        deviceInfo: 'Chrome on macOS',
        expiresAt: mockExpiresAt,
        ipAddress: '192.168.1.1',
        isRevoked: false,
        token: mockToken,
        toObject: jest.fn().mockReturnValue({
          _id: new Types.ObjectId(),
          deviceInfo: 'Chrome on macOS',
          expiresAt: mockExpiresAt,
          ipAddress: '192.168.1.1',
          isRevoked: false,
          token: mockToken,
          userId: mockUserId,
        }),
        userId: mockUserId,
      };

      mockRefreshTokenModel.create.mockResolvedValue(mockCreatedToken);

      const result = await service.createRefreshToken(
        mockUserId,
        mockToken,
        mockExpiresAt,
        'Chrome on macOS',
        '192.168.1.1',
      );

      expect(mockRefreshTokenModel.create).toHaveBeenCalledWith({
        deviceInfo: 'Chrome on macOS',
        expiresAt: mockExpiresAt,
        ipAddress: '192.168.1.1',
        isRevoked: false,
        token: mockToken,
        userId: mockUserId,
      });
      expect(result).toBeDefined();
      expect(result.token).toBe(mockToken);
    });

    it('should handle errors when creating token', async () => {
      mockRefreshTokenModel.create.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.createRefreshToken(
          mockUserId,
          mockToken,
          mockExpiresAt,
          'Chrome on macOS',
          '192.168.1.1',
        ),
      ).rejects.toThrow('Database error');
    });
  });

  describe('findRefreshToken', () => {
    it('should find a refresh token by token string', async () => {
      const mockFoundToken = {
        _id: new Types.ObjectId(),
        expiresAt: mockExpiresAt,
        isRevoked: false,
        token: mockToken,
        userId: mockUserId,
      };

      mockRefreshTokenModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockFoundToken),
      });

      const result = await service.findRefreshToken(mockToken);

      expect(mockRefreshTokenModel.findOne).toHaveBeenCalledWith({
        token: mockToken,
      });
      expect(result).toEqual(mockFoundToken);
    });

    it('should return null when token not found', async () => {
      mockRefreshTokenModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findRefreshToken('non-existent-token');

      expect(result).toBeNull();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke a refresh token successfully', async () => {
      mockRefreshTokenModel.updateOne.mockResolvedValue({
        modifiedCount: 1,
      });

      const result = await service.revokeRefreshToken(mockToken);

      expect(mockRefreshTokenModel.updateOne).toHaveBeenCalledWith(
        { isRevoked: false, token: mockToken },
        { $set: { isRevoked: true } },
      );
      expect(result).toBe(true);
    });

    it('should return false when token not found', async () => {
      mockRefreshTokenModel.updateOne.mockResolvedValue({
        modifiedCount: 0,
      });

      const result = await service.revokeRefreshToken('non-existent-token');

      expect(result).toBe(false);
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user', async () => {
      mockRefreshTokenModel.updateMany.mockResolvedValue({
        modifiedCount: 3,
      });

      const result = await service.revokeAllUserTokens(mockUserId);

      expect(mockRefreshTokenModel.updateMany).toHaveBeenCalledWith(
        {
          isRevoked: false,
          userId: mockUserId,
        },
        { $set: { isRevoked: true } },
      );
      expect(result).toBe(3);
    });

    it('should return 0 when no tokens found', async () => {
      mockRefreshTokenModel.updateMany.mockResolvedValue({
        modifiedCount: 0,
      });

      const result = await service.revokeAllUserTokens(mockUserId);

      expect(result).toBe(0);
    });
  });

  describe('findActiveTokensByUserId', () => {
    it('should find all active tokens for a user', async () => {
      const mockTokens = [
        {
          _id: new Types.ObjectId(),
          expiresAt: mockExpiresAt,
          isRevoked: false,
          token: 'token1',
          userId: mockUserId,
        },
        {
          _id: new Types.ObjectId(),
          expiresAt: mockExpiresAt,
          isRevoked: false,
          token: 'token2',
          userId: mockUserId,
        },
      ];

      mockRefreshTokenModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTokens),
        sort: jest.fn().mockReturnThis(),
      });

      const result = await service.findActiveTokensByUserId(mockUserId);

      expect(mockRefreshTokenModel.find).toHaveBeenCalledWith({
        expiresAt: { $gt: expect.any(Date) },
        isRevoked: false,
        userId: mockUserId,
      });
      expect(result).toEqual(mockTokens);
      expect(result).toHaveLength(2);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      mockRefreshTokenModel.deleteMany.mockResolvedValue({
        deletedCount: 5,
      });

      const result = await service.cleanupExpiredTokens();

      expect(mockRefreshTokenModel.deleteMany).toHaveBeenCalledWith({
        expiresAt: { $lt: expect.any(Date) },
      });
      expect(result).toBe(5);
    });

    it('should return 0 when no expired tokens found', async () => {
      mockRefreshTokenModel.deleteMany.mockResolvedValue({
        deletedCount: 0,
      });

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(0);
    });
  });
});
