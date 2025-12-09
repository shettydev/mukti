import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CanvasSessionDocument = CanvasSession & Document;

/**
 * Node position for persisting custom node positions on the canvas.
 */
export interface NodePosition {
  /** Unique identifier for the node (e.g., 'seed', 'soil-0', 'root-1') */
  nodeId: string;
  /** X coordinate on the canvas */
  x: number;
  /** Y coordinate on the canvas */
  y: number;
}

/**
 * Problem structure embedded document containing the three key elements
 * of a Thinking Canvas session: Seed, Soil, and Roots.
 */
export interface ProblemStructure {
  /** Core assumptions the user holds about the problem (1-8 items, 5-200 chars each) */
  roots: string[];
  /** The main problem statement (10-500 characters) */
  seed: string;
  /** Context and constraints surrounding the problem (0-10 items, 5-200 chars each) */
  soil: string[];
}

/**
 * Relationship edge connecting an assumption (Root) to a constraint (Soil).
 * Used to visualize logical relationships between beliefs and limitations.
 */
export interface RelationshipEdge {
  /** Unique identifier for the relationship (e.g., 'rel-root-0-soil-1') */
  id: string;
  /** Source node ID - must be an assumption node (root-*) */
  sourceNodeId: string;
  /** Target node ID - must be a constraint node (soil-*) */
  targetNodeId: string;
}

/**
 * Canvas Session schema for storing Thinking Canvas problem structures.
 *
 * @remarks
 * This schema stores the structured problem definition created through
 * the Setup Wizard, which provides context for Socratic AI mentoring.
 */
@Schema({ collection: 'canvas_sessions', timestamps: true })
export class CanvasSession {
  _id: Types.ObjectId;

  createdAt: Date;

  /**
   * Array of node IDs that were added dynamically after the initial setup.
   * Used to distinguish original setup nodes from user-added nodes.
   * Original nodes cannot be deleted, while dynamic nodes can.
   */
  @Prop({ default: [], type: [String] })
  dynamicNodeIds: string[];

  /**
   * Array of node IDs that have been explored through Socratic dialogue.
   * Used for Phase 3 integration to track exploration progress.
   */
  @Prop({ default: [], type: [String] })
  exploredNodes: string[];

  /**
   * Custom node positions set by the user through drag operations.
   * If empty, auto-layout positions are used.
   */
  @Prop({
    default: [],
    type: [
      {
        nodeId: { required: true, type: String },
        x: { required: true, type: Number },
        y: { required: true, type: Number },
      },
    ],
  })
  nodePositions: NodePosition[];

  @Prop({
    required: true,
    type: {
      roots: { required: true, type: [String] },
      seed: { required: true, type: String },
      soil: { default: [], type: [String] },
    },
  })
  problemStructure: ProblemStructure;

  /**
   * Array of relationship edges connecting assumptions (Roots) to constraints (Soil).
   * Stored as embedded documents for efficient retrieval with the session.
   */
  @Prop({
    default: [],
    type: [
      {
        id: { required: true, type: String },
        sourceNodeId: { required: true, type: String },
        targetNodeId: { required: true, type: String },
      },
    ],
  })
  relationshipEdges: RelationshipEdge[];

  updatedAt: Date;
  @Prop({ index: true, ref: 'User', required: true, type: Types.ObjectId })
  userId: Types.ObjectId;
}

export const CanvasSessionSchema = SchemaFactory.createForClass(CanvasSession);

// Indexes for performance
CanvasSessionSchema.index({ createdAt: -1, userId: 1 });

// Virtual for user population
CanvasSessionSchema.virtual('user', {
  foreignField: '_id',
  justOne: true,
  localField: 'userId',
  ref: 'User',
});

// Ensure virtuals are included in JSON
CanvasSessionSchema.set('toJSON', { virtuals: true });
CanvasSessionSchema.set('toObject', { virtuals: true });
