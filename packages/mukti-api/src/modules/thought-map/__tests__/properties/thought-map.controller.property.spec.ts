import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import * as fc from 'fast-check';
import { Types } from 'mongoose';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { User } from '../../../../schemas/user.schema';
import { AiPolicyService } from '../../../ai/services/ai-policy.service';
import { AiSecretsService } from '../../../ai/services/ai-secrets.service';
import { BranchSuggestionService } from '../../services/branch-suggestion.service';
import { MapExtractionService } from '../../services/map-extraction.service';
import { ThoughtMapShareService } from '../../services/thought-map-share.service';
import { ThoughtMapService } from '../../services/thought-map.service';
import { ThoughtMapController } from '../../thought-map.controller';

describe('ThoughtMapController - Query Parsing (Property-Based)', () => {
  let controller: ThoughtMapController;

  const mockThoughtMapService = {
    addNode: jest.fn(),
    confirmMap: jest.fn(),
    convertFromCanvas: jest.fn(),
    createMap: jest.fn(),
    deleteMap: jest.fn(),
    deleteNode: jest.fn(),
    findMapById: jest.fn(),
    getMap: jest.fn(),
    getPublicMap: jest.fn(),
    listMaps: jest.fn(),
    updateNode: jest.fn(),
    updateSettings: jest.fn(),
  };

  const mockUserModel = {
    findById: jest.fn().mockReturnThis(),
    lean: jest.fn(),
    select: jest.fn().mockReturnThis(),
    updateOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ThoughtMapController],
      providers: [
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: AiPolicyService,
          useValue: { resolveEffectiveModel: jest.fn() },
        },
        {
          provide: AiSecretsService,
          useValue: { decryptString: jest.fn() },
        },
        {
          provide: ThoughtMapService,
          useValue: mockThoughtMapService,
        },
        {
          provide: BranchSuggestionService,
          useValue: {},
        },
        {
          provide: MapExtractionService,
          useValue: {},
        },
        {
          provide: ThoughtMapShareService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<ThoughtMapController>(ThoughtMapController);
    jest.clearAllMocks();
  });

  it('treats only "true" and "1" as cascade=true for any query value', async () => {
    const user = { _id: new Types.ObjectId() };

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(fc.string(), fc.constant(undefined), fc.constant(null)),
        async (cascade) => {
          await controller.deleteNode(
            '507f1f77bcf86cd799439011',
            'thought-0',
            cascade as any,
            user as any,
          );

          const expected = cascade === 'true' || cascade === '1';
          expect(mockThoughtMapService.deleteNode).toHaveBeenLastCalledWith(
            '507f1f77bcf86cd799439011',
            'thought-0',
            user._id,
            expected,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
