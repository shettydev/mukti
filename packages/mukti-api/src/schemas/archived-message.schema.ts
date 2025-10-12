import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ArchivedMessageDocument = ArchivedMessage & Document;

export interface MessageMetadata {
  completionTokens?: number;
  cost?: number;
  latencyMs?: number;
  model?: string;
  promptTokens?: number;
  technique?: string;
  totalTokens?: number;
}

@Schema({ collection: 'archived_messages', timestamps: true })
export class ArchivedMessage {
  // Virtual fields
  _id: Types.ObjectId;

  @Prop({ required: true, type: String })
  content: string;

  @Prop({
    index: true,
    ref: 'Conversation',
    required: true,
    type: Types.ObjectId,
  })
  conversationId: Types.ObjectId;

  createdAt: Date;

  @Prop({ type: Date })
  editedAt?: Date;

  @Prop({ type: String })
  editedContent?: string;

  @Prop({ default: false, type: Boolean })
  isEdited: boolean;

  @Prop({ type: Object })
  metadata?: MessageMetadata;

  @Prop({
    enum: ['user', 'assistant', 'system'],
    index: true,
    required: true,
    type: String,
  })
  role: string;

  @Prop({ index: true, required: true, type: Number })
  sequenceNumber: number;
  @Prop({ default: () => new Date(), index: true, required: true, type: Date })
  timestamp: Date;
  updatedAt: Date;
}

export const ArchivedMessageSchema =
  SchemaFactory.createForClass(ArchivedMessage);

// Compound index for efficient range queries
ArchivedMessageSchema.index({ conversationId: 1, sequenceNumber: 1 });
ArchivedMessageSchema.index({ conversationId: 1, timestamp: 1 });
ArchivedMessageSchema.index({ role: 1 });
ArchivedMessageSchema.index({ timestamp: -1 });

// Full-text search on content (for advanced search features)
ArchivedMessageSchema.index({ content: 'text' });

// Virtual for conversation population
ArchivedMessageSchema.virtual('conversation', {
  foreignField: '_id',
  justOne: true,
  localField: 'conversationId',
  ref: 'Conversation',
});

// Static method to get messages by conversation with pagination
ArchivedMessageSchema.statics.findByConversation = function (
  conversationId: Types.ObjectId,
  limit = 50,
  beforeSequence?: number,
) {
  const query: any = { conversationId };

  if (beforeSequence !== undefined) {
    query.sequenceNumber = { $lt: beforeSequence };
  }

  return this.find(query).sort({ sequenceNumber: -1 }).limit(limit).exec();
};

// Static method to get total message count
ArchivedMessageSchema.statics.countByConversation = function (
  conversationId: Types.ObjectId,
) {
  return this.countDocuments({ conversationId }).exec();
};

ArchivedMessageSchema.set('toJSON', { virtuals: true });
ArchivedMessageSchema.set('toObject', { virtuals: true });
