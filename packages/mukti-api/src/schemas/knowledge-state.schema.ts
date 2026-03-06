import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import {
  BKTParameters,
  DEFAULT_BKT_PARAMS,
} from '../modules/knowledge-tracing/interfaces/bkt.interface';

export type KnowledgeStateDocument = Document & KnowledgeState;

/**
 * Knowledge State Schema for BKT (Bayesian Knowledge Tracing)
 *
 * Stores the evolving knowledge state of a user for specific concepts
 * using the BKT probabilistic model.
 *
 * @remarks
 * Each document represents one user-concept pair. The currentProbability
 * field tracks P(L_n) - the probability that the user has mastered
 * this concept after n learning interactions.
 */
@Schema({ collection: 'knowledge_states', timestamps: true })
export class KnowledgeState {
  _id: Types.ObjectId;

  /**
   * Total number of learning interactions (attempts) for this concept.
   * Includes both correct and incorrect responses.
   */
  @Prop({ default: 0, min: 0, required: true, type: Number })
  attempts: number;

  /**
   * ID of the concept being tracked.
   * Should reference a Concept document or use a standardized concept ID.
   *
   * @example "algebra_linear_equations", "calculus_derivatives"
   */
  @Prop({ index: true, required: true, type: String })
  conceptId: string;

  /**
   * Number of correct attempts out of total attempts.
   * Used for analytics and accuracy tracking.
   */
  @Prop({ default: 0, min: 0, required: true, type: Number })
  correctAttempts: number;

  /**
   * Timestamp of when this knowledge state was first created.
   * Automatically managed by Mongoose timestamps.
   */
  createdAt: Date;

  /**
   * Current knowledge probability P(L_n).
   * Range: 0.0 - 1.0
   *
   * Represents the posterior probability that the user has mastered
   * this concept after n learning interactions.
   */
  @Prop({ max: 1, min: 0, required: true, type: Number })
  currentProbability: number;

  /**
   * Timestamp of the last knowledge state update.
   * Updated each time the user interacts with this concept.
   */
  @Prop({ default: Date.now, required: true, type: Date })
  lastAssessed: Date;

  /**
   * BKT parameters used for this concept.
   * Can be customized per concept or use global defaults.
   */
  @Prop({
    default: DEFAULT_BKT_PARAMS,
    required: true,
    type: {
      pGuess: { max: 1, min: 0, required: true, type: Number },
      pInit: { max: 1, min: 0, required: true, type: Number },
      pLearn: { max: 1, min: 0, required: true, type: Number },
      pSlip: { max: 1, min: 0, required: true, type: Number },
    },
  })
  parameters: BKTParameters;

  /**
   * Timestamp of the last update to this document.
   * Automatically managed by Mongoose timestamps.
   */
  updatedAt: Date;

  /**
   * ID of the user whose knowledge is being tracked.
   * References the User collection.
   */
  @Prop({ index: true, ref: 'User', required: true, type: Types.ObjectId })
  userId: Types.ObjectId;
}

export const KnowledgeStateSchema =
  SchemaFactory.createForClass(KnowledgeState);

// Compound index for efficient user-concept lookups
KnowledgeStateSchema.index({ conceptId: 1, userId: 1 }, { unique: true });

// Index for querying by knowledge probability (e.g., finding struggling users)
KnowledgeStateSchema.index({ currentProbability: 1 });

// Index for time-based queries (e.g., recently assessed concepts)
KnowledgeStateSchema.index({ lastAssessed: -1 });

// Virtual for user population
KnowledgeStateSchema.virtual('user', {
  foreignField: '_id',
  justOne: true,
  localField: 'userId',
  ref: 'User',
});

// Ensure virtuals are included in JSON
KnowledgeStateSchema.set('toJSON', { virtuals: true });
KnowledgeStateSchema.set('toObject', { virtuals: true });
