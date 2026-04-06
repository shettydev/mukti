import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Logger,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import { JoinWaitlistDto } from './dto';
import { WaitlistService } from './waitlist.service';

/**
 * @deprecated Waitlist functionality is deprecated. Registration is now open — users
 * should sign up directly via the auth flow. These endpoints are preserved for
 * backward compatibility and existing data access only.
 */
@ApiTags('Waitlist')
@Controller('waitlist')
export class WaitlistController {
  private readonly logger = new Logger(WaitlistController.name);

  constructor(private readonly waitlistService: WaitlistService) {}

  /**
   * @deprecated Use the auth sign-up flow instead.
   */
  @ApiOperation({
    deprecated: true,
    summary: 'Join the waitlist (deprecated — registration is now open)',
  })
  @ApiResponse({
    description: 'Successfully joined waitlist',
    status: 201,
  })
  @ApiResponse({
    description: 'Email already exists in waitlist',
    status: 409,
  })
  @HttpCode(HttpStatus.CREATED)
  @Post('join')
  @Public()
  async join(
    @Body() dto: JoinWaitlistDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    this.logger.warn(
      `Deprecated waitlist join attempt from IP ${ip} — registration is now open`,
    );

    const userAgent = req.headers['user-agent'] ?? 'Unknown';

    const result = await this.waitlistService.join(dto, ip, userAgent);

    return result;
  }

  /**
   * @deprecated Use the auth sign-up flow instead.
   */
  @ApiOperation({
    deprecated: true,
    summary:
      'Check if email is in waitlist (deprecated — registration is now open)',
  })
  @ApiResponse({
    description: 'Email exists in waitlist',
    status: 200,
  })
  @ApiResponse({
    description: 'Email not found in waitlist',
    status: 404,
  })
  @Get('check')
  @Public()
  async check(@Query('email') email: string) {
    this.logger.warn(
      `Deprecated waitlist check for email: ${email} — registration is now open`,
    );

    const result = await this.waitlistService.checkEmail(email);

    return result;
  }
}
