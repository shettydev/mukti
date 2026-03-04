import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import {
  BKTParameters,
  DEFAULT_BKT_PARAMS,
} from '../modules/knowledge-tracing/interfaces/bkt.interface';

/**
 * Difficulty level for concepts - affects scaffolding thresholds
 */
export type ConceptDifficulty = 'advanced' | 'beginner' | 'intermediate';

export type ConceptDocument = Concept & Document;

/**
 * Domain categories for organizing concepts
 */
export type ConceptDomain =
  | 'general'
  | 'logic'
  | 'mathematics'
  | 'problem-solving'
  | 'programming';

/**
 * Concept Schema for Knowledge Gap Detection
 *
 * Represents a single concept in the knowledge graph with its prerequisites.
 * Used by the PrerequisiteChecker to trace root knowledge gaps.
 *
 * @remarks
 * This schema supports the recursive prerequisite checking algorithm
 * described in RFC-0001. Each concept can have multiple prerequisites,
 * forming a directed acyclic graph (DAG) of knowledge dependencies.
 *
 * @example
 * Concept: "recursion"
 * Prerequisites: ["loops", "functions", "call_stack"]
 * These prerequisites themselves have prerequisites, enabling
 * recursive gap detection up to depth=3.
 */
@Schema({ collection: 'concepts', timestamps: true })
export class Concept {
  _id: Types.ObjectId;

  /**
   * Whether this concept was auto-discovered by LLM extraction.
   * false = manually curated, true = created by LLM concept discovery pipeline.
   */
  @Prop({ default: false, index: true, type: Boolean })
  autoDiscovered: boolean;

  /**
   * Custom BKT parameters for this concept.
   * Allows tuning based on concept difficulty.
   *
   * @remarks
   * Harder concepts might have lower pLearn (slower learning)
   * and higher pSlip (more careless mistakes under complexity).
   */
  @Prop({
    default: DEFAULT_BKT_PARAMS,
    type: {
      pGuess: { max: 1, min: 0, required: true, type: Number },
      pInit: { max: 1, min: 0, required: true, type: Number },
      pLearn: { max: 1, min: 0, required: true, type: Number },
      pSlip: { max: 1, min: 0, required: true, type: Number },
    },
  })
  bktParameters: BKTParameters;

  /**
   * Brief explanation of the concept for Level 4 (direct instruction).
   * Should be 2-3 sentences max.
   */
  @Prop({ type: String })
  briefExplanation?: string;

  /**
   * Unique identifier for the concept.
   * Should be a lowercase, underscore-separated string.
   *
   * @example "linear_equations", "recursion", "async_await"
   */
  @Prop({ index: true, required: true, type: String, unique: true })
  conceptId: string;

  createdAt: Date;

  /**
   * Depth level in the prerequisite graph (0 = foundational, no prerequisites).
   * Used to optimize prerequisite traversal.
   */
  @Prop({ default: 0, min: 0, type: Number })
  depthLevel: number;

  /**
   * Brief description of what this concept covers.
   */
  @Prop({ type: String })
  description?: string;

  /**
   * Difficulty level - affects BKT parameters and scaffold thresholds.
   */
  @Prop({
    default: 'intermediate',
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true,
    type: String,
  })
  difficulty: ConceptDifficulty;

  /**
   * Domain/category this concept belongs to.
   */
  @Prop({
    default: 'general',
    enum: ['programming', 'mathematics', 'logic', 'problem-solving', 'general'],
    index: true,
    required: true,
    type: String,
  })
  domain: ConceptDomain;

  /**
   * Example questions/prompts that assess understanding of this concept.
   * Used for scaffolding at Level 3 (worked examples).
   */
  @Prop({ default: [], type: [String] })
  exampleQuestions?: string[];

  /**
   * Number of unique users who have interacted with this concept.
   * Used for auto-verification threshold (e.g., 5 users with P(L) > 0.6).
   */
  @Prop({ default: 0, min: 0, type: Number })
  interactionCount: number;

  /**
   * Whether this concept is currently active in the system.
   */
  @Prop({ default: true, index: true, type: Boolean })
  isActive: boolean;

  /**
   * Keywords/aliases that can trigger this concept detection.
   * Used by the KnowledgeGapDetector to identify relevant concepts
   * from user messages.
   *
   * @example ["loop", "for loop", "while loop", "iteration"] for concept "loops"
   */
  @Prop({ default: [], type: [String] })
  keywords: string[];

  /**
   * Human-readable name for display purposes.
   *
   * @example "Linear Equations", "Recursion", "Async/Await"
   */
  @Prop({ required: true, type: String })
  name: string;

  /**
   * Array of prerequisite concept IDs.
   * These must be learned before this concept can be effectively taught.
   *
   * @remarks
   * The PrerequisiteChecker traverses these relationships to find
   * the root knowledge gap when a user struggles with a concept.
   *
   * @example ["variables", "operators"] for concept "expressions"
   */
  @Prop({ default: [], type: [String] })
  prerequisites: string[];

  updatedAt: Date;
  /**
   * Whether this concept has been verified as accurate.
   * Manually curated concepts start verified. Auto-discovered concepts
   * get auto-verified after N users interact with them successfully.
   */
  @Prop({ default: false, type: Boolean })
  verified: boolean;
}

export const ConceptSchema = SchemaFactory.createForClass(Concept);

// Index for prerequisite lookups
ConceptSchema.index({ prerequisites: 1 });

// Index for keyword-based concept detection
ConceptSchema.index({ keywords: 1 });

// Index for domain + difficulty filtering
ConceptSchema.index({ difficulty: 1, domain: 1 });

// Index for auto-discovered concept queries
ConceptSchema.index({ autoDiscovered: 1, verified: 1 });

// Ensure virtuals are included in JSON
ConceptSchema.set('toJSON', { virtuals: true });
ConceptSchema.set('toObject', { virtuals: true });
