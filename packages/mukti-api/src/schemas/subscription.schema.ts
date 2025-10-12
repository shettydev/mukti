import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionDocument = Document & Subscription;

export interface SubscriptionLimits {
  canUseAdvancedModels: boolean;
  conversationsPerDay: number;
  maxConversationLength: number;
  maxSharedLinks: number;
  maxStorageGB: number;
  questionsPerDay: number;
  questionsPerHour: number;
}

export interface SubscriptionUsage {
  conversationsToday: number;
  lastHourResetAt: Date;
  lastResetAt: Date;
  questionsThisHour: number;
  questionsToday: number;
  storageUsedGB: number;
}

@Schema({ collection: 'subscriptions', timestamps: true })
export class Subscription {
  // Virtual fields
  _id: Types.ObjectId;

  @Prop({ type: Date })
  cancelAt?: Date;

  @Prop({ type: Date })
  canceledAt?: Date;

  createdAt: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ default: true, index: true, type: Boolean })
  isActive: boolean;

  @Prop({ default: false, type: Boolean })
  isCanceled: boolean;

  @Prop({
    default: {
      canUseAdvancedModels: false,
      conversationsPerDay: 10,
      maxConversationLength: 50,
      maxSharedLinks: 5,
      maxStorageGB: 1,
      questionsPerDay: 50,
      questionsPerHour: 10,
    },
    required: true,
    type: Object,
  })
  limits: SubscriptionLimits;

  @Prop({ required: true, type: Date })
  startDate: Date;

  @Prop({ type: String })
  stripeCustomerId?: string;

  @Prop({ type: String })
  stripePriceId?: string;

  @Prop({ type: String })
  stripeSubscriptionId?: string;

  @Prop({
    default: 'free',
    enum: ['free', 'paid'],
    index: true,
    required: true,
    type: String,
  })
  tier: string;

  updatedAt: Date;
  @Prop({
    default: {
      conversationsToday: 0,
      lastHourResetAt: new Date(),
      lastResetAt: new Date(),
      questionsThisHour: 0,
      questionsToday: 0,
      storageUsedGB: 0,
    },
    type: Object,
  })
  usage: SubscriptionUsage;
  @Prop({
    index: true,
    ref: 'User',
    required: true,
    type: Types.ObjectId,
    unique: true,
  })
  userId: Types.ObjectId;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// Indexes
SubscriptionSchema.index({ userId: 1 }, { unique: true });
SubscriptionSchema.index({ tier: 1 });
SubscriptionSchema.index({ isActive: 1 });
SubscriptionSchema.index(
  { endDate: 1 },
  {
    partialFilterExpression: { endDate: { $exists: true }, isActive: true },
    sparse: true,
  },
);
SubscriptionSchema.index({ stripeCustomerId: 1 }, { sparse: true });
SubscriptionSchema.index({ stripeSubscriptionId: 1 }, { sparse: true });

// Virtual for user population
SubscriptionSchema.virtual('user', {
  foreignField: '_id',
  justOne: true,
  localField: 'userId',
  ref: 'User',
});

// Method to check if usage needs reset
SubscriptionSchema.methods.needsDailyReset = function (): boolean {
  const now = new Date();
  const lastReset = this.usage.lastResetAt;
  return (
    now.getDate() !== lastReset.getDate() ||
    now.getMonth() !== lastReset.getMonth() ||
    now.getFullYear() !== lastReset.getFullYear()
  );
};

SubscriptionSchema.methods.needsHourlyReset = function (): boolean {
  const now = new Date();
  const lastReset = this.usage.lastHourResetAt;
  const hoursDiff = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
  return hoursDiff >= 1;
};

// Static method to get default limits by tier
SubscriptionSchema.statics.getDefaultLimits = function (
  tier: string,
): SubscriptionLimits {
  const limits: Record<string, SubscriptionLimits> = {
    free: {
      canUseAdvancedModels: false,
      conversationsPerDay: 10,
      maxConversationLength: 50,
      maxSharedLinks: 5,
      maxStorageGB: 1,
      questionsPerDay: 50,
      questionsPerHour: 10,
    },
    paid: {
      canUseAdvancedModels: true,
      conversationsPerDay: 100,
      maxConversationLength: 200,
      maxSharedLinks: 50,
      maxStorageGB: 10,
      questionsPerDay: 500,
      questionsPerHour: 100,
    },
  };

  return limits[tier] || limits.free;
};

SubscriptionSchema.set('toJSON', { virtuals: true });
SubscriptionSchema.set('toObject', { virtuals: true });
