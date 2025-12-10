import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InsightNodeDocument = Document & InsightNode;

/**
 * Position coordinates for an insight node on the canvas.
 */
export interface InsightNodePosition {
  /** X coordinate on the canvas */
  x: number;
  /** Y coordinate on the canvas */
  y: number;
}

/**
 * InsightNode schema for storing dynamically created insight nodes.
 *
 * @remarks
 * Insight nodes are spawned from dialogue representing discoveries or realizations.
 * They are connected to their parent node and persist across sessions.
 * Stored in a separate collection for efficient queries by session ID.
 */
@Schema({ collection: 'insight_nodes', timestamps: true })
export class InsightNode {
  _id: Types.ObjectId;

  createdAt: Date;

  /**
   * Whether this insight has been explored through Socratic dialogue.
   */
  @Prop({ default: false })
  isExplored: boolean;

  /**
   * The insight label/text describing the discovery or realization.
   */
  @Prop({ required: true })
  label: string;

  /**
   * Unique identifier for this node (e.g., 'insight-0', 'insight-1').
   */
  @Prop({ required: true })
  nodeId: string;

  /**
   * The parent node ID from which this insight was spawned.
   * Can be a root, soil, seed, or another insight node.
   */
  @Prop({ required: true })
  parentNodeId: string;

  /**
   * Position coordinates on the canvas.
   */
  @Prop({
    required: true,
    type: {
      x: { required: true, type: Number },
      y: { required: true, type: Number },
    },
  })
  position: InsightNodePosition;

  /**
   * Reference to the canvas session this insight belongs to.
   */
  @Prop({
    index: true,
    ref: 'CanvasSession',
    required: true,
    type: Types.ObjectId,
  })
  sessionId: Types.ObjectId;

  updatedAt: Date;
}

export const InsightNodeSchema = SchemaFactory.createForClass(InsightNode);

// Index on sessionId for efficient queries (Requirements 7.4)
InsightNodeSchema.index({ sessionId: 1 });

// Compound index for finding insights by session and nodeId
InsightNodeSchema.index({ nodeId: 1, sessionId: 1 }, { unique: true });

// Virtual for session population
InsightNodeSchema.virtual('session', {
  foreignField: '_id',
  justOne: true,
  localField: 'sessionId',
  ref: 'CanvasSession',
});

// Ensure virtuals are included in JSON
InsightNodeSchema.set('toJSON', { virtuals: true });
InsightNodeSchema.set('toObject', { virtuals: true });
