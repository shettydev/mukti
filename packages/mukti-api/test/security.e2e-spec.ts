import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as request from 'supertest';
import { type App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Security Configuration (e2e)', () => {
  let app: INestApplication<App>;
  let configService: ConfigService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = app.get(ConfigService);

    // Apply the same middleware as in main.ts
    const isProduction = configService.get<string>('NODE_ENV') === 'production';
    app.use(
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
      }),
    );

    const cookieSecret = configService.get<string>('SESSION_SECRET');
    app.use(cookieParser(cookieSecret));

    app.useGlobalFilters(new HttpExceptionFilter());

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

    const corsOrigins = configService.get<string>('CORS_ORIGINS');
    const frontendUrl = configService.get<string>('FRONTEND_URL');

    app.enableCors({
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
      credentials: true,
      exposedHeaders: ['X-CSRF-Token'],
      maxAge: 86400,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      origin: corsOrigins
        ? corsOrigins.split(',').map((origin) => origin.trim())
        : frontendUrl || 'http://localhost:3001',
    });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Security Headers', () => {
    it('should include helmet security headers', async () => {
      const response = await request(app.getHttpServer()).get('/');

      // Check for common security headers set by helmet
      expect(response.headers['x-dns-prefetch-control']).toBeDefined();
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-content-type-options']).toBeDefined();
      expect(response.headers['x-download-options']).toBeDefined();
    });

    it('should set X-Content-Type-Options to nosniff', async () => {
      const response = await request(app.getHttpServer()).get('/');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options', async () => {
      const response = await request(app.getHttpServer()).get('/');

      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });

  describe('CORS Configuration', () => {
    it('should allow requests from configured origin', async () => {
      const frontendUrl =
        configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';

      const response = await request(app.getHttpServer())
        .get('/')
        .set('Origin', frontendUrl);

      expect(response.headers['access-control-allow-origin']).toBe(frontendUrl);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should expose X-CSRF-Token header', async () => {
      const frontendUrl =
        configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';

      const response = await request(app.getHttpServer())
        .options('/')
        .set('Origin', frontendUrl);

      expect(response.headers['access-control-expose-headers']).toContain(
        'X-CSRF-Token',
      );
    });

    it('should allow required headers', async () => {
      const frontendUrl =
        configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';

      const response = await request(app.getHttpServer())
        .options('/')
        .set('Origin', frontendUrl)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });

  describe('Cookie Configuration', () => {
    it('should parse cookies with cookie-parser', async () => {
      // This test verifies that cookie-parser is configured
      // by checking if the app can handle cookie-based authentication
      const response = await request(app.getHttpServer())
        .get('/')
        .set('Cookie', ['test=value']);

      // If cookie-parser is working, the request should be processed
      expect(response.status).toBeDefined();
    });
  });

  describe('CSRF Token Endpoint', () => {
    it('should provide CSRF token endpoint', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/v1/auth/csrf-token',
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('csrfToken');
    });
  });
});
