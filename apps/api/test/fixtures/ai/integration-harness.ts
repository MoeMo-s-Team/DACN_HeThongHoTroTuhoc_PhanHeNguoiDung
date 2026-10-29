import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { AiConfig, CapacityProfile, AiDeploymentBinding, AiConfiguration } from '../../../src/ai/ai.config';
import { AiGatewayService } from '../../../src/ai/ai-gateway.service';
import { AiInferenceService, AiInvocationPolicy } from '../../../src/ai/ai-inference.service';
import { AiRequestLogRepository } from '../../../src/ai/ai-request-log.repository';
import { AiSemanticValidator } from '../../../src/ai/ai-semantic-validator';
import { CapacityPreflightService, TokenEstimator } from '../../../src/ai/capacity-preflight.service';
import { RuntimeHttpAdapter, RuntimeHttpResponse } from '../../../src/ai/runtime-http.client';
import { AiTask, SchemaRegistryService } from '../../../src/ai/schema-registry.service';

export const aiTasks: AiTask[] = [
  'STUDENT_LEARNING_ANALYSIS', 'STUDENT_STUDY_PLAN_GENERATION', 'STUDENT_STUDY_PLAN_ADJUSTMENT',
  'TEACHER_CLASS_ANALYSIS', 'ADMIN_FEEDBACK_GROUPING_STAGE1', 'ADMIN_FEEDBACK_SUMMARY_STAGE2',
];
const fixtureDir = join(process.cwd(), '../../docs/releases/ai-contract-v1.0-schema-pack-release1/fixtures/valid');
export const aiFixture = (name: string) => JSON.parse(readFileSync(join(fixtureDir, name), 'utf8'));
const promptVersions = Object.fromEntries(aiTasks.map((task) => [task, `prompt-${task}`]));
const capacityProfile: CapacityProfile = {
  capacityProfileVersion: 'integration-v1', modelId: 'integration-model', tokenizerId: 'integration-tokenizer',
  contractVersion: '1.0', contextWindowTokens: 100_000, inputSafetyMarginTokens: 100,
  tasks: Object.fromEntries(aiTasks.map((task) => [task, { reservedOutputTokens: 100, promptAndSchemaOverheadTokens: 100, promptVersion: promptVersions[task] }])),
};
const deployment: AiDeploymentBinding = {
  modelId: capacityProfile.modelId, tokenizerId: capacityProfile.tokenizerId, contractVersion: '1.0', promptVersions,
};

export class ScriptedAiRuntime implements RuntimeHttpAdapter {
  calls = 0;
  readonly requests: unknown[] = [];
  readonly replies: Array<unknown | Error | ((request: Record<string, any>) => Promise<unknown>)> = [];

  queue(...replies: ScriptedAiRuntime['replies']): this {
    this.replies.push(...replies);
    return this;
  }

  async post(_url: string, body: string): Promise<RuntimeHttpResponse> {
    this.calls += 1;
    const request = JSON.parse(body) as Record<string, any>;
    this.requests.push(request);
    const reply = this.replies.shift();
    if (reply instanceof Error) throw reply;
    if (reply === undefined) throw new Error('Integration fake runtime response was not scripted');
    const output = typeof reply === 'function' ? await reply(request) : reply;
    if (output && typeof output === 'object' && 'status' in output && 'body' in output) {
      const response = output as { status: number; body: string };
      return { status: response.status, body: response.body };
    }
    return {
      status: 200,
      body: JSON.stringify({
        contractVersion: request.contractVersion,
        requestId: request.requestId,
        task: request.task,
        output,
        runtime: { modelId: capacityProfile.modelId, promptVersion: promptVersions[request.task as AiTask] },
      }),
    };
  }
}

export function makeAiInference(prisma: PrismaClient, runtime: RuntimeHttpAdapter, policy: AiInvocationPolicy, estimate: (payload: string) => number = () => 1, overrides: Partial<AiConfiguration> = {}) {
  const schemas = new SchemaRegistryService();
  const config = new AiConfig({ capacityProfile, deployment, registryPromptVersions: promptVersions, ...overrides });
  const tokenizer: TokenEstimator = {
    tokenizerId: capacityProfile.tokenizerId,
    capacityProfileVersion: capacityProfile.capacityProfileVersion,
    estimate,
  };
  const preflight = new CapacityPreflightService(config, tokenizer);
  const logs = new AiRequestLogRepository(prisma as never);
  return new AiInferenceService(
    preflight,
    schemas,
    new AiSemanticValidator(schemas),
    new AiGatewayService(runtime, schemas),
    logs,
    policy,
    { registryPromptVersions: promptVersions, profilePromptVersions: promptVersions },
  );
}
