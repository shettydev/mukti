import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { type Model, Types } from 'mongoose';

import {
  Session,
  type SessionDocument,
} from '../../../../../schemas/session.schema';
import { SessionService } from '../../session.service';

/**
 * Property-Based Tests for Session Revocation
 *
 * Feature: auth-system, Property 21: Session revocation invalidates tokens
 * Validates: Requirements 7.2
 *
 * This test verifies that for any active session, revoking that session
 * immediately invalidates its refresh token, preventing further use.
 */
describe('SessionService - Property 21: Session Revocation', () => {
  let service: SessionService;
  let sessionModel: Model<SessionDocument>;

  // Arbitraries for generating test data
  const userIdArb = fc.string({ maxLength: 24, minLength: 24 }).map((s) => {
    return s
      .replace(/[^0-9a-f]/gi, '0')
      .toLowerCase()
      .slice(0, 24)
      .padEnd(24, '0');
  });

  const sessionIdArb = fc.string({ maxLength: 24, minLength: 24 }).map((s) => {
    return s
      .replace(/[^0-9a-f]/gi, '0')
      .toLowerCase()
      .slice(0, 24)
      .padEnd(24, '0');
  });

  const refreshTokenArb = fc.string({ maxLength: 128, minLength: 32 });

  beforeEach(async () => {
    const mockSessionModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      lean: jest.fn(),
      limit: jest.fn(),
      skip: jest.fn(),
      sort: jest.fn(),
      updateMany: jest.fn(),
      updateOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: getModelToken(Session.name),
          useValue: mockSessionModel,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    sessionModel = module.get<Model<SessionDocument>>(
      getModelToken(Session.name),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 21: Session revocation invalidates tokens
   *
   * For any active session, revoking that session should set isActive to false,
   * effectively invalidating the refresh token.
   */
  it('should invalidate session for any valid session ID and user ID', async () => {
    await fc.assert(
      fc.asyncProperty(sessionIdArb, userIdArb, async (sessionId, userId) => {
        // Mock successful update
        (sessionModel.updateOne as jest.Mock).mockResolvedValue({
          matchedCount: 1,
          modifiedCount: 1,
        });

        // Revoke session
        await service.revokeSession(sessionId, userId);

        // Verify updateOne was called with correct parameters
        expect(sessionModel.updateOne).toHaveBeenCalledWith(
          {
            _id: new Types.ObjectId(sessionId),
            userId: new Types.ObjectId(userId),
          },
          {
            $set: {
              isActive: false,
            },
          },
        );

        // Verify session was marked as inactive
        const updateCall = (sessionModel.updateOne as jest.Mock).mock.calls[0];
        expect(updateCall[1].$set.isActive).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Session revocation throws error for non-existent session
   *
   * For any session ID that doesn't exist or doesn't belong to the user,
   * revokeSession should throw a NotFoundException.
   */
  it('should throw NotFoundException for any non-existent session', async () => {
    await fc.assert(
      fc.asyncProperty(sessionIdArb, userIdArb, async (sessionId, userId) => {
        // Mock no match found
        (sessionModel.updateOne as jest.Mock).mockResolvedValue({
          matchedCount: 0,
          modifiedCount: 0,
        });

        // Attempt to revoke non-existent session
        const rejectPromise = service.revokeSession(sessionId, userId);
        await expect(rejectPromise).rejects.toThrow(NotFoundException);

        // Verify error message contains session ID
        const rejectPromise2 = service.revokeSession(sessionId, userId);
        await expect(rejectPromise2).rejects.toThrow(sessionId);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Revoke all sessions except current
   *
   * For any user with multiple sessions, revokeAllSessions should invalidate
   * all sessions except the one with the provided refresh token.
   */
  it('should revoke all sessions except current for any user', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        refreshTokenArb,
        fc.integer({ max: 10, min: 1 }),
        async (userId, currentToken, sessionCount) => {
          // Clear mocks before each iteration
          jest.clearAllMocks();

          // Mock successful update
          (sessionModel.updateMany as jest.Mock).mockResolvedValue({
            matchedCount: sessionCount,
            modifiedCount: sessionCount,
          });

          // Revoke all sessions except current
          const revokedCount = await service.revokeAllSessions(
            userId,
            currentToken,
          );

          // Verify updateMany was called with correct filter
          expect(sessionModel.updateMany).toHaveBeenCalledWith(
            {
              isActive: true,
              refreshToken: { $ne: currentToken },
              userId: new Types.ObjectId(userId),
            },
            {
              $set: {
                isActive: false,
              },
            },
          );

          // Verify correct count returned
          expect(revokedCount).toBe(sessionCount);

          // Verify current session is excluded from revocation
          const updateCall = (sessionModel.updateMany as jest.Mock).mock
            .calls[0];
          expect(updateCall[0].refreshToken).toBeDefined();
          expect(updateCall[0].refreshToken.$ne).toBe(currentToken);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Revoke all sessions without exception
   *
   * For any user, revokeAllSessions without a current token should invalidate
   * all active sessions.
   */
  it('should revoke all sessions when no current token provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.integer({ max: 10, min: 1 }),
        async (userId, sessionCount) => {
          // Mock successful update
          (sessionModel.updateMany as jest.Mock).mockResolvedValue({
            matchedCount: sessionCount,
            modifiedCount: sessionCount,
          });

          // Revoke all sessions without exception
          const revokedCount = await service.revokeAllSessions(userId);

          // Verify updateMany was called without refresh token filter
          expect(sessionModel.updateMany).toHaveBeenCalledWith(
            {
              isActive: true,
              userId: new Types.ObjectId(userId),
            },
            {
              $set: {
                isActive: false,
              },
            },
          );

          // Verify correct count returned
          expect(revokedCount).toBe(sessionCount);

          // Verify no refresh token filter was applied
          const updateCall = (sessionModel.updateMany as jest.Mock).mock
            .calls[0];
          expect(updateCall[0].refreshToken).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Revoke session by token
   *
   * For any refresh token, revokeSessionByToken should invalidate the session
   * associated with that token.
   */
  it('should revoke session by token for any refresh token', async () => {
    await fc.assert(
      fc.asyncProperty(refreshTokenArb, async (refreshToken) => {
        // Mock successful update
        (sessionModel.updateOne as jest.Mock).mockResolvedValue({
          matchedCount: 1,
          modifiedCount: 1,
        });

        // Revoke session by token
        await service.revokeSessionByToken(refreshToken);

        // Verify updateOne was called with correct parameters
        expect(sessionModel.updateOne).toHaveBeenCalledWith(
          { refreshToken },
          {
            $set: {
              isActive: false,
            },
          },
        );
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Find session by token
   *
   * For any refresh token, findSessionByToken should return the active,
   * non-expired session if it exists.
   */
  it('should find active session by token for any refresh token', async () => {
    await fc.assert(
      fc.asyncProperty(
        refreshTokenArb,
        userIdArb,
        async (refreshToken, userId) => {
          const mockSession = {
            _id: new Types.ObjectId(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            isActive: true,
            lastActivityAt: new Date(),
            refreshToken,
            userId: new Types.ObjectId(userId),
          };

          // Mock findOne chain
          (sessionModel.findOne as jest.Mock).mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockSession),
          });

          // Find session by token
          const result = await service.findSessionByToken(refreshToken);

          // Verify findOne was called with correct filter
          expect(sessionModel.findOne).toHaveBeenCalledWith({
            expiresAt: { $gt: expect.any(Date) },
            isActive: true,
            refreshToken,
          });

          // Verify session is returned
          expect(result).toEqual(mockSession);
          expect(result?.refreshToken).toBe(refreshToken);
          expect(result?.isActive).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Update last activity
   *
   * For any refresh token, updateLastActivity should update the lastActivityAt
   * timestamp for the associated session.
   */
  it('should update last activity for any refresh token', async () => {
    await fc.assert(
      fc.asyncProperty(refreshTokenArb, async (refreshToken) => {
        // Mock successful update
        (sessionModel.updateOne as jest.Mock).mockResolvedValue({
          matchedCount: 1,
          modifiedCount: 1,
        });

        const beforeUpdate = Date.now() - 10; // Add small buffer for timing

        // Update last activity
        await service.updateLastActivity(refreshToken);

        const afterUpdate = Date.now() + 10; // Add small buffer for timing

        // Verify updateOne was called
        expect(sessionModel.updateOne).toHaveBeenCalledWith(
          { isActive: true, refreshToken },
          {
            $set: {
              lastActivityAt: expect.any(Date),
            },
          },
        );

        // Verify timestamp is current (within reasonable range)
        const updateCall = (sessionModel.updateOne as jest.Mock).mock.calls[0];
        const timestamp = updateCall[1].$set.lastActivityAt.getTime();
        expect(timestamp).toBeGreaterThanOrEqual(beforeUpdate);
        expect(timestamp).toBeLessThanOrEqual(afterUpdate);
      }),
      { numRuns: 100 },
    );
  });
});
