import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { SeedService } from './modules/conversations/services/seed.service';

/**
 * Database seeding script.
 * Seeds the database with initial data including built-in techniques and test user.
 *
 * Usage:
 *   bun run seed
 *   npm run seed
 */
async function seed() {
  const logger = new Logger('Seed');

  try {
    logger.log('Initializing application context...');
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    logger.log('Getting SeedService...');
    const seedService = app.get(SeedService);

    logger.log('Starting database seeding...');
    await seedService.seedAll();

    logger.log('Database seeding completed successfully');

    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
}

void seed();
