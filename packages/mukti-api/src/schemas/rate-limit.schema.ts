import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RateLimitDocument = Document & RateLimit;

@Schema({ collection: 'rate_limits', timestamps: true })
export class RateLimit {
  // Virtual fields
  _id: Types.ObjectId;

  @Prop({ index: true, required: true, type: String })
  action: string; // 'question', 'conversation', 'resource_submit', etc.

  @Prop({ type: Date })
  blockedUntil?: Date;

  @Prop({ default: 0, required: true, type: Number })
  count: number;

  createdAt: Date;

  @Prop({ default: false, type: Boolean })
  isBlocked: boolean;

  @Prop({ required: true, type: Number })
  limit: number;

  updatedAt: Date;

  @Prop({ index: true, ref: 'User', required: true, type: Types.ObjectId })
  userId: Types.ObjectId;

  @Prop({ index: true, required: true, type: Date })
  windowEnd: Date;
  @Prop({ index: true, required: true, type: Date })
  windowStart: Date;
  @Prop({
    default: 'hour',
    enum: ['hour', 'day', 'week', 'month'],
    type: String,
  })
  windowType: string;
}

export const RateLimitSchema = SchemaFactory.createForClass(RateLimit);

// Compound index for fast lookups
RateLimitSchema.index({ action: 1, userId: 1, windowStart: 1 });

// TTL index - auto-expire when window ends
RateLimitSchema.index({ windowEnd: 1 }, { expireAfterSeconds: 0 });

// Index for cleanup queries
RateLimitSchema.index({ isBlocked: 1, windowEnd: 1 });

// Virtual for user
RateLimitSchema.virtual('user', {
  foreignField: '_id',
  justOne: true,
  localField: 'userId',
  ref: 'User',
});

// Method to check if rate limit is exceeded
RateLimitSchema.methods.isExceeded = function (): boolean {
  const now = new Date();

  if (this.isBlocked && this.blockedUntil && now < this.blockedUntil) {
    return true;
  }

  if (now > this.windowEnd) {
    return false; // Window expired
  }

  return this.count >= this.limit;
};

// Method to increment count
RateLimitSchema.methods.increment = function (amount = 1) {
  this.count += amount;

  if (this.count >= this.limit) {
    this.isBlocked = true;
    this.blockedUntil = this.windowEnd;
  }

  return this.save();
};

// Method to reset window
RateLimitSchema.methods.reset = function () {
  this.count = 0;
  this.isBlocked = false;
  this.blockedUntil = undefined;
  return this.save();
};

// Helper function to calculate window end
function calculateWindowEnd(windowStart: Date, windowType: string): Date {
  const end = new Date(windowStart);

  switch (windowType) {
    case 'day':
      end.setDate(end.getDate() + 1);
      break;
    case 'hour':
      end.setHours(end.getHours() + 1);
      break;
    case 'month':
      end.setMonth(end.getMonth() + 1);
      break;
    case 'week':
      end.setDate(end.getDate() + 7);
      break;
  }

  return end;
}

// Helper function to calculate window start
function calculateWindowStart(date: Date, windowType: string): Date {
  const start = new Date(date);

  switch (windowType) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;
    case 'hour':
      start.setMinutes(0, 0, 0);
      break;
    case 'month':
      start.setHours(0, 0, 0, 0);
      start.setDate(1);
      break;
    case 'week':
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay());
      break;
  }

  return start;
}

// Static method to get or create rate limit record
RateLimitSchema.statics.getOrCreate = async function (
  userId: Types.ObjectId,
  action: string,
  limit: number,
  windowType: 'day' | 'hour' | 'month' | 'week' = 'hour',
) {
  const now = new Date();
  const windowStart = calculateWindowStart(now, windowType);
  const windowEnd = calculateWindowEnd(windowStart, windowType);

  let rateLimit = await this.findOne({
    action,
    userId,
    windowEnd: { $lte: windowEnd },
    windowStart: { $gte: windowStart },
  });

  if (!rateLimit) {
    rateLimit = await this.create({
      action,
      count: 0,
      limit,
      userId,
      windowEnd,
      windowStart,
      windowType,
    });
  }

  return rateLimit;
};

// Assign helper functions to statics
RateLimitSchema.statics.calculateWindowStart = calculateWindowStart;
RateLimitSchema.statics.calculateWindowEnd = calculateWindowEnd;

// Static method to check rate limit (main entry point)
RateLimitSchema.statics.checkRateLimit = async function (
  userId: Types.ObjectId,
  action: string,
  limit: number,
  windowType: 'day' | 'hour' | 'month' | 'week' = 'hour',
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const rateLimit = await (this as any).getOrCreate(
    userId,
    action,
    limit,
    windowType,
  );

  const allowed = !rateLimit.isExceeded();
  const remaining = Math.max(0, rateLimit.limit - rateLimit.count);

  return {
    allowed,
    remaining,
    resetAt: rateLimit.windowEnd,
  };
};

// Static method to consume rate limit
RateLimitSchema.statics.consumeRateLimit = async function (
  userId: Types.ObjectId,
  action: string,
  limit: number,
  windowType: 'day' | 'hour' | 'month' | 'week' = 'hour',
  amount = 1,
): Promise<{ remaining: number; resetAt: Date; success: boolean }> {
  const rateLimit = await (this as any).getOrCreate(
    userId,
    action,
    limit,
    windowType,
  );

  if (rateLimit.isExceeded()) {
    return {
      remaining: 0,
      resetAt: rateLimit.windowEnd,
      success: false,
    };
  }

  await rateLimit.increment(amount);
  const remaining = Math.max(0, rateLimit.limit - rateLimit.count);

  return {
    remaining,
    resetAt: rateLimit.windowEnd,
    success: true,
  };
};

RateLimitSchema.set('toJSON', { virtuals: true });
RateLimitSchema.set('toObject', { virtuals: true });
