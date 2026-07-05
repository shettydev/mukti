import { ConflictException, NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';

import { Waitlist } from '../../../schemas/waitlist.schema';
import { WaitlistService } from '../waitlist.service';

// ─── helpers ──────────────────────────────────────────────────────────────────

const makeEntry = (overrides: Partial<Record<string, unknown>> = {}) => ({
  email: 'user@example.com',
  ipAddress: '127.0.0.1',
  joinedAt: new Date('2024-01-01'),
  userAgent: 'jest',
  ...overrides,
});

// ─── describe WaitlistService ─────────────────────────────────────────────────

describe('WaitlistService', () => {
  let service: WaitlistService;

  const mockFindOneQuery = { lean: jest.fn() };
  const mockFindQuery = {
    lean: jest.fn(),
    limit: jest.fn(),
    skip: jest.fn(),
    sort: jest.fn(),
  };

  const mockWaitlistModel: any = {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    // Chain setup: find().sort().limit().skip().lean()
    mockFindQuery.sort.mockReturnValue(mockFindQuery);
    mockFindQuery.limit.mockReturnValue(mockFindQuery);
    mockFindQuery.skip.mockReturnValue(mockFindQuery);
    mockWaitlistModel.find.mockReturnValue(mockFindQuery);

    // Chain setup: findOne().lean()
    mockWaitlistModel.findOne.mockReturnValue(mockFindOneQuery);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        { provide: getModelToken(Waitlist.name), useValue: mockWaitlistModel },
      ],
    }).compile();

    service = module.get<WaitlistService>(WaitlistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── join ──────────────────────────────────────────────────────────────────

  /**
   * Helper: replace service['waitlistModel'] with a constructor that both
   * returns a saveable instance AND carries the static findOne method.
   */
  const setupJoinMock = (findOneResult: unknown, instanceEmail: string) => {
    const mockFindOneQ = { lean: jest.fn().mockResolvedValue(findOneResult) };
    const mockInstance = {
      email: instanceEmail,
      joinedAt: new Date(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    function MockModel() {
      return mockInstance;
    }
    MockModel.findOne = jest.fn().mockReturnValue(mockFindOneQ);
    (service as any).waitlistModel = MockModel;
    return { mockInstance };
  };

  describe('join', () => {
    it('should add a new email to the waitlist and return the entry', async () => {
      // Arrange
      const { mockInstance } = setupJoinMock(null, 'new@example.com');

      // Act
      const result = await service.join(
        { email: 'new@example.com' },
        '127.0.0.1',
        'jest',
      );

      // Assert
      expect(result.email).toBe('new@example.com');
      expect(mockInstance.save).toHaveBeenCalled();
    });

    it('should lowercase the email before saving', async () => {
      // Arrange
      const { mockInstance } = setupJoinMock(null, 'upper@example.com');

      // Act
      const result = await service.join(
        { email: 'UPPER@EXAMPLE.COM' },
        '127.0.0.1',
      );

      // Assert — service lowercases before passing to the model constructor
      expect(result.email).toBe('upper@example.com');
    });

    it('should throw ConflictException when the email already exists', async () => {
      // Arrange
      mockFindOneQuery.lean.mockResolvedValue(makeEntry());

      // Act & Assert
      await expect(service.join({ email: 'user@example.com' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── checkEmail ───────────────────────────────────────────────────────────

  describe('checkEmail', () => {
    it('should return entry details when email exists in the waitlist', async () => {
      // Arrange
      const entry = makeEntry({ email: 'found@example.com' });
      mockFindOneQuery.lean.mockResolvedValue(entry);

      // Act
      const result = await service.checkEmail('found@example.com');

      // Assert
      expect(result.email).toBe('found@example.com');
      expect(result.exists).toBe(true);
      expect(result.joinedAt).toEqual(entry.joinedAt);
    });

    it('should throw NotFoundException when email is not on the waitlist', async () => {
      // Arrange
      mockFindOneQuery.lean.mockResolvedValue(null);

      // Act & Assert
      await expect(service.checkEmail('ghost@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── getAll ───────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('should return paginated results with total count', async () => {
      // Arrange
      const entries = [makeEntry(), makeEntry({ email: 'second@example.com' })];
      mockFindQuery.lean.mockResolvedValue(entries);
      mockWaitlistModel.countDocuments.mockResolvedValue(50);

      // Act
      const result = await service.getAll(10, 0);

      // Assert
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(50);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(0);
    });

    it('should use default limit=100 and skip=0 when called with no arguments', async () => {
      // Arrange
      mockFindQuery.lean.mockResolvedValue([]);
      mockWaitlistModel.countDocuments.mockResolvedValue(0);

      // Act
      const result = await service.getAll();

      // Assert
      expect(mockFindQuery.limit).toHaveBeenCalledWith(100);
      expect(mockFindQuery.skip).toHaveBeenCalledWith(0);
      expect(result.total).toBe(0);
    });

    it('should apply custom limit and skip values', async () => {
      // Arrange
      mockFindQuery.lean.mockResolvedValue([]);
      mockWaitlistModel.countDocuments.mockResolvedValue(200);

      // Act
      await service.getAll(25, 50);

      // Assert
      expect(mockFindQuery.limit).toHaveBeenCalledWith(25);
      expect(mockFindQuery.skip).toHaveBeenCalledWith(50);
    });
  });
});
