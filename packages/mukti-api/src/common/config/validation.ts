import type { ValidationPipeOptions } from '@nestjs/common';

/**
 * The validation every request body and query goes through (registered as the
 * global `ValidationPipe` in `start.ts`). Exported so DTO tests validate with
 * exactly the options the running API uses.
 */
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
  whitelist: true,
};
