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
    type: String,
    unique: true,
  })
  email: string;

  @Prop({ type: Date })
  emailVerificationExpires?: Date;

  @Prop({ type: String })
  emailVerificationToken?: string;

  @Prop({ default: false, type: Boolean })
  emailVerified: boolean;

  @Prop({ required: true, trim: true, type: String })
  firstName: string;

  @Prop({ type: String })
  googleId?: string;

  @Prop({ default: true, index: true, type: Boolean })
  isActive: boolean;

  @Prop({ type: Date })
  lastLoginAt?: Date;

  @Prop({ type: String })
  lastLoginDevice?: string;

  @Prop({ type: String })
  lastLoginIp?: string;

  @Prop({ required: true, trim: true, type: String })
  lastName: string;

  @Prop({ required: false, select: false, type: String })
  password?: string; // Optional for OAuth users

  @Prop({ type: Date })
  passwordResetExpires?: Date;

  @Prop({ type: String })
  passwordResetToken?: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ default: {}, type: Object })
  preferences: UserPreferences;

  @Prop({ default: [], type: [String] })
  refreshTokens: string[];

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
UserSchema.index({ googleId: 1 }, { sparse: true });

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
    delete ret.password;
    delete ret.emailVerificationToken;
    delete ret.passwordResetToken;
    delete ret.refreshTokens;
    delete ret.__v;
    return ret;
  },
  virtuals: true,
});

UserSchema.set('toObject', {
  transform: (_, ret: any) => {
    delete ret.password;
    delete ret.emailVerificationToken;
    delete ret.passwordResetToken;
    delete ret.refreshTokens;
    delete ret.__v;
    return ret;
  },
  virtuals: true,
});
