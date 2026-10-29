import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AiConfig } from './ai.config';
import { AiGatewayService } from './ai-gateway.service';
import { AiFlowService } from './ai-flow.service';
import { AiInferenceService, DenyAllAiInvocationPolicy, promptBindings } from './ai-inference.service';
import { AiRequestLogRepository } from './ai-request-log.repository';
import { AiSemanticValidator } from './ai-semantic-validator';
import { CapacityPreflightService } from './capacity-preflight.service';
import { RuntimeHttpClient } from './runtime-http.client';
import { SchemaRegistryService } from './schema-registry.service';

export const AI_INVOCATION_POLICY = Symbol('AI_INVOCATION_POLICY');

@Module({
  imports: [PrismaModule],
  providers: [
    SchemaRegistryService,
    AiSemanticValidator,
    AiRequestLogRepository,
    { provide: AiConfig, useFactory: () => AiConfig.fromEnvironment() },
    { provide: CapacityPreflightService, useFactory: (config: AiConfig) => new CapacityPreflightService(config), inject: [AiConfig] },
    { provide: RuntimeHttpClient, useFactory: () => new RuntimeHttpClient({
      baseUrl: process.env.AI_RUNTIME_URL,
      apiKey: process.env.AI_RUNTIME_API_KEY,
    }) },
    {
      provide: AiGatewayService,
      useFactory: (client: RuntimeHttpClient, schemas: SchemaRegistryService) => new AiGatewayService(client, schemas),
      inject: [RuntimeHttpClient, SchemaRegistryService],
    },
    { provide: AI_INVOCATION_POLICY, useClass: DenyAllAiInvocationPolicy },
    {
      provide: AiInferenceService,
      useFactory: (preflight: CapacityPreflightService, schemas: SchemaRegistryService, semantic: AiSemanticValidator,
        gateway: AiGatewayService, logs: AiRequestLogRepository, policy: DenyAllAiInvocationPolicy, config: AiConfig) =>
        new AiInferenceService(preflight, schemas, semantic, gateway, logs, policy, promptBindings(config)),
      inject: [CapacityPreflightService, SchemaRegistryService, AiSemanticValidator, AiGatewayService, AiRequestLogRepository, AI_INVOCATION_POLICY, AiConfig],
    },
    AiFlowService,
  ],
  exports: [AiFlowService, AiInferenceService],
})
export class AiModule {}
