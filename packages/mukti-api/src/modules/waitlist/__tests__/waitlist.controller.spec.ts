import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { WaitlistController } from '../waitlist.controller';
import { WaitlistService } from '../waitlist.service';

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeMockRequest = (userAgent = 'jest/test') =>
  ({ headers: { 'user-agent': userAgent } }) as any;

// ─── describe WaitlistController ──────────────────────────────────────────────

describe('WaitlistController', () => {
  let controller: WaitlistController;

  const mockWaitlistService = {
    checkEmail: jest.fn() as jest.MockedFunction<WaitlistService['checkEmail']>,
    join: jest.fn() as jest.MockedFunction<WaitlistService['join']>,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WaitlistController],
      providers: [{ provide: WaitlistService, useValue: mockWaitlistService }],
    }).compile();

    controller = module.get<WaitlistController>(WaitlistController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── POST /waitlist/join ───────────────────────────────────────────────────

  describe('join', () => {
    const dto = { email: 'new@example.com' };

    it('should return the new waitlist entry on success', async () => {
      // Arrange
      const serviceResult = { email: 'new@example.com', joinedAt: new Date() };
      mockWaitlistService.join.mockResolvedValue(serviceResult);

      // Act
      const result = await controller.join(
        dto,
        '127.0.0.1',
        makeMockRequest('Chrome/120'),
      );

      // Assert
      expect(result).toEqual(serviceResult);
      expect(mockWaitlistService.join).toHaveBeenCalledWith(
        dto,
        '127.0.0.1',
        'Chrome/120',
      );
    });

    it('should fall back to "Unknown" when User-Agent header is absent', async () => {
      // Arrange
      const serviceResult = { email: 'new@example.com', joinedAt: new Date() };
      mockWaitlistService.join.mockResolvedValue(serviceResult);
      const reqWithoutUA = { headers: {} } as any;

      // Act
      await controller.join(dto, '127.0.0.1', reqWithoutUA);

      // Assert
      expect(mockWaitlistService.join).toHaveBeenCalledWith(
        dto,
        '127.0.0.1',
        'Unknown',
      );
    });

    it('should propagate ConflictException when email already exists', async () => {
      // Arrange
      mockWaitlistService.join.mockRejectedValue(
        new ConflictException('Email already exists in waitlist'),
      );

      // Act & Assert
      await expect(
        controller.join(dto, '127.0.0.1', makeMockRequest()),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── GET /waitlist/check ──────────────────────────────────────────────────

  describe('check', () => {
    it('should return the waitlist entry when email is found', async () => {
      // Arrange
      const serviceResult = {
        email: 'user@example.com',
        exists: true,
        joinedAt: new Date(),
      };
      mockWaitlistService.checkEmail.mockResolvedValue(serviceResult);

      // Act
      const result = await controller.check('user@example.com');

      // Assert
      expect(result).toEqual(serviceResult);
      expect(mockWaitlistService.checkEmail).toHaveBeenCalledWith(
        'user@example.com',
      );
    });

    it('should propagate NotFoundException when email is not on the waitlist', async () => {
      // Arrange
      mockWaitlistService.checkEmail.mockRejectedValue(
        new NotFoundException('Email not found in waitlist'),
      );

      // Act & Assert
      await expect(controller.check('ghost@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
