import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { loadAiConfig } from './ai.config';
import { AiOutputValidator } from './ai-output.validator';
import { AiRequestLogService } from './ai-request-log.service';
import { AiConfig } from './ai.config';
import { AiGateway } from './ai.gateway';
import { AiService } from './ai.service';

export const AI_CONFIG = 'AI_CONFIG';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    {
      provide: AI_CONFIG,
      useFactory: (config: ConfigService) => loadAiConfig({
        AI_RUNTIME_BASE_URL: config.get('AI_RUNTIME_BASE_URL'),
        AI_RUNTIME_TOKEN: config.get('AI_RUNTIME_TOKEN'),
      }),
      inject: [ConfigService],
    },
    { provide: AiGateway, useFactory: (config: AiConfig) => new AiGateway(config), inject: [AI_CONFIG] },
    { provide: AiOutputValidator, useFactory: () => new AiOutputValidator() },
    AiRequestLogService,
    AiService,
  ],
  exports: [AI_CONFIG, AiOutputValidator, AiRequestLogService, AiService],
})
export class AiModule {}
