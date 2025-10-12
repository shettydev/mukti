import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = Document & User;

export interface UserPreferences {
  defaultTechnique?: string;
  emailNotifications?: boolean;
  language?: string;
  theme?: 'dark' | 'light';
}

@Schema({ collection: 'users', timestamps: true })
export class User {
  // Virtual field for id
  _id: Types.ObjectId;

  createdAt: Date;

  @Prop({
    index: true,
    lowercase: true,
    required: true,
    trim: true,
    unique: true,
  })
  email: string;

  @Prop({ type: String })
  emailVerificationToken?: string;

  @Prop({ type: Date })
  emailVerifiedAt?: Date;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: Date })
  passwordResetExpiresAt?: Date;

  @Prop({ type: String })
  passwordResetToken?: string;

  @Prop({ default: {}, type: Object })
  preferences: UserPreferences;

  @Prop({
    default: 'user',
    enum: ['user', 'moderator', 'admin'],
    index: true,
    type: String,
  })
  role: string;
  @Prop({ ref: 'Subscription', type: Types.ObjectId })
  subscriptionId?: Types.ObjectId;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes for performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ createdAt: -1, isActive: 1, role: 1 });
UserSchema.index({ emailVerificationToken: 1 }, { sparse: true });
UserSchema.index({ passwordResetToken: 1 }, { sparse: true });

// Virtual for subscription population
UserSchema.virtual('subscription', {
  foreignField: '_id',
  justOne: true,
  localField: 'subscriptionId',
  ref: 'Subscription',
});

// Ensure virtuals are included in JSON
UserSchema.set('toJSON', {
  transform: (_, ret: any) => {
    delete ret.passwordHash;
    delete ret.emailVerificationToken;
    delete ret.passwordResetToken;
    delete ret.__v;
    return ret;
  },
  virtuals: true,
});

UserSchema.set('toObject', {
  transform: (_, ret: any) => {
    delete ret.passwordHash;
    delete ret.emailVerificationToken;
    delete ret.passwordResetToken;
    delete ret.__v;
    return ret;
  },
  virtuals: true,
});
