import { Types } from 'mongoose';

import { DEFAULT_BKT_PARAMS } from '../../interfaces/bkt.interface';
import { BKTAlgorithmService } from '../bkt-algorithm.service';
import { KnowledgeStateStore } from '../knowledge-state-store.service';

/**
 * Concurrency rules for per-concept knowledge writes. Uses the real BKT
 * algorithm; only the Mongo model is mocked.
 */
describe('KnowledgeStateStore', () => {
  const userId = new Types.ObjectId();
  const docId = new Types.ObjectId();

  let model: {
    create: jest.Mock;
    findOne: jest.Mock;
    updateOne: jest.Mock;
  };
  let store: KnowledgeStateStore;

  const stored = (attempts: number, currentProbability: number) => ({
    _id: docId,
    attempts,
    conceptId: 'recursion',
    correctAttempts: 0,
    currentProbability,
    lastAssessed: new Date('2026-10-01T00:00:00.000Z'),
    parameters: DEFAULT_BKT_PARAMS,
    userId,
  });

  /** Queues the documents successive `findOne` reads will return. */
  const reads = (...docs: unknown[]) => {
    for (const doc of docs) {
      model.findOne.mockReturnValueOnce({
        lean: () => ({ exec: () => Promise.resolve(doc) }),
      });
    }
  };

  /** Queues the matched counts successive compare-and-set writes report. */
  const writes = (...matched: number[]) => {
    for (const matchedCount of matched) {
      model.updateOne.mockReturnValueOnce({
        exec: () => Promise.resolve({ matchedCount }),
      });
    }
  };

  beforeEach(() => {
    model = { create: jest.fn(), findOne: jest.fn(), updateOne: jest.fn() };
    store = new KnowledgeStateStore(model as any, new BKTAlgorithmService());
  });

  it('writes only if the record is still at the version it read', async () => {
    reads(stored(3, 0.4));
    writes(1);

    const { previousProbability, result } = await store.applyObservation(
      userId,
      'recursion',
      true,
    );

    expect(previousProbability).toBe(0.4);
    expect(result.state.attempts).toBe(4);
    expect(model.updateOne).toHaveBeenCalledWith(
      { _id: docId, attempts: 3 },
      { $set: expect.objectContaining({ attempts: 4 }) },
    );
  });

  it('re-applies the observation to the newer value when another turn wrote first', async () => {
    // First read sees attempts=3; meanwhile another turn bumps it to 4.
    reads(stored(3, 0.4), stored(4, 0.7));
    writes(0, 1);

    const { previousProbability, result } = await store.applyObservation(
      userId,
      'recursion',
      true,
    );

    expect(model.updateOne).toHaveBeenCalledTimes(2);
    expect(model.updateOne).toHaveBeenLastCalledWith(
      { _id: docId, attempts: 4 },
      expect.anything(),
    );
    // Built on the other turn's value, so neither observation is lost.
    expect(previousProbability).toBe(0.7);
    expect(result.state.attempts).toBe(5);
  });

  it('creates the record on first sight, then applies the observation to it', async () => {
    reads(null, stored(0, DEFAULT_BKT_PARAMS.pInit));
    writes(1);

    await store.applyObservation(userId, 'recursion', false);

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        attempts: 0,
        conceptId: 'recursion',
        currentProbability: DEFAULT_BKT_PARAMS.pInit,
        userId,
      }),
    );
    expect(model.updateOne).toHaveBeenCalledWith(
      { _id: docId, attempts: 0 },
      expect.anything(),
    );
  });

  it('treats losing the creation race as success and uses the winner’s record', async () => {
    reads(null, stored(1, 0.5));
    model.create.mockRejectedValueOnce(
      Object.assign(new Error('E11000'), { code: 11000 }),
    );
    writes(1);

    const { previousProbability } = await store.applyObservation(
      userId,
      'recursion',
      true,
    );

    expect(previousProbability).toBe(0.5);
  });

  it('rethrows creation errors other than a duplicate key', async () => {
    reads(null);
    model.create.mockRejectedValueOnce(new Error('connection lost'));

    await expect(
      store.applyObservation(userId, 'recursion', true),
    ).rejects.toThrow('connection lost');
  });

  it('gives up after repeated conflicts instead of looping forever', async () => {
    const cap = 20;
    for (let i = 0; i < cap; i++) {
      reads(stored(i, 0.4));
      writes(0);
    }

    await expect(
      store.applyObservation(userId, 'recursion', true),
    ).rejects.toThrow('kept changing');
    expect(model.updateOne).toHaveBeenCalledTimes(cap);
  });

  it('does not count creating the record against the retry budget', async () => {
    // A missing record, then 19 conflicts, then success: still within the cap.
    reads(null);
    for (let i = 0; i < 20; i++) {
      reads(stored(i, 0.4));
    }
    for (let i = 0; i < 19; i++) {
      writes(0);
    }
    writes(1);

    await expect(
      store.applyObservation(userId, 'recursion', true),
    ).resolves.toBeDefined();
    expect(model.create).toHaveBeenCalledTimes(1);
  });
});
