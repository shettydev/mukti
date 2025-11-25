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
 * Property-Based Tests for Session Creation
 *
 * Feature: auth-system, Property 8: Successful authentication creates session record
 * Validates: Requirements 2.5
 *
 * This test verifies that for any successful authentication, the system creates
 * a session record containing device information, IP address, and location metadata.
 */
describe('SessionService - Property 8: Session Creation', () => {
  let service: SessionService;
  let sessionModel: Model<SessionDocument>;
  let createdSessions: any[];

  // Arbitraries for generating test data
  const userIdArb = fc.string({ maxLength: 24, minLength: 24 }).map((s) => {
    // Generate valid hex string for MongoDB ObjectId
    return s
      .replace(/[^0-9a-f]/gi, '0')
      .toLowerCase()
      .slice(0, 24)
      .padEnd(24, '0');
  });

  const refreshTokenArb = fc.string({ maxLength: 128, minLength: 32 });

  const deviceInfoArb = fc.option(
    fc.oneof(
      fc.constant('Chrome on macOS'),
      fc.constant('Safari on iOS'),
      fc.constant('Firefox on Windows'),
      fc.constant('Edge on Windows'),
    ),
    { nil: undefined },
  );

  const ipAddressArb = fc.option(fc.oneof(fc.ipV4(), fc.ipV6()), {
    nil: undefined,
  });

  const userAgentArb = fc.option(fc.string({ maxLength: 200, minLength: 10 }), {
    nil: undefined,
  });

  const locationArb = fc.option(
    fc.oneof(
      fc.constant('San Francisco, CA'),
      fc.constant('New York, NY'),
      fc.constant('London, UK'),
      fc.constant('Tokyo, Japan'),
    ),
    { nil: undefined },
  );

  const sessionDataArb = fc.record({
    deviceInfo: deviceInfoArb,
    ipAddress: ipAddressArb,
    location: locationArb,
    refreshToken: refreshTokenArb,
    userAgent: userAgentArb,
    userId: userIdArb,
  });

  beforeEach(async () => {
    createdSessions = [];

    // Mock session model
    const mockSessionModel = {
      create: jest.fn().mockImplementation((data) => {
        const session = {
          _id: new Types.ObjectId(),
          ...data,
          toObject: () => ({ _id: new Types.ObjectId(), ...data }),
        };
        createdSessions.push(session);
        return Promise.resolve(session);
      }),
      find: jest.fn(),
      findOne: jest.fn(),
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
    createdSessions = [];
  });

  /**
   * Property 8: Successful authentication creates session record
   *
   * For any valid session creation data (userId, refreshToken, device info, IP, location),
   * creating a session should store a record with all the provided metadata.
   */
  it('should create session with device and location metadata for any valid input', async () => {
    await fc.assert(
      fc.asyncProperty(sessionDataArb, async (sessionData) => {
        // Create session with generated data
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const session = await service.createSession({
          ...sessionData,
          expiresAt,
        });

        // Verify session was created
        expect(session).toBeDefined();
        expect(sessionModel.create).toHaveBeenCalled();

        // Verify all metadata is stored
        const createCall = (sessionModel.create as jest.Mock).mock.calls[
          (sessionModel.create as jest.Mock).mock.calls.length - 1
        ][0];

        expect(createCall.userId).toBeDefined();
        expect(createCall.refreshToken).toBe(sessionData.refreshToken);
        expect(createCall.expiresAt).toEqual(expiresAt);
        expect(createCall.isActive).toBe(true);
        expect(createCall.lastActivityAt).toBeInstanceOf(Date);

        // Verify optional metadata is preserved
        if (sessionData.deviceInfo) {
          expect(createCall.deviceInfo).toBe(sessionData.deviceInfo);
        }
        if (sessionData.ipAddress) {
          expect(createCall.ipAddress).toBe(sessionData.ipAddress);
        }
        if (sessionData.userAgent) {
          expect(createCall.userAgent).toBe(sessionData.userAgent);
        }
        if (sessionData.location) {
          expect(createCall.location).toBe(sessionData.location);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Session creation sets correct initial state
   *
   * For any session creation, the session should be active and have a lastActivityAt timestamp.
   */
  it('should set isActive to true and lastActivityAt for any new session', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          refreshToken: refreshTokenArb,
          userId: userIdArb,
        }),
        async (sessionData) => {
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await service.createSession({
            ...sessionData,
            expiresAt,
          });

          const createCall = (sessionModel.create as jest.Mock).mock.calls[
            (sessionModel.create as jest.Mock).mock.calls.length - 1
          ][0];

          // Verify initial state
          expect(createCall.isActive).toBe(true);
          expect(createCall.lastActivityAt).toBeInstanceOf(Date);
          expect(createCall.lastActivityAt.getTime()).toBeLessThanOrEqual(
            Date.now(),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Session expiration is set correctly
   *
   * For any session creation with an expiration date, the session should store
   * that exact expiration date.
   */
  it('should store the provided expiration date for any session', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          daysUntilExpiry: fc.integer({ max: 30, min: 1 }),
          refreshToken: refreshTokenArb,
          userId: userIdArb,
        }),
        async (data) => {
          const expiresAt = new Date(
            Date.now() + data.daysUntilExpiry * 24 * 60 * 60 * 1000,
          );

          await service.createSession({
            expiresAt,
            refreshToken: data.refreshToken,
            userId: data.userId,
          });

          const createCall = (sessionModel.create as jest.Mock).mock.calls[
            (sessionModel.create as jest.Mock).mock.calls.length - 1
          ][0];

          expect(createCall.expiresAt).toEqual(expiresAt);
        },
      ),
      { numRuns: 100 },
    );
  });
});
