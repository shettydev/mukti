import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RequestQueueDocument = Document & RequestQueue;

@Schema({ collection: 'request_queue', timestamps: true })
export class RequestQueue {
  // Virtual fields
  _id: Types.ObjectId;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Object })
  context?: {
    maxTokens?: number;
    model?: string;
    temperature?: number;
  };

  @Prop({ ref: 'Conversation', required: true, type: Types.ObjectId })
  conversationId: Types.ObjectId;

  createdAt: Date;

  @Prop({ type: String })
  error?: string;

  // For queue position tracking
  @Prop({ type: Number })
  estimatedWaitTimeMs?: number;

  @Prop({ default: 3, type: Number })
  maxRetries: number;

  @Prop({ default: 0, index: true, type: Number })
  priority: number; // Higher = process first. Paid users get higher priority

  @Prop({ default: () => new Date(), index: true, required: true, type: Date })
  queuedAt: Date;

  @Prop({ type: Object })
  result?: {
    latencyMs?: number;
    messageId?: Types.ObjectId;
    model?: string;
    tokens?: number;
  };

  @Prop({ default: 0, type: Number })
  retryCount: number;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({
    default: 'pending',
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    index: true,
    required: true,
    type: String,
  })
  status: string;

  @Prop({ type: String })
  technique?: string;

  updatedAt: Date;
  @Prop({ index: true, ref: 'User', required: true, type: Types.ObjectId })
  userId: Types.ObjectId;
  @Prop({ required: true, type: String })
  userMessage: string;
}

export const RequestQueueSchema = SchemaFactory.createForClass(RequestQueue);

// Indexes for queue processing
RequestQueueSchema.index({ priority: -1, queuedAt: 1, status: 1 });
RequestQueueSchema.index({ status: 1, userId: 1 });
RequestQueueSchema.index({ conversationId: 1 });
RequestQueueSchema.index({ queuedAt: 1, status: 1 });

// TTL index - auto-delete completed/failed requests after 24 hours
RequestQueueSchema.index(
  { completedAt: 1 },
  {
    expireAfterSeconds: 86400,
    partialFilterExpression: {
      completedAt: { $exists: true },
      status: { $in: ['completed', 'failed', 'cancelled'] },
    },
  },
);

// Virtual for user
RequestQueueSchema.virtual('user', {
  foreignField: '_id',
  justOne: true,
  localField: 'userId',
  ref: 'User',
});

// Virtual for conversation
RequestQueueSchema.virtual('conversation', {
  foreignField: '_id',
  justOne: true,
  localField: 'conversationId',
  ref: 'Conversation',
});

// Method to start processing
RequestQueueSchema.methods.startProcessing = function () {
  this.status = 'processing';
  this.startedAt = new Date();
  return this.save();
};

// Method to mark as completed
RequestQueueSchema.methods.markCompleted = function (result?: any) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (result) {
    this.result = result;
  }
  return this.save();
};

// Method to mark as failed
RequestQueueSchema.methods.markFailed = function (error: string) {
  this.status = 'failed';
  this.completedAt = new Date();
  this.error = error;
  this.retryCount++;
  return this.save();
};

// Method to retry
RequestQueueSchema.methods.retry = function () {
  if (this.retryCount >= this.maxRetries) {
    return this.markFailed('Max retries exceeded');
  }
  this.status = 'pending';
  this.error = undefined;
  this.startedAt = undefined;
  return this.save();
};

// Static method to get next request to process
RequestQueueSchema.statics.getNextRequest = function () {
  return this.findOneAndUpdate(
    { status: 'pending' },
    {
      $set: {
        startedAt: new Date(),
        status: 'processing',
      },
    },
    {
      new: true,
      sort: { priority: -1, queuedAt: 1 },
    },
  ).exec();
};

// Static method to get queue position
RequestQueueSchema.statics.getQueuePosition = async function (
  requestId: Types.ObjectId,
) {
  const request = await this.findById(requestId);
  if (!request || request.status !== 'pending') {
    return 0;
  }

  const position = await this.countDocuments({
    $or: [
      { priority: { $gt: request.priority } },
      { priority: request.priority, queuedAt: { $lt: request.queuedAt } },
    ],
    status: 'pending',
  });

  return position + 1;
};

// Static method to get queue stats
RequestQueueSchema.statics.getQueueStats = async function () {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);
};

// Static method to cleanup old requests
RequestQueueSchema.statics.cleanupOldRequests = function (olderThanDays = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  return this.deleteMany({
    completedAt: { $lt: cutoffDate },
    status: { $in: ['completed', 'failed', 'cancelled'] },
  }).exec();
};

RequestQueueSchema.set('toJSON', { virtuals: true });
RequestQueueSchema.set('toObject', { virtuals: true });
