import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UsageEventDocument = Document & UsageEvent;

export interface UsageEventMetadata {
  [key: string]: any;
  completionTokens?: number;
  conversationId?: Types.ObjectId;
  cost?: number;
  error?: string;
  latencyMs?: number;
  model?: string;
  promptTokens?: number;
  statusCode?: number;
  technique?: string;
  tokens?: number;
}

@Schema({ collection: 'usage_events', timestamps: false })
export class UsageEvent {
  // Virtual fields
  _id: Types.ObjectId;

  @Prop({ index: true, required: true, type: String })
  eventType: string;

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ type: Object })
  metadata?: UsageEventMetadata;

  @Prop({ default: () => new Date(), index: true, required: true, type: Date })
  timestamp: Date;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ index: true, ref: 'User', required: true, type: Types.ObjectId })
  userId: Types.ObjectId;
}

export const UsageEventSchema = SchemaFactory.createForClass(UsageEvent);

// Indexes - optimized for time-series queries
UsageEventSchema.index({ timestamp: -1, userId: 1 });
UsageEventSchema.index({ eventType: 1, timestamp: -1 });
UsageEventSchema.index({ timestamp: -1 });
UsageEventSchema.index({ eventType: 1, timestamp: -1, userId: 1 });

// TTL index - auto-delete events older than 90 days
UsageEventSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 7776000 }, // 90 days
);

// Virtual for user population
UsageEventSchema.virtual('user', {
  foreignField: '_id',
  justOne: true,
  localField: 'userId',
  ref: 'User',
});

// Static method to log an event
UsageEventSchema.statics.logEvent = function (
  userId: Types.ObjectId,
  eventType: string,
  metadata?: UsageEventMetadata,
) {
  return this.create({
    eventType,
    metadata,
    timestamp: new Date(),
    userId,
  });
};

// Static method to get event counts by type
UsageEventSchema.statics.getEventCounts = async function (
  userId: Types.ObjectId,
  startDate: Date,
  endDate: Date,
) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        userId,
      },
    },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

// Static method to get usage statistics
UsageEventSchema.statics.getUsageStats = async function (
  userId: Types.ObjectId,
  startDate: Date,
  endDate: Date,
) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        userId,
      },
    },
    {
      $group: {
        _id: null,
        avgLatency: { $avg: '$metadata.latencyMs' },
        totalCost: { $sum: '$metadata.cost' },
        totalEvents: { $sum: 1 },
        totalTokens: { $sum: '$metadata.tokens' },
      },
    },
  ]);
};

// Static method to get daily event counts (for charts)
UsageEventSchema.statics.getDailyEventCounts = async function (
  userId: Types.ObjectId,
  days = 30,
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        userId,
      },
    },
    {
      $group: {
        _id: {
          day: { $dayOfMonth: '$timestamp' },
          month: { $month: '$timestamp' },
          year: { $year: '$timestamp' },
        },
        count: { $sum: 1 },
        totalCost: { $sum: '$metadata.cost' },
        totalTokens: { $sum: '$metadata.tokens' },
      },
    },
    {
      $sort: { '_id.day': 1, '_id.month': 1, '_id.year': 1 },
    },
  ]);
};

UsageEventSchema.set('toJSON', { virtuals: true });
UsageEventSchema.set('toObject', { virtuals: true });
