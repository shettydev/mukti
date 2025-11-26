import type { Request, Response } from 'express';

import {
  type ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'test-request-id'),
}));

import { HttpExceptionFilter } from '../http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    // Mock response object
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };

    // Mock request object
    const getMock = jest.fn();
    getMock.mockImplementation((header: string) => {
      if (header === 'user-agent') {
        return 'Jest Test Agent';
      }
      if (header === 'set-cookie') {
        return [];
      }
      return undefined;
    });

    mockRequest = {
      get: getMock as any,
      ip: '127.0.0.1',
      method: 'GET',
      url: '/api/v1/test',
    };

    // Mock ArgumentsHost
    mockArgumentsHost = {
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };
  });

  describe('catch', () => {
    it('should format BadRequestException correctly', () => {
      const exception = new BadRequestException('Invalid input');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
      expect(jsonCall.error.code).toBe('BAD_REQUEST');
      expect(jsonCall.error.message).toBe('Invalid input');
      expect(jsonCall.meta.timestamp).toBeDefined();
      expect(jsonCall.meta.requestId).toBeDefined();
      expect(jsonCall.meta.path).toBe('/api/v1/test');
      expect(jsonCall.meta.method).toBe('GET');
    });

    it('should format NotFoundException correctly', () => {
      const exception = new NotFoundException('Resource not found');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
      expect(jsonCall.error.code).toBe('NOT_FOUND');
      expect(jsonCall.error.message).toBe('Resource not found');
    });

    it('should format UnauthorizedException correctly', () => {
      const exception = new UnauthorizedException('Invalid credentials');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
      expect(jsonCall.error.code).toBe('UNAUTHORIZED');
      expect(jsonCall.error.message).toBe('Invalid credentials');
    });

    it('should handle validation errors with array of messages', () => {
      const exception = new BadRequestException({
        error: 'Bad Request',
        message: ['email must be a valid email', 'password is too short'],
        statusCode: 400,
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
      expect(jsonCall.error.code).toBe('VALIDATION_ERROR');
      expect(jsonCall.error.message).toBe('Validation failed');
      expect(jsonCall.error.details.errors).toEqual([
        'email must be a valid email',
        'password is too short',
      ]);
    });

    it('should handle custom error structure from guards', () => {
      const exception = new HttpException(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            details: {
              retryAfter: 60,
            },
            message: 'Too many requests',
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.TOO_MANY_REQUESTS,
      );

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
      expect(jsonCall.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(jsonCall.error.message).toBe('Too many requests');
      expect(jsonCall.error.details.retryAfter).toBe(60);
    });

    it('should handle InternalServerErrorException', () => {
      const exception = new InternalServerErrorException(
        'Something went wrong',
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
      expect(jsonCall.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(jsonCall.error.message).toBe('Something went wrong');
    });

    it('should handle unexpected errors (non-HttpException)', () => {
      const exception = new Error('Unexpected error');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
      expect(jsonCall.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(jsonCall.error.message).toBeDefined();
    });

    it('should include request ID in response', () => {
      const exception = new BadRequestException('Test error');

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.meta.requestId).toBeDefined();
      expect(typeof jsonCall.meta.requestId).toBe('string');
      expect(jsonCall.meta.requestId.length).toBeGreaterThan(0);
    });

    it('should include timestamp in ISO format', () => {
      const exception = new BadRequestException('Test error');

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.meta.timestamp).toBeDefined();
      expect(() => new Date(jsonCall.meta.timestamp)).not.toThrow();
    });

    it('should include request path and method in meta', () => {
      const exception = new BadRequestException('Test error');

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.meta.path).toBe('/api/v1/test');
      expect(jsonCall.meta.method).toBe('GET');
    });

    it('should handle string error responses', () => {
      const exception = new HttpException(
        'Simple error message',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
      expect(jsonCall.error.message).toBe('Simple error message');
    });

    it('should not expose stack traces in production for unexpected errors', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const exception = new Error('Unexpected error');

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.error.message).toBe('An unexpected error occurred');
      expect(jsonCall.error.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });

    it('should expose error details in development for unexpected errors', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const exception = new Error('Unexpected error');

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.error.message).toBe('Unexpected error');
      expect(jsonCall.error.details).toBeDefined();
      expect(jsonCall.error.details.stack).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('error code generation', () => {
    it('should convert exception names to error codes correctly', () => {
      const testCases = [
        { exception: new BadRequestException(), expectedCode: 'BAD_REQUEST' },
        { exception: new NotFoundException(), expectedCode: 'NOT_FOUND' },
        {
          exception: new UnauthorizedException(),
          expectedCode: 'UNAUTHORIZED',
        },
        {
          exception: new InternalServerErrorException(),
          expectedCode: 'INTERNAL_SERVER_ERROR',
        },
      ];

      testCases.forEach(({ exception, expectedCode }) => {
        filter.catch(exception, mockArgumentsHost);

        const jsonCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
        expect(jsonCall.error.code).toBe(expectedCode);

        // Clear mock for next iteration
        (mockResponse.json as jest.Mock).mockClear();
      });
    });
  });
});
