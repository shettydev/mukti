import { Injectable } from '@nestjs/common';
import { OpenRouter } from '@openrouter/sdk';

@Injectable()
export class OpenRouterClientFactory {
  create(apiKey: string): OpenRouter {
    return new OpenRouter({ apiKey });
  }
}
