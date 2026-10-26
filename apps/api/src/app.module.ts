import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
  return { ...config, API_PORT: port, DATABASE_URL: databaseUrl };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'], validate: validateEnvironment }),
    PrismaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
