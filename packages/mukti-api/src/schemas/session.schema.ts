import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SessionDocument = Document & Session;

/**
 * Session schema for tracking active user sessions.
 * Stores session metadata including device information, location, and activity tracking.
 */
@Schema({ collection: 'sessions', timestamps: true })
export class Session {
  _id: Types.ObjectId;

  createdAt: Date;

  @Prop({ type: String })
  deviceInfo: string;

  @Prop({ index: true, required: true })
  expiresAt: Date;

  @Prop({ type: String })
  ipAddress: string;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: Date.now, type: Date })
  lastActivityAt: Date;

  @Prop({ type: String })
  location?: string;

  @Prop({ index: true, required: true })
  refreshToken: string;

  updatedAt: Date;

  @Prop({ type: String })
  userAgent: string;

  @Prop({ index: true, ref: 'User', required: true, type: Types.ObjectId })
  userId: Types.ObjectId;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Indexes for performance
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup
SessionSchema.index({ refreshToken: 1 });
SessionSchema.index({ isActive: 1, userId: 1 });
SessionSchema.index({ lastActivityAt: -1, userId: 1 });

// Ensure sensitive data is not exposed
SessionSchema.set('toJSON', {
  transform: (_, ret: any) => {
    delete ret.refreshToken;
    delete ret.__v;
    return ret;
  },
});

SessionSchema.set('toObject', {
  transform: (_, ret: any) => {
    delete ret.refreshToken;
    delete ret.__v;
    return ret;
  },
});
