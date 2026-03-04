import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import {
  DEFAULT_BKT_PARAMS,
  type KnowledgeState,
  MASTERY_THRESHOLD,
} from '../interfaces/bkt.interface';
import { BKTAlgorithmService } from './bkt-algorithm.service';

describe('BKTAlgorithmService', () => {
  let service: BKTAlgorithmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BKTAlgorithmService],
    }).compile();

    service = module.get<BKTAlgorithmService>(BKTAlgorithmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateKnowledgeState', () => {
    const baseState: KnowledgeState = {
      attempts: 0,
      conceptId: 'test_concept',
      correctAttempts: 0,
      currentProbability: 0.5,
      lastAssessed: new Date(),
      parameters: DEFAULT_BKT_PARAMS,
      userId: new Types.ObjectId() as any,
    };

    it('should increase probability when answer is correct', () => {
      const result = service.updateKnowledgeState(baseState, true);

      expect(result.posteriorAfterLearning).toBeGreaterThan(
        baseState.currentProbability,
      );
      expect(result.state.correctAttempts).toBe(1);
      expect(result.state.attempts).toBe(1);
    });

    it('should decrease probability when answer is incorrect', () => {
      const result = service.updateKnowledgeState(baseState, false);

      expect(result.posteriorAfterLearning).toBeLessThan(
        baseState.currentProbability,
      );
      expect(result.state.correctAttempts).toBe(0);
      expect(result.state.attempts).toBe(1);
    });

    it('should apply learning rate after posterior calculation', () => {
      const { pLearn } = DEFAULT_BKT_PARAMS;
      const result = service.updateKnowledgeState(baseState, true);

      // P(L_n+1) = P(L_n | obs) + (1 - P(L_n | obs)) * pLearn
      const expectedIncrease = (1 - result.posteriorBeforeLearning) * pLearn;

      expect(result.posteriorAfterLearning).toBeCloseTo(
        result.posteriorBeforeLearning + expectedIncrease,
        5,
      );
    });

    it('should mark as mastered when probability >= threshold', () => {
      const highProbState: KnowledgeState = {
        ...baseState,
        currentProbability: 0.94,
      };

      const result = service.updateKnowledgeState(highProbState, true);

      expect(result.posteriorAfterLearning).toBeGreaterThanOrEqual(
        MASTERY_THRESHOLD,
      );
      expect(result.isMastered).toBe(true);
      expect(result.recommendation).toBe('advance');
    });

    it('should recommend review for moderate probability', () => {
      const moderateState: KnowledgeState = {
        ...baseState,
        currentProbability: 0.8,
      };

      const result = service.updateKnowledgeState(moderateState, false);

      expect(result.recommendation).toBe('review');
    });

    it('should recommend reassess for low probability', () => {
      const lowState: KnowledgeState = {
        ...baseState,
        currentProbability: 0.2,
      };

      const result = service.updateKnowledgeState(lowState, false);

      expect(result.recommendation).toBe('reassess');
    });

    it('should update lastAssessed timestamp', () => {
      const oldDate = new Date('2020-01-01');
      const stateWithOldDate: KnowledgeState = {
        ...baseState,
        lastAssessed: oldDate,
      };

      const result = service.updateKnowledgeState(stateWithOldDate, true);

      expect(result.state.lastAssessed.getTime()).toBeGreaterThan(
        oldDate.getTime(),
      );
    });

    it('should handle edge case: probability = 0', () => {
      const zeroState: KnowledgeState = {
        ...baseState,
        currentProbability: 0,
      };

      const result = service.updateKnowledgeState(zeroState, true);

      expect(result.posteriorAfterLearning).toBeGreaterThan(0);
      expect(result.state.currentProbability).toBeGreaterThan(0);
    });

    it('should handle edge case: probability = 1', () => {
      const perfectState: KnowledgeState = {
        ...baseState,
        currentProbability: 1,
      };

      const result = service.updateKnowledgeState(perfectState, false);

      // With a prior of 1, posterior remains 1 even on an incorrect response;
      // the incorrect answer is fully explained by slip.
      expect(result.posteriorBeforeLearning).toBe(1);
    });

    it('should apply slip probability correctly', () => {
      // High knowledge but incorrect answer (slip)
      const highKnowledgeState: KnowledgeState = {
        ...baseState,
        currentProbability: 0.9,
      };

      const result = service.updateKnowledgeState(highKnowledgeState, false);

      // Should decrease but not drastically (it's likely a slip)
      expect(result.posteriorBeforeLearning).toBeGreaterThan(0.5);
    });

    it('should apply guess probability correctly', () => {
      // Low knowledge but correct answer (guess)
      const lowKnowledgeState: KnowledgeState = {
        ...baseState,
        currentProbability: 0.1,
      };

      const result = service.updateKnowledgeState(lowKnowledgeState, true);

      // Should increase but not drastically (might be a guess)
      expect(result.posteriorBeforeLearning).toBeLessThan(0.5);
    });
  });

  describe('validateParameters', () => {
    it('should accept valid parameters', () => {
      expect(() => {
        service.validateParameters(DEFAULT_BKT_PARAMS);
      }).not.toThrow();
    });

    it('should reject pInit < 0', () => {
      expect(() => {
        service.validateParameters({ ...DEFAULT_BKT_PARAMS, pInit: -0.1 });
      }).toThrow('Invalid pInit');
    });

    it('should reject pInit > 1', () => {
      expect(() => {
        service.validateParameters({ ...DEFAULT_BKT_PARAMS, pInit: 1.1 });
      }).toThrow('Invalid pInit');
    });

    it('should reject pLearn < 0', () => {
      expect(() => {
        service.validateParameters({ ...DEFAULT_BKT_PARAMS, pLearn: -0.1 });
      }).toThrow('Invalid pLearn');
    });

    it('should reject pLearn > 1', () => {
      expect(() => {
        service.validateParameters({ ...DEFAULT_BKT_PARAMS, pLearn: 1.5 });
      }).toThrow('Invalid pLearn');
    });

    it('should reject pSlip < 0', () => {
      expect(() => {
        service.validateParameters({ ...DEFAULT_BKT_PARAMS, pSlip: -0.1 });
      }).toThrow('Invalid pSlip');
    });

    it('should reject pSlip > 1', () => {
      expect(() => {
        service.validateParameters({ ...DEFAULT_BKT_PARAMS, pSlip: 1.2 });
      }).toThrow('Invalid pSlip');
    });

    it('should reject pGuess < 0', () => {
      expect(() => {
        service.validateParameters({ ...DEFAULT_BKT_PARAMS, pGuess: -0.1 });
      }).toThrow('Invalid pGuess');
    });

    it('should reject pGuess > 1', () => {
      expect(() => {
        service.validateParameters({ ...DEFAULT_BKT_PARAMS, pGuess: 1.3 });
      }).toThrow('Invalid pGuess');
    });

    it('should warn when pSlip + pGuess >= 1', () => {
      const loggerWarnSpy = jest.spyOn((service as any).logger, 'warn');

      service.validateParameters({
        pGuess: 0.5,
        pInit: 0.5,
        pLearn: 0.1,
        pSlip: 0.6,
      });

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('pSlip'),
      );
    });
  });

  describe('BKT mathematical correctness', () => {
    it('should match expected posterior for correct answer', () => {
      const state: KnowledgeState = {
        attempts: 0,
        conceptId: 'test',
        correctAttempts: 0,
        currentProbability: 0.5,
        lastAssessed: new Date(),
        parameters: {
          pGuess: 0.2,
          pInit: 0.5,
          pLearn: 0.1,
          pSlip: 0.1,
        },
        userId: new Types.ObjectId() as any,
      };

      const result = service.updateKnowledgeState(state, true);

      // Manual calculation:
      // P(L | correct) = P(L) * (1 - P(S)) / [P(L) * (1 - P(S)) + (1 - P(L)) * P(G)]
      // = 0.5 * 0.9 / [0.5 * 0.9 + 0.5 * 0.2]
      // = 0.45 / [0.45 + 0.1]
      // = 0.45 / 0.55
      // = 0.8182

      expect(result.posteriorBeforeLearning).toBeCloseTo(0.8182, 3);

      // P(L_n+1) = 0.8182 + (1 - 0.8182) * 0.1 = 0.8182 + 0.01818 = 0.8364
      expect(result.posteriorAfterLearning).toBeCloseTo(0.8364, 3);
    });

    it('should match expected posterior for incorrect answer', () => {
      const state: KnowledgeState = {
        attempts: 0,
        conceptId: 'test',
        correctAttempts: 0,
        currentProbability: 0.5,
        lastAssessed: new Date(),
        parameters: {
          pGuess: 0.2,
          pInit: 0.5,
          pLearn: 0.1,
          pSlip: 0.1,
        },
        userId: new Types.ObjectId() as any,
      };

      const result = service.updateKnowledgeState(state, false);

      // Manual calculation:
      // P(L | incorrect) = P(L) * P(S) / [P(L) * P(S) + (1 - P(L)) * (1 - P(G))]
      // = 0.5 * 0.1 / [0.5 * 0.1 + 0.5 * 0.8]
      // = 0.05 / [0.05 + 0.4]
      // = 0.05 / 0.45
      // = 0.1111

      expect(result.posteriorBeforeLearning).toBeCloseTo(0.1111, 3);

      // P(L_n+1) = 0.1111 + (1 - 0.1111) * 0.1 = 0.1111 + 0.0889 = 0.2
      expect(result.posteriorAfterLearning).toBeCloseTo(0.2, 3);
    });
  });
});
