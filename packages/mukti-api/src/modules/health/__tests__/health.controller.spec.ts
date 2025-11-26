import type { TestingModule } from '@nestjs/testing';

import { HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';

import { HealthController } from '../health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };

    const mockMongooseHealthIndicator = {
      pingCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: MongooseHealthIndicator,
          useValue: mockMongooseHealthIndicator,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should perform health check with database ping', async () => {
      const mockResult = {
        details: { database: { status: 'up' } },
        error: {},
        info: { database: { status: 'up' } },
        status: 'ok' as const,
      };

      jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockResult as any);

      const result = await controller.check();

      expect(healthCheckService.check).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('live', () => {
    it('should return ok status', () => {
      const result = controller.live();

      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('ready', () => {
    it('should perform readiness check with database ping', async () => {
      const mockResult = {
        details: { database: { status: 'up' } },
        error: {},
        info: { database: { status: 'up' } },
        status: 'ok' as const,
      };

      jest
        .spyOn(healthCheckService, 'check')
        .mockResolvedValue(mockResult as any);

      const result = await controller.ready();

      expect(healthCheckService.check).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });
});
