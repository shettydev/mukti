import {
  type CallHandler,
  type ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'test-request-id'),
}));

import { SKIP_ENVELOPE_KEY } from '../../decorators/skip-envelope.decorator';
import { ResponseInterceptor } from '../response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor;
  let reflector: Reflector;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockResponse: { statusCode: number };

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new ResponseInterceptor(reflector);

    mockResponse = { statusCode: HttpStatus.OK };

    mockExecutionContext = {
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getClass: jest.fn().mockReturnValue(class TestController {}),
      getHandler: jest.fn().mockReturnValue(() => {
        // noop — stub handler reference used only for reflector metadata lookup
      }),
      getType: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn(),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };

    mockCallHandler = {
      handle: jest.fn(),
    };
  });

  describe('standard wrapping', () => {
    it('should wrap a plain object in the standard envelope', (done) => {
      const controllerResult = { id: '123', name: 'Test' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(controllerResult));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual(controllerResult);
          expect(result.meta.requestId).toBe('test-request-id');
          expect(result.meta.timestamp).toBeDefined();
          expect(() => new Date(result.meta.timestamp)).not.toThrow();
          done();
        });
    });

    it('should wrap an array in the standard envelope', (done) => {
      const controllerResult = [{ id: '1' }, { id: '2' }];
      mockCallHandler.handle = jest.fn().mockReturnValue(of(controllerResult));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual(controllerResult);
          expect(result.meta.requestId).toBeDefined();
          done();
        });
    });

    it('should wrap a string value in the standard envelope', (done) => {
      const controllerResult = 'some string result';
      mockCallHandler.handle = jest.fn().mockReturnValue(of(controllerResult));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          expect(result.success).toBe(true);
          expect(result.data).toBe('some string result');
          expect(result.meta.requestId).toBeDefined();
          done();
        });
    });

    it('should wrap a number value in the standard envelope', (done) => {
      const controllerResult = 42;
      mockCallHandler.handle = jest.fn().mockReturnValue(of(controllerResult));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          expect(result.success).toBe(true);
          expect(result.data).toBe(42);
          done();
        });
    });

    it('should wrap a boolean value in the standard envelope', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of(true));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          expect(result.success).toBe(true);
          expect(result.data).toBe(true);
          done();
        });
    });
  });

  describe('null/undefined handling', () => {
    it('should omit data key when controller returns null', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of(null));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          expect(result.success).toBe(true);
          expect(result).not.toHaveProperty('data');
          expect(result.meta.requestId).toBeDefined();
          done();
        });
    });

    it('should omit data key when controller returns undefined', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of(undefined));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          expect(result.success).toBe(true);
          expect(result).not.toHaveProperty('data');
          expect(result.meta.requestId).toBeDefined();
          done();
        });
    });
  });

  describe('204 No Content', () => {
    it('should pass through undefined for 204 status without wrapping', (done) => {
      mockResponse.statusCode = HttpStatus.NO_CONTENT;
      mockCallHandler.handle = jest.fn().mockReturnValue(of(undefined));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          expect(result).toBeUndefined();
          done();
        });
    });
  });

  describe('paginated result merging', () => {
    it('should extract data and merge meta for paginated results', (done) => {
      const controllerResult = {
        data: [{ id: '1' }, { id: '2' }],
        meta: { limit: 20, page: 1, total: 100, totalPages: 5 },
      };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(controllerResult));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual([{ id: '1' }, { id: '2' }]);
          expect(result.meta.requestId).toBe('test-request-id');
          expect(result.meta.timestamp).toBeDefined();
          expect(result.meta.page).toBe(1);
          expect(result.meta.limit).toBe(20);
          expect(result.meta.total).toBe(100);
          expect(result.meta.totalPages).toBe(5);
          done();
        });
    });

    it('should handle paginated result with empty data array', (done) => {
      const controllerResult = {
        data: [],
        meta: { limit: 20, page: 1, total: 0, totalPages: 0 },
      };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(controllerResult));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual([]);
          expect(result.meta.total).toBe(0);
          done();
        });
    });
  });

  describe('@SkipEnvelope() decorator', () => {
    it('should skip wrapping when @SkipEnvelope() is on the handler', (done) => {
      const controllerResult = { custom: 'response' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(controllerResult));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          expect(result).toEqual({ custom: 'response' });
          expect(result).not.toHaveProperty('success');
          expect(result).not.toHaveProperty('meta');
          done();
        });
    });

    it('should check both handler and class for @SkipEnvelope() metadata', () => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of({}));
      const spy = jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(false);

      interceptor.intercept(mockExecutionContext, mockCallHandler);

      expect(spy).toHaveBeenCalledWith(SKIP_ENVELOPE_KEY, [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });
  });

  describe('201 Created status', () => {
    it('should wrap response normally for 201 status', (done) => {
      mockResponse.statusCode = HttpStatus.CREATED;
      const controllerResult = { id: 'new-123', title: 'New Item' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(controllerResult));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual(controllerResult);
          expect(result.meta.requestId).toBeDefined();
          done();
        });
    });
  });

  describe('202 Accepted status', () => {
    it('should wrap response normally for 202 status (queue jobs)', (done) => {
      mockResponse.statusCode = HttpStatus.ACCEPTED;
      const controllerResult = { jobId: 'job-123', position: 1 };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(controllerResult));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual({ jobId: 'job-123', position: 1 });
          expect(result.meta.requestId).toBeDefined();
          done();
        });
    });
  });

  describe('edge cases', () => {
    it('should not treat object with only "data" key as paginated', (done) => {
      const controllerResult = { data: 'some-value' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(controllerResult));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          // Without a "meta" key, the whole object is treated as data
          expect(result.success).toBe(true);
          expect(result.data).toEqual({ data: 'some-value' });
          done();
        });
    });

    it('should not treat object with non-object "meta" as paginated', (done) => {
      const controllerResult = { data: [1, 2], meta: 'not-an-object' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(controllerResult));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          // meta is a string, not an object — treated as regular data
          expect(result.success).toBe(true);
          expect(result.data).toEqual({ data: [1, 2], meta: 'not-an-object' });
          done();
        });
    });

    it('should handle empty object return', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of({}));
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      interceptor
        .intercept(mockExecutionContext, mockCallHandler)
        .subscribe((result: any) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual({});
          expect(result.meta.requestId).toBeDefined();
          done();
        });
    });
  });
});
