import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DailyUsageAggregateDocument = DailyUsageAggregate & Document;

@Schema({ collection: 'daily_usage_aggregates', timestamps: true })
export class DailyUsageAggregate {
  // Virtual fields
  _id: Types.ObjectId;

  @Prop({ default: 0, type: Number })
  avgLatencyMs: number;

  @Prop({ default: 0, type: Number })
  completionTokens: number;

  @Prop({ default: 0, type: Number })
  conversationsCount: number;

  createdAt: Date;

  @Prop({ index: true, required: true, type: Date })
  date: Date; // Stored as YYYY-MM-DD 00:00:00

  @Prop({ default: 0, type: Number })
  errorCount: number;

  @Prop({ default: {}, type: Object })
  eventCounts: Record<string, number>; // { 'question': 10, 'conversation_created': 5 }

  @Prop({ default: 0, type: Number })
  messagesCount: number;

  @Prop({ default: {}, type: Object })
  modelUsage: Record<string, number>; // { 'gpt-4': 5, 'gpt-3.5': 10 }

  @Prop({ default: 0, type: Number })
  promptTokens: number;

  @Prop({ default: 0, type: Number })
  questionsCount: number;

  @Prop({ default: {}, type: Object })
  techniqueUsage: Record<string, number>; // { 'elenchus': 3, 'dialectic': 2 }

  @Prop({ default: 0, type: Number })
  totalCost: number; // In cents

  @Prop({ default: 0, type: Number })
  totalTokens: number;
  updatedAt: Date;
  @Prop({ index: true, ref: 'User', required: true, type: Types.ObjectId })
  userId: Types.ObjectId;
}

export const DailyUsageAggregateSchema =
  SchemaFactory.createForClass(DailyUsageAggregate);

// Composite unique index on userId and date
DailyUsageAggregateSchema.index({ date: 1, userId: 1 }, { unique: true });
DailyUsageAggregateSchema.index({ date: 1 });
DailyUsageAggregateSchema.index({ date: -1, userId: 1 });

// Virtual for user population
DailyUsageAggregateSchema.virtual('user', {
  foreignField: '_id',
  justOne: true,
  localField: 'userId',
  ref: 'User',
});

// Helper function for normalizing date
function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

// Method to normalize date to start of day
DailyUsageAggregateSchema.statics.normalizeDate = normalizeDate;

// Static method to upsert aggregate
DailyUsageAggregateSchema.statics.upsertAggregate = function (
  userId: Types.ObjectId,
  date: Date,
  updates: Partial<DailyUsageAggregate>,
) {
  const normalizedDate = normalizeDate(date);

  return this.findOneAndUpdate(
    { date: normalizedDate, userId },
    {
      $inc: {
        completionTokens: updates.completionTokens || 0,
        conversationsCount: updates.conversationsCount || 0,
        errorCount: updates.errorCount || 0,
        messagesCount: updates.messagesCount || 0,
        promptTokens: updates.promptTokens || 0,
        questionsCount: updates.questionsCount || 0,
        totalCost: updates.totalCost || 0,
        totalTokens: updates.totalTokens || 0,
      },
      $set: {
        avgLatencyMs: updates.avgLatencyMs,
      },
    },
    { new: true, upsert: true },
  );
};

// Static method to get aggregates for date range
DailyUsageAggregateSchema.statics.getAggregatesForRange = function (
  userId: Types.ObjectId,
  startDate: Date,
  endDate: Date,
) {
  return this.find({
    date: {
      $gte: normalizeDate(startDate),
      $lte: normalizeDate(endDate),
    },
    userId,
  })
    .sort({ date: 1 })
    .exec();
};

// Static method to get monthly summary
DailyUsageAggregateSchema.statics.getMonthlySummary = function (
  userId: Types.ObjectId,
  year: number,
  month: number,
) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  return this.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
        userId,
      },
    },
    {
      $group: {
        _id: null,
        avgLatency: { $avg: '$avgLatencyMs' },
        totalConversations: { $sum: '$conversationsCount' },
        totalCost: { $sum: '$totalCost' },
        totalErrors: { $sum: '$errorCount' },
        totalMessages: { $sum: '$messagesCount' },
        totalQuestions: { $sum: '$questionsCount' },
        totalTokens: { $sum: '$totalTokens' },
      },
    },
  ]).exec();
};

// Static method to get all users' summary for a date (admin)
DailyUsageAggregateSchema.statics.getPlatformSummary = function (date: Date) {
  const normalizedDate = normalizeDate(date);

  return this.aggregate([
    {
      $match: { date: normalizedDate },
    },
    {
      $group: {
        _id: null,
        avgLatency: { $avg: '$avgLatencyMs' },
        totalConversations: { $sum: '$conversationsCount' },
        totalCost: { $sum: '$totalCost' },
        totalQuestions: { $sum: '$questionsCount' },
        totalTokens: { $sum: '$totalTokens' },
        totalUsers: { $sum: 1 },
      },
    },
  ]).exec();
};

DailyUsageAggregateSchema.set('toJSON', { virtuals: true });
DailyUsageAggregateSchema.set('toObject', { virtuals: true });
