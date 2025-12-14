import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true, // Explicitly enable body parser
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Trust proxy is required when running behind a reverse proxy (e.g. Nginx, Cloudflare)
  // This ensures that secure cookies and IP rate limiting work correctly
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', true);

  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  app.enableShutdownHooks();

  // Security: Helmet for security headers
  // Exclude API documentation endpoints from strict CSP
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const apiPrefix = configService.get<string>('API_PREFIX') ?? 'api';
  const docsRoute = 'docs';
  const referenceRoute = 'reference';
  const prefixedDocsRoute = `/${apiPrefix}/${docsRoute}`;
  const prefixedReferenceRoute = `/${apiPrefix}/${referenceRoute}`;

  app.use((req, res, next) => {
    // Skip Helmet CSP for documentation endpoints
    if (
      req.path.startsWith('/reference') ||
      req.path.startsWith(prefixedReferenceRoute) ||
      req.path.startsWith(prefixedDocsRoute)
    ) {
      return next();
    }

    helmet({
      contentSecurityPolicy: isProduction
        ? undefined
        : {
            directives: {
              defaultSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
            },
          },
      crossOriginEmbedderPolicy: !isProduction,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })(req, res, next);
  });

  // Security: Cookie parser with secret
  const cookieSecret = configService.get<string>('SESSION_SECRET');
  app.use(cookieParser(cookieSecret));

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: false, // Don't strip properties - let decorators handle it
    }),
  );

  app.setGlobalPrefix(apiPrefix);

  app.enableVersioning({ defaultVersion: '1', type: VersioningType.URI });

  // Security: CORS configuration
  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const cookieDomain =
    configService.get<string>('COOKIE_DOMAIN') ??
    (isProduction ? 'mukti.live' : 'localhost');

  const allowedOrigins = new Set<string>(
    corsOrigins
      ? corsOrigins
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean)
      : [frontendUrl ?? 'http://localhost:3001'],
  );

  if (isProduction && cookieDomain !== 'localhost') {
    const normalizedDomain = cookieDomain.replace(/^\./, '');
    allowedOrigins.add(`https://${normalizedDomain}`);
    allowedOrigins.add(`https://www.${normalizedDomain}`);
    allowedOrigins.add(`https://api.${normalizedDomain}`);
  }

  app.enableCors({
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    credentials: true,
    exposedHeaders: ['X-CSRF-Token'],
    maxAge: 86400, // 24 hours
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: Array.from(allowedOrigins),
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mukti API')
    .setDescription('API documentation for the Mukti backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(docsRoute, app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    useGlobalPrefix: true,
  });

  const referenceHandler = apiReference({
    content: swaggerDocument,
  });
  app.use(`/${referenceRoute}`, referenceHandler);
  app.use(prefixedReferenceRoute, referenceHandler);

  // Ensure CORS middleware is registered before csurf
  await app.init();

  // Security: CSRF protection (only for state-changing operations)
  // Skip CSRF for API documentation and health check endpoints
  if (isProduction) {
    const normalizedCookieDomain =
      cookieDomain === 'localhost'
        ? cookieDomain
        : cookieDomain.startsWith('.')
          ? cookieDomain
          : `.${cookieDomain}`;

    app.use(
      csurf({
        cookie: {
          domain: normalizedCookieDomain,
          httpOnly: true,
          maxAge: 86400000, // 24 hours
          sameSite: 'lax',
          secure: true,
        },
        ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
      }),
    );
  }

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);

  const appUrl = await app.getUrl();
  logger.log(`API listening at ${appUrl}/${apiPrefix}`);

  logger.log(`Swagger docs available at ${appUrl}/${apiPrefix}/docs`);
}

void bootstrap();
