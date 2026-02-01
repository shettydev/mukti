import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAiClientFactory {
  create(apiKey: string): OpenAI {
    return new OpenAI({ apiKey });
  }
}
