import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';

import { User, UserDocument } from '../../schemas/user.schema';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateAiSettingsDto } from './dto/ai-settings.dto';
import { ToggleAiModelDto, UpsertAiModelDto } from './dto/admin-model.dto';
import {
  SetProviderApiKeyDto,
  ToggleProviderDto,
} from './dto/admin-provider.dto';
import {
  AiConfigService,
  type AiModelSelectionResult,
} from './services/ai-config.service';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly aiConfigService: AiConfigService,
  ) {}

  @Get('admin/models')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAdminModels() {
    const models = await this.aiConfigService.getAdminModels();

    return {
      data: { models },
      success: true,
    };
  }

  @Get('admin/providers')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getAdminProviders() {
    const providers = await this.aiConfigService.getAdminProviders();

    return {
      data: { providers },
      success: true,
    };
  }

  @Get('models')
  async getModels() {
    const models = await this.aiConfigService.getClientModels();

    return {
      data: {
        models,
      },
      success: true,
    };
  }

  @Get('settings')
  async getSettings(@CurrentUser('_id') userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('preferences')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    const resolved = await this.aiConfigService.resolveModelSelection({
      userActiveModel: user.preferences?.activeModel,
    });

    await this.persistResolvedModel(userId, resolved);

    return {
      data: {
        activeModel: resolved.activeModel,
        aiConfigured: resolved.aiConfigured,
      },
      success: true,
    };
  }

  @Delete('admin/models/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin')
  async deleteAdminModel(@Param('id') id: string) {
    await this.aiConfigService.deleteModelConfig(id);

    return {
      data: { id },
      success: true,
    };
  }

  @Patch('admin/models/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin')
  async patchAdminModel(
    @Param('id') id: string,
    @Body() dto: ToggleAiModelDto,
  ) {
    const model = await this.aiConfigService.setModelActive(id, dto.isActive);

    return {
      data: model,
      success: true,
    };
  }

  @Patch('admin/providers/:provider')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin')
  async patchAdminProvider(
    @Param('provider') provider: string,
    @Body() dto: ToggleProviderDto,
  ) {
    const updatedProvider = await this.aiConfigService.setProviderActive(
      provider,
      dto.isActive,
    );

    return {
      data: updatedProvider,
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
      .select('preferences')
      .lean();

    if (!user) {
      throw new Error('User not found');
    }

    const resolved = await this.aiConfigService.resolveModelSelection({
      requestedModel: dto.activeModel,
      userActiveModel: user.preferences?.activeModel,
    });

    await this.persistResolvedModel(userId, resolved);

    return {
      data: {
        activeModel: resolved.activeModel,
        aiConfigured: resolved.aiConfigured,
      },
      success: true,
    };
  }

  @Put('admin/models/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin')
  async putAdminModel(@Param('id') id: string, @Body() dto: UpsertAiModelDto) {
    const model = await this.aiConfigService.upsertModelConfig(id, dto);

    return {
      data: model,
      success: true,
    };
  }

  @Put('admin/providers/:provider')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin')
  async putAdminProvider(
    @Param('provider') provider: string,
    @Body() dto: SetProviderApiKeyDto,
  ) {
    const updatedProvider = await this.aiConfigService.setProviderApiKey(
      provider,
      dto.apiKey,
    );

    return {
      data: updatedProvider,
      success: true,
    };
  }

  private async persistResolvedModel(
    userId: string,
    resolved: AiModelSelectionResult,
  ): Promise<void> {
    if (!resolved.shouldPersist) {
      return;
    }

    if (!resolved.activeModel) {
      await this.userModel.updateOne(
        { _id: userId },
        { $unset: { 'preferences.activeModel': 1 } },
      );
      return;
    }

    await this.userModel.updateOne(
      { _id: userId },
      { $set: { 'preferences.activeModel': resolved.activeModel } },
    );
  }
}
