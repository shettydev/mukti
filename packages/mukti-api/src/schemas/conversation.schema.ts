import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

export interface ConversationMetadata {
  averageLatencyMs?: number;
  estimatedCost: number;
  forkedFrom?: Types.ObjectId;
  lastMessageAt?: Date;
  messageCount: number;
  totalTokens: number;
}

export interface RecentMessage {
  content: string;
  metadata?: {
    completionTokens?: number;
    latencyMs?: number;
    model?: string;
    promptTokens?: number;
    totalTokens?: number;
  };
  role: 'assistant' | 'system' | 'user';
  timestamp: Date;
}

@Schema({ collection: 'conversations', timestamps: true })
export class Conversation {
  // Virtual fields
  _id: Types.ObjectId;

  createdAt: Date;

  @Prop({ default: false, type: Boolean })
  hasArchivedMessages: boolean;

  @Prop({ default: false, index: true, type: Boolean })
  isArchived: boolean;

  @Prop({ default: false, type: Boolean })
  isFavorite: boolean;

  @Prop({ default: false, index: true, type: Boolean })
  isShared: boolean;

  @Prop({
    default: {
      estimatedCost: 0,
      messageCount: 0,
      totalTokens: 0,
    },
    type: Object,
  })
  metadata: ConversationMetadata;

  @Prop({ type: Types.ObjectId })
  oldestMessageId?: Types.ObjectId;

  @Prop({ default: [], type: Array })
  recentMessages: RecentMessage[];

  @Prop({ sparse: true, type: String, unique: true })
  shareToken?: string;

  @Prop({ default: [], index: true, type: [String] })
  tags: string[];

  @Prop({
    enum: [
      'elenchus',
      'dialectic',
      'maieutics',
      'definitional',
      'analogical',
      'counterfactual',
    ],
    index: true,
    required: true,
    type: String,
  })
  technique: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: 0, type: Number })
  totalMessageCount: number;
  updatedAt: Date;
  @Prop({ index: true, ref: 'User', required: true, type: Types.ObjectId })
  userId: Types.ObjectId;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes for performance
ConversationSchema.index({ createdAt: -1, userId: 1 });
ConversationSchema.index({ updatedAt: -1, userId: 1 });
ConversationSchema.index({ isFavorite: 1, updatedAt: -1, userId: 1 });
ConversationSchema.index({ shareToken: 1 }, { sparse: true, unique: true });
ConversationSchema.index({ technique: 1 });
ConversationSchema.index(
  { createdAt: -1, isShared: 1 },
  { partialFilterExpression: { isShared: true } },
);
ConversationSchema.index({ tags: 1 });
ConversationSchema.index({ 'metadata.lastMessageAt': -1 });

// Full-text search on title
ConversationSchema.index({ tags: 'text', title: 'text' });

// Virtual for user population
ConversationSchema.virtual('user', {
  foreignField: '_id',
  justOne: true,
  localField: 'userId',
  ref: 'User',
});

// Virtual for shared link
ConversationSchema.virtual('sharedLink', {
  foreignField: 'conversationId',
  justOne: true,
  localField: '_id',
  ref: 'SharedLink',
});

// Method to add a message (maintains recent messages limit)
ConversationSchema.methods.addMessage = function (
  message: RecentMessage,
  maxRecent = 50,
) {
  this.recentMessages.push(message);
  this.totalMessageCount++;
  this.metadata.messageCount = this.totalMessageCount;
  this.metadata.lastMessageAt = message.timestamp;

  // Keep only the last N messages
  if (this.recentMessages.length > maxRecent) {
    this.hasArchivedMessages = true;
    this.recentMessages = this.recentMessages.slice(-maxRecent);
  }

  // Update token counts
  if (message.metadata?.totalTokens) {
    this.metadata.totalTokens += message.metadata.totalTokens;
  }
};

// Method to generate share token
ConversationSchema.methods.generateShareToken = function (): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  this.shareToken = token;
  this.isShared = true;
  return token;
};

ConversationSchema.set('toJSON', { virtuals: true });
ConversationSchema.set('toObject', { virtuals: true });
