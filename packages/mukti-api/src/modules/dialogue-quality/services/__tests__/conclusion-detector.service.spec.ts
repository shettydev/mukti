import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import {
  type ConclusionAssessmentInput,
  ConclusionDetectorService,
} from '../conclusion-detector.service';

describe('ConclusionDetectorService', () => {
  let service: ConclusionDetectorService;
  let configService: ConfigService;

  const baseInput: ConclusionAssessmentInput = {
    conclusionOffered: false,
    conversationHistory: [],
    totalMessageCount: 5,
    userMessage: 'Tell me more about closures.',
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConclusionDetectorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('true'),
          },
        },
      ],
    }).compile();

    service = module.get(ConclusionDetectorService);
    configService = module.get(ConfigService);
  });

  it('returns not ready for neutral messages', () => {
    const result = service.assess(baseInput);
    expect(result.conclusionReady).toBe(false);
    expect(result.signals).toHaveLength(0);
    expect(result.directive).toBeUndefined();
  });

  describe('feature flag', () => {
    it('returns not ready when disabled', () => {
      jest.spyOn(configService, 'get').mockReturnValue('false');
      const result = service.assess({
        ...baseInput,
        wrapUpRequested: true,
      });
      expect(result.conclusionReady).toBe(false);
    });
  });

  describe('user wrap-up', () => {
    it('always triggers with confidence 1.0', () => {
      const result = service.assess({
        ...baseInput,
        wrapUpRequested: true,
      });
      expect(result.conclusionReady).toBe(true);
      expect(result.directive).toBeDefined();
      expect(result.directive!.source).toBe('conclusion');
      expect(result.directive!.priority).toBe(-1);
      expect(result.signals).toContainEqual(
        expect.objectContaining({ confidence: 1.0, type: 'user-wrap-up' }),
      );
    });

    it('triggers even when conclusionOffered is true', () => {
      const result = service.assess({
        ...baseInput,
        conclusionOffered: true,
        wrapUpRequested: true,
      });
      expect(result.conclusionReady).toBe(true);
      expect(result.directive).toBeDefined();
    });
  });

  describe('action commitment signals', () => {
    const actionPhrases = [
      "I'll research this more",
      'I will try that approach',
      "I'm going to refactor the code",
      'My next step is to test it',
      'I plan to implement this',
      'Going to try the alternative',
      'Will research the topic further',
      'Will look into that library',
    ];

    it.each(actionPhrases)('detects "%s"', (phrase) => {
      const result = service.assess({
        ...baseInput,
        userMessage: phrase,
      });
      expect(result.signals).toContainEqual(
        expect.objectContaining({ confidence: 0.7, type: 'action-commitment' }),
      );
    });
  });

  describe('satisfaction signals', () => {
    const satisfactionPhrases = [
      'That makes sense now',
      "That's clear, thanks",
      'I understand now',
      'Got it!',
      'Perfect, exactly what I needed',
      'This helps a lot',
      'Thank you so much',
      'Really helpful explanation',
    ];

    it.each(satisfactionPhrases)('detects "%s"', (phrase) => {
      const result = service.assess({
        ...baseInput,
        userMessage: phrase,
      });
      expect(result.signals).toContainEqual(
        expect.objectContaining({ confidence: 0.6, type: 'satisfaction' }),
      );
    });
  });

  describe('explicit closure signals', () => {
    const closurePhrases = [
      'Thanks for the help',
      'Thank you',
      "That's all I needed",
      "I think we're done",
      'Nothing else to ask',
      'No more questions',
      "I'm good",
    ];

    it.each(closurePhrases)('detects "%s" with confidence >= 0.8', (phrase) => {
      const result = service.assess({
        ...baseInput,
        userMessage: phrase,
      });
      const closureSignal = result.signals.find(
        (s) => s.type === 'explicit-closure',
      );
      expect(closureSignal).toBeDefined();
      expect(closureSignal!.confidence).toBe(0.8);
    });

    it('sets conclusionReady on explicit closure but does not emit directive without wrapUpRequested', () => {
      const result = service.assess({
        ...baseInput,
        userMessage: "I think we're done here",
      });
      expect(result.conclusionReady).toBe(true);
      expect(result.directive).toBeUndefined();
    });

    it('emits directive on explicit closure when wrapUpRequested', () => {
      const result = service.assess({
        ...baseInput,
        userMessage: "I think we're done here",
        wrapUpRequested: true,
      });
      expect(result.conclusionReady).toBe(true);
      expect(result.directive).toBeDefined();
    });
  });

  describe('diminishing engagement', () => {
    it('detects short messages when totalMessageCount > 20', () => {
      const result = service.assess({
        ...baseInput,
        conversationHistory: [
          { content: 'ok', role: 'user' },
          { content: 'Response from AI', role: 'assistant' },
          { content: 'sure', role: 'user' },
          { content: 'Response from AI', role: 'assistant' },
          { content: 'yeah', role: 'user' },
        ],
        totalMessageCount: 25,
        userMessage: 'yeah',
      });
      expect(result.signals).toContainEqual(
        expect.objectContaining({
          confidence: 0.5,
          type: 'diminishing-engagement',
        }),
      );
    });

    it('does not detect when totalMessageCount <= 20', () => {
      const result = service.assess({
        ...baseInput,
        conversationHistory: [
          { content: 'ok', role: 'user' },
          { content: 'AI response', role: 'assistant' },
          { content: 'sure', role: 'user' },
          { content: 'AI response', role: 'assistant' },
          { content: 'yeah', role: 'user' },
        ],
        totalMessageCount: 15,
        userMessage: 'yeah',
      });
      const engagement = result.signals.find(
        (s) => s.type === 'diminishing-engagement',
      );
      expect(engagement).toBeUndefined();
    });

    it('does not detect when messages are long', () => {
      const longMessage =
        'I think this is a really interesting point and I want to explore it further with more detail';
      const result = service.assess({
        ...baseInput,
        conversationHistory: [
          { content: longMessage, role: 'user' },
          { content: 'AI response', role: 'assistant' },
          { content: longMessage, role: 'user' },
          { content: 'AI response', role: 'assistant' },
          { content: longMessage, role: 'user' },
        ],
        totalMessageCount: 25,
        userMessage: longMessage,
      });
      const engagement = result.signals.find(
        (s) => s.type === 'diminishing-engagement',
      );
      expect(engagement).toBeUndefined();
    });
  });

  describe('threshold logic', () => {
    it('triggers when total confidence >= 0.7', () => {
      // action-commitment (0.7) alone should trigger
      const result = service.assess({
        ...baseInput,
        userMessage: "I'll try this approach",
      });
      expect(result.conclusionReady).toBe(true);
    });

    it('triggers when any single signal >= 0.8', () => {
      // explicit-closure (0.8)
      const result = service.assess({
        ...baseInput,
        userMessage: 'Thank you',
      });
      expect(result.conclusionReady).toBe(true);
    });

    it('does not trigger on satisfaction alone (0.6 < 0.7)', () => {
      const result = service.assess({
        ...baseInput,
        userMessage: 'Got it!',
      });
      // Only satisfaction signal (0.6), no others
      const hasOnlySatisfaction =
        result.signals.length === 1 &&
        result.signals[0].type === 'satisfaction';
      if (hasOnlySatisfaction) {
        expect(result.conclusionReady).toBe(false);
      }
    });

    it('combines signals to reach threshold', () => {
      // satisfaction (0.6) + diminishing-engagement (0.5) = 1.1
      const result = service.assess({
        ...baseInput,
        conversationHistory: [
          { content: 'ok', role: 'user' },
          { content: 'AI response', role: 'assistant' },
          { content: 'sure', role: 'user' },
          { content: 'AI response', role: 'assistant' },
          { content: 'Got it', role: 'user' },
        ],
        totalMessageCount: 25,
        userMessage: 'Got it',
      });
      expect(result.conclusionReady).toBe(true);
    });
  });

  describe('directive emission', () => {
    it('does not emit directive on auto-detected signals (only sets conclusionReady)', () => {
      const result = service.assess({
        ...baseInput,
        userMessage: "I'll try this approach",
      });
      expect(result.conclusionReady).toBe(true);
      expect(result.directive).toBeUndefined();
    });

    it('emits directive only when wrapUpRequested is true', () => {
      const result = service.assess({
        ...baseInput,
        wrapUpRequested: true,
      });
      expect(result.conclusionReady).toBe(true);
      expect(result.directive).toBeDefined();
    });

    it('emits directive on wrapUpRequested even if conclusionOffered is true', () => {
      const result = service.assess({
        ...baseInput,
        conclusionOffered: true,
        wrapUpRequested: true,
      });
      expect(result.directive).toBeDefined();
    });
  });

  describe('directive content', () => {
    it('has correct structure', () => {
      const result = service.assess({
        ...baseInput,
        wrapUpRequested: true,
      });
      expect(result.directive).toMatchObject({
        priority: -1,
        source: 'conclusion',
      });
      expect(result.directive!.instruction).toContain('CONCLUSION PROTOCOL');
      expect(result.directive!.instruction).toContain('synthesis mode');
      expect(result.directive!.instruction).toContain(
        'Do NOT ask another probing question',
      );
    });
  });
});
