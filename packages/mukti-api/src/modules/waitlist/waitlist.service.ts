import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Waitlist, WaitlistDocument } from '../../schemas/waitlist.schema';
import { JoinWaitlistDto } from './dto';

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    @InjectModel(Waitlist.name)
    private waitlistModel: Model<WaitlistDocument>,
  ) {}

  async checkEmail(email: string) {
    const entry = await this.waitlistModel
      .findOne({ email: email.toLowerCase() })
      .lean();

    if (!entry) {
      throw new NotFoundException('Email not found in waitlist');
    }

    return {
      email: entry.email,
      exists: true,
      joinedAt: entry.joinedAt,
    };
  }

  async getAll(limit = 100, skip = 0) {
    const entries = await this.waitlistModel
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await this.waitlistModel.countDocuments();

    return {
      data: entries,
      limit,
      skip,
      total,
    };
  }

  async join(dto: JoinWaitlistDto, ipAddress?: string, userAgent?: string) {
    const existingEntry = await this.waitlistModel
      .findOne({ email: dto.email.toLowerCase() })
      .lean();

    if (existingEntry) {
      this.logger.log(`Email ${dto.email} already exists in waitlist`);
      throw new ConflictException('Email already exists in waitlist');
    }

    const waitlistEntry = new this.waitlistModel({
      email: dto.email.toLowerCase(),
      ipAddress,
      joinedAt: new Date(),
      userAgent,
    });

    await waitlistEntry.save();

    this.logger.log(`Added ${dto.email} to waitlist`);

    return {
      email: waitlistEntry.email,
      joinedAt: waitlistEntry.joinedAt,
    };
  }
}
