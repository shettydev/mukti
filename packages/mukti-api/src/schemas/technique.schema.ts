import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TechniqueDocument = Document & Technique;

export interface TechniqueTemplate {
  conversationFlow?: string[];
  exampleQuestions: string[];
  followUpStrategy: string;
  maxQuestionsPerTopic?: number;
  questioningStyle: string;
  systemPrompt: string;
}

@Schema({ collection: 'techniques', timestamps: true })
export class Technique {
  // Virtual fields
  _id: Types.ObjectId;

  createdAt: Date;

  @Prop({ required: true, type: String })
  description: string;

  @Prop({
    default: 'beginner',
    enum: ['beginner', 'intermediate', 'advanced'],
    type: String,
  })
  difficulty: string;

  @Prop({ default: 0, type: Number })
  downvotes: number;

  @Prop({ default: true, type: Boolean })
  isActive: boolean;

  @Prop({ default: false, type: Boolean })
  isBuiltIn: boolean; // System-provided techniques

  @Prop({ type: Date })
  moderatedAt?: Date;

  @Prop({ type: String })
  moderationNotes?: string;

  @Prop({ ref: 'User', type: Types.ObjectId })
  moderatorId?: Types.ObjectId;

  @Prop({ required: true, trim: true, type: String, unique: true })
  name: string;

  @Prop({ default: 0, index: true, type: Number })
  score: number; // upvotes - downvotes

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

  @Prop({ required: true, type: Object })
  template: TechniqueTemplate;

  updatedAt: Date;

  @Prop({ default: 0, type: Number })
  upvotes: number;
  @Prop({ default: 0, index: true, type: Number })
  useCount: number;
  @Prop({ index: true, ref: 'User', required: true, type: Types.ObjectId })
  userId: Types.ObjectId;
}

export const TechniqueSchema = SchemaFactory.createForClass(Technique);

// Indexes
TechniqueSchema.index({ name: 1 }, { unique: true });
TechniqueSchema.index({ score: -1, status: 1 });
TechniqueSchema.index({ userId: 1 });
TechniqueSchema.index({ useCount: -1 });
TechniqueSchema.index({ tags: 1 });
TechniqueSchema.index({ isActive: 1, score: -1, status: 1 });
TechniqueSchema.index({ isActive: 1, isBuiltIn: 1 });
TechniqueSchema.index({ difficulty: 1 });

// Full-text search
TechniqueSchema.index({ description: 'text', name: 'text' });

// Virtual for user
TechniqueSchema.virtual('user', {
  foreignField: '_id',
  justOne: true,
  localField: 'userId',
  ref: 'User',
});

// Virtual for moderator
TechniqueSchema.virtual('moderator', {
  foreignField: '_id',
  justOne: true,
  localField: 'moderatorId',
  ref: 'User',
});

// Method to increment use count
TechniqueSchema.methods.incrementUseCount = function () {
  this.useCount++;
  return this.save();
};

// Method to update vote counts
TechniqueSchema.methods.updateVoteCount = function (delta: number) {
  if (delta > 0) {
    this.upvotes += Math.abs(delta);
  } else if (delta < 0) {
    this.downvotes += Math.abs(delta);
  }
  this.score = this.upvotes - this.downvotes;
};

// Static method to find popular techniques
TechniqueSchema.statics.findPopular = function (limit = 10) {
  return this.find({
    isActive: true,
    status: 'approved',
  })
    .sort({ score: -1, useCount: -1 })
    .limit(limit)
    .populate('userId', 'name email')
    .exec();
};

// Static method to get built-in techniques
TechniqueSchema.statics.findBuiltIn = function () {
  return this.find({
    isActive: true,
    isBuiltIn: true,
  })
    .sort({ name: 1 })
    .exec();
};

TechniqueSchema.set('toJSON', { virtuals: true });
TechniqueSchema.set('toObject', { virtuals: true });
