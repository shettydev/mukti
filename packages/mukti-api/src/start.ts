import type { INestApplication } from '@nestjs/common';
import type { Application, NextFunction, Request, Response } from 'express';

import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { applyLocalModeEnvDefaults } from './common/config/local-mode';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/** Port used when neither the caller nor `PORT` specifies one. */
const DEFAULT_API_PORT = 3000;

/**
 * Programmatic entrypoint for the API.
 *
 * @remarks
 * The published CLI starts the API by importing this, not by shelling out to
 * `nest start` — the CLI ships prebuilt output and has no Nest CLI, no
 * TypeScript, and no file watcher available. `main.ts` is the same thing for
 * the CLI-less case (`node dist/main`), so both paths configure the app
 * identically and there is only one place to change it.
 */
export interface StartApiOptions {
  /**
   * Bind address. The published CLI passes a loopback address so a local-mode
   * instance — which runs with auth bypassed for a seeded user — is never
   * reachable from the network.
   */
  readonly host?: string;
  /** Port to listen on. Defaults to `PORT`, then 3000. */
  readonly port?: number;
}

/**
 * Creates, configures and starts the Nest application, resolving once it is
 * listening. Returns the app so a caller that owns the process (the CLI) can
 * shut it down.
 */
export async function startApi(
  options: StartApiOptions = {},
): Promise<INestApplication> {
  // Fill in ephemeral secrets/defaults before any module reads config.
  applyLocalModeEnvDefaults();

  const app = await NestFactory.create(AppModule, {
    bodyParser: true, // Explicitly enable body parser
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Trust proxy is required when running behind a reverse proxy (e.g. Nginx, Cloudflare)
  // This ensures that secure cookies and IP rate limiting work correctly
  const expressApp = app.getHttpAdapter().getInstance() as Application;
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

  app.use((req: Request, res: Response, next: NextFunction) => {
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
        ? {
            directives: {
              defaultSrc: ["'self'"],
              imgSrc: ["'self'", 'data:'],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'"],
            },
          }
        : false, // Disable CSP in development for hot-reload tooling
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
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      whitelist: true,
    }),
  );

  app.setGlobalPrefix(apiPrefix);

  app.enableVersioning({ defaultVersion: '1', type: VersioningType.URI });

  // Security: CORS configuration
  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const cookieDomain =
    configService.get<string>('COOKIE_DOMAIN') ??
    (isProduction ? 'mukti.chat' : 'localhost');

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

  const port =
    options.port ?? configService.get<number>('PORT') ?? DEFAULT_API_PORT;

  // Nest's overloads differ by arity, so the bind address is only passed when
  // one was asked for — omitting it keeps the existing all-interfaces default
  // that hosted deployments rely on.
  if (options.host) {
    await app.listen(port, options.host);
  } else {
    await app.listen(port);
  }

  const appUrl = await app.getUrl();
  logger.log(`API listening at ${appUrl}/${apiPrefix}`);

  logger.log(`Swagger docs available at ${appUrl}/${apiPrefix}/docs`);

  return app;
}
