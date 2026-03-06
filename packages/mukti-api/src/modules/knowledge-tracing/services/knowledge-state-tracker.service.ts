import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
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
 * Manages knowledge state persistence and updates using BKT.
 * Implements caching strategy for high-performance updates.
 *
 * Architecture:
 * - In-memory Map cache for active knowledge states (hot path)
 * - MongoDB persistence for long-term storage (cold path)
 * - Event emission for downstream services (analytics, recommendations)
 *
 * Cache Strategy:
 * - Cache key: `${userId}:${conceptId}`
 * - Cache TTL: 1 hour for inactive states
 * - Cache eviction: LRU when memory threshold reached
 */
/** Wraps a cached value with its insertion timestamp for TTL checks. */
interface CacheEntry {
  cachedAt: number;
  state: KnowledgeState;
}

@Injectable()
export class KnowledgeStateTrackerService implements OnModuleDestroy {
  /** Sweep interval: prune expired entries every 15 minutes. */
  private readonly CACHE_SWEEP_INTERVAL = 15 * 60 * 1000;

  /** Cache TTL: evict entries not accessed within 1 hour. */
  private readonly CACHE_TTL = 60 * 60 * 1000;

  private readonly logger = new Logger(KnowledgeStateTrackerService.name);

  /**
   * In-memory cache for active knowledge states.
   * Key format: `${userId}:${conceptId}`
   * Each entry carries a `cachedAt` timestamp; entries older than CACHE_TTL
   * are evicted on read and during periodic sweeps.
   */
  private readonly stateCache = new Map<string, CacheEntry>();

  private readonly sweepTimer: ReturnType<typeof setInterval>;

  constructor(
    @InjectModel(KnowledgeStateDocument.name)
    private readonly knowledgeStateModel: Model<KnowledgeStateDoc>,
    private readonly bktAlgorithm: BKTAlgorithmService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.sweepTimer = setInterval(
      () => this.sweepExpiredEntries(),
      this.CACHE_SWEEP_INTERVAL,
    );
    this.logger.log('KnowledgeStateTrackerService initialized');
  }

  /**
   * Clear cache (useful for testing or memory management).
   */
  clearCache(): void {
    this.stateCache.clear();
    this.logger.log('Cache cleared');
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): { size: number } {
    return { size: this.stateCache.size };
  }

  /**
   * Get current knowledge state for a user-concept pair.
   * Checks cache first, then database.
   *
   * @param userId - ID of the user
   * @param conceptId - ID of the concept
   * @returns KnowledgeState or null if not found
   */
  async getKnowledgeState(
    userId: string,
    conceptId: string,
  ): Promise<KnowledgeState | null> {
    const cacheKey = this.getCacheKey(userId, conceptId);

    // Check cache first — evict on read if the entry has expired
    const cachedEntry = this.stateCache.get(cacheKey);
    if (cachedEntry) {
      if (Date.now() - cachedEntry.cachedAt < this.CACHE_TTL) {
        this.logger.debug(`Cache hit: ${cacheKey}`);
        return cachedEntry.state;
      }
      this.stateCache.delete(cacheKey);
      this.logger.debug(`Cache expired (evicted on read): ${cacheKey}`);
    }

    const userObjectId = this.toObjectId(userId);

    // Query database
    const state = await this.knowledgeStateModel
      .findOne({
        conceptId,
        userId: userObjectId,
      })
      .exec();

    if (state) {
      // Convert Mongoose document to BKT interface type
      const plainState = this.toInterfaceState(state);
      this.stateCache.set(cacheKey, {
        cachedAt: Date.now(),
        state: plainState,
      });
      return plainState;
    }

    return null;
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
    const userObjectId = this.toObjectId(userId);

    const states = await this.knowledgeStateModel
      .find({ userId: userObjectId })
      .sort({ lastAssessed: -1 })
      .exec();

    return states.map((state) => this.toInterfaceState(state));
  }

  /** Clean up the sweep timer when the module is torn down (e.g. in tests). */
  onModuleDestroy(): void {
    clearInterval(this.sweepTimer);
  }

