import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import Redis from 'ioredis';

import type { MisconceptionResult } from '../interfaces/quality.interface';

import { OpenRouterClientFactory } from '../../ai/services/openrouter-client.factory';

const MISCONCEPTION_DETECTION_PROMPT = `You are a misconception detector for a Socratic learning platform.
Analyze the user's message for factual misconceptions or fundamental misunderstandings about the concepts being discussed.

Concepts in context: {concepts}

User message: "{message}"

Respond with a JSON object (no markdown, no code fences):
{
  "hasMisconception": boolean,
  "conceptName": string or null,
  "detectedBelief": string or null,
  "correctDirection": string or null
}

Rules:
- Only flag clear factual misconceptions, not stylistic or opinion differences
- "correctDirection" should hint at the right direction WITHOUT giving the answer
- If no misconception is detected, return hasMisconception: false with null fields`;

@Injectable()
export class MisconceptionDetectorService {
  private readonly logger = new Logger(MisconceptionDetectorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly openRouterClientFactory: OpenRouterClientFactory,
    @Inject('QUALITY_REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async detect(input: {
    apiKey: string;
    conceptContext?: string[];
    model?: string;
    userId: string;
    userMessage: string;
  }): Promise<MisconceptionResult> {
    const enabled = this.configService.get<string>(
      'DIALOGUE_QUALITY_MISCONCEPTION_ENABLED',
      'true',
    );
    if (enabled !== 'true') {
      return { fromCache: false, hasMisconception: false };
    }

    const concepts = (input.conceptContext ?? []).join(',');
    const normalizedMsg = input.userMessage.trim().toLowerCase();
    const cacheKey = `misconception:${createHash('sha256')
      .update(input.userId + concepts + normalizedMsg)
      .digest('hex')}`;

    try {
      // Check cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        this.logger.debug(`Misconception cache hit for key ${cacheKey}`);
        return { ...JSON.parse(cached), fromCache: true };
      }
    } catch (error) {
      this.logger.warn(
        `Redis cache read failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // LLM call with 500ms timeout — fail open
    const model =
      input.model ??
      this.configService.get<string>(
        'DIALOGUE_QUALITY_MISCONCEPTION_MODEL',
        'google/gemini-3-flash-preview',
      );

    try {
      const client = this.openRouterClientFactory.create(input.apiKey);
      const prompt = MISCONCEPTION_DETECTION_PROMPT.replace(
        '{concepts}',
        concepts || 'general',
      ).replace('{message}', input.userMessage);

      const responsePromise = client.chat.send({
        messages: [{ content: prompt, role: 'user' }],
        model,
        stream: false,
        temperature: 0,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Misconception detection timeout')),
          500,
        ),
      );

      const response = await Promise.race([responsePromise, timeoutPromise]);

      const content = this.extractContent(response);
      const parsed = JSON.parse(content);

      const result: MisconceptionResult = {
        conceptName: parsed.conceptName ?? undefined,
        correctDirection: parsed.correctDirection ?? undefined,
        detectedBelief: parsed.detectedBelief ?? undefined,
        fromCache: false,
        hasMisconception: Boolean(parsed.hasMisconception),
      };

      // Cache result
      try {
        await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
      } catch (error) {
        this.logger.warn(
          `Redis cache write failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      return result;
    } catch (error) {
      this.logger.warn(
        `Misconception detection failed (fail-open): ${error instanceof Error ? error.message : String(error)}`,
      );
      return { fromCache: false, hasMisconception: false };
    }
  }

  private extractContent(response: unknown): string {
    if (
      typeof response === 'object' &&
      response !== null &&
      'choices' in response &&
      Array.isArray((response as any).choices)
    ) {
      const choice = (response as any).choices[0];
      const content = choice?.message?.content;
      if (typeof content === 'string') {
        return content;
      }
    }
    return '{"hasMisconception": false}';
  }
}
