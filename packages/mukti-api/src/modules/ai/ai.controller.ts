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
import { SetAnthropicKeyDto } from './dto/anthropic-key.dto';
import { SetOpenRouterKeyDto } from './dto/openrouter-key.dto';
import { AiPolicyService } from './services/ai-policy.service';
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
        'preferences openRouterApiKeyLast4 openRouterApiKeyUpdatedAt anthropicApiKeyLast4 anthropicApiKeyUpdatedAt',
      )
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    return {
      data: {
        activeModel: user.preferences?.activeModel,
        anthropicKeyLast4: user.anthropicApiKeyLast4 ?? null,
        hasAnthropicKey: !!user.anthropicApiKeyUpdatedAt,
        hasOpenRouterKey: !!user.openRouterApiKeyUpdatedAt,
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
    if (!dto.activeModel) {
      return {
        data: { activeModel: null },
        success: true,
      };
    }

    const user = await this.userModel
      .findById(userId)
      .select('+openRouterApiKeyEncrypted preferences')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    const hasByok = this.aiPolicyService.hasUserOpenRouterKey(user);

    const validationApiKey = this.getValidationApiKey({ hasByok, user });

    const effectiveModel = await this.aiPolicyService.resolveEffectiveModel({
      hasByok,
      requestedModel: dto.activeModel,
      userActiveModel: user.preferences?.activeModel,
      validationApiKey,
    });

    await this.userModel.updateOne(
      { _id: userId },
      { $set: { 'preferences.activeModel': effectiveModel } },
    );

    return {
      data: { activeModel: effectiveModel },
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

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          openRouterApiKeyEncrypted: encrypted,
          openRouterApiKeyLast4: last4,
          openRouterApiKeyUpdatedAt: new Date(),
        },
      },
    );

    return {
      data: {
        hasOpenRouterKey: true,
        openRouterKeyLast4: last4,
      },
      success: true,
    };
  }

  @Delete('openrouter-key')
  @HttpCode(HttpStatus.OK)
  async deleteOpenRouterKey(@CurrentUser('_id') userId: string) {
    await this.userModel.updateOne(
      { _id: userId },
      {
        $unset: {
          openRouterApiKeyEncrypted: 1,
          openRouterApiKeyLast4: 1,
          openRouterApiKeyUpdatedAt: 1,
        },
      },
    );

    // If activeModel is not curated, reset to default.
    const user = await this.userModel
      .findById(userId)
      .select('preferences')
      .lean();
    const activeModel = user?.preferences?.activeModel;
    const isCurated = this.aiPolicyService
      .getCuratedModels()
      .some((m) => m.id === activeModel);

    if (!isCurated) {
      await this.userModel.updateOne(
        { _id: userId },
        {
          $set: {
            'preferences.activeModel': this.aiPolicyService.getDefaultModel(),
          },
        },
      );
    }

    return {
      data: {
        hasOpenRouterKey: false,
        openRouterKeyLast4: null,
      },
      success: true,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Put('anthropic-key')
  async setAnthropicKey(
    @CurrentUser('_id') userId: string,
    @Body() dto: SetAnthropicKeyDto,
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

    const encrypted = this.aiSecretsService.encryptString(apiKey);
    const last4 = apiKey.slice(-4);

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          anthropicApiKeyEncrypted: encrypted,
          anthropicApiKeyLast4: last4,
          anthropicApiKeyUpdatedAt: new Date(),
        },
      },
    );

    return {
      data: {
        anthropicKeyLast4: last4,
        hasAnthropicKey: true,
      },
      success: true,
    };
  }

  @Delete('anthropic-key')
  @HttpCode(HttpStatus.OK)
  async deleteAnthropicKey(@CurrentUser('_id') userId: string) {
    await this.userModel.updateOne(
      { _id: userId },
      {
        $unset: {
          anthropicApiKeyEncrypted: 1,
          anthropicApiKeyLast4: 1,
          anthropicApiKeyUpdatedAt: 1,
        },
      },
    );

    return {
      data: {
        anthropicKeyLast4: null,
        hasAnthropicKey: false,
      },
      success: true,
    };
  }

  @Get('models')
  async getModels(@CurrentUser('_id') userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('+openRouterApiKeyEncrypted preferences')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    const hasByok = this.aiPolicyService.hasUserOpenRouterKey(user);

    if (!hasByok) {
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
}
