import { BadRequestException } from '@nestjs/common';

import type { AiModelConfig } from '../../../../schemas/ai-model-config.schema';
import type { AiProviderConfig } from '../../../../schemas/ai-provider-config.schema';

import { AiConfigService } from '../ai-config.service';

describe('AiConfigService', () => {
  let service: AiConfigService;

  let providerDocs: Partial<AiProviderConfig>[];
  let modelDocs: Partial<AiModelConfig>[];

  beforeEach(() => {
    providerDocs = [];
    modelDocs = [];

    const providerModel = {
      find: jest.fn((filter: any = {}) => ({
        select: jest.fn(() => ({
          lean: jest.fn(async () =>
            providerDocs.filter((doc) => {
              if (
                filter.isActive !== undefined &&
                doc.isActive !== filter.isActive
              ) {
                return false;
              }

              if (filter.provider && doc.provider !== filter.provider) {
                return false;
              }

              return true;
            }),
          ),
        })),
      })),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    const aiModelModel = {
      find: jest.fn((filter: any = {}) => ({
        sort: jest.fn(() => ({
          lean: jest.fn(async () =>
            modelDocs
              .filter((doc) => {
                if (
                  filter.isActive !== undefined &&
                  doc.isActive !== filter.isActive
                ) {
                  return false;
                }

                if (filter.id && doc.id !== filter.id) {
                  return false;
                }

                if (
                  filter.provider?.$in &&
                  Array.isArray(filter.provider.$in) &&
                  !filter.provider.$in.includes(doc.provider)
                ) {
                  return false;
                }

                return true;
              })
              .sort((a, b) => (a.id ?? '').localeCompare(b.id ?? '')),
          ),
        })),
      })),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    const aiSecretsService = {
      decryptString: jest.fn(),
      encryptString: jest.fn(),
    };

    service = new AiConfigService(
      providerModel as any,
      aiModelModel as any,
      aiSecretsService as any,
    );
  });

  it('should return only models that are active and mapped to active providers with keys', async () => {
    providerDocs = [
      {
        apiKeyEncrypted: 'enc-openai',
        isActive: true,
        provider: 'openai',
      },
      {
        apiKeyEncrypted: 'enc-anthropic',
        isActive: false,
        provider: 'anthropic',
      },
      {
        isActive: true,
        provider: 'gemini',
      },
    ];

    modelDocs = [
      {
        id: 'openai/gpt-5-mini',
        isActive: true,
        label: 'GPT-5 Mini',
        pricing: { completionUsdPer1M: 0.4, promptUsdPer1M: 0.1 },
        provider: 'openai',
        providerModel: 'gpt-5-mini',
      },
      {
        id: 'anthropic/claude-sonnet',
        isActive: true,
        label: 'Claude Sonnet',
        pricing: { completionUsdPer1M: 1.0, promptUsdPer1M: 0.3 },
        provider: 'anthropic',
        providerModel: 'claude-sonnet-4-20250514',
      },
      {
        id: 'openai/gpt-5-mini-inactive',
        isActive: false,
        label: 'GPT-5 Mini Inactive',
        pricing: { completionUsdPer1M: 0.4, promptUsdPer1M: 0.1 },
        provider: 'openai',
        providerModel: 'gpt-5-mini',
      },
      {
        id: 'gemini/gemini-2.0-flash',
        isActive: true,
        label: 'Gemini 2.0 Flash',
        pricing: { completionUsdPer1M: 0.3, promptUsdPer1M: 0.075 },
        provider: 'gemini',
        providerModel: 'gemini-2.0-flash',
      },
    ];

    const models = await service.getClientModels();

    expect(models).toEqual([
      {
        id: 'openai/gpt-5-mini',
        label: 'GPT-5 Mini',
      },
    ]);
  });

  it('should throw MODEL_NOT_ALLOWED when requested model is not active/allowed', async () => {
    providerDocs = [
      {
        apiKeyEncrypted: 'enc-openai',
        isActive: true,
        provider: 'openai',
      },
    ];

    modelDocs = [
      {
        id: 'openai/gpt-5-mini',
        isActive: true,
        label: 'GPT-5 Mini',
        pricing: { completionUsdPer1M: 0.4, promptUsdPer1M: 0.1 },
        provider: 'openai',
        providerModel: 'gpt-5-mini',
      },
    ];

    await expect(
      service.resolveModelSelection({
        requestedModel: 'gemini/gemini-2.0-flash',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.resolveModelSelection({
        requestedModel: 'gemini/gemini-2.0-flash',
      }),
    ).rejects.toMatchObject({
      response: {
        error: {
          code: 'MODEL_NOT_ALLOWED',
        },
      },
    });
  });

  it('should fall back to a default active model when user preference is invalid', async () => {
    providerDocs = [
      {
        apiKeyEncrypted: 'enc-openai',
        isActive: true,
        provider: 'openai',
      },
    ];

    modelDocs = [
      {
        id: 'openai/gpt-5-mini',
        isActive: true,
        label: 'GPT-5 Mini',
        pricing: { completionUsdPer1M: 0.4, promptUsdPer1M: 0.1 },
        provider: 'openai',
        providerModel: 'gpt-5-mini',
      },
    ];

    const result = await service.resolveModelSelection({
      userActiveModel: 'legacy/inactive-model',
    });

    expect(result).toEqual({
      activeModel: 'openai/gpt-5-mini',
      aiConfigured: true,
      shouldPersist: true,
    });
  });
});
