/**
 * Local-mode endpoints for choosing the AI CLI from Settings.
 *
 * @remarks
 * These exist only under `MUKTI_LOCAL`. Elsewhere they answer 404, as if they
 * were never registered, so a hosted deployment exposes nothing that probes or
 * runs local binaries. Local mode binds to loopback and limits CORS to the web
 * origin; the request body only ever selects an entry from the fixed provider
 * catalogue, and nothing from it reaches a command line.
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Put,
  Query,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Model } from 'mongoose';

import { isLocalMode } from '../../common/config/local-mode';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserDocument } from '../../schemas/user.schema';
import { SwitchProviderDto } from './dto/switch-provider.dto';
import { AiPolicyService } from './services/ai-policy.service';
import { LocalProviderSwitchService } from './services/local-provider-switch.service';

@ApiTags('AI')
@Controller('ai')
export class LocalProviderController {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly aiPolicyService: AiPolicyService,
    private readonly switcher: LocalProviderSwitchService,
  ) {}

  /** Every supported local AI CLI, with whether it is ready to use. */
  @Get('providers')
  async getProviders(
    @CurrentUser('_id') userId: string,
    @Query('refresh') refresh?: string,
  ) {
    this.assertLocalMode();

    const status = await this.switcher.getStatus({
      refresh: refresh === '1' || refresh === 'true',
    });
    return { ...status, activeModel: await this.activeModelFor(userId) };
  }

  /**
   * Makes another local AI CLI active, from the next AI request on.
   *
   * @remarks
   * Can take several seconds: the target is probed and prepared (model
   * discovery, Codex's settings self-check) before it becomes active. The
   * response carries the new model list and the model the user's turns will
   * now run on, so the web app can refresh its picker in one round trip.
   */
  @HttpCode(HttpStatus.OK)
  @Put('provider')
  async switchProvider(
    @CurrentUser('_id') userId: string,
    @Body() dto: SwitchProviderDto,
  ) {
    this.assertLocalMode();

    const result = await this.switcher.switchTo(dto.id, {
      saveAsDefault: dto.saveAsDefault,
    });
    return {
      ...result,
      activeModel: await this.activeModelFor(userId),
      models: this.aiPolicyService.getCuratedModels(),
    };
  }

  /** The model this user's turns will run on under the active CLI. */
  private async activeModelFor(userId: string): Promise<string> {
    const user = await this.userModel
      .findById(userId)
      .select('preferences')
      .lean();
    return this.aiPolicyService.resolveLocalCliModel(
      user?.preferences?.activeModel,
    );
  }

  private assertLocalMode(): void {
    if (!isLocalMode()) {
      throw new NotFoundException();
    }
  }
}
