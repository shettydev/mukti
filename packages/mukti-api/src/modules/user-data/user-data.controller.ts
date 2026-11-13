import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { isLocalMode } from '../../common/config/local-mode';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SUPPORTED_PROVIDERS } from '../ai/local-cli/provider-catalog';
import { type UserDataDeletion, UserDataService } from './user-data.service';

@ApiTags('User data')
@Controller('me')
export class UserDataController {
  constructor(private readonly service: UserDataService) {}
  @Delete('data')
  async deleteData(
    @CurrentUser('_id') userId: string,
    @Body() body: unknown,
  ): Promise<UserDataDeletion> {
    this.confirm(body);
    const result = await this.service.deleteAll(userId.toString());
    if (isLocalMode()) {
      result.outside = SUPPORTED_PROVIDERS.flatMap((provider) =>
        provider.keepsOutsideMukti.map(
          (entry) =>
            `${provider.label}: ${entry.what} at ${entry.where}. Not removed by Mukti. ${entry.howToRemove}`,
        ),
      );
    }
    return result;
  }
  @Delete()
  async deleteAccount(
    @CurrentUser('_id') userId: string,
    @Body() body: unknown,
  ): Promise<UserDataDeletion> {
    if (isLocalMode()) {
      throw new NotFoundException();
    }
    this.confirm(body);
    return this.service.deleteAccount(userId.toString());
  }
  private confirm(body: unknown): void {
    if (
      !body ||
      typeof body !== 'object' ||
      !('confirm' in body) ||
      body.confirm !== 'DELETE'
    ) {
      throw new BadRequestException(
        'Type DELETE to confirm permanent deletion.',
      );
    }
  }
}
