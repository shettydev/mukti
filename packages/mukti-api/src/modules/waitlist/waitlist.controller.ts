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

import { Public } from '../auth/decorators/public.decorator';
import { JoinWaitlistDto } from './dto';
import { WaitlistService } from './waitlist.service';

@ApiTags('Waitlist')
@Controller('waitlist')
export class WaitlistController {
  private readonly logger = new Logger(WaitlistController.name);

  constructor(private readonly waitlistService: WaitlistService) {}

  @ApiOperation({ summary: 'Join the waitlist' })
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
    this.logger.log(`Waitlist join attempt from IP ${ip}`);

    const userAgent = req.headers['user-agent'] ?? 'Unknown';

    const result = await this.waitlistService.join(dto, ip, userAgent);

    return {
      data: result,
      success: true,
    };
  }

  @ApiOperation({ summary: 'Check if email is in waitlist' })
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
    this.logger.log(`Checking waitlist for email: ${email}`);

    const result = await this.waitlistService.checkEmail(email);

    return {
      data: result,
      success: true,
    };
  }
}
