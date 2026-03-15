import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ThoughtMapDocument = Document & ThoughtMap;

/**
 * Settings for auto-suggestion behaviour on a ThoughtMap.
 */
export interface ThoughtMapSettings {
  /** Whether AI ghost node auto-suggestions are enabled */
  autoSuggestEnabled: boolean;
  /** Idle seconds before auto-suggestions are triggered */
  autoSuggestIdleSeconds: number;
  /** Maximum number of ghost node suggestions shown per node */
  maxSuggestionsPerNode: number;
}

/**
 * Valid lifecycle statuses for a ThoughtMap.
 */
export type ThoughtMapStatus = 'active' | 'archived' | 'draft';

/**
 * ThoughtMap schema for storing the root document of a Thought Map session.
 *
 * @remarks
 * A ThoughtMap is the top-level container for a tree of ThoughtNodes. It is
 * created from a free-text topic and can optionally be linked to a source
 * Conversation or CanvasSession for context-carry-over.
 */
@Schema({ collection: 'thought_maps', timestamps: true })
export class ThoughtMap {
  _id: Types.ObjectId;

  createdAt: Date;

  /**
   * The nodeId of the root topic ThoughtNode for this map.
   * Always a 'topic' type node at depth 0.
   */
  @Prop({ required: true, type: String })
  rootNodeId: string;

  /**
   * Auto-suggestion and display settings for this map.
   */
  @Prop({
    default: {
      autoSuggestEnabled: true,
      autoSuggestIdleSeconds: 10,
      maxSuggestionsPerNode: 4,
    },
    required: true,
    type: {
      autoSuggestEnabled: { default: true, type: Boolean },
      autoSuggestIdleSeconds: { default: 10, type: Number },
      maxSuggestionsPerNode: { default: 4, type: Number },
    },
  })
  settings: ThoughtMapSettings;

  /**
   * Optional reference to a CanvasSession that seeded this map.
   */
  @Prop({ ref: 'CanvasSession', required: false, type: Types.ObjectId })
  sourceCanvasSessionId?: Types.ObjectId;

  /**
   * Optional reference to a Conversation that seeded this map.
   */
  @Prop({ ref: 'Conversation', required: false, type: Types.ObjectId })
  sourceConversationId?: Types.ObjectId;

  /**
   * Lifecycle status of the map.
   */
  @Prop({
    default: 'active',
    enum: ['draft', 'active', 'archived'],
    required: true,
    type: String,
  })
  status: ThoughtMapStatus;

  /**
   * The central topic / title of the Thought Map (user-visible).
   */
  @Prop({ maxlength: 500, required: true, trim: true, type: String })
  title: string;

  updatedAt: Date;

  /**
   * Reference to the owning user.
   */
  @Prop({ index: true, ref: 'User', required: true, type: Types.ObjectId })
  userId: Types.ObjectId;
}

export const ThoughtMapSchema = SchemaFactory.createForClass(ThoughtMap);

// Index for dashboard queries — list maps by user
ThoughtMapSchema.index({ userId: 1 });

// Virtual for user population
ThoughtMapSchema.virtual('user', {
  foreignField: '_id',
  justOne: true,
  localField: 'userId',
  ref: 'User',
});

// Ensure virtuals are included in JSON
ThoughtMapSchema.set('toJSON', { virtuals: true });
ThoughtMapSchema.set('toObject', { virtuals: true });
