import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { Types } from 'mongoose';

import { RateLimit } from '../../../../../schemas/rate-limit.schema';
import { RateLimitService } from '../../rate-limit.service';

/**
 * Property-Based Tests for Rate Limit Reset
 *
 * **Feature: auth-system, Property 30: Successful login resets rate limit**
 * **Validates: Requirements 12.3**
 *
 * These tests verify that:
 * - Successful login resets the rate limit counter for that IP
 * - After reset, the IP can make 5 more attempts
 */
describe('RateLimitService - Rate Limit Reset (Property-Based)', () => {
  let service: RateLimitService;
  let mockRateLimits: Map<string, any>;

  beforeEach(async () => {
    mockRateLimits = new Map();

    const mockRateLimitModel = {
      create: jest.fn().mockImplementation((data) => {
        const id = new Types.ObjectId();
        const rateLimit = {
          ...data,
          _id: id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockRateLimits.set(data.action, rateLimit);
        return rateLimit;
      }),
      deleteMany: jest.fn().mockImplementation(({ action }) => {
        mockRateLimits.delete(action);
        return { deletedCount: 1 };
      }),
      findOne: jest.fn().mockImplementation(({ action }) => {
        return mockRateLimits.get(action) ?? null;
      }),
      findOneAndUpdate: jest.fn().mockImplementation(({ action }, update) => {
        const existing = mockRateLimits.get(action);
        if (existing) {
          existing.count += update.$inc?.count ?? 0;
          mockRateLimits.set(action, existing);
          return existing;
        }
        if (update.$setOnInsert) {
          const newRateLimit = {
            ...update.$setOnInsert,
            _id: new Types.ObjectId(),
            count: update.$inc?.count ?? 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockRateLimits.set(action, newRateLimit);
          return newRateLimit;
        }
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: getModelToken(RateLimit.name),
          useValue: mockRateLimitModel,
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
  });

  afterEach(() => {
    mockRateLimits.clear();
    jest.clearAllMocks();
  });

  /**
   * Property 30: Successful login resets rate limit
   *
   * For any IP address with failed login attempts, resetting the rate limit
   * should restore the full 5 attempts.
   */
  it('should reset rate limit counter after successful login', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.integer({ max: 5, min: 1 }), // 1-5 failed attempts
        async (ipAddress, failedAttempts) => {
          // Clear any existing rate limits
          mockRateLimits.clear();

          // Make some failed login attempts
          for (let i = 0; i < failedAttempts; i++) {
            await service.incrementLoginAttempt(ipAddress);
          }

          // Check rate limit before reset
          const before = await service.checkLoginRateLimit(ipAddress);
          expect(before.remaining).toBe(5 - failedAttempts);

          // Reset rate limit (simulating successful login)
          await service.resetLoginRateLimit(ipAddress);

          // Check rate limit after reset
          const after = await service.checkLoginRateLimit(ipAddress);
          expect(after.remaining).toBe(5);
          expect(after.allowed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 30: Reset allows new attempts
   *
   * For any IP address that was blocked, resetting should allow
   * 5 new attempts before blocking again.
   */
  it('should allow 5 new attempts after reset', async () => {
    await fc.assert(
      fc.asyncProperty(fc.ipV4(), async (ipAddress) => {
        // Clear any existing rate limits
        mockRateLimits.clear();

        // Max out rate limit (5 attempts)
        for (let i = 0; i < 5; i++) {
          await service.incrementLoginAttempt(ipAddress);
        }

        // Verify blocked
        const blocked = await service.checkLoginRateLimit(ipAddress);
        expect(blocked.allowed).toBe(false);

        // Reset
        await service.resetLoginRateLimit(ipAddress);

        // Should be able to make 5 more attempts
        for (let i = 0; i < 5; i++) {
          await service.incrementLoginAttempt(ipAddress);
          const check = await service.checkLoginRateLimit(ipAddress);
          if (i < 4) {
            expect(check.allowed).toBe(true);
          } else {
            expect(check.allowed).toBe(false); // 5th attempt hits limit
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 30: Reset is idempotent
   *
   * For any IP address, resetting multiple times should have the same effect
   * as resetting once.
   */
  it('should be idempotent - multiple resets have same effect', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.integer({ max: 3, min: 1 }), // 1-3 resets
        async (ipAddress, resetCount) => {
          // Clear any existing rate limits
          mockRateLimits.clear();

          // Make some failed attempts
          for (let i = 0; i < 3; i++) {
            await service.incrementLoginAttempt(ipAddress);
          }

          // Reset multiple times
          for (let i = 0; i < resetCount; i++) {
            await service.resetLoginRateLimit(ipAddress);
          }

          // Check rate limit - should have full 5 attempts regardless of reset count
          const result = await service.checkLoginRateLimit(ipAddress);
          expect(result.remaining).toBe(5);
          expect(result.allowed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 30: Reset only affects specific IP
   *
   * For any two different IP addresses, resetting one should not affect the other.
   */
  it('should only reset the specific IP address', async () => {
    await fc.assert(
      fc.asyncProperty(fc.ipV4(), fc.ipV4(), async (ip1, ip2) => {
        // Skip if IPs are the same
        fc.pre(ip1 !== ip2);

        // Clear any existing rate limits
        mockRateLimits.clear();

        // Make attempts on both IPs
        for (let i = 0; i < 3; i++) {
          await service.incrementLoginAttempt(ip1);
          await service.incrementLoginAttempt(ip2);
        }

        // Reset only ip1
        await service.resetLoginRateLimit(ip1);

        // Check ip1 is reset
        const check1 = await service.checkLoginRateLimit(ip1);
        expect(check1.remaining).toBe(5);

        // Check ip2 is unchanged
        const check2 = await service.checkLoginRateLimit(ip2);
        expect(check2.remaining).toBe(2); // 5 - 3 = 2
      }),
      { numRuns: 100 },
    );
  });
});
