import {
  MAX_TITLE_LENGTH,
  PLACEHOLDER_CYCLE_MS,
  PROMPT_CYCLE_MS,
  SOCRATIC_PROMPTS,
  THINKING_INTENTS,
} from '../thought-map-constants';

describe('thought-map-constants', () => {
  describe('SOCRATIC_PROMPTS', () => {
    it('contains at least 3 prompts', () => {
      expect(SOCRATIC_PROMPTS.length).toBeGreaterThanOrEqual(3);
    });

    it('contains only non-empty strings', () => {
      for (const prompt of SOCRATIC_PROMPTS) {
        expect(typeof prompt).toBe('string');
        expect(prompt.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe('THINKING_INTENTS', () => {
    it('contains all four intent values', () => {
      const values = THINKING_INTENTS.map((i) => i.value);
      expect(values).toContain('explore');
      expect(values).toContain('decide');
      expect(values).toContain('understand');
      expect(values).toContain('debug');
    });

    it('each intent has required fields', () => {
      for (const intent of THINKING_INTENTS) {
        expect(intent.label).toBeTruthy();
        expect(intent.description).toBeTruthy();
        expect(intent.icon).toBeDefined();
        expect(intent.placeholders.length).toBeGreaterThan(0);
      }
    });

    it('each intent has unique value and label', () => {
      const values = THINKING_INTENTS.map((i) => i.value);
      const labels = THINKING_INTENTS.map((i) => i.label);
      expect(new Set(values).size).toBe(values.length);
      expect(new Set(labels).size).toBe(labels.length);
    });
  });

  describe('numeric constants', () => {
    it('MAX_TITLE_LENGTH is a positive integer', () => {
      expect(MAX_TITLE_LENGTH).toBeGreaterThan(0);
      expect(Number.isInteger(MAX_TITLE_LENGTH)).toBe(true);
    });

    it('PROMPT_CYCLE_MS is a positive number', () => {
      expect(PROMPT_CYCLE_MS).toBeGreaterThan(0);
    });

    it('PLACEHOLDER_CYCLE_MS is a positive number', () => {
      expect(PLACEHOLDER_CYCLE_MS).toBeGreaterThan(0);
    });
  });
});
