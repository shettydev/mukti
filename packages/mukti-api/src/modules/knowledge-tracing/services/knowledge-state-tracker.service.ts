import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  KnowledgeStateDocument as KnowledgeStateDoc,
  KnowledgeState as KnowledgeStateDocument,
} from '../../../schemas/knowledge-state.schema';
import {
  BKTParameters,
  BKTUpdateResult,
  DEFAULT_BKT_PARAMS,
  KnowledgeState,
  MASTERY_THRESHOLD,
  STRUGGLING_THRESHOLD,
} from '../interfaces/bkt.interface';
import { BKTAlgorithmService } from './bkt-algorithm.service';
import { KnowledgeStateStore } from './knowledge-state-store.service';

/**
 * Knowledge State Event - emitted when a knowledge state is updated
 */
export interface KnowledgeStateUpdatedEvent {
  conceptId: string;
  isMastered: boolean;
  newProbability: number;
  previousProbability: number;
  recommendation: string;
  timestamp: Date;
  userId: string;
}

/**
 * Knowledge State Tracker Service
 *
 * Reads learners' per-concept knowledge and records new observations using
 * BKT, emitting `knowledge-state.updated` for downstream services.
 *
 * @remarks
 * Writes go through {@link KnowledgeStateStore}, which applies each
 * observation atomically. Reads always come from MongoDB: an earlier
 * per-process cache served stale P(L) to other API instances and to the
 * Socratic turn, which writes through a different path.
 */
@Injectable()
export class KnowledgeStateTrackerService {
  private readonly logger = new Logger(KnowledgeStateTrackerService.name);

  constructor(
    @InjectModel(KnowledgeStateDocument.name)
    private readonly knowledgeStateModel: Model<KnowledgeStateDoc>,
    private readonly bktAlgorithm: BKTAlgorithmService,
    private readonly knowledgeStateStore: KnowledgeStateStore,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get current knowledge state for a user-concept pair.
   *
   * @param userId - ID of the user
   * @param conceptId - ID of the concept
   * @returns KnowledgeState or null if not found
   */
  async getKnowledgeState(
    userId: string,
    conceptId: string,
  ): Promise<KnowledgeState | null> {
    const state = await this.knowledgeStateModel
      .findOne({
        conceptId,
        userId: this.toObjectId(userId),
      })
      .exec();

    return state ? this.toInterfaceState(state) : null;
  }

  /**
   * Get all users who have mastered a concept.
   *
   * @param conceptId - ID of the concept
   * @returns Array of userIds
   */
  async getMasteredUsers(conceptId: string): Promise<string[]> {
    const states = await this.knowledgeStateModel
      .find({
        conceptId,
        currentProbability: { $gte: MASTERY_THRESHOLD },
      })
      .select('userId')
      .exec();

    return states.map((state) => state.userId.toString());
  }

  /**
   * Get all users currently struggling with a concept.
   * Useful for identifying users who need intervention.
   *
   * @param conceptId - ID of the concept
   * @param threshold - Probability threshold (default: STRUGGLING_THRESHOLD)
   * @returns Array of userIds
   */
  async getStrugglingUsers(
    conceptId: string,
    threshold: number = STRUGGLING_THRESHOLD,
  ): Promise<string[]> {
    const states = await this.knowledgeStateModel
      .find({
        conceptId,
        currentProbability: { $lt: threshold },
      })
      .select('userId')
      .exec();

    return states.map((state) => state.userId.toString());
  }

  /**
   * Get all knowledge states for a user.
   * Useful for displaying user progress dashboard.
   *
   * @param userId - ID of the user
   * @returns Array of KnowledgeState objects
   */
  async getUserKnowledgeStates(userId: string): Promise<KnowledgeState[]> {
    const states = await this.knowledgeStateModel
      .find({ userId: this.toObjectId(userId) })
      .sort({ lastAssessed: -1 })
      .exec();

    return states.map((state) => this.toInterfaceState(state));
  }

  /**
   * Reset knowledge state for a user-concept pair.
   * Useful when re-teaching a concept or correcting errors.
   *
   * @param userId - ID of the user
   * @param conceptId - ID of the concept
   */
  async resetKnowledgeState(userId: string, conceptId: string): Promise<void> {
    const result = await this.knowledgeStateModel
      .deleteOne({
        conceptId,
        userId: this.toObjectId(userId),
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Knowledge state not found for user=${userId}, concept=${conceptId}`,
      );
    }

    this.logger.log(`Reset knowledge state: ${userId}:${conceptId}`);
  }

  /**
   * Update knowledge state based on a user's response to a learning interaction.
   *
   * Applies one BKT observation atomically (creating the state with the given
   * parameters if this is the first), then emits `knowledge-state.updated`.
   *
   * @param userId - ID of the user
   * @param conceptId - ID of the concept being assessed
   * @param correct - Whether the user answered correctly
   * @param customParams - Optional BKT parameters, used only when the state is
   *   created; an existing state keeps its stored parameters
   * @returns BKTUpdateResult with updated state and diagnostics
   */
  async updateKnowledgeState(
    userId: string,
    conceptId: string,
    correct: boolean,
    customParams?: Partial<BKTParameters>,
  ): Promise<BKTUpdateResult> {
    this.logger.debug(
      `Updating knowledge state: user=${userId}, concept=${conceptId}, correct=${correct}`,
    );

    const parameters: BKTParameters = {
      ...DEFAULT_BKT_PARAMS,
      ...customParams,
    };
    this.bktAlgorithm.validateParameters(parameters);

    const { previousProbability, result } =
      await this.knowledgeStateStore.applyObservation(
        this.toObjectId(userId),
        conceptId,
        correct,
        parameters,
      );

    this.eventEmitter.emit('knowledge-state.updated', {
      conceptId,
      isMastered: result.isMastered,
      newProbability: result.posteriorAfterLearning,
      previousProbability,
      recommendation: result.recommendation,
      timestamp: new Date(),
      userId,
    } satisfies KnowledgeStateUpdatedEvent);

    return result;
  }

  /**
   * Map a Mongoose document to the BKT interface KnowledgeState type.
   * Converts ObjectId fields to strings for compatibility with the BKT algorithm.
   */
  private toInterfaceState(doc: KnowledgeStateDoc): KnowledgeState {
    return {
      _id: doc._id.toString(),
      attempts: doc.attempts,
      conceptId: doc.conceptId,
      correctAttempts: doc.correctAttempts,
      createdAt: doc.createdAt,
      currentProbability: doc.currentProbability,
      lastAssessed: doc.lastAssessed,
      parameters: doc.parameters,
      updatedAt: doc.updatedAt,
      userId: doc.userId.toString(),
    };
  }

  private toObjectId(userId: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(`Invalid userId format: ${userId}`);
    }
    return new Types.ObjectId(userId);
  }
}
