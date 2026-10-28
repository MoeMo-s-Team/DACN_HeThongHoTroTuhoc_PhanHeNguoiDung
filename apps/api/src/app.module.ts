import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { validateJwtAccessSecret } from './auth/auth.config';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';

function validateEnvironment(config: Record<string, unknown>) {
  const port = Number(config.API_PORT ?? 3101);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT must be an integer between 1 and 65535');
  }
  const databaseUrl = String(config.DATABASE_URL ?? 'postgresql://dacn:dacn_dev_password@localhost:5433/dacn?schema=public');
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must use PostgreSQL');
  }
  validateJwtAccessSecret(config.JWT_ACCESS_SECRET);
  const frontendOrigin = String(config.FRONTEND_ORIGIN ?? 'http://localhost:3100');
  if (new URL(frontendOrigin).origin !== frontendOrigin) throw new Error('FRONTEND_ORIGIN must be an origin');
  return { ...config, API_PORT: port, DATABASE_URL: databaseUrl, FRONTEND_ORIGIN: frontendOrigin };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'], validate: validateEnvironment }),
    PrismaModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
