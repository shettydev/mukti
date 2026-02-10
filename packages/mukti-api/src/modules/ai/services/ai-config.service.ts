import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  AI_PROVIDER_VALUES,
  type AiProvider,
  AiProviderConfig,
  type AiProviderConfigDocument,
} from '../../../schemas/ai-provider-config.schema';
import {
  AiModelConfig,
  type AiModelConfigDocument,
  type AiModelPricing,
} from '../../../schemas/ai-model-config.schema';

import { AiSecretsService } from './ai-secrets.service';

export interface AdminProviderView {
  apiKeyLast4: null | string;
  isActive: boolean;
  provider: AiProvider;
  updatedAt: Date | null;
}

export interface AdminModelView {
  id: string;
  isActive: boolean;
  label: string;
  pricing: AiModelPricing;
  provider: AiProvider;
  providerModel: string;
  updatedAt?: Date;
}

export interface AiClientModel {
  id: string;
  label: string;
}

export interface AiModelSelectionResult {
  activeModel: null | string;
  aiConfigured: boolean;
  shouldPersist: boolean;
}

export interface AiGatewayModelConfig {
  apiKey: string;
  id: string;
  pricing: AiModelPricing;
  provider: AiProvider;
  providerModel: string;
}

interface UpsertModelInput {
  isActive?: boolean;
  label: string;
  pricing: AiModelPricing;
  provider: string;
  providerModel: string;
}

@Injectable()
export class AiConfigService {
  constructor(
    @InjectModel(AiProviderConfig.name)
    private readonly aiProviderConfigModel: Model<AiProviderConfigDocument>,
    @InjectModel(AiModelConfig.name)
    private readonly aiModelConfigModel: Model<AiModelConfigDocument>,
    private readonly aiSecretsService: AiSecretsService,
  ) {}

  async deleteModelConfig(idInput: string): Promise<void> {
    const id = this.normalizeModelId(idInput);

    await this.aiModelConfigModel.deleteOne({ id });
  }

  async getAdminModels(): Promise<AdminModelView[]> {
    const docs = await this.aiModelConfigModel
      .find()
      .sort({ label: 1, id: 1 })
      .lean();

    return docs.map((doc) => this.toAdminModelView(doc));
  }

  async getAdminProviders(): Promise<AdminProviderView[]> {
    const docs = await this.aiProviderConfigModel
      .find()
      .select('provider isActive apiKeyLast4 updatedAt')
      .lean();

    const providerMap = new Map<AiProvider, (typeof docs)[number]>();
    for (const doc of docs) {
      providerMap.set(doc.provider, doc);
    }

    return AI_PROVIDER_VALUES.map((provider) => {
      const doc = providerMap.get(provider);

      return {
        apiKeyLast4: doc?.apiKeyLast4 ?? null,
        isActive: doc?.isActive ?? false,
        provider,
        updatedAt: doc?.updatedAt ?? null,
      };
    });
  }

  async getClientModels(): Promise<AiClientModel[]> {
    const models = await this.getActiveUsableModels();
    return models.map((model) => ({ id: model.id, label: model.label }));
  }

  async getModelForGeneration(
    modelIdInput: string,
  ): Promise<AiGatewayModelConfig> {
    const modelId = this.normalizeModelId(modelIdInput);

    const modelConfig = await this.aiModelConfigModel
      .findOne({ id: modelId, isActive: true })
      .lean();

    if (!modelConfig) {
      this.throwModelNotAllowed();
    }

    const providerConfig = await this.aiProviderConfigModel
      .findOne({
        isActive: true,
        provider: modelConfig.provider,
      })
      .select('+apiKeyEncrypted provider')
      .lean();

    if (!providerConfig) {
      this.throwModelNotAllowed();
    }

    if (!providerConfig.apiKeyEncrypted) {
      throw new BadRequestException({
        error: {
          code: 'AI_PROVIDER_NOT_CONFIGURED',
          message: `${providerConfig.provider} provider is active but has no configured key`,
        },
      });
    }

    return {
      apiKey: this.aiSecretsService.decryptString(
        providerConfig.apiKeyEncrypted,
      ),
      id: modelConfig.id,
      pricing: modelConfig.pricing,
      provider: modelConfig.provider,
      providerModel: modelConfig.providerModel,
    };
  }

  async resolveModelSelection(params: {
    requestedModel?: null | string;
    userActiveModel?: null | string;
  }): Promise<AiModelSelectionResult> {
    const usableModels = await this.getActiveUsableModels();

    if (usableModels.length === 0) {
      return {
        activeModel: null,
        aiConfigured: false,
        shouldPersist: !!params.userActiveModel,
      };
    }

    const allowedModelIds = new Set(usableModels.map((model) => model.id));

    const requested = params.requestedModel?.trim();
    if (requested) {
      if (!allowedModelIds.has(requested)) {
        this.throwModelNotAllowed();
      }

      return {
        activeModel: requested,
        aiConfigured: true,
        shouldPersist: requested !== params.userActiveModel,
      };
    }

    const existing = params.userActiveModel?.trim();
    if (existing && allowedModelIds.has(existing)) {
      return {
        activeModel: existing,
        aiConfigured: true,
        shouldPersist: false,
      };
    }

    const fallback = usableModels[0].id;

    return {
      activeModel: fallback,
      aiConfigured: true,
      shouldPersist: fallback !== existing,
    };
  }

