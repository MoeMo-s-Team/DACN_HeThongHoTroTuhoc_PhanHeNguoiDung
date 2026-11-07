import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { loadAiConfig } from './ai.config';

export const AI_CONFIG = 'AI_CONFIG';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [{
    provide: AI_CONFIG,
    useFactory: (config: ConfigService) => loadAiConfig({
      AI_RUNTIME_BASE_URL: config.get('AI_RUNTIME_BASE_URL'),
      AI_RUNTIME_TOKEN: config.get('AI_RUNTIME_TOKEN'),
    }),
    inject: [ConfigService],
  }],
  exports: [AI_CONFIG],
})
export class AiModule {}
