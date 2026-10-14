import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Subscription } from '../../../schemas/subscription.schema';
import { User, type UserDocument } from '../../../schemas/user.schema';
import { AiPolicyService } from './ai-policy.service';
import { AiSecretsService } from './ai-secrets.service';
import { FreeQuotaService } from './free-quota.service';

/** Everything a queue needs to run one AI request for a user. */
export interface AiRequestContext {
  model: string;
  subscriptionTier: 'free' | 'paid';
  usedByok: boolean;
}

/**
 * The single entry point every controller must pass through before it
 * enqueues work that calls an AI model.
 *
 * @remarks
 * It used to be copy-pasted into each controller, and the Thought Map copies
 * left out the free-quota check, so people without their own key could spend
 * the server's OpenRouter key without limit. Keeping the policy here means a
 * new AI surface cannot forget it.
 *
 * Order matters: configuration and model are validated before a free message
 * is consumed, so a misconfigured server or a rejected model never costs the
 * user part of their daily allowance.
 */
@Injectable()
export class AiRequestGate {
  private readonly logger = new Logger(AiRequestGate.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<Subscription>,
    private readonly configService: ConfigService,
    private readonly aiPolicyService: AiPolicyService,
    private readonly aiSecretsService: AiSecretsService,
    private readonly freeQuotaService: FreeQuotaService,
  ) {}

  /**
   * Resolves key ownership, tier and model for one AI request, and consumes
   * one free message when the request will run on the server's key.
   *
   * @throws NotFoundException when the user record is missing.
   * @throws InternalServerErrorException when the server key is required but unset.
   * @throws HttpException(429) when the daily free allowance is used up.
   */
  async authorize(
    userId: string | Types.ObjectId,
    requestedModel?: string,
  ): Promise<AiRequestContext> {
    const userRecord = await this.userModel
      .findById(userId)
      .select('+openRouterApiKeyEncrypted preferences')
      .lean();

    if (!userRecord) {
      throw new NotFoundException('User not found');
    }

    const subscription = await this.subscriptionModel
      .findOne({ userId: new Types.ObjectId(userId.toString()) })
      .lean();
    const subscriptionTier: 'free' | 'paid' =
      subscription?.tier === 'paid' ? 'paid' : 'free';

    const usedByok = !!userRecord.openRouterApiKeyEncrypted;
    // A local CLI runs on the user's own auth: no OpenRouter quota, no server
    // key, and no validation key are involved.
    const isLocalCli = this.aiPolicyService.isLocalCliProvider();
    const usesServerKey = !usedByok && !isLocalCli;

    const serverApiKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ?? '';

    if (usesServerKey && !serverApiKey) {
      this.logger.error('OPENROUTER_API_KEY is not configured');
      throw new InternalServerErrorException(
        'AI service is temporarily unavailable',
      );
    }

    const validationApiKey =
      usedByok && !isLocalCli
        ? this.aiSecretsService.decryptString(
            userRecord.openRouterApiKeyEncrypted!,
          )
        : serverApiKey;

    const model = await this.aiPolicyService.resolveEffectiveModel({
      hasByok: usedByok,
      requestedModel,
      userActiveModel: userRecord.preferences?.activeModel,
      validationApiKey,
    });

    if (usesServerKey) {
      await this.freeQuotaService.checkAndConsume(userId);
    }

    const shouldPersistModel =
      !!requestedModel || !userRecord.preferences?.activeModel;
    if (shouldPersistModel) {
      await this.userModel.updateOne(
        { _id: userId },
        { $set: { 'preferences.activeModel': model } },
      );
    }

    return { model, subscriptionTier, usedByok };
  }
}