  async setModelActive(
    idInput: string,
    isActive: boolean,
  ): Promise<AdminModelView> {
    const id = this.normalizeModelId(idInput);

    const updated = await this.aiModelConfigModel
      .findOneAndUpdate(
        { id },
        {
          $set: {
            isActive,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .lean();

    if (!updated) {
      throw new NotFoundException(`Model '${id}' not found`);
    }

    return this.toAdminModelView(updated);
  }

  async setProviderActive(
    providerInput: string,
    isActive: boolean,
  ): Promise<AdminProviderView> {
    const provider = this.normalizeProvider(providerInput);

    const updated = await this.aiProviderConfigModel
      .findOneAndUpdate(
        { provider },
        {
          $set: {
            isActive,
            provider,
          },
        },
        {
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          upsert: true,
        },
      )
      .select('provider isActive apiKeyLast4 updatedAt')
      .lean();

    return {
      apiKeyLast4: updated?.apiKeyLast4 ?? null,
      isActive: updated?.isActive ?? false,
      provider,
      updatedAt: updated?.updatedAt ?? null,
    };
  }

  async setProviderApiKey(
    providerInput: string,
    apiKeyInput: string,
  ): Promise<AdminProviderView> {
    const provider = this.normalizeProvider(providerInput);
    const apiKey = apiKeyInput.trim();

    if (!apiKey) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_API_KEY',
          message: 'API key is required',
        },
      });
    }

    const encrypted = this.aiSecretsService.encryptString(apiKey);
    const last4 = apiKey.slice(-4);

    const updated = await this.aiProviderConfigModel
      .findOneAndUpdate(
        { provider },
        {
          $set: {
            apiKeyEncrypted: encrypted,
            apiKeyLast4: last4,
            provider,
            updatedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          upsert: true,
        },
      )
      .select('provider isActive apiKeyLast4 updatedAt')
      .lean();

    return {
      apiKeyLast4: updated?.apiKeyLast4 ?? null,
      isActive: updated?.isActive ?? false,
      provider,
      updatedAt: updated?.updatedAt ?? null,
    };
  }

  async upsertModelConfig(
    idInput: string,
    dto: UpsertModelInput,
  ): Promise<AdminModelView> {
    const id = this.normalizeModelId(idInput);
    const provider = this.normalizeProvider(dto.provider);

    const updated = await this.aiModelConfigModel
      .findOneAndUpdate(
        { id },
        {
          $set: {
            id,
            isActive: dto.isActive ?? true,
            label: dto.label.trim(),
            pricing: {
              completionUsdPer1M: dto.pricing.completionUsdPer1M,
              promptUsdPer1M: dto.pricing.promptUsdPer1M,
            },
            provider,
            providerModel: dto.providerModel.trim(),
          },
        },
        {
          new: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          upsert: true,
        },
      )
      .lean();

    return this.toAdminModelView(updated!);
  }

  private async getActiveUsableModels(): Promise<
    {
      id: string;
      label: string;
      pricing: AiModelPricing;
      provider: AiProvider;
      providerModel: string;
    }[]
  > {
    const activeProviders = await this.aiProviderConfigModel
      .find({
        isActive: true,
      })
      .select('+apiKeyEncrypted provider')
      .lean();

    const providersWithKeys = activeProviders
      .filter((providerConfig) => !!providerConfig.apiKeyEncrypted)
      .map((providerConfig) => providerConfig.provider);

    if (providersWithKeys.length === 0) {
      return [];
    }

    const models = await this.aiModelConfigModel
      .find({
        isActive: true,
        provider: { $in: providersWithKeys },
      })
      .sort({ id: 1, label: 1 })
      .lean();

    return models.map((model) => ({
      id: model.id,
      label: model.label,
      pricing: model.pricing,
      provider: model.provider,
      providerModel: model.providerModel,
    }));
  }

  private normalizeModelId(modelId: string): string {
    const normalized = modelId.trim();

    if (!normalized) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_MODEL_ID',
          message: 'Model id is required',
        },
      });
    }

    return normalized;
  }

  private normalizeProvider(provider: string): AiProvider {
    if (!AI_PROVIDER_VALUES.includes(provider as AiProvider)) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_PROVIDER',
          message: `Provider must be one of: ${AI_PROVIDER_VALUES.join(', ')}`,
        },
      });
    }

    return provider as AiProvider;
  }

  private throwModelNotAllowed(): never {
    throw new BadRequestException({
      error: {
        code: 'MODEL_NOT_ALLOWED',
        message: 'Model is not available for this account',
      },
    });
  }

  private toAdminModelView(
    model: Pick<
      AiModelConfig,
      | 'id'
      | 'isActive'
      | 'label'
      | 'pricing'
      | 'provider'
      | 'providerModel'
      | 'updatedAt'
    >,
  ): AdminModelView {
    return {
      id: model.id,
      isActive: model.isActive,
      label: model.label,
      pricing: {
        completionUsdPer1M: model.pricing.completionUsdPer1M,
        promptUsdPer1M: model.pricing.promptUsdPer1M,
      },
      provider: model.provider,
      providerModel: model.providerModel,
      updatedAt: model.updatedAt,
    };
  }
}
