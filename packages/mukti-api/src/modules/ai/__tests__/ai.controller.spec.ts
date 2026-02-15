import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';

jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn(() => ({})),
}));

import { User } from '../../../schemas/user.schema';
import { AiController } from '../ai.controller';
import { AiPolicyService } from '../services/ai-policy.service';
import { AiSecretsService } from '../services/ai-secrets.service';
import { OpenRouterModelsService } from '../services/openrouter-models.service';

type PlainObject = Record<string, any>;

function applyUpdate(target: PlainObject, update: PlainObject) {
  const set = update.$set ?? {};
  const unset = update.$unset ?? {};

  Object.entries(set).forEach(([path, value]) => {
    setNested(target, path, value);
  });

  Object.keys(unset).forEach((path) => {
    unsetNested(target, path);
  });
}

function setNested(target: PlainObject, path: string, value: unknown) {
  const keys = path.split('.');
  let cursor = target;

  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }

  cursor[keys[keys.length - 1]] = value;
}

function unsetNested(target: PlainObject, path: string) {
  const keys = path.split('.');
  let cursor = target;

  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      return;
    }
    cursor = cursor[key];
  }

  delete cursor[keys[keys.length - 1]];
}

describe('AiController', () => {
  let controller: AiController;
  let aiPolicyService: AiPolicyService;
  let openRouterModelsService: jest.Mocked<OpenRouterModelsService>;
  let state: PlainObject;

  const mockUserModel = {
    findById: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockAiSecretsService = {
    decryptString: jest.fn((cipher: string) => cipher.replace(/^enc:/, '')),
    encryptString: jest.fn((plain: string) => `enc:${plain}`),
  };

  const mockOpenRouterModelsService = {
    listModels: jest.fn(),
    validateModelExists: jest.fn().mockResolvedValue(true),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'OPENROUTER_API_KEY') {
        return 'server-openrouter-key';
      }

      return undefined;
    }),
  };

  const makeFindByIdChain = () => ({
    lean: jest.fn(async () => state),
    select: jest.fn().mockImplementation(() => makeFindByIdChain()),
  });

  beforeEach(async () => {
    state = {
      _id: 'user-123',
      geminiApiKeyEncrypted: undefined,
      geminiApiKeyLast4: null,
      geminiApiKeyUpdatedAt: undefined,
      openRouterApiKeyEncrypted: undefined,
      openRouterApiKeyLast4: null,
      openRouterApiKeyUpdatedAt: undefined,
      preferences: {
        activeModel: 'openai/gpt-5-mini',
        activeProvider: 'openrouter',
      },
    };

    mockUserModel.findById.mockImplementation(() => makeFindByIdChain());
    mockUserModel.updateOne.mockImplementation(async (_query, update) => {
      applyUpdate(state, update as PlainObject);
      return { acknowledged: true };
    });
    mockOpenRouterModelsService.listModels.mockResolvedValue([
      { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini' },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        AiPolicyService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: AiSecretsService,
          useValue: mockAiSecretsService,
        },
        {
          provide: OpenRouterModelsService,
          useValue: mockOpenRouterModelsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
    aiPolicyService = module.get<AiPolicyService>(AiPolicyService);
    openRouterModelsService = module.get(OpenRouterModelsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('saving Gemini key clears OpenRouter key and persists Gemini as active provider', async () => {
    state.openRouterApiKeyEncrypted = 'enc:sk-or-v1-previous';
    state.openRouterApiKeyLast4 = '9999';
    state.openRouterApiKeyUpdatedAt = new Date();
    state.preferences.activeModel = 'openai/gpt-5-mini';
    state.preferences.activeProvider = 'openrouter';

    const result = await controller.setGeminiKey('user-123', {
      apiKey: 'AIzaSy_test_gemini_key',
    });

    expect(result.success).toBe(true);
    expect(result.data.activeProvider).toBe('gemini');
    expect(state.openRouterApiKeyEncrypted).toBeUndefined();
    expect(state.openRouterApiKeyLast4).toBeUndefined();
    expect(state.openRouterApiKeyUpdatedAt).toBeUndefined();
    expect(state.preferences.activeProvider).toBe('gemini');
    expect(state.preferences.activeModel).toBe(
      aiPolicyService.getDefaultModel('gemini'),
    );
  });

  it('saving OpenRouter key clears Gemini key and persists OpenRouter as active provider', async () => {
    state.geminiApiKeyEncrypted = 'enc:AIzaSy_previous';
    state.geminiApiKeyLast4 = '8888';
    state.geminiApiKeyUpdatedAt = new Date();
    state.preferences.activeModel = 'gemini-2.0-flash';
    state.preferences.activeProvider = 'gemini';

    const result = await controller.setOpenRouterKey('user-123', {
      apiKey: 'sk-or-v1-test-openrouter-key',
    });

    expect(openRouterModelsService.listModels).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.data.activeProvider).toBe('openrouter');
    expect(state.geminiApiKeyEncrypted).toBeUndefined();
    expect(state.geminiApiKeyLast4).toBeUndefined();
    expect(state.geminiApiKeyUpdatedAt).toBeUndefined();
    expect(state.preferences.activeProvider).toBe('openrouter');
    expect(state.preferences.activeModel).toBe(
      aiPolicyService.getDefaultModel('openrouter'),
    );
  });

  it('GET /ai/settings returns activeProvider from persisted preferences', async () => {
    state.geminiApiKeyEncrypted = 'enc:AIzaSy_test';
    state.geminiApiKeyLast4 = '4321';
    state.geminiApiKeyUpdatedAt = new Date();
    state.preferences.activeProvider = 'gemini';
    state.preferences.activeModel = 'gemini-2.0-flash';

    const result = await controller.getSettings('user-123');

    expect(result.success).toBe(true);
    expect(result.data.activeProvider).toBe('gemini');
    expect(result.data.activeModel).toBe('gemini-2.0-flash');
    expect(result.data.hasGeminiKey).toBe(true);
    expect(result.data.hasOpenRouterKey).toBe(false);
  });

  it('GET /ai/models returns Gemini models when active provider is Gemini', async () => {
    state.geminiApiKeyEncrypted = 'enc:AIzaSy_test';
    state.geminiApiKeyUpdatedAt = new Date();
    state.preferences.activeProvider = 'gemini';
    state.preferences.activeModel = 'openai/gpt-5-mini';

    const result = await controller.getModels('user-123');

    expect(result.success).toBe(true);
    expect(result.data.provider).toBe('gemini');
    expect(result.data.mode).toBe('gemini');
    expect(result.data.models).toEqual(aiPolicyService.getGeminiModels());
    expect(state.preferences.activeModel).toBe(
      aiPolicyService.getDefaultModel('gemini'),
    );
  });
});
