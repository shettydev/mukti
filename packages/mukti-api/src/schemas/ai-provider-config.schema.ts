import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export const AI_PROVIDER_VALUES = [
  'openai',
  'anthropic',
  'gemini',
  'openrouter',
] as const;

export type AiProvider = (typeof AI_PROVIDER_VALUES)[number];

export type AiProviderConfigDocument = Document & AiProviderConfig;

@Schema({
  collection: 'ai_provider_configs',
  timestamps: { createdAt: false, updatedAt: true },
})
export class AiProviderConfig {
  @Prop({ enum: AI_PROVIDER_VALUES, index: true, required: true, unique: true })
  provider: AiProvider;

  @Prop({ required: false, select: false, type: String })
  apiKeyEncrypted?: string;

  @Prop({ required: false, type: String })
  apiKeyLast4?: string;

  @Prop({ default: false, type: Boolean })
  isActive: boolean;

  updatedAt: Date;
}

export const AiProviderConfigSchema =
  SchemaFactory.createForClass(AiProviderConfig);

AiProviderConfigSchema.index({ provider: 1 }, { unique: true });
