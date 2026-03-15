import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ThoughtMapShareLinkDocument = Document & ThoughtMapShareLink;

/**
 * ThoughtMapShareLink schema for persisting public share tokens for Thought Maps.
 *
 * @remarks
 * Mirrors the SharedLink pattern but targets ThoughtMap instead of Conversation.
 * One active share link per map — revoke deactivates (isActive = false) rather
 * than deleting the document so view counts are preserved.
 */
@Schema({ collection: 'thought_map_share_links', timestamps: true })
export class ThoughtMapShareLink {
  _id: Types.ObjectId;

  createdAt: Date;

  /** Reference to the owning user who created the share link. */
  @Prop({ ref: 'User', required: true, type: Types.ObjectId })
  createdBy: Types.ObjectId;

  /** Optional expiry — link is invalid after this timestamp. */
  @Prop({ type: Date })
  expiresAt?: Date;

  /** Whether the link is currently active and usable. */
  @Prop({ default: true, type: Boolean })
  isActive: boolean;

  /** Timestamp of the most recent view. */
  @Prop({ type: Date })
  lastViewedAt?: Date;

  /**
   * The Thought Map this share link exposes.
   * One map can have at most one active share link at a time.
   */
  @Prop({
    ref: 'ThoughtMap',
    required: true,
    type: Types.ObjectId,
  })
  thoughtMapId: Types.ObjectId;

  /** Unique URL-safe token used in the public share URL. */
  @Prop({ required: true, type: String })
  token: string;

  updatedAt: Date;

  /** Cumulative view count. */
  @Prop({ default: 0, type: Number })
  viewCount: number;
}

export const ThoughtMapShareLinkSchema =
  SchemaFactory.createForClass(ThoughtMapShareLink);

// Indexes
ThoughtMapShareLinkSchema.index({ token: 1 }, { unique: true });
ThoughtMapShareLinkSchema.index(
  { thoughtMapId: 1 },
  {
    partialFilterExpression: { isActive: true },
    unique: true,
  },
);
ThoughtMapShareLinkSchema.index({ createdAt: -1, createdBy: 1 });

// TTL index — auto-expire links past their expiresAt
ThoughtMapShareLinkSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { expiresAt: { $exists: true } },
  },
);

// Virtual for map population
ThoughtMapShareLinkSchema.virtual('thoughtMap', {
  foreignField: '_id',
  justOne: true,
  localField: 'thoughtMapId',
  ref: 'ThoughtMap',
});

ThoughtMapShareLinkSchema.set('toJSON', {
  transform: (_: any, ret: any) => {
    delete ret.__v;
    return ret;
  },
  virtuals: true,
});

ThoughtMapShareLinkSchema.set('toObject', {
  transform: (_: any, ret: any) => {
    delete ret.__v;
    return ret;
  },
  virtuals: true,
});
