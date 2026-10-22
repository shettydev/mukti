import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  KnowledgeStateDocument as KnowledgeStateDoc,
  KnowledgeState as KnowledgeStateSchemaClass,
} from '../../../schemas/knowledge-state.schema';
import {
  BKTParameters,
  BKTUpdateResult,
  DEFAULT_BKT_PARAMS,
  KnowledgeState,
} from '../interfaces/bkt.interface';
import { BKTAlgorithmService } from './bkt-algorithm.service';

/**
 * How many times to re-read and retry when another writer got in first.
 * Each conflict means some other observation succeeded, so the loop always
 * makes progress; the cap only bounds pathological contention.
 */
const MAX_ATTEMPTS = 20;

/** Upper bound of the random pause between conflicting attempts, in ms. */
const MAX_BACKOFF_MS = 25;

/** MongoDB duplicate-key error (the unique `{ conceptId, userId }` index). */
const DUPLICATE_KEY = 11000;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface AppliedObservation {
  previousProbability: number;
  result: BKTUpdateResult;
}

/**
 * The one place a learner's per-concept knowledge is written.
 *
 * @remarks
 * A BKT update reads P(L), computes the next value from it, and writes it
 * back. Done naively, two turns that touch the same concept at once (chat in
 * one tab, a thought map in another, a BullMQ retry, or two API instances)
 * both read the same P(L) and the later write silently erases the earlier
 * observation. Creation had the same race and could fail the whole turn with
 * a duplicate-key error after the reply was already saved.
 *
 * Every write here is a compare-and-set on `attempts`, which every update
 * increments by exactly one, so it works as a version number. If the record
 * moved since it was read, the observation is re-applied to the fresh value.
 * No in-memory cache is consulted, so separate processes stay consistent.
 */
@Injectable()
export class KnowledgeStateStore {
  private readonly logger = new Logger(KnowledgeStateStore.name);

  constructor(
    @InjectModel(KnowledgeStateSchemaClass.name)
    private readonly knowledgeStateModel: Model<KnowledgeStateDoc>,
    private readonly bktAlgorithm: BKTAlgorithmService,
  ) {}

  /**
   * Records one observation of the learner on a concept, creating the record
   * with `initialParameters` if this is the first.
   *
   * @throws Error if the record keeps changing underneath after several tries.
   */
  async applyObservation(
    userId: Types.ObjectId,
    conceptId: string,
    correct: boolean,
    initialParameters: BKTParameters = DEFAULT_BKT_PARAMS,
  ): Promise<AppliedObservation> {
    let attempt = 0;
    while (attempt < MAX_ATTEMPTS) {
      const doc = await this.knowledgeStateModel
        .findOne({ conceptId, userId })
        .lean<KnowledgeStateDoc>()
        .exec();

      if (!doc) {
        // Creating is not a conflict; whoever wins, the next read finds it.
        await this.createIfAbsent(userId, conceptId, initialParameters);
        continue;
      }
      attempt++;

      const current: KnowledgeState = {
        attempts: doc.attempts,
        conceptId,
        correctAttempts: doc.correctAttempts,
        currentProbability: doc.currentProbability,
        lastAssessed: doc.lastAssessed,
        parameters: doc.parameters,
        userId: userId.toString(),
      };
      const result = this.bktAlgorithm.updateKnowledgeState(current, correct);

      const write = await this.knowledgeStateModel
        .updateOne(
          { _id: doc._id, attempts: doc.attempts },
          {
            $set: {
              attempts: result.state.attempts,
              correctAttempts: result.state.correctAttempts,
              currentProbability: result.state.currentProbability,
              lastAssessed: result.state.lastAssessed,
            },
          },
        )
        .exec();

      if (write.matchedCount === 1) {
        return { previousProbability: doc.currentProbability, result };
      }

      this.logger.debug(
        `Knowledge state ${userId.toString()}:${conceptId} changed concurrently, retrying (${attempt}/${MAX_ATTEMPTS})`,
      );
      // Jitter so writers that collided do not collide again in lockstep.
      await sleep(Math.random() * MAX_BACKOFF_MS);
    }

    throw new Error(
      `Knowledge state ${userId.toString()}:${conceptId} kept changing; observation not recorded`,
    );
  }

  private async createIfAbsent(
    userId: Types.ObjectId,
    conceptId: string,
    parameters: BKTParameters,
  ): Promise<void> {
    try {
      await this.knowledgeStateModel.create({
        attempts: 0,
        conceptId,
        correctAttempts: 0,
        currentProbability: parameters.pInit,
        lastAssessed: new Date(),
        parameters,
        userId,
      });
    } catch (error) {
      // Another writer created it first; the next read will find it.
      if ((error as { code?: number }).code !== DUPLICATE_KEY) {
        throw error;
      }
    }
  }
}
