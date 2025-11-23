import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
      whitelist: true,
    }),
  );

  const apiPrefix = configService.get<string>('API_PREFIX') ?? 'api';
  app.setGlobalPrefix(apiPrefix);

  app.enableVersioning({ type: VersioningType.URI });

  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  app.enableCors({
    credentials: true,
    origin: corsOrigins
      ? corsOrigins.split(',').map((origin) => origin.trim())
      : true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mukti API')
    .setDescription('API documentation for the Mukti backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.use(
    `/reference`,
    apiReference({
      content: swaggerDocument,
    }),
  );

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);

  const appUrl = await app.getUrl();
  logger.log(`API listening at ${appUrl}/${apiPrefix}`);

  logger.log(`Swagger docs available at ${appUrl}/${apiPrefix}/docs`);
}

void bootstrap();
