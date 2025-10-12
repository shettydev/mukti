import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ResourceDocument = Document & Resource;

@Schema({ collection: 'resources', timestamps: true })
export class Resource {
  // Virtual fields
  _id: Types.ObjectId;

  createdAt: Date;

  @Prop({ required: true, type: String })
  description: string;

  @Prop({ default: 0, type: Number })
  downvotes: number;

  @Prop({ default: true, type: Boolean })
  isActive: boolean;

  @Prop({ type: Date })
  moderatedAt?: Date;

  @Prop({ type: String })
  moderationNotes?: string;

  @Prop({ ref: 'User', type: Types.ObjectId })
  moderatorId?: Types.ObjectId;

  @Prop({
    default: 'article',
    enum: ['article', 'video', 'book', 'course', 'tool', 'other'],
    type: String,
  })
  resourceType: string;

  @Prop({ default: 0, index: true, type: Number })
  score: number; // upvotes - downvotes (for sorting)

  @Prop({
    default: 'pending',
    enum: ['pending', 'approved', 'rejected'],
    index: true,
    required: true,
    type: String,
  })
  status: string;

  @Prop({ default: [], index: true, type: [String] })
  tags: string[];

  @Prop({ required: true, trim: true, type: String })
  title: string;

  updatedAt: Date;

  @Prop({ default: 0, type: Number })
  upvotes: number;

  @Prop({ required: true, type: String })
  url: string;
  @Prop({ index: true, ref: 'User', required: true, type: Types.ObjectId })
  userId: Types.ObjectId;
  @Prop({ default: 0, type: Number })
  viewCount: number;
}

export const ResourceSchema = SchemaFactory.createForClass(Resource);

// Indexes for performance
ResourceSchema.index({ userId: 1 });
ResourceSchema.index({ createdAt: -1, status: 1 });
ResourceSchema.index({ score: -1, status: 1 });
ResourceSchema.index({ tags: 1 });
ResourceSchema.index({ resourceType: 1 });
ResourceSchema.index({ isActive: 1, score: -1, status: 1 });

// Full-text search on title and description
ResourceSchema.index({ description: 'text', title: 'text' });

// Virtual for user population
ResourceSchema.virtual('user', {
  foreignField: '_id',
  justOne: true,
  localField: 'userId',
  ref: 'User',
});

// Virtual for moderator population
ResourceSchema.virtual('moderator', {
  foreignField: '_id',
  justOne: true,
  localField: 'moderatorId',
  ref: 'User',
});

// Virtual for votes
ResourceSchema.virtual('votes', {
  foreignField: 'targetId',
  localField: '_id',
  ref: 'Vote',
});

// Method to update vote counts
ResourceSchema.methods.updateVoteCount = function (delta: number) {
  if (delta > 0) {
    this.upvotes += Math.abs(delta);
  } else if (delta < 0) {
    this.downvotes += Math.abs(delta);
  }
  this.score = this.upvotes - this.downvotes;
};

// Static method to find popular resources
ResourceSchema.statics.findPopular = function (limit = 10, minScore = 5) {
  return this.find({
    isActive: true,
    score: { $gte: minScore },
    status: 'approved',
  })
    .sort({ createdAt: -1, score: -1 })
    .limit(limit)
    .populate('userId', 'name email')
    .exec();
};

ResourceSchema.set('toJSON', { virtuals: true });
ResourceSchema.set('toObject', { virtuals: true });
