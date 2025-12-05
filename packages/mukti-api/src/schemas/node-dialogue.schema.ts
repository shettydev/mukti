import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NodeDialogueDocument = Document & NodeDialogue;

/**
 * Valid node types for dialogue context.
 */
export type NodeType = 'insight' | 'root' | 'seed' | 'soil';

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

  createdAt: Date;

  /**
   * Timestamp of the most recent message in this dialogue.
   */
  @Prop({ type: Date })
  lastMessageAt?: Date;

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
    enum: ['seed', 'soil', 'root', 'insight'],
    required: true,
    type: String,
  })
  nodeType: NodeType;

  /**
   * Reference to the parent canvas session.
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

export const NodeDialogueSchema = SchemaFactory.createForClass(NodeDialogue);

// Compound index for efficient queries by session and node (unique constraint)
NodeDialogueSchema.index({ nodeId: 1, sessionId: 1 }, { unique: true });

// Index for listing dialogues by session with recent first
NodeDialogueSchema.index({ lastMessageAt: -1, sessionId: 1 });

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
