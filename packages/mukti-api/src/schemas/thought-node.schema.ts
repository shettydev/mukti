import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ThoughtNodeDocument = Document & ThoughtNode;

/**
 * Position coordinates for a ThoughtNode on the canvas.
 */
export interface ThoughtNodePosition {
  /** X coordinate on the canvas */
  x: number;
  /** Y coordinate on the canvas */
  y: number;
}

/**
 * Valid node types within a ThoughtMap.
 *
 * - `topic`    — root or sub-topic heading (structural)
 * - `thought`  — a free-form idea or observation
 * - `question` — an open question the user wants to explore
 * - `insight`  — a realisation or conclusion reached through dialogue
 */
export type ThoughtNodeType = 'insight' | 'question' | 'thought' | 'topic';

/**
 * ThoughtNode schema for storing individual nodes within a Thought Map.
 *
 * @remarks
 * ThoughtNodes form a tree rooted at the 'topic' node (depth 0). Each node
 * tracks its Socratic dialogue state and whether it was promoted from an
 * AI-generated ghost suggestion. The compound index on (mapId, nodeId)
 * enforces uniqueness of node IDs within a single map.
 */
@Schema({ collection: 'thought_nodes', timestamps: true })
export class ThoughtNode {
  _id: Types.ObjectId;

  createdAt: Date;

  /**
   * Tree depth relative to the root topic node (0 = topic, 1 = direct child…).
   */
  @Prop({ min: 0, required: true, type: Number })
  depth: number;

  /**
   * Whether this node was promoted from an AI-generated ghost suggestion.
   */
  @Prop({ default: false, type: Boolean })
  fromSuggestion: boolean;

  /**
   * Whether the user has collapsed this node's children in the UI.
   */
  @Prop({ default: false, type: Boolean })
  isCollapsed: boolean;

  /**
   * Whether a Socratic dialogue has been opened for this node.
   */
  @Prop({ default: false, type: Boolean })
  isExplored: boolean;

  /**
   * User-visible text label for the node.
   */
  @Prop({ maxlength: 300, required: true, trim: true, type: String })
  label: string;

  /**
   * Reference to the parent ThoughtMap.
   */
  @Prop({
    index: true,
    ref: 'ThoughtMap',
    required: true,
    type: Types.ObjectId,
  })
  mapId: Types.ObjectId;

  /**
   * Count of Socratic dialogue messages for this node.
   */
  @Prop({ default: 0, type: Number })
  messageCount: number;

  /**
   * Unique node identifier within this map (e.g., 'topic-0', 'thought-7').
   * NOT the MongoDB _id — used as a stable reference in tree operations.
   */
  @Prop({ required: true, type: String })
  nodeId: string;

  /**
   * nodeId of the parent node. Null / undefined for the root topic node.
   */
  @Prop({ required: false, type: String })
  parentId?: string;

  /**
   * Canvas position for layout persistence.
   */
  @Prop({
    required: true,
    type: {
      x: { default: 0, type: Number },
      y: { default: 0, type: Number },
    },
  })
  position: ThoughtNodePosition;

  /**
   * Conversation message indices this node was extracted from.
   * Set only when the node was created via conversation extraction.
   */
  @Prop({ required: false, type: [Number] })
  sourceMessageIndices?: number[];

  /**
   * Type of node — determines default Socratic technique and visual style.
   */
  @Prop({
    enum: ['topic', 'thought', 'question', 'insight'],
    required: true,
    type: String,
  })
  type: ThoughtNodeType;

  updatedAt: Date;
}

export const ThoughtNodeSchema = SchemaFactory.createForClass(ThoughtNode);

// Compound unique index — nodeId must be unique within a single map
ThoughtNodeSchema.index({ mapId: 1, nodeId: 1 }, { unique: true });

// Index for listing all nodes of a map
ThoughtNodeSchema.index({ mapId: 1 });

// Virtual for map population
ThoughtNodeSchema.virtual('map', {
  foreignField: '_id',
  justOne: true,
  localField: 'mapId',
  ref: 'ThoughtMap',
});

// Ensure virtuals are included in JSON
ThoughtNodeSchema.set('toJSON', { virtuals: true });
ThoughtNodeSchema.set('toObject', { virtuals: true });
