import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from '../../../schemas/user.schema';
import { AiPolicyService } from './ai-policy.service';
import { AiSecretsService } from './ai-secrets.service';

/**
 * Resolves the API key an AI consumer service sends with a completion.
 *
 * @remarks
 * Centralizes the per-surface `resolveApiKey` logic that used to be copy-pasted
 * into every AI queue service. The claude-code provider returns an empty key
 * everywhere (it runs on the developer's own auth and the client ignores the
 * key), the BYOK key is decrypted when present, otherwise the server key is
 * used — retiring the `OPENROUTER_API_KEY not configured` failure to one place.
 */
@Injectable()
export class AiKeyResolver {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
    private readonly aiPolicyService: AiPolicyService,
    private readonly aiSecretsService: AiSecretsService,
  ) {}

  /**
   * Resolves the effective API key for a consumer request.
   *
   * @returns `''` for the claude-code provider; the decrypted BYOK key when
   *   `usedByok` is set; otherwise the configured server key.
   * @throws If BYOK is requested but the user has no stored key
   *   (`OPENROUTER_KEY_MISSING`), or no server key is configured in hosted mode
   *   (`OPENROUTER_API_KEY not configured`).
   */
  async resolve(params: {
    usedByok: boolean;
    userId: string;
  }): Promise<string> {
    // Claude Code runs on the developer's own auth; no API key is threaded
    // through and the client ignores it.
    if (this.aiPolicyService.isClaudeCodeProvider()) {
      return '';
    }

    if (params.usedByok) {
      const user = await this.userModel
        .findById(params.userId)
        .select('+openRouterApiKeyEncrypted')
        .lean();

      if (!user?.openRouterApiKeyEncrypted) {
        throw new Error('OPENROUTER_KEY_MISSING');
      }

      return this.aiSecretsService.decryptString(
        user.openRouterApiKeyEncrypted,
      );
    }

    const serverKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ?? '';

    if (!serverKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    return serverKey;
  }
}
