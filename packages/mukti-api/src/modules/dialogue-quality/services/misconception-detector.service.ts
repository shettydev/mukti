import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import Redis from 'ioredis';

import type { MisconceptionResult } from '../interfaces/quality.interface';

import { AiPolicyService } from '../../ai/services/ai-policy.service';
import {
  AI_CHAT_CLIENT_FACTORY,
  type AiChatClientFactory,
} from '../../ai/types/ai-chat-client.interface';

const MISCONCEPTION_DETECTION_PROMPT = `You are a misconception detector for a Socratic learning platform.
Analyze the user's message for factual misconceptions or fundamental misunderstandings about the concepts being discussed.

Concepts in context: {concepts}

Recent exchange (last 3 turns):
{recentHistory}

Student message: "{message}"

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
    @Inject(AI_CHAT_CLIENT_FACTORY)
    private readonly chatClientFactory: AiChatClientFactory,
    private readonly aiPolicyService: AiPolicyService,
    @Inject('QUALITY_REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  async detect(input: {
    conceptContext?: string[];
    conversationHistory?: { content: string; role: 'assistant' | 'user' }[];
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
        const parsedCache = JSON.parse(cached) as Omit<
          MisconceptionResult,
          'fromCache'
        >;
        return { ...parsedCache, fromCache: true };
      }
    } catch (error) {
      this.logger.warn(
        `Redis cache read failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // LLM call with 500ms timeout — fail open
    // Always use the platform key, never the user's BYOK key (RFC-0004 OQ-3).
    // Under the claude-code provider there is no OpenRouter key — the CLI runs
    // on the developer's own auth — so use the provider's default Claude model
    // and an empty key (the client ignores it).
    const isClaudeCode = this.aiPolicyService.isClaudeCodeProvider();
    const model = isClaudeCode
      ? this.aiPolicyService.getDefaultModel()
      : this.configService.get<string>(
          'DIALOGUE_QUALITY_MISCONCEPTION_MODEL',
          'google/gemini-3-flash-preview',
        );
    const platformKey = this.configService.get<string>('OPENROUTER_API_KEY');
    if (!isClaudeCode && !platformKey) {
      this.logger.warn(
        'Platform OPENROUTER_API_KEY not configured, skipping misconception detection',
      );
      return { fromCache: false, hasMisconception: false };
    }

    // Build recent history excerpt (last 3 turns) for context
    const recentHistory = (input.conversationHistory ?? [])
      .slice(-3)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    let timer: ReturnType<typeof setTimeout>;
    try {
      const client = this.chatClientFactory.create(
        isClaudeCode ? '' : (platformKey ?? ''),
      );
      const prompt = MISCONCEPTION_DETECTION_PROMPT.replace(
        '{concepts}',
        concepts || 'general',
      )
        .replace('{recentHistory}', recentHistory || '(no prior context)')
        .replace('{message}', input.userMessage);

      const responsePromise = client.chat.send({
        messages: [{ content: prompt, role: 'user' }],
        model,
        stream: false,
        temperature: 0,
      });
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Misconception detection timeout')),
          500,
        );
      });

      const response = await Promise.race([responsePromise, timeoutPromise]);
      clearTimeout(timer!);

      const content = this.extractContent(response);
      const parsed = JSON.parse(content) as {
        conceptName?: null | string;
        correctDirection?: null | string;
        detectedBelief?: null | string;
        hasMisconception?: boolean;
      };

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
      clearTimeout(timer!);
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
      Array.isArray((response as { choices: unknown[] }).choices)
    ) {
      const choice = (
        response as { choices: { message?: { content?: unknown } }[] }
      ).choices[0];
      const content = choice?.message?.content;
      if (typeof content === 'string') {
        return content;
      }
    }
    return '{"hasMisconception": false}';
  }
}
