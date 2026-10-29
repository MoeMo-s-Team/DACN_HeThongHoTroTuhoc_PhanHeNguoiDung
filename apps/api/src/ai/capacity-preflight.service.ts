import { HttpException } from '@nestjs/common';
import { AiConfig, type CapacityProfile } from './ai.config';
import { AiTask } from './schema-registry.service';

export interface InferenceRequest {
  contractVersion: '1.0';
  requestId: string;
  task: AiTask;
  locale: 'vi-VN';
  input: unknown;
}

export interface TokenEstimator {
  tokenizerId: string;
  capacityProfileVersion: string;
  estimate(serializedPayload: string): number;
}

export interface PreflightResult {
  serializedPayload: string;
  estimatedInputTokens: number;
  inputBudgetTokens: number;
}

export class AiPreflightError extends HttpException {
  constructor(readonly code: 'AI_INPUT_TOO_LARGE' | 'AI_RUNTIME_FAILURE', status: 422 | 502) {
    super({
      code,
      message: code === 'AI_INPUT_TOO_LARGE'
        ? 'Dữ liệu hiện vượt khả năng xử lý của AI cho yêu cầu này. Hãy thu hẹp phạm vi dữ liệu khi có thể và thử lại.'
        : 'AI tạm thời chưa thể xử lý yêu cầu. Vui lòng thử lại sau.',
      details: code === 'AI_INPUT_TOO_LARGE' ? { reason: 'AI_CONTEXT_CAPACITY' } : null,
    }, status);
    this.name = 'AiPreflightError';
  }
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function validProfile(profile: unknown): profile is CapacityProfile {
  if (!isRecord(profile)) return false;
  return Boolean(isNonEmptyString(profile.capacityProfileVersion) && isNonEmptyString(profile.modelId)
    && isNonEmptyString(profile.tokenizerId) && isNonEmptyString(profile.contractVersion)
    && isNonNegativeInteger(profile.contextWindowTokens) && profile.contextWindowTokens > 0
    && isNonNegativeInteger(profile.inputSafetyMarginTokens) && isRecord(profile.tasks));
}

function validDeployment(deployment: unknown): deployment is NonNullable<AiConfig['value']['deployment']> {
  return isRecord(deployment) && Boolean(isNonEmptyString(deployment.modelId)
    && isNonEmptyString(deployment.tokenizerId) && isNonEmptyString(deployment.contractVersion))
    && isRecord(deployment.promptVersions);
}

export function buildRequest(task: AiTask, input: unknown, requestId: string): InferenceRequest {
  return { contractVersion: '1.0', requestId, task, locale: 'vi-VN', input };
}

export class CapacityPreflightService {
  constructor(private readonly config: AiConfig, private readonly estimator?: TokenEstimator) {}

  buildRequest(task: AiTask, input: unknown, requestId: string): InferenceRequest {
    return buildRequest(task, input, requestId);
  }

  preflight(request: InferenceRequest): PreflightResult {
    const { capacityProfile: profile, deployment, registryPromptVersions } = this.config.value;
    const estimateTokens = this.estimator;
    if (!validProfile(profile) || !validDeployment(deployment) || !estimateTokens) this.mismatch();

    const taskProfile = profile.tasks[request.task];
    const registryPromptVersion = registryPromptVersions[request.task];
    const deployedPromptVersion = deployment.promptVersions[request.task];
    if (!isRecord(taskProfile) || !isNonNegativeInteger(taskProfile.reservedOutputTokens)
      || taskProfile.reservedOutputTokens === 0
      || !isNonNegativeInteger(taskProfile.promptAndSchemaOverheadTokens)
      || !isNonEmptyString(taskProfile.promptVersion)
      || !isNonEmptyString(registryPromptVersion)
      || !isNonEmptyString(deployedPromptVersion)
      || request.contractVersion !== profile.contractVersion
      || deployment.contractVersion !== profile.contractVersion
      || deployment.modelId !== profile.modelId
      || deployment.tokenizerId !== profile.tokenizerId
      || taskProfile.promptVersion !== registryPromptVersion
      || taskProfile.promptVersion !== deployedPromptVersion
      || estimateTokens.tokenizerId !== profile.tokenizerId
      || estimateTokens.capacityProfileVersion !== profile.capacityProfileVersion) this.mismatch();

    const inputBudgetTokens = profile.contextWindowTokens - taskProfile.reservedOutputTokens
      - taskProfile.promptAndSchemaOverheadTokens - profile.inputSafetyMarginTokens;
    if (inputBudgetTokens < 0) this.mismatch();

    const serializedPayload = JSON.stringify(request);
    let estimatedInputTokens: number;
    try {
      estimatedInputTokens = estimateTokens.estimate(serializedPayload);
    } catch {
      this.mismatch();
    }
    if (!isNonNegativeInteger(estimatedInputTokens)) this.mismatch();
    if (estimatedInputTokens > inputBudgetTokens) throw new AiPreflightError('AI_INPUT_TOO_LARGE', 422);
    return { serializedPayload, estimatedInputTokens, inputBudgetTokens };
  }

  private mismatch(): never {
    throw new AiPreflightError('AI_RUNTIME_FAILURE', 502);
  }
}
