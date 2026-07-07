import { HttpException, HttpStatus } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { Subscription } from '../../../../schemas/subscription.schema';
import { SubscriptionService } from '../../../subscription/subscription.service';
import { FreeQuotaService } from '../free-quota.service';

describe('FreeQuotaService', () => {
  let service: FreeQuotaService;

  const userId = new Types.ObjectId();

  const mockSubscriptionModel: any = {
    exists: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockSubscriptionService: any = {
    ensureSubscription: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FreeQuotaService,
        {
          provide: getModelToken(Subscription.name),
          useValue: mockSubscriptionModel,
        },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    }).compile();

    service = module.get<FreeQuotaService>(FreeQuotaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('consumes a free message when the user is under the daily limit', async () => {
    mockSubscriptionModel.findOneAndUpdate.mockResolvedValue({
      usage: { freeApiMessagesUsed: 1 },
    });

    await expect(service.checkAndConsume(userId)).resolves.toBeUndefined();

    expect(mockSubscriptionModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(mockSubscriptionService.ensureSubscription).not.toHaveBeenCalled();
  });

  it('self-heals by creating a subscription when none exists, instead of throwing 500', async () => {
    // First atomic attempt matches nothing (no subscription record yet).
    mockSubscriptionModel.findOneAndUpdate
      .mockResolvedValueOnce(null)
      // After provisioning, the retry succeeds.
      .mockResolvedValueOnce({ usage: { freeApiMessagesUsed: 1 } });
    mockSubscriptionModel.exists.mockResolvedValue(null);
    mockSubscriptionService.ensureSubscription.mockResolvedValue({});

    await expect(service.checkAndConsume(userId)).resolves.toBeUndefined();

    expect(mockSubscriptionService.ensureSubscription).toHaveBeenCalledWith(
      userId,
    );
    expect(mockSubscriptionModel.findOneAndUpdate).toHaveBeenCalledTimes(2);
  });

  it('throws 429 when an existing subscription has hit the daily limit', async () => {
    mockSubscriptionModel.findOneAndUpdate.mockResolvedValue(null);
    // Subscription exists, so no self-heal — the null means limit reached.
    mockSubscriptionModel.exists.mockResolvedValue({
      _id: new Types.ObjectId(),
    });

    await expect(service.checkAndConsume(userId)).rejects.toMatchObject({
      constructor: HttpException,
    });
    await expect(service.checkAndConsume(userId)).rejects.toHaveProperty(
      'status',
      HttpStatus.TOO_MANY_REQUESTS,
    );

    expect(mockSubscriptionService.ensureSubscription).not.toHaveBeenCalled();
  });
});
