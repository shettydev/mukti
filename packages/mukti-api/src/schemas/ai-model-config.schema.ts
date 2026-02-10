import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import {
  AI_PROVIDER_VALUES,
  type AiProvider,
} from './ai-provider-config.schema';

export type AiModelConfigDocument = Document & AiModelConfig;

export interface AiModelPricing {
  completionUsdPer1M: number;
  promptUsdPer1M: number;
}

@Schema({ _id: false, id: false })
export class AiModelPricingConfig implements AiModelPricing {
  @Prop({ default: 0, min: 0, required: true, type: Number })
  completionUsdPer1M: number;

  @Prop({ default: 0, min: 0, required: true, type: Number })
  promptUsdPer1M: number;
}

const AiModelPricingConfigSchema =
  SchemaFactory.createForClass(AiModelPricingConfig);

@Schema({
  collection: 'ai_model_configs',
  timestamps: true,
})
export class AiModelConfig {
  _id: string;

  createdAt: Date;

  @Prop({ required: true, trim: true, type: String, unique: true })
  id: string;

  @Prop({ default: true, type: Boolean })
  isActive: boolean;

  @Prop({ required: true, trim: true, type: String })
  label: string;

  @Prop({ enum: AI_PROVIDER_VALUES, required: true, type: String })
  provider: AiProvider;

  @Prop({ required: true, trim: true, type: String })
  providerModel: string;

  @Prop({ required: true, type: AiModelPricingConfigSchema })
  pricing: AiModelPricingConfig;

  updatedAt: Date;
}

export const AiModelConfigSchema = SchemaFactory.createForClass(AiModelConfig);

AiModelConfigSchema.index({ id: 1 }, { unique: true });
AiModelConfigSchema.index({ isActive: 1, provider: 1 });
