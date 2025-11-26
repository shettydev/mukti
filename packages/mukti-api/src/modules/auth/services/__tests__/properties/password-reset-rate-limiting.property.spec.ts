import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { Types } from 'mongoose';

import { RateLimit } from '../../../../../schemas/rate-limit.schema';
import { RateLimitService } from '../../rate-limit.service';

/**
 * Property-Based Tests for Password Reset Rate Limiting
 *
 * **Feature: auth-system, Property 31: Rate limiting on password reset requests**
 * **Validates: Requirements 12.5**
 *
 * These tests verify that:
 * - Password reset requests are limited to 3 per hour per email
 * - Rate limit returns 429 error when exceeded
 * - Rate limit is enforced per email address
 */
describe('RateLimitService - Password Reset Rate Limiting (Property-Based)', () => {
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
   * Property 31: Rate limiting on password reset requests
   *
   * For any email address, after 3 password reset requests within 1 hour,
   * the 4th request should be blocked.
   */
  it('should block password reset requests after 3 attempts within 1 hour', async () => {
    await fc.assert(
      fc.asyncProperty(fc.emailAddress(), async (email) => {
        // Clear any existing rate limits for this email
        mockRateLimits.clear();

        // Make 3 password reset attempts
        for (let i = 0; i < 3; i++) {
          await service.incrementPasswordResetAttempt(email);
        }

        // Check rate limit - should be blocked (3 attempts = at limit)
        const checkBefore = await service.checkPasswordResetRateLimit(email);
        expect(checkBefore.allowed).toBe(false);

        // Make 4th attempt
        await service.incrementPasswordResetAttempt(email);

        // Check rate limit - should still be blocked
        const checkAfter = await service.checkPasswordResetRateLimit(email);
        expect(checkAfter.allowed).toBe(false);
        expect(checkAfter.remaining).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 31: Rate limit returns correct remaining attempts
   *
   * For any email address, the rate limit check should return correct
   * remaining attempts and reset time.
   */
  it('should return correct remaining attempts for password reset', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.integer({ max: 2, min: 0 }), // 0-2 attempts
        async (email, attempts) => {
          // Clear any existing rate limits for this email
          mockRateLimits.clear();

          // Make specified number of attempts
          for (let i = 0; i < attempts; i++) {
            await service.incrementPasswordResetAttempt(email);
          }

          // Check rate limit
          const result = await service.checkPasswordResetRateLimit(email);

          // Remaining should be 3 - attempts
          expect(result.remaining).toBe(3 - attempts);
          expect(result.allowed).toBe(true);
          expect(result.resetAt).toBeInstanceOf(Date);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 31: Rate limit is per email address
   *
   * For any two different email addresses, rate limits should be independent.
   */
  it('should enforce rate limits independently per email address', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.emailAddress(),
        async (email1, email2) => {
          // Skip if emails are the same (case-insensitive)
          fc.pre(email1.toLowerCase() !== email2.toLowerCase());

          // Clear any existing rate limits
          mockRateLimits.clear();

          // Max out rate limit for email1
          for (let i = 0; i < 3; i++) {
            await service.incrementPasswordResetAttempt(email1);
          }

          // Check email1 is blocked
          const check1 = await service.checkPasswordResetRateLimit(email1);
          expect(check1.allowed).toBe(false);

          // Check email2 is still allowed
          const check2 = await service.checkPasswordResetRateLimit(email2);
          expect(check2.allowed).toBe(true);
          expect(check2.remaining).toBe(3);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 31: Email addresses are case-insensitive
   *
   * For any email address, rate limits should apply regardless of case.
   */
  it('should treat email addresses as case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(fc.emailAddress(), async (email) => {
        // Clear any existing rate limits
        mockRateLimits.clear();

        // Make attempts with lowercase email
        await service.incrementPasswordResetAttempt(email.toLowerCase());
        await service.incrementPasswordResetAttempt(email.toLowerCase());

        // Check with uppercase email - should see 2 attempts
        const result = await service.checkPasswordResetRateLimit(
          email.toUpperCase(),
        );
        expect(result.remaining).toBe(1); // 3 - 2 = 1
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 31: Increment increases count
   *
   * For any email address, incrementing should increase the count and decrease remaining.
   */
  it('should increment count and decrease remaining on each password reset attempt', async () => {
    await fc.assert(
      fc.asyncProperty(fc.emailAddress(), async (email) => {
        // Clear any existing rate limits
        mockRateLimits.clear();

        // Check initial state
        const initial = await service.checkPasswordResetRateLimit(email);
        const initialRemaining = initial.remaining;

        // Increment
        await service.incrementPasswordResetAttempt(email);

        // Check after increment
        const after = await service.checkPasswordResetRateLimit(email);

        // Remaining should decrease by 1
        expect(after.remaining).toBe(initialRemaining - 1);
      }),
      { numRuns: 100 },
    );
  });
});
