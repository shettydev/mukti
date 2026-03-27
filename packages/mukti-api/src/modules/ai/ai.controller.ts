import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Patch,
  Put,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserDocument } from '../../schemas/user.schema';
import { UpdateAiSettingsDto } from './dto/ai-settings.dto';
import { SetGeminiKeyDto } from './dto/gemini-key.dto';
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
        'preferences openRouterApiKeyLast4 openRouterApiKeyUpdatedAt geminiApiKeyLast4 geminiApiKeyUpdatedAt',
      )
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      activeModel: user.preferences?.activeModel,
      geminiKeyLast4: user.geminiApiKeyLast4 ?? null,
      hasGeminiKey: !!user.geminiApiKeyUpdatedAt,
      hasOpenRouterKey: !!user.openRouterApiKeyUpdatedAt,
      openRouterKeyLast4: user.openRouterApiKeyLast4 ?? null,
    };
  }

  @Patch('settings')
  async updateSettings(
    @CurrentUser('_id') userId: string,
    @Body() dto: UpdateAiSettingsDto,
  ) {
    if (!dto.activeModel) {
      return { activeModel: null };
    }

    const user = await this.userModel
      .findById(userId)
      .select('+openRouterApiKeyEncrypted preferences')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
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

    return { activeModel: effectiveModel };
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
      hasOpenRouterKey: true,
      openRouterKeyLast4: last4,
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
      hasOpenRouterKey: false,
      openRouterKeyLast4: null,
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

    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          geminiApiKeyEncrypted: encrypted,
          geminiApiKeyLast4: last4,
          geminiApiKeyUpdatedAt: new Date(),
        },
      },
    );

    return {
      geminiKeyLast4: last4,
      hasGeminiKey: true,
    };
  }

  @Delete('gemini-key')
  @HttpCode(HttpStatus.OK)
  async deleteGeminiKey(@CurrentUser('_id') userId: string) {
    await this.userModel.updateOne(
      { _id: userId },
      {
        $unset: {
          geminiApiKeyEncrypted: 1,
          geminiApiKeyLast4: 1,
          geminiApiKeyUpdatedAt: 1,
        },
      },
    );

    return {
      geminiKeyLast4: null,
      hasGeminiKey: false,
    };
  }

  @Get('models')
  async getModels(@CurrentUser('_id') userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('+openRouterApiKeyEncrypted preferences')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
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
        mode: 'curated',
        models: this.aiPolicyService.getCuratedModels(),
      };
    }

    const byokKey = this.aiSecretsService.decryptString(
      user.openRouterApiKeyEncrypted!,
    );
    const models = await this.openRouterModelsService.listModels(byokKey);

    return {
      mode: 'openrouter',
      models: models.map((m) => ({
        id: m.id,
        name: m.name,
      })),
    };
  }

  private getValidationApiKey(params: {
    hasByok: boolean;
    user: Pick<User, 'openRouterApiKeyEncrypted'>;
  }): string {
    if (params.hasByok) {
      // hasByok guarantees openRouterApiKeyEncrypted is present
      return this.aiSecretsService.decryptString(
        params.user.openRouterApiKeyEncrypted!,
      );
    }

    const serverKey =
      this.configService.get<string>('OPENROUTER_API_KEY') ?? '';

    if (!serverKey) {
      throw new InternalServerErrorException(
        'OPENROUTER_API_KEY not configured',
      );
    }

    return serverKey;
  }
}
