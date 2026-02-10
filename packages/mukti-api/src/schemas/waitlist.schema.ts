import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WaitlistDocument = Document & Waitlist;

@Schema({ collection: 'waitlist', timestamps: true })
export class Waitlist {
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

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ default: Date.now, type: Date })
  joinedAt: Date;

  updatedAt: Date;

  @Prop({ type: String })
  userAgent?: string;
}

export const WaitlistSchema = SchemaFactory.createForClass(Waitlist);

WaitlistSchema.index({ email: 1 }, { unique: true });
WaitlistSchema.index({ createdAt: -1 });