  /**
   * Reset knowledge state for a user-concept pair.
   * Useful when re-teaching a concept or correcting errors.
   *
   * @param userId - ID of the user
   * @param conceptId - ID of the concept
   */
  async resetKnowledgeState(userId: string, conceptId: string): Promise<void> {
    const userObjectId = this.toObjectId(userId);

    const result = await this.knowledgeStateModel
      .deleteOne({
        conceptId,
        userId: userObjectId,
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Knowledge state not found for user=${userId}, concept=${conceptId}`,
      );
    }

    // Remove from cache
    const cacheKey = this.getCacheKey(userId, conceptId);
    this.stateCache.delete(cacheKey);

    this.logger.log(`Reset knowledge state: ${cacheKey}`);
  }

  /**
   * Update knowledge state based on a user's response to a learning interaction.
   *
   * This is the primary method for applying BKT updates. It:
   * 1. Retrieves or creates the knowledge state
   * 2. Applies the BKT algorithm
   * 3. Persists the updated state
   * 4. Emits events for downstream processing
   *
   * @param userId - ID of the user
   * @param conceptId - ID of the concept being assessed
   * @param correct - Whether the user answered correctly
   * @param customParams - Optional custom BKT parameters (overrides defaults)
   * @returns BKTUpdateResult with updated state and diagnostics
   *
   * @example
   * const result = await tracker.updateKnowledgeState(
   *   'user_123',
   *   'algebra_linear_equations',
   *   true,
   * );
   *
   * if (result.isMastered) {
   *   console.log('User has mastered this concept!');
   * }
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

    // Step 1: Get or create knowledge state
    const currentState = await this.getOrCreateKnowledgeState(
      userId,
      conceptId,
      customParams,
    );

    const previousProbability = currentState.currentProbability;

    // Step 2: Apply BKT algorithm
    const updateResult = this.bktAlgorithm.updateKnowledgeState(
      currentState,
      correct,
    );

    // Step 3: Persist updated state
    await this.persistKnowledgeState(updateResult.state);

    // Step 4: Update cache
    this.updateCache(userId, conceptId, updateResult.state);

    // Step 5: Emit event for downstream services
    this.emitKnowledgeStateUpdatedEvent({
      conceptId,
      isMastered: updateResult.isMastered,
      newProbability: updateResult.posteriorAfterLearning,
      previousProbability,
      recommendation: updateResult.recommendation,
      timestamp: new Date(),
      userId,
    });

    return updateResult;
  }

  /**
   * Emit knowledge state updated event.
   *
   * @private
   */
  private emitKnowledgeStateUpdatedEvent(
    event: KnowledgeStateUpdatedEvent,
  ): void {
    this.eventEmitter.emit('knowledge-state.updated', event);
    this.logger.debug(
      `Emitted knowledge-state.updated event: ${event.userId}:${event.conceptId}`,
    );
  }

  /**
   * Generate cache key for user-concept pair.
   *
   * @private
   */
  private getCacheKey(userId: string, conceptId: string): string {
    return `${userId}:${conceptId}`;
  }

  /**
   * Get or create knowledge state for a user-concept pair.
   *
   * @private
   */
  private async getOrCreateKnowledgeState(
    userId: string,
    conceptId: string,
    customParams?: Partial<BKTParameters>,
  ): Promise<KnowledgeState> {
    const existingState = await this.getKnowledgeState(userId, conceptId);

    if (existingState) {
      return existingState;
    }

    // Create new knowledge state with pInit as initial probability
    const parameters: BKTParameters = {
      ...DEFAULT_BKT_PARAMS,
      ...customParams,
    };

    this.bktAlgorithm.validateParameters(parameters);

    const newState: KnowledgeState = {
      attempts: 0,
      conceptId,
      correctAttempts: 0,
      currentProbability: parameters.pInit,
      lastAssessed: new Date(),
      parameters,
      userId,
    };

    this.logger.log(
      `Created new knowledge state: user=${userId}, concept=${conceptId}, pInit=${parameters.pInit}`,
    );

    return newState;
  }

  /**
   * Persist knowledge state to database.
   *
   * @private
   */
  private async persistKnowledgeState(state: KnowledgeState): Promise<void> {
    await this.knowledgeStateModel
      .updateOne(
        {
          conceptId: state.conceptId,
          userId: state.userId,
        },
        {
          $set: {
            attempts: state.attempts,
            correctAttempts: state.correctAttempts,
            currentProbability: state.currentProbability,
            lastAssessed: state.lastAssessed,
            parameters: state.parameters,
          },
        },
        { upsert: true },
      )
      .exec();
  }

  /**
   * Evict all cache entries whose TTL has expired.
   * Called periodically by the sweep timer.
   *
   * @private
   */
  private sweepExpiredEntries(): void {
    const now = Date.now();
    let evicted = 0;
    for (const [key, entry] of this.stateCache) {
      if (now - entry.cachedAt >= this.CACHE_TTL) {
        this.stateCache.delete(key);
        evicted++;
      }
    }
    if (evicted > 0) {
      this.logger.debug(`Cache sweep: evicted ${evicted} expired entries`);
    }
  }

  /**
   * Map a Mongoose document to the BKT interface KnowledgeState type.
   * Converts ObjectId fields to strings for compatibility with the BKT algorithm.
   *
   * @private
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

  /**
   * Update in-memory cache with a fresh TTL timestamp.
   *
   * @private
   */
  private updateCache(
    userId: string,
    conceptId: string,
    state: KnowledgeState,
  ): void {
    const cacheKey = this.getCacheKey(userId, conceptId);
    this.stateCache.set(cacheKey, { cachedAt: Date.now(), state });
  }
}
