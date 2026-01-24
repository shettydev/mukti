import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

import { OpenRouterClientFactory } from './openrouter-client.factory';

interface CachedModels {
  expiresAt: number;
  models: OpenRouterModel[];
}

interface OpenRouterModel {
  id: string;
  name: string;
}

@Injectable()
export class OpenRouterModelsService {
  private readonly cache = new Map<string, CachedModels>();
  private readonly logger = new Logger(OpenRouterModelsService.name);
  private readonly ttlMs = 20 * 60 * 1000;

  constructor(
    private readonly openRouterClientFactory: OpenRouterClientFactory,
  ) {}

  async listModels(apiKey: string): Promise<OpenRouterModel[]> {
    const cacheKey = this.hashApiKey(apiKey);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.models;
    }

    const client = this.openRouterClientFactory.create(apiKey);
    const response = await client.models.list();

    const models = response.data ?? [];

    this.cache.set(cacheKey, {
      expiresAt: Date.now() + this.ttlMs,
      models,
    });

    this.logger.debug(`Cached ${models.length} OpenRouter models`);

    return models;
  }

  async validateModelExists(apiKey: string, modelId: string): Promise<boolean> {
    const models = await this.listModels(apiKey);
    return models.some((m) => m.id === modelId);
  }

  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }
}
