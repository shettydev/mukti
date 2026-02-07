import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GeminiClientFactory {
  create(apiKey: string): GoogleGenerativeAI {
    return new GoogleGenerativeAI(apiKey);
  }
}
