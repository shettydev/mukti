import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { QualityDirective } from '../interfaces/quality.interface';

export interface ConclusionAssessment {
  conclusionReady: boolean;
  directive?: QualityDirective;
  signals: ConclusionSignal[];
}

export interface ConclusionAssessmentInput {
  conclusionOffered: boolean;
  conversationHistory: { content: string; role: string }[];
  totalMessageCount: number;
  userMessage: string;
  wrapUpRequested?: boolean;
}

export interface ConclusionSignal {
  confidence: number;
  type:
    | 'action-commitment'
    | 'diminishing-engagement'
    | 'explicit-closure'
    | 'satisfaction'
    | 'user-wrap-up';
}

const ACTION_COMMITMENT_PATTERN =
  /\b(I'll|I will|I'm going to|my next step|plan to|going to try|will research|will look into)\b/i;

const SATISFACTION_PATTERN =
  /\b(makes sense|that's clear|I understand now|got it|perfect|exactly what|10\/10|this helps|thank you so much|really helpful)\b/i;

const EXPLICIT_CLOSURE_PATTERN =
  /\b(thanks|thank you|that's all|I think we're done|nothing else|no more questions|I'm good)\b/i;

export const CONCLUSION_INSTRUCTION =
  `CONCLUSION PROTOCOL — This turn closes the dialogue: the user asked to wrap up, or reached the turn limit they set.\n` +
  `Write the closing summary whatever the user's latest message asks for (even a request for code,\n` +
  `the full answer or an explanation); do not answer that request, fold it into "Still open" instead.\n` +
  `Shift from questioning mode to synthesis mode and write a closing summary in Markdown\n` +
  `with exactly these three headings, in this order:\n` +
  `## Established — 2-3 key discoveries or conclusions the user reached in this conversation\n` +
  `## Still open — what is unresolved or uncertain (at most 2 points; say "Nothing major" if none)\n` +
  `## Next step — the user's stated next step if they mentioned one, otherwise one concrete suggestion\n` +
  `End with an open door: "You can always return to explore this further."\n` +
  `Do NOT ask another probing question — this is a closing response`;

@Injectable()
export class ConclusionDetectorService {
  constructor(private readonly configService: ConfigService) {}

  assess(input: ConclusionAssessmentInput): ConclusionAssessment {
    // An explicit wrap-up is a learner control (dialogue-help-controls: "Wrap
    // up is available once the dialogue has a reply"), so it is honoured even
    // when the heuristic detection below is switched off.
    const userWrapUp: ConclusionAssessment = {
      conclusionReady: true,
      directive: {
        instruction: CONCLUSION_INSTRUCTION,
        priority: -1,
        source: 'conclusion',
      },
      signals: [{ confidence: 1.0, type: 'user-wrap-up' }],
    };

    const enabled = this.configService.get<string>(
      'DIALOGUE_QUALITY_CONCLUSION_ENABLED',
      'true',
    );
    if (enabled !== 'true') {
      return input.wrapUpRequested
        ? userWrapUp
        : { conclusionReady: false, signals: [] };
    }

    const signals: ConclusionSignal[] = [];

    // 1. User wrap-up (explicit chip click)
    if (input.wrapUpRequested) {
      signals.push({ confidence: 1.0, type: 'user-wrap-up' });
    }

    // 2. Action commitments
    if (ACTION_COMMITMENT_PATTERN.test(input.userMessage)) {
      signals.push({ confidence: 0.7, type: 'action-commitment' });
    }

    // 3. Satisfaction signals
    if (SATISFACTION_PATTERN.test(input.userMessage)) {
      signals.push({ confidence: 0.6, type: 'satisfaction' });
    }

    // 4. Diminishing engagement
    if (input.totalMessageCount > 20) {
      const userMessages = input.conversationHistory
        .filter((m) => m.role === 'user')
        .slice(-3);

      if (
        userMessages.length >= 3 &&
        userMessages.every((m) => m.content.trim().split(/\s+/).length < 15)
      ) {
        signals.push({ confidence: 0.5, type: 'diminishing-engagement' });
      }
    }

    // 5. Explicit closure
    if (EXPLICIT_CLOSURE_PATTERN.test(input.userMessage)) {
      signals.push({ confidence: 0.8, type: 'explicit-closure' });
    }

    // Determine if conclusion should trigger
    const totalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0);
    const hasHighConfidenceSignal = signals.some((s) => s.confidence >= 0.8);
    const conclusionReady =
      input.wrapUpRequested === true ||
      totalConfidence >= 0.7 ||
      hasHighConfidenceSignal;

    if (!conclusionReady) {
      return { conclusionReady: false, signals };
    }

    // Only emit the conclusion directive when the user explicitly requests wrap-up.
    // For auto-detected signals, just set conclusionReady so the frontend can show the
    // wrap-up chip — don't auto-fire the synthesis response.
    if (input.wrapUpRequested) {
      return {
        conclusionReady: true,
        directive: {
          instruction: CONCLUSION_INSTRUCTION,
          priority: -1,
          source: 'conclusion',
        },
        signals,
      };
    }

    return { conclusionReady: true, signals };
  }
}
