import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';

import { RateLimit } from '../../../../schemas/rate-limit.schema';
import { RateLimitService } from '../rate-limit.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRateLimit(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    action: 'login:127.0.0.1',
    count: 0,
    limit: 5,
    windowEnd: new Date(Date.now() + 15 * 60 * 1000),
    windowStart: new Date(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('RateLimitService', () => {
  let service: RateLimitService;
  let rateLimitModel: {
    create: jest.Mock;
    deleteMany: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };

  beforeEach(async () => {
    rateLimitModel = {
      create: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({}),
      findOne: jest.fn().mockResolvedValue(null),
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: getModelToken(RateLimit.name),
          useValue: rateLimitModel,
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // checkLoginRateLimit
  // -------------------------------------------------------------------------

  describe('checkLoginRateLimit', () => {
    it('returns allowed=true and full remaining when no prior attempts exist', async () => {
      const freshRecord = makeRateLimit({ count: 0 });
      // findOne returns null → service creates a new record
      rateLimitModel.findOne.mockResolvedValue(null);
      rateLimitModel.create.mockResolvedValue(freshRecord);

      const result = await service.checkLoginRateLimit('127.0.0.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it('returns allowed=true when under the 5-attempt limit', async () => {
      rateLimitModel.findOne.mockResolvedValue(makeRateLimit({ count: 3 }));

      const result = await service.checkLoginRateLimit('127.0.0.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('returns allowed=false when count equals the limit (5)', async () => {
      rateLimitModel.findOne.mockResolvedValue(makeRateLimit({ count: 5 }));

      const result = await service.checkLoginRateLimit('127.0.0.1');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('returns allowed=false when count exceeds the limit', async () => {
      rateLimitModel.findOne.mockResolvedValue(makeRateLimit({ count: 10 }));

      const result = await service.checkLoginRateLimit('127.0.0.1');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0); // never goes negative
    });

    it('fails open (allowed=true) when the database throws', async () => {
      rateLimitModel.findOne.mockRejectedValue(new Error('DB connection lost'));

      const result = await service.checkLoginRateLimit('192.168.1.1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('scopes the rate limit to the IP address (different IPs are independent)', async () => {
      rateLimitModel.findOne
        .mockResolvedValueOnce(makeRateLimit({ count: 5 })) // IP A is blocked
        .mockResolvedValueOnce(makeRateLimit({ count: 0 })); // IP B is fresh

      const [blocked, allowed] = await Promise.all([
        service.checkLoginRateLimit('10.0.0.1'),
        service.checkLoginRateLimit('10.0.0.2'),
      ]);

      expect(blocked.allowed).toBe(false);
      expect(allowed.allowed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // checkPasswordResetRateLimit
  // -------------------------------------------------------------------------

  describe('checkPasswordResetRateLimit', () => {
    it('returns allowed=true when no prior reset attempts exist', async () => {
      rateLimitModel.findOne.mockResolvedValue(null);
      rateLimitModel.create.mockResolvedValue(
        makeRateLimit({ count: 0, limit: 3 }),
      );

      const result =
        await service.checkPasswordResetRateLimit('user@example.com');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    });

    it('returns allowed=false after 3 attempts', async () => {
      rateLimitModel.findOne.mockResolvedValue(
        makeRateLimit({ count: 3, limit: 3 }),
      );

      const result =
        await service.checkPasswordResetRateLimit('user@example.com');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('normalises email to lowercase when checking the limit', async () => {
      rateLimitModel.findOne.mockResolvedValue(null);
      rateLimitModel.create.mockResolvedValue(makeRateLimit({ count: 0 }));

      await service.checkPasswordResetRateLimit('User@Example.COM');

      expect(rateLimitModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'password-reset:user@example.com' }),
      );
    });

    it('fails open (allowed=true) when the database throws', async () => {
      rateLimitModel.findOne.mockRejectedValue(new Error('timeout'));

      const result =
        await service.checkPasswordResetRateLimit('user@example.com');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // incrementLoginAttempt
  // -------------------------------------------------------------------------

  describe('incrementLoginAttempt', () => {
    it('upserts and increments the count for the given IP', async () => {
      rateLimitModel.findOneAndUpdate.mockResolvedValue({});

      await service.incrementLoginAttempt('127.0.0.1');

      expect(rateLimitModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'login:127.0.0.1' }),
        expect.objectContaining({ $inc: { count: 1 } }),
        { new: true, upsert: true },
      );
    });

    it('does not throw when the database fails (silently logs)', async () => {
      rateLimitModel.findOneAndUpdate.mockRejectedValue(
        new Error('network error'),
      );

      await expect(
        service.incrementLoginAttempt('127.0.0.1'),
      ).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // incrementPasswordResetAttempt
  // -------------------------------------------------------------------------

  describe('incrementPasswordResetAttempt', () => {
    it('upserts and increments the count for the given email', async () => {
      rateLimitModel.findOneAndUpdate.mockResolvedValue({});

      await service.incrementPasswordResetAttempt('user@example.com');

      expect(rateLimitModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'password-reset:user@example.com' }),
        expect.objectContaining({ $inc: { count: 1 } }),
        { new: true, upsert: true },
      );
    });

    it('does not throw when the database fails', async () => {
      rateLimitModel.findOneAndUpdate.mockRejectedValue(new Error('timeout'));

      await expect(
        service.incrementPasswordResetAttempt('user@example.com'),
      ).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // resetLoginRateLimit
  // -------------------------------------------------------------------------

  describe('resetLoginRateLimit', () => {
    it('deletes all rate limit records for the given IP', async () => {
      await service.resetLoginRateLimit('127.0.0.1');

      expect(rateLimitModel.deleteMany).toHaveBeenCalledWith({
        action: 'login:127.0.0.1',
      });
    });

    it('does not throw when delete fails (silently logs)', async () => {
      rateLimitModel.deleteMany.mockRejectedValue(new Error('db error'));

      await expect(
        service.resetLoginRateLimit('127.0.0.1'),
      ).resolves.toBeUndefined();
    });
  });
});
