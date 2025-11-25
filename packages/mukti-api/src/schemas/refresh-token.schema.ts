import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RefreshTokenDocument = Document & RefreshToken;

/**
 * RefreshToken schema for managing user refresh tokens.
 * Stores refresh tokens with expiration and device information for security tracking.
 */
@Schema({ collection: 'refresh_tokens', timestamps: true })
export class RefreshToken {
  _id: Types.ObjectId;

  createdAt: Date;

  @Prop({ type: String })
  deviceInfo?: string;

  @Prop({ index: true, required: true })
  expiresAt: Date;

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ default: false, index: true })
  isRevoked: boolean;

  @Prop({ index: true, required: true, unique: true })
  token: string;

  updatedAt: Date;

  @Prop({ index: true, ref: 'User', required: true, type: Types.ObjectId })
  userId: Types.ObjectId;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Indexes for performance
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for automatic cleanup
RefreshTokenSchema.index({ token: 1 }, { unique: true });
RefreshTokenSchema.index({ isRevoked: 1, userId: 1 });

// Ensure sensitive data is not exposed
RefreshTokenSchema.set('toJSON', {
  transform: (_, ret: any) => {
    delete ret.__v;
    return ret;
  },
});

RefreshTokenSchema.set('toObject', {
  transform: (_, ret: any) => {
    delete ret.__v;
    return ret;
  },
});
