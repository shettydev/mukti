import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as fc from 'fast-check';

import { Subscription } from '../../../../schemas/subscription.schema';
import { Technique } from '../../../../schemas/technique.schema';
import { User } from '../../../../schemas/user.schema';
import { SeedService } from '../seed.service';

describe('SeedService', () => {
  let service: SeedService;

  // Mock data storage
  let mockTechniques: any[] = [];
  let mockUsers: any[] = [];
  let mockSubscriptions: any[] = [];

  beforeEach(async () => {
    // Reset mock data
    mockTechniques = [];
    mockUsers = [];
    mockSubscriptions = [];

    // Create mock models
    const mockTechniqueModel = {
      create: jest.fn((data: any) => {
        const technique = {
          _id: `technique_${mockTechniques.length}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockTechniques.push(technique);
        return Promise.resolve(technique);
      }),
      find: jest.fn(() => ({
        exec: jest.fn(() => Promise.resolve(mockTechniques)),
      })),
      findOne: jest.fn((query: any) => ({
        exec: jest.fn(() =>
          Promise.resolve(
            mockTechniques.find((t) => t.name === query.name) ?? null,
          ),
        ),
      })),
    };

    const mockUserModel = {
      create: jest.fn((data: any) => {
        const user: any = {
          _id: `user_${mockUsers.length}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        user.save = jest.fn().mockResolvedValue(user);
        mockUsers.push(user);
        return Promise.resolve(user);
      }),
      findOne: jest.fn((query: any) =>
        Promise.resolve(mockUsers.find((u) => u.email === query.email) ?? null),
      ),
    };

    const mockSubscriptionModel = {
      create: jest.fn((data: any) => {
        const subscription = {
          _id: `subscription_${mockSubscriptions.length}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockSubscriptions.push(subscription);
        return Promise.resolve(subscription);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedService,
        {
          provide: getModelToken(Technique.name),
          useValue: mockTechniqueModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Subscription.name),
          useValue: mockSubscriptionModel,
        },
      ],
    }).compile();

    service = module.get<SeedService>(SeedService);

    // Speed up hashing operations during tests
    jest
      .spyOn(bcrypt, 'hash')
      .mockImplementation(
        (value: Buffer | string) => `hashed-${String(value)}`,
      );
    jest
      .spyOn(bcrypt, 'compare')
      .mockImplementation(
        (value: Buffer | string, hash: string) =>
          hash === `hashed-${String(value)}`,
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('seedTechniques', () => {
    /**
     * Feature: conversation-backend, Property 23: Seeded techniques have correct properties
     * Validates: Requirements 7.2, 7.3, 7.4
     */
    it('should seed all techniques with correct properties (isBuiltIn: true, status: approved, complete template)', async () => {
      await fc.assert(
        fc.asyncProperty(fc.constant(null), async () => {
          // Reset mock data for each iteration
          mockTechniques = [];

          // Seed techniques
          await service.seedTechniques();

          expect(mockUsers.length).toBe(1);
          const systemUserId = mockUsers[0]._id;

          // Verify all 6 techniques were created
          expect(mockTechniques.length).toBe(6);

          // Verify each technique has correct properties
          const expectedTechniqueNames = [
            'elenchus',
            'dialectic',
            'maieutics',
            'definitional',
            'analogical',
            'counterfactual',
          ];

          for (const technique of mockTechniques) {
            // Property 23: Check isBuiltIn is true (Requirement 7.2)
            expect(technique.isBuiltIn).toBe(true);

            // Property 23: Check status is 'approved' (Requirement 7.3)
            expect(technique.status).toBe('approved');

            // Property 23: Check template has all required fields (Requirement 7.4)
            expect(technique.template).toBeDefined();
            expect(technique.template.systemPrompt).toBeDefined();
            expect(typeof technique.template.systemPrompt).toBe('string');
            expect(technique.template.systemPrompt.length).toBeGreaterThan(0);

            expect(technique.template.questioningStyle).toBeDefined();
            expect(typeof technique.template.questioningStyle).toBe('string');
            expect(technique.template.questioningStyle.length).toBeGreaterThan(
              0,
            );

            expect(technique.template.followUpStrategy).toBeDefined();
            expect(typeof technique.template.followUpStrategy).toBe('string');
            expect(technique.template.followUpStrategy.length).toBeGreaterThan(
              0,
            );

            expect(technique.template.exampleQuestions).toBeDefined();
            expect(Array.isArray(technique.template.exampleQuestions)).toBe(
              true,
            );
            expect(technique.template.exampleQuestions.length).toBeGreaterThan(
              0,
            );

            // Verify technique name is one of the expected ones
            expect(expectedTechniqueNames).toContain(technique.name);
            expect(technique.userId).toBe(systemUserId);
          }

          // Verify all expected techniques are present
          const seededNames = mockTechniques.map((t) => t.name);
          for (const expectedName of expectedTechniqueNames) {
            expect(seededNames).toContain(expectedName);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('seedTestUser', () => {
    it('should create test user with hashed password and free tier subscription', async () => {
      await service.seedTestUser();

      // Verify user was created
      expect(mockUsers.length).toBe(1);
      const user = mockUsers[0];

      expect(user.email).toBe('test@mukti.app');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('user');
      expect(user.isActive).toBe(true);
      expect(user.emailVerifiedAt).toBeDefined();

      // Verify password was hashed
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe('testpassword123');
      const isValidPassword = await bcrypt.compare(
        'testpassword123',
        user.passwordHash,
      );
      expect(isValidPassword).toBe(true);

      // Verify subscription was created
      expect(mockSubscriptions.length).toBe(1);
      const subscription = mockSubscriptions[0];

      expect(subscription.userId).toBe(user._id);
      expect(subscription.tier).toBe('free');
      expect(subscription.isActive).toBe(true);
      expect(subscription.limits.questionsPerHour).toBe(10);
      expect(subscription.limits.questionsPerDay).toBe(50);
      expect(subscription.limits.canUseAdvancedModels).toBe(false);
    });
  });

  describe('idempotency', () => {
    /**
     * Feature: conversation-backend, Property 24: Seeding is idempotent
     * Validates: Requirements 7.5, 8.3
     */
    it('should not create duplicate techniques when seeding multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ max: 5, min: 2 }), async (runCount) => {
          // Reset mock data
          mockTechniques = [];

          // Run seeding multiple times
          for (let i = 0; i < runCount; i++) {
            await service.seedTechniques();
          }

          // Property 24: Verify only 6 techniques exist (no duplicates)
          expect(mockTechniques.length).toBe(6);

          // Verify each technique name is unique
          const techniqueNames = mockTechniques.map((t) => t.name);
          const uniqueNames = new Set(techniqueNames);
          expect(uniqueNames.size).toBe(6);
          expect(mockUsers.length).toBe(1);
        }),
        { numRuns: 100 },
      );
    });

    it('should not create duplicate test user when seeding multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ max: 3, min: 2 }), async (runCount) => {
          // Reset mock data
          mockUsers.length = 0;
          mockSubscriptions.length = 0;

          // Run seeding multiple times
          for (let i = 0; i < runCount; i++) {
            await service.seedTestUser();
          }

          // Property 24: Verify only 1 user exists (no duplicates)
          expect(mockUsers.length).toBe(1);

          // Verify only 1 subscription exists
          expect(mockSubscriptions.length).toBe(1);

          // Verify user email is correct
          expect(mockUsers[0].email).toBe('test@mukti.app');
        }),
        { numRuns: 20 },
      );
    }, 10000);
  });

  describe('seedAll', () => {
    it('should seed both techniques and test user', async () => {
      await service.seedAll();

      // Verify techniques were seeded
      expect(mockTechniques.length).toBe(6);

      // Verify system and test users were seeded
      expect(mockUsers.length).toBe(2);
      expect(mockUsers.map((u) => u.email)).toEqual(
        expect.arrayContaining(['system@mukti.app', 'test@mukti.app']),
      );

      const testUser = mockUsers.find((u) => u.email === 'test@mukti.app');
      expect(testUser).toBeDefined();
      expect(mockSubscriptions[0].userId).toBe(testUser?._id);
      expect(mockSubscriptions.length).toBe(1);
    });
  });
});
