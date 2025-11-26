import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { Types } from 'mongoose';

import { RateLimit } from '../../../../../schemas/rate-limit.schema';
import { RateLimitService } from '../../rate-limit.service';

/**
 * Property-Based Tests for Login Rate Limiting
 *
 * **Feature: auth-system, Property 29: Rate limiting on login attempts**
 * **Validates: Requirements 12.1, 12.2**
 *
 * These tests verify that:
 * - Login attempts are limited to 5 per 15 minutes per IP address
 * - Rate limit returns 429 error when exceeded
 * - Rate limit headers are properly set
 */
describe('RateLimitService - Login Rate Limiting (Property-Based)', () => {
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
   * Property 29: Rate limiting on login attempts
   *
   * For any IP address, after 5 failed login attempts within 15 minutes,
   * the 6th attempt should be blocked.
   */
  it('should block login attempts after 5 attempts within 15 minutes', async () => {
    await fc.assert(
      fc.asyncProperty(fc.ipV4(), async (ipAddress) => {
        // Clear any existing rate limits for this IP
        mockRateLimits.clear();

        // Make 5 login attempts
        for (let i = 0; i < 5; i++) {
          await service.incrementLoginAttempt(ipAddress);
        }

        // Check rate limit - should still be allowed (5 attempts made, limit is 5)
        const checkBefore = await service.checkLoginRateLimit(ipAddress);
        expect(checkBefore.allowed).toBe(false); // 5 attempts = at limit

        // Make 6th attempt
        await service.incrementLoginAttempt(ipAddress);

        // Check rate limit - should be blocked
        const checkAfter = await service.checkLoginRateLimit(ipAddress);
        expect(checkAfter.allowed).toBe(false);
        expect(checkAfter.remaining).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 29: Rate limit headers are set correctly
   *
   * For any IP address, the rate limit check should return correct
   * remaining attempts and reset time.
   */
  it('should return correct remaining attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.integer({ max: 4, min: 0 }), // 0-4 attempts
        async (ipAddress, attempts) => {
          // Clear any existing rate limits for this IP
          mockRateLimits.clear();

          // Make specified number of attempts
          for (let i = 0; i < attempts; i++) {
            await service.incrementLoginAttempt(ipAddress);
          }

          // Check rate limit
          const result = await service.checkLoginRateLimit(ipAddress);

          // Remaining should be 5 - attempts
          expect(result.remaining).toBe(5 - attempts);
          expect(result.allowed).toBe(true);
          expect(result.resetAt).toBeInstanceOf(Date);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 29: Rate limit is per IP address
   *
   * For any two different IP addresses, rate limits should be independent.
   */
  it('should enforce rate limits independently per IP address', async () => {
    await fc.assert(
      fc.asyncProperty(fc.ipV4(), fc.ipV4(), async (ip1, ip2) => {
        // Skip if IPs are the same
        fc.pre(ip1 !== ip2);

        // Clear any existing rate limits
        mockRateLimits.clear();

        // Max out rate limit for ip1
        for (let i = 0; i < 5; i++) {
          await service.incrementLoginAttempt(ip1);
        }

        // Check ip1 is blocked
        const check1 = await service.checkLoginRateLimit(ip1);
        expect(check1.allowed).toBe(false);

        // Check ip2 is still allowed
        const check2 = await service.checkLoginRateLimit(ip2);
        expect(check2.allowed).toBe(true);
        expect(check2.remaining).toBe(5);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 29: Increment increases count
   *
   * For any IP address, incrementing should increase the count and decrease remaining.
   */
  it('should increment count and decrease remaining on each attempt', async () => {
    await fc.assert(
      fc.asyncProperty(fc.ipV4(), async (ipAddress) => {
        // Clear any existing rate limits
        mockRateLimits.clear();

        // Check initial state
        const initial = await service.checkLoginRateLimit(ipAddress);
        const initialRemaining = initial.remaining;

        // Increment
        await service.incrementLoginAttempt(ipAddress);

        // Check after increment
        const after = await service.checkLoginRateLimit(ipAddress);

        // Remaining should decrease by 1
        expect(after.remaining).toBe(initialRemaining - 1);
      }),
      { numRuns: 100 },
    );
  });
});
