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
 * Property-Based Tests for Session Listing
 *
 * Feature: auth-system, Property 20: Session listing returns all active sessions
 * Validates: Requirements 7.1
 *
 * This test verifies that for any authenticated user, requesting their sessions
 * returns all active sessions with device, location, and last activity information.
 */
describe('SessionService - Property 20: Session Listing', () => {
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

  const deviceInfoArb = fc.oneof(
    fc.constant('Chrome on macOS'),
    fc.constant('Safari on iOS'),
    fc.constant('Firefox on Windows'),
    fc.constant('Edge on Windows'),
    fc.constant('Mobile Safari on iPhone'),
  );

  const ipAddressArb = fc.oneof(fc.ipV4(), fc.ipV6());

  const locationArb = fc.oneof(
    fc.constant('San Francisco, CA'),
    fc.constant('New York, NY'),
    fc.constant('London, UK'),
    fc.constant('Tokyo, Japan'),
    fc.constant('Sydney, Australia'),
  );

  const sessionArb = fc.record({
    _id: fc.string().map(() => new Types.ObjectId()),
    createdAt: fc.date({ max: new Date() }),
    deviceInfo: deviceInfoArb,
    expiresAt: fc.date({ min: new Date(Date.now() + 1000) }), // Future date
    ipAddress: ipAddressArb,
    isActive: fc.constant(true),
    lastActivityAt: fc.date({ max: new Date() }), // Past or current date
    location: locationArb,
    refreshToken: fc.string({ maxLength: 128, minLength: 32 }),
    updatedAt: fc.date({ max: new Date() }),
    userAgent: fc.string({ maxLength: 200, minLength: 10 }),
    userId: fc.string().map(() => new Types.ObjectId()),
  });

  beforeEach(async () => {
    const mockSessionModel = {
      countDocuments: jest.fn(),
      create: jest.fn(),
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      lean: jest.fn(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
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
   * Property 20: Session listing returns all active sessions
   *
   * For any user with active sessions, getUserSessions should return all active,
   * non-expired sessions with complete metadata.
   */
  it('should return all active sessions for any user', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.array(sessionArb, { maxLength: 10, minLength: 1 }),
        async (userId, sessions) => {
          // Set all sessions to belong to the same user
          const userSessions = sessions.map((s) => ({
            ...s,
            userId: new Types.ObjectId(userId),
          }));

          // Mock the database query chain
          const mockModel = sessionModel as any;
          mockModel.find.mockReturnThis();
          mockModel.sort.mockReturnThis();
          mockModel.lean.mockResolvedValue(userSessions);

          // Get user sessions
          const result = await service.getUserSessions(userId);

          // Verify query was called with correct filters
          expect(sessionModel.find).toHaveBeenCalledWith({
            expiresAt: { $gt: expect.any(Date) },
            isActive: true,
            userId: new Types.ObjectId(userId),
          });

          // Verify sorting by last activity
          expect((sessionModel as any).sort).toHaveBeenCalledWith({
            lastActivityAt: -1,
          });

          // Verify all sessions are returned
          expect(result).toHaveLength(userSessions.length);

          // Verify each session has required metadata
          for (let index = 0; index < result.length; index++) {
            const session = result[index];
            expect(session.userId).toEqual(userSessions[index].userId);
            expect(session.deviceInfo).toBeDefined();
            expect(session.ipAddress).toBeDefined();
            expect(session.location).toBeDefined();
            expect(session.lastActivityAt).toBeDefined();
            expect(session.isActive).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Session listing filters inactive sessions
   *
   * For any user, getUserSessions should only return active sessions,
   * excluding any inactive ones.
   */
  it('should only return active sessions for any user', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.array(sessionArb, { maxLength: 10, minLength: 2 }),
        async (userId, sessions) => {
          // Mix of active and inactive sessions
          const mixedSessions = sessions.map((s, i) => ({
            ...s,
            isActive: i % 2 === 0, // Alternate between active and inactive
            userId: new Types.ObjectId(userId),
          }));

          const activeSessions = mixedSessions.filter((s) => s.isActive);

          // Mock the database query chain
          const mockModel = sessionModel as any;
          mockModel.find.mockReturnThis();
          mockModel.sort.mockReturnThis();
          mockModel.lean.mockResolvedValue(activeSessions);

          // Get user sessions
          const result = await service.getUserSessions(userId);

          // Verify query filters for active sessions
          expect(sessionModel.find).toHaveBeenCalledWith({
            expiresAt: { $gt: expect.any(Date) },
            isActive: true,
            userId: new Types.ObjectId(userId),
          });

          // Verify only active sessions are returned
          expect(result).toHaveLength(activeSessions.length);
          for (const session of result) {
            expect(session.isActive).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Session listing filters expired sessions
   *
   * For any user, getUserSessions should only return non-expired sessions.
   */
  it('should only return non-expired sessions for any user', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.array(sessionArb, { maxLength: 10, minLength: 2 }),
        async (userId, sessions) => {
          const now = new Date();

          // Mix of expired and non-expired sessions
          const mixedSessions = sessions.map((s, i) => ({
            ...s,
            expiresAt:
              i % 2 === 0
                ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Future
                : new Date(now.getTime() - 1000), // Past (expired)
            userId: new Types.ObjectId(userId),
          }));

          const nonExpiredSessions = mixedSessions.filter(
            (s) => s.expiresAt > now,
          );

          // Mock the database query chain
          const mockModel = sessionModel as any;
          mockModel.find.mockReturnThis();
          mockModel.sort.mockReturnThis();
          mockModel.lean.mockResolvedValue(nonExpiredSessions);

          // Get user sessions
          const result = await service.getUserSessions(userId);

          // Verify query filters for non-expired sessions
          expect(sessionModel.find).toHaveBeenCalledWith({
            expiresAt: { $gt: expect.any(Date) },
            isActive: true,
            userId: new Types.ObjectId(userId),
          });

          // Verify only non-expired sessions are returned
          expect(result).toHaveLength(nonExpiredSessions.length);
          for (const session of result) {
            expect(session.expiresAt.getTime()).toBeGreaterThan(
              now.getTime() - 1000,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Session listing is sorted by last activity
   *
   * For any user with multiple sessions, getUserSessions should return
   * sessions sorted by lastActivityAt in descending order (most recent first).
   */
  it('should sort sessions by last activity for any user', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        fc.array(sessionArb, { maxLength: 10, minLength: 2 }),
        async (userId, sessions) => {
          const userSessions = sessions.map((s) => ({
            ...s,
            userId: new Types.ObjectId(userId),
          }));

          // Sort sessions by lastActivityAt descending
          const sortedSessions = [...userSessions].sort(
            (a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
          );

          // Mock the database query chain
          const mockModel = sessionModel as any;
          mockModel.find.mockReturnThis();
          mockModel.sort.mockReturnThis();
          mockModel.lean.mockResolvedValue(sortedSessions);

          // Get user sessions
          await service.getUserSessions(userId);

          // Verify sorting was applied
          expect((sessionModel as any).sort).toHaveBeenCalledWith({
            lastActivityAt: -1,
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});
