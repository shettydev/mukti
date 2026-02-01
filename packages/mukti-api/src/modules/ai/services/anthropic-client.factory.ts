import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnthropicClientFactory {
  create(apiKey: string): Anthropic {
    return new Anthropic({ apiKey });
  }
}
