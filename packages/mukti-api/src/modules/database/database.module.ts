import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { ALL_SCHEMAS } from '../../schemas';

@Module({
  exports: [MongooseModule],
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            console.log('✅ MongoDB connected successfully');
          });
          connection.on('error', (error) => {
            console.error('❌ MongoDB connection error:', error);
          });
          connection.on('disconnected', () => {
            console.log('⚠️  MongoDB disconnected');
          });
          return connection;
        },
        retryAttempts: 3,
        retryDelay: 1000,
        uri:
          configService.get<string>('MONGODB_URI') ||
          'mongodb://localhost:27017/mukti',
      }),
    }),
    MongooseModule.forFeature(ALL_SCHEMAS),
  ],
})
export class DatabaseModule {}
