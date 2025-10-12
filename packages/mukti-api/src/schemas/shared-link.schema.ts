import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SharedLinkDocument = Document & SharedLink;

@Schema({ collection: 'shared_links', timestamps: true })
export class SharedLink {
  // Virtual fields
  _id: Types.ObjectId;

  @Prop({ default: true, type: Boolean })
  allowComments: boolean;

  @Prop({
    index: true,
    ref: 'Conversation',
    required: true,
    type: Types.ObjectId,
  })
  conversationId: Types.ObjectId;

  createdAt: Date;

  @Prop({ ref: 'User', required: true, type: Types.ObjectId })
  createdBy: Types.ObjectId;

  @Prop({ index: true, type: Date })
  expiresAt?: Date;

  @Prop({ default: true, index: true, type: Boolean })
  isActive: boolean;

  @Prop({ type: Date })
  lastViewedAt?: Date;

  @Prop({ default: 0, type: Number })
  maxViews?: number; // Optional view limit

  @Prop({ type: String })
  passwordHash?: string;

  @Prop({ default: false, type: Boolean })
  requiresPassword: boolean;

  @Prop({ required: true, type: String, unique: true })
  token: string;
  updatedAt: Date;
  @Prop({ default: 0, type: Number })
  viewCount: number;
}

export const SharedLinkSchema = SchemaFactory.createForClass(SharedLink);

// Indexes
SharedLinkSchema.index({ token: 1 }, { unique: true });
SharedLinkSchema.index({ conversationId: 1 });
SharedLinkSchema.index({ expiresAt: 1 }, { sparse: true });
SharedLinkSchema.index({ expiresAt: 1, isActive: 1 });
SharedLinkSchema.index({ createdAt: -1, createdBy: 1 });

// TTL index for expired links
SharedLinkSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { expiresAt: { $exists: true } },
  },
);

// Virtual for conversation
SharedLinkSchema.virtual('conversation', {
  foreignField: '_id',
  justOne: true,
  localField: 'conversationId',
  ref: 'Conversation',
});

// Virtual for creator
SharedLinkSchema.virtual('creator', {
  foreignField: '_id',
  justOne: true,
  localField: 'createdBy',
  ref: 'User',
});

// Method to check if link is valid
SharedLinkSchema.methods.isValid = function (): boolean {
  if (!this.isActive) {
    return false;
  }

  if (this.expiresAt && new Date() > this.expiresAt) {
    return false;
  }

  if (this.maxViews && this.viewCount >= this.maxViews) {
    return false;
  }

  return true;
};

// Method to increment view count
SharedLinkSchema.methods.incrementViewCount = function () {
  this.viewCount++;
  this.lastViewedAt = new Date();

  // Auto-deactivate if max views reached
  if (this.maxViews && this.viewCount >= this.maxViews) {
    this.isActive = false;
  }

  return this.save();
};

// Static method to generate unique token
SharedLinkSchema.statics.generateToken = function (length = 16): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

// Static method to find active link by token
SharedLinkSchema.statics.findByToken = function (token: string) {
  return this.findOne({
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } },
    ],
    isActive: true,
    token,
  })
    .populate('conversationId')
    .exec();
};

SharedLinkSchema.set('toJSON', {
  transform: (_, ret: any) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
  virtuals: true,
});

SharedLinkSchema.set('toObject', {
  transform: (_, ret: any) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
  virtuals: true,
});
