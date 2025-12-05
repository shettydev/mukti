import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DialogueMessageDocument = DialogueMessage & Document;

/**
 * Metadata for AI-generated messages.
 */
export interface DialogueMessageMetadata {
  /** Time taken to generate the response in milliseconds */
  latencyMs?: number;
  /** AI model used for generation */
  model?: string;
  /** Token count for the message */
  tokens?: number;
}

/**
 * Message role in the dialogue.
 */
export type MessageRole = 'assistant' | 'user';

/**
 * DialogueMessage schema for storing individual messages in node dialogues.
 *
 * @remarks
 * This schema stores the conversation history for each node dialogue,
 * enabling context-aware Socratic questioning and dialogue history review.
 */
@Schema({ collection: 'dialogue_messages', timestamps: true })
export class DialogueMessage {
  _id: Types.ObjectId;

  /**
   * The message content.
   */
  @Prop({ required: true, type: String })
  content: string;

  createdAt: Date;

  /**
   * Reference to the parent node dialogue.
   */
  @Prop({
    index: true,
    ref: 'NodeDialogue',
    required: true,
    type: Types.ObjectId,
  })
  dialogueId: Types.ObjectId;

  /**
   * Optional metadata for AI-generated messages.
   */
  @Prop({ type: Object })
  metadata?: DialogueMessageMetadata;

  /**
   * Role of the message sender.
   */
  @Prop({
    enum: ['user', 'assistant'],
    required: true,
    type: String,
  })
  role: MessageRole;

  /**
   * Sequence number for ordering messages within a dialogue.
   */
  @Prop({ default: 0, type: Number })
  sequence: number;

  updatedAt: Date;
}

export const DialogueMessageSchema =
  SchemaFactory.createForClass(DialogueMessage);

// Compound index for pagination within a dialogue
DialogueMessageSchema.index({ dialogueId: 1, sequence: 1 });

// Index for fetching messages by dialogue with chronological order
DialogueMessageSchema.index({ createdAt: 1, dialogueId: 1 });

// Virtual for dialogue population
DialogueMessageSchema.virtual('dialogue', {
  foreignField: '_id',
  justOne: true,
  localField: 'dialogueId',
  ref: 'NodeDialogue',
});

// Ensure virtuals are included in JSON
DialogueMessageSchema.set('toJSON', { virtuals: true });
DialogueMessageSchema.set('toObject', { virtuals: true });
