import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Gap detection result stored on dialogue for tracking.
 * From RFC-0001 Knowledge Gap Detection System.
 */
export interface GapDetectionSnapshot {
  /** Timestamp of detection */
  detectedAt: Date;
  /** Overall gap score (0-1, higher = more certain gap exists) */
  gapScore: number;
  /** Current P(L) from BKT */
  knowledgeProbability: number;
  /** Recommended action */
  recommendation: 'scaffold' | 'socratic' | 'teach';
  /** Root knowledge gap concept ID if found */
  rootGap: null | string;
  /** Determined scaffold level */
  scaffoldLevel: ScaffoldLevel;
  /** Signal breakdown */
  signals: {
    behavioral: number;
    linguistic: number;
    temporal: number;
  };
}

export type NodeDialogueDocument = Document & NodeDialogue;
/**
 * Valid node types for dialogue context.
 * Canvas node types: 'seed', 'soil', 'root', 'insight'
 * ThoughtMap node types (RFC-0003): 'topic', 'thought', 'question'
 */
export type NodeType =
  | 'insight'
  | 'question'
  | 'root'
  | 'seed'
  | 'soil'
  | 'thought'
  | 'topic';

/**
 * Scaffold levels from RFC-0002 Adaptive Scaffolding Framework.
 * Determines the level of support provided to the user.
 */
export type ScaffoldLevel = 0 | 1 | 2 | 3 | 4;

/**
 * NodeDialogue schema for storing dialogue threads associated with canvas nodes.
 *
 * @remarks
 * This schema links Socratic dialogue conversations to specific nodes on the
 * Thinking Canvas, enabling context-aware questioning for each aspect of the
 * user's problem structure.
 */
@Schema({ collection: 'node_dialogues', timestamps: true })
export class NodeDialogue {
  _id: Types.ObjectId;

  /**
   * Count of consecutive failed responses at current level.
   * Used for scaffold escalation (2 failures = increase level).
   */
  @Prop({ default: 0, min: 0, type: Number })
  consecutiveFailures: number;

  /**
   * Count of consecutive successful responses at current level.
   * Used for scaffold fading (2 successes = decrease level).
   */
  @Prop({ default: 0, min: 0, type: Number })
  consecutiveSuccesses: number;

  createdAt: Date;

  /**
   * Current scaffold level for this dialogue (RFC-0002).
   * 0 = Pure Socratic, 4 = Direct Instruction
   */
  @Prop({ default: 0, max: 4, min: 0, type: Number })
  currentScaffoldLevel: ScaffoldLevel;

  /**
   * Concepts detected in this dialogue thread.
   * Populated by the KnowledgeGapDetector.
   */
  @Prop({ default: [], type: [String] })
  detectedConcepts: string[];

  /**
   * Most recent gap detection result snapshot.
   * Stored for analytics and debugging.
   */
  @Prop({ type: Object })
  lastGapDetection?: GapDetectionSnapshot;

  /**
   * Timestamp of the most recent message in this dialogue.
   */
  @Prop({ type: Date })
  lastMessageAt?: Date;

  /**
   * Optional reference to the parent ThoughtMap (RFC-0003).
   * Set only when this dialogue belongs to a Thought Map node.
   * Null / undefined for legacy Canvas node dialogues.
   */
  @Prop({ ref: 'ThoughtMap', required: false, type: Types.ObjectId })
  mapId?: Types.ObjectId;

  // ============================================================
  // RFC-0001 & RFC-0002: Knowledge Gap Detection & Scaffolding
  // ============================================================

  /**
   * Count of messages in this dialogue thread.
   */
  @Prop({ default: 0, type: Number })
  messageCount: number;

  /**
   * Unique identifier for the node (e.g., 'seed', 'soil-0', 'root-1', 'insight-0').
   */
  @Prop({ index: true, required: true, type: String })
  nodeId: string;

  /**
   * The node's content/label for context in AI prompts.
   */
  @Prop({ required: true, type: String })
  nodeLabel: string;

  /**
   * Type of node being discussed.
   */
  @Prop({
    enum: ['seed', 'soil', 'root', 'insight', 'topic', 'thought', 'question'],
    required: true,
    type: String,
  })
  nodeType: NodeType;

  /**
   * History of scaffold level transitions for this dialogue.
   */
  @Prop({
    default: [],
    type: [
      {
        fromLevel: { type: Number },
        reason: { type: String },
        timestamp: { type: Date },
        toLevel: { type: Number },
      },
    ],
  })
  scaffoldHistory: {
    fromLevel: ScaffoldLevel;
    reason: string;
    timestamp: Date;
    toLevel: ScaffoldLevel;
  }[];

  /**
   * Reference to the parent canvas session.
   * Optional for Thought Map node dialogues (RFC-0003) which have no canvas session.
   */
  @Prop({
    index: true,
    ref: 'CanvasSession',
    required: false,
    type: Types.ObjectId,
  })
  sessionId?: Types.ObjectId;

  updatedAt: Date;

  /**
   * Reference to the user for knowledge state tracking.
   */
  @Prop({ index: true, ref: 'User', type: Types.ObjectId })
  userId?: Types.ObjectId;
}

export const NodeDialogueSchema = SchemaFactory.createForClass(NodeDialogue);

// Compound index for efficient queries by session and node (unique when both present)
// sparse: true so the constraint is only enforced when sessionId is provided
NodeDialogueSchema.index(
  { nodeId: 1, sessionId: 1 },
  { sparse: true, unique: true },
);

// Index for listing dialogues by session with recent first
NodeDialogueSchema.index({ lastMessageAt: -1, sessionId: 1 });

// Sparse compound index for Thought Map node dialogues (RFC-0003)
// sparse: true because mapId is absent on legacy Canvas node dialogues
NodeDialogueSchema.index(
  { mapId: 1, nodeId: 1 },
  { sparse: true, unique: true },
);

// Virtual for session population
NodeDialogueSchema.virtual('session', {
  foreignField: '_id',
  justOne: true,
  localField: 'sessionId',
  ref: 'CanvasSession',
});

// Ensure virtuals are included in JSON
NodeDialogueSchema.set('toJSON', { virtuals: true });
NodeDialogueSchema.set('toObject', { virtuals: true });
