import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';

import { User, UserDocument } from '../../schemas/user.schema';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateAiSettingsDto } from './dto/ai-settings.dto';
import { SetGeminiKeyDto } from './dto/gemini-key.dto';
import { SetOpenRouterKeyDto } from './dto/openrouter-key.dto';
import { AiPolicyService, type AiProvider } from './services/ai-policy.service';
import { AiSecretsService } from './services/ai-secrets.service';
import { OpenRouterModelsService } from './services/openrouter-models.service';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly aiPolicyService: AiPolicyService,
    private readonly aiSecretsService: AiSecretsService,
    private readonly openRouterModelsService: OpenRouterModelsService,
    private readonly configService: ConfigService,
  ) {}

  @Get('settings')
  async getSettings(@CurrentUser('_id') userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select(
        'preferences openRouterApiKeyLast4 openRouterApiKeyUpdatedAt geminiApiKeyLast4 geminiApiKeyUpdatedAt +openRouterApiKeyEncrypted +geminiApiKeyEncrypted',
      )
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    const hasOpenRouterByok = this.aiPolicyService.hasUserOpenRouterKey(user);
    const hasGeminiKey = this.aiPolicyService.hasUserGeminiKey(user);
    const activeProvider = this.aiPolicyService.resolveActiveProvider({
      hasGeminiKey,
      hasOpenRouterAccess: hasOpenRouterByok || this.hasServerOpenRouterKey(),
      preferredProvider: user.preferences?.activeProvider,
    });
    const activeModel = this.aiPolicyService.coerceModelForProvider({
      activeProvider,
      hasOpenRouterByok,
      model: user.preferences?.activeModel,
    });

    const settingsPatch: Record<string, string> = {};
    if (user.preferences?.activeProvider !== activeProvider) {
      settingsPatch['preferences.activeProvider'] = activeProvider;
    }
    if (user.preferences?.activeModel !== activeModel) {
      settingsPatch['preferences.activeModel'] = activeModel;
    }

    if (Object.keys(settingsPatch).length > 0) {
      await this.userModel.updateOne(
        { _id: userId },
        {
          $set: settingsPatch,
        },
      );
    }

    return {
      data: {
        activeModel,
        activeProvider,
        geminiKeyLast4: user.geminiApiKeyLast4 ?? null,
        hasGeminiKey,
        hasOpenRouterKey: hasOpenRouterByok,
        openRouterKeyLast4: user.openRouterApiKeyLast4 ?? null,
      },
      success: true,
    };
  }

  @Patch('settings')
  async updateSettings(
    @CurrentUser('_id') userId: string,
    @Body() dto: UpdateAiSettingsDto,
  ) {
    const user = await this.userModel
      .findById(userId)
      .select('+openRouterApiKeyEncrypted +geminiApiKeyEncrypted preferences')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    const hasOpenRouterByok = this.aiPolicyService.hasUserOpenRouterKey(user);
    const hasGeminiKey = this.aiPolicyService.hasUserGeminiKey(user);
    const activeProvider = this.aiPolicyService.resolveActiveProvider({
      hasGeminiKey,
      hasOpenRouterAccess: hasOpenRouterByok || this.hasServerOpenRouterKey(),
      preferredProvider: user.preferences?.activeProvider,
    });
    const validationApiKey =
      activeProvider === 'openrouter'
        ? this.getValidationApiKey({ hasByok: hasOpenRouterByok, user })
        : undefined;

    const effectiveModel = dto.activeModel
      ? await this.aiPolicyService.resolveEffectiveModel({
          activeProvider,
          hasByok: hasOpenRouterByok,
          requestedModel: dto.activeModel,
          userActiveModel: user.preferences?.activeModel,
          validationApiKey,
        })
      : this.aiPolicyService.coerceModelForProvider({
          activeProvider,
          hasOpenRouterByok,
          model: user.preferences?.activeModel,
        });

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          'preferences.activeModel': effectiveModel,
          'preferences.activeProvider': activeProvider,
        },
      },
    );

    return {
      data: {
        activeModel: effectiveModel,
        activeProvider,
      },
      success: true,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Put('openrouter-key')
  async setOpenRouterKey(
    @CurrentUser('_id') userId: string,
    @Body() dto: SetOpenRouterKeyDto,
  ) {
    const apiKey = dto.apiKey.trim();

    if (!apiKey) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_API_KEY',
          message: 'API key is required',
        },
      });
    }

    // Validate key works by listing models.
    try {
      await this.openRouterModelsService.listModels(apiKey);
    } catch {
      throw new BadRequestException({
        error: {
          code: 'INVALID_OPENROUTER_API_KEY',
          message: 'OpenRouter API key is invalid',
        },
      });
    }

    const encrypted = this.aiSecretsService.encryptString(apiKey);
    const last4 = apiKey.slice(-4);
    const user = await this.userModel
      .findById(userId)
      .select('preferences')
      .lean();
    const activeModel = this.aiPolicyService.coerceModelForProvider({
      activeProvider: 'openrouter',
      hasOpenRouterByok: true,
      model: user?.preferences?.activeModel,
    });

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          openRouterApiKeyEncrypted: encrypted,
          openRouterApiKeyLast4: last4,
          openRouterApiKeyUpdatedAt: new Date(),
          'preferences.activeModel': activeModel,
          'preferences.activeProvider': 'openrouter',
        },
        $unset: {
          geminiApiKeyEncrypted: 1,
          geminiApiKeyLast4: 1,
          geminiApiKeyUpdatedAt: 1,
        },
      },
    );

    return {
      data: {
        activeModel,
        activeProvider: 'openrouter',
        geminiKeyLast4: null,
        hasGeminiKey: false,
        hasOpenRouterKey: true,
        openRouterKeyLast4: last4,
      },
      success: true,
    };
  }

  @Delete('openrouter-key')
  @HttpCode(HttpStatus.OK)
  async deleteOpenRouterKey(@CurrentUser('_id') userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('+geminiApiKeyEncrypted preferences')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    const hasGeminiKey = this.aiPolicyService.hasUserGeminiKey(user);
    const nextPreferredProvider: AiProvider | undefined =
      user.preferences?.activeProvider === 'openrouter' && hasGeminiKey
        ? 'gemini'
        : user.preferences?.activeProvider;
    const activeProvider = this.aiPolicyService.resolveActiveProvider({
      hasGeminiKey,
      hasOpenRouterAccess: this.hasServerOpenRouterKey(),
      preferredProvider: nextPreferredProvider,
    });
    const activeModel = this.aiPolicyService.coerceModelForProvider({
      activeProvider,
      hasOpenRouterByok: false,
      model: user.preferences?.activeModel,
    });

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          'preferences.activeModel': activeModel,
          'preferences.activeProvider': activeProvider,
        },
        $unset: {
          openRouterApiKeyEncrypted: 1,
          openRouterApiKeyLast4: 1,
          openRouterApiKeyUpdatedAt: 1,
        },
      },
    );

    return {
      data: {
        activeModel,
        activeProvider,
        hasOpenRouterKey: false,
        openRouterKeyLast4: null,
      },
      success: true,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Put('gemini-key')
  async setGeminiKey(
    @CurrentUser('_id') userId: string,
    @Body() dto: SetGeminiKeyDto,
  ) {
    const apiKey = dto.apiKey.trim();

    if (!apiKey) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_API_KEY',
          message: 'API key is required',
        },
      });
    }

    // TODO: Validate key by listing models or making a dummy call.
    // For now, we trust the format check.

    const encrypted = this.aiSecretsService.encryptString(apiKey);
    const last4 = apiKey.slice(-4);
    const user = await this.userModel
      .findById(userId)
      .select('preferences')
      .lean();
    const activeModel = this.aiPolicyService.coerceModelForProvider({
      activeProvider: 'gemini',
      hasOpenRouterByok: false,
      model: user?.preferences?.activeModel,
    });

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          geminiApiKeyEncrypted: encrypted,
          geminiApiKeyLast4: last4,
          geminiApiKeyUpdatedAt: new Date(),
          'preferences.activeModel': activeModel,
          'preferences.activeProvider': 'gemini',
        },
        $unset: {
          openRouterApiKeyEncrypted: 1,
          openRouterApiKeyLast4: 1,
          openRouterApiKeyUpdatedAt: 1,
        },
      },
    );

    return {
      data: {
        activeModel,
        activeProvider: 'gemini',
        geminiKeyLast4: last4,
        hasGeminiKey: true,
        hasOpenRouterKey: false,
        openRouterKeyLast4: null,
      },
      success: true,
    };
  }

  @Delete('gemini-key')
  @HttpCode(HttpStatus.OK)
  async deleteGeminiKey(@CurrentUser('_id') userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('+openRouterApiKeyEncrypted preferences')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    const hasOpenRouterByok = this.aiPolicyService.hasUserOpenRouterKey(user);
    const nextPreferredProvider: AiProvider | undefined =
      user.preferences?.activeProvider === 'gemini'
        ? 'openrouter'
        : user.preferences?.activeProvider;
    const activeProvider = this.aiPolicyService.resolveActiveProvider({
      hasGeminiKey: false,
      hasOpenRouterAccess: hasOpenRouterByok || this.hasServerOpenRouterKey(),
      preferredProvider: nextPreferredProvider,
    });
    const activeModel = this.aiPolicyService.coerceModelForProvider({
      activeProvider,
      hasOpenRouterByok,
      model: user.preferences?.activeModel,
    });

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          'preferences.activeModel': activeModel,
          'preferences.activeProvider': activeProvider,
        },
        $unset: {
          geminiApiKeyEncrypted: 1,
          geminiApiKeyLast4: 1,
          geminiApiKeyUpdatedAt: 1,
        },
      },
    );

    return {
      data: {
        activeModel,
        activeProvider,
        geminiKeyLast4: null,
        hasGeminiKey: false,
      },
      success: true,
    };
  }

  @Get('models')
  async getModels(@CurrentUser('_id') userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('+openRouterApiKeyEncrypted +geminiApiKeyEncrypted preferences')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    const hasOpenRouterByok = this.aiPolicyService.hasUserOpenRouterKey(user);
    const hasGeminiKey = this.aiPolicyService.hasUserGeminiKey(user);
    const activeProvider = this.aiPolicyService.resolveActiveProvider({
      hasGeminiKey,
      hasOpenRouterAccess: hasOpenRouterByok || this.hasServerOpenRouterKey(),
      preferredProvider: user.preferences?.activeProvider,
    });
    const activeModel = this.aiPolicyService.coerceModelForProvider({
      activeProvider,
      hasOpenRouterByok,
      model: user.preferences?.activeModel,
    });

    if (user.preferences?.activeModel !== activeModel) {
      await this.userModel.updateOne(
        { _id: userId },
        {
          $set: {
            'preferences.activeModel': activeModel,
            'preferences.activeProvider': activeProvider,
          },
        },
      );
    }

    if (activeProvider === 'gemini') {
      return {
        data: {
          mode: 'gemini',
          models: this.aiPolicyService.getGeminiModels(),
          provider: 'gemini',
        },
        success: true,
      };
    }

    if (!hasOpenRouterByok) {
      const validationApiKey =
        this.configService.get<string>('OPENROUTER_API_KEY') ?? '';
      if (validationApiKey) {
        // Ensure curated defaults exist.
        await Promise.all(
          this.aiPolicyService.getCuratedModels().map((m) =>
            this.aiPolicyService.validateModelOrThrow({
              apiKey: validationApiKey,
              model: m.id,
            }),
          ),
        );
      }

      return {
        data: {
          mode: 'curated',
          models: this.aiPolicyService.getCuratedModels(),
          provider: 'openrouter',
        },
        success: true,
      };
    }

    const byokKey = this.aiSecretsService.decryptString(
      user.openRouterApiKeyEncrypted!,
    );
    const models = await this.openRouterModelsService.listModels(byokKey);

    return {
      data: {
        mode: 'openrouter',
        models: models.map((m) => ({
          id: m.id,
          name: m.name,
        })),
        provider: 'openrouter',
      },
      success: true,
    };
  }

  private getValidationApiKey(params: { hasByok: boolean; user: any }): string {
    if (params.hasByok) {
      return this.aiSecretsService.decryptString(
        params.user.openRouterApiKeyEncrypted,
      );
    }

    const serverKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ?? '';

    if (!serverKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    return serverKey;
  }

  private hasServerOpenRouterKey(): boolean {
    return !!(this.configService.get<string>('OPENROUTER_API_KEY') ?? '');
  }
}
