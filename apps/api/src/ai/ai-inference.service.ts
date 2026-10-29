import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AIRequestStatus } from '@prisma/client';
import { AuthUser } from '../auth/auth.service';
import { AiConfig } from './ai.config';
import { CapacityPreflightService, InferenceRequest } from './capacity-preflight.service';
import { AiGatewayError, AiGatewayService } from './ai-gateway.service';
import { AiSemanticValidationError, AiSemanticValidator } from './ai-semantic-validator';
import { AiRequestLogRepository } from './ai-request-log.repository';
import { AiSchemaValidationError, AiTask, SchemaRegistryService } from './schema-registry.service';

export type AiTaskRequest = InferenceRequest;
export type AiAuthoritativeContext = Record<string, unknown>;
export type ValidatedTaskOutput = Record<string, unknown>;

export interface AiInvocationPolicy {
  authorize(principal: AuthUser, task: AiTask, context: AiAuthoritativeContext): Promise<void> | void;
  checkEligibility(principal: AuthUser, task: AiTask, context: AiAuthoritativeContext): Promise<void> | void;
}

export class DenyAllAiInvocationPolicy implements AiInvocationPolicy {
  authorize(): never {
    throw new ForbiddenException({ code: 'AI_FORBIDDEN', message: 'AI invocation is not available.', details: null });
  }

  checkEligibility(): never {
    throw new ForbiddenException({ code: 'AI_FORBIDDEN', message: 'AI invocation is not available.', details: null });
  }
}

export interface AiInferenceClock {
  now(): Date;
  monotonic(): number;
}

export interface AiPromptBindings {
  registryPromptVersions: Partial<Record<AiTask, string>>;
  profilePromptVersions: Partial<Record<AiTask, string>>;
}

const defaultClock: AiInferenceClock = {
  now: () => new Date(),
  monotonic: () => performance.now(),
};

function responseError(error: unknown): string {
  if (error instanceof AiGatewayError) return error.internalCode;
  if (error instanceof AiSemanticValidationError) {
    if (error.code === 'AI_RUNTIME_FAILURE') return 'AI_RUNTIME_PROMPT_VERSION_MISMATCH';
    return error.code;
  }
  if (error instanceof AiSchemaValidationError) {
    return error.errors.some(({ keyword }) => keyword === 'required') ? 'AI_INCOMPLETE_DATA' : 'AI_INVALID_STRUCTURE';
  }
  return 'AI_RUNTIME_TECHNICAL_FAILURE';
}

function schemaError(error: AiSchemaValidationError): 'AI_INCOMPLETE_DATA' | 'AI_INVALID_STRUCTURE' {
  return error.errors.some(({ keyword }) => keyword === 'required') ? 'AI_INCOMPLETE_DATA' : 'AI_INVALID_STRUCTURE';
}

function publicFailure(error: unknown): AiGatewayError {
  if (error instanceof AiGatewayError) return error;
  if (error instanceof AiSemanticValidationError) {
    if (error.code === 'AI_RUNTIME_FAILURE') return new AiGatewayError('AI_RUNTIME_FAILURE', 502, 'AI_RUNTIME_PROMPT_VERSION_MISMATCH');
    return new AiGatewayError(error.code, 502, error.code);
  }
  if (error instanceof AiSchemaValidationError) {
    const code = schemaError(error);
    return new AiGatewayError(code, 502, code);
  }
  return new AiGatewayError('AI_RUNTIME_FAILURE', 502, responseError(error));
}

@Injectable()
export class AiInferenceService {
  constructor(
    private readonly preflight: CapacityPreflightService,
    private readonly schemas: SchemaRegistryService,
    private readonly semantic: AiSemanticValidator,
    private readonly gateway: AiGatewayService,
    private readonly logs: AiRequestLogRepository,
    private readonly policy: AiInvocationPolicy,
    private readonly runtime: { registryPromptVersions: Partial<Record<AiTask, string>>; profilePromptVersions: Partial<Record<AiTask, string>>; now?: () => Date; monotonic?: () => number },
  ) {}

  async execute(request: AiTaskRequest, principal: AuthUser, authoritativeContext: AiAuthoritativeContext): Promise<ValidatedTaskOutput> {
    if (!principal || principal.status !== 'ACTIVE' || !principal.id) {
      throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Yêu cầu đăng nhập hợp lệ.', details: null });
    }
    await this.policy.authorize(principal, request.task, authoritativeContext);
    await this.policy.checkEligibility(principal, request.task, authoritativeContext);
    this.schemas.validateEnvelope('request', request);
    const inputValidator = this.schemas.get(request.task).input;
    if (!inputValidator(request.input)) {
      throw new AiSchemaValidationError((inputValidator.errors ?? []).map(({ keyword, instancePath, params }) => ({
        keyword, instancePath, params: params as Record<string, unknown>,
      })));
    }
    this.semantic.validateInput(request.task, request.input, authoritativeContext);
    this.preflight.preflight(request);

    this.gateway.assertReady();
    const createdAt = this.runtime.now?.() ?? defaultClock.now();
    const started = this.runtime.monotonic?.() ?? defaultClock.monotonic();
    let status: AIRequestStatus = 'SUCCESS';
    let errorCode: string | null = null;
    let result: ValidatedTaskOutput | undefined;
    let failure: unknown;
    let failed = false;
    try {
      const response = await this.gateway.infer(request);
      this.schemas.validateEnvelope('success', response.body);
      const envelope = response.body as Record<string, any>;
      this.semantic.validateCorrelation(request, envelope, authoritativeContext);
      this.semantic.validateOutput(request.task, request.input, envelope.output, {
        runtimePromptVersion: envelope.runtime.promptVersion,
        expectedPromptVersions: [
          this.runtime.registryPromptVersions[request.task] ?? '',
          this.runtime.profilePromptVersions[request.task] ?? '',
        ],
      });
      result = envelope.output as ValidatedTaskOutput;
    } catch (error) {
      failed = true;
      status = 'FAILED';
      errorCode = responseError(error);
      failure = error;
    }
    const elapsed = (this.runtime.monotonic?.() ?? defaultClock.monotonic()) - started;
    await this.logs.createTerminal({
      userId: principal.id,
      feature: request.task,
      status,
      errorCode,
      durationMs: Number.isFinite(elapsed) && elapsed >= 0 ? Math.floor(elapsed) : null,
      createdAt,
    });
    if (failed) throw publicFailure(failure);
    return result!;
  }
}

export function promptBindings(config: AiConfig) {
  const profilePromptVersions: Partial<Record<AiTask, string>> = {};
  for (const [task, taskConfig] of Object.entries(config.value.capacityProfile?.tasks ?? {})) {
    if (taskConfig?.promptVersion) profilePromptVersions[task as AiTask] = taskConfig.promptVersion;
  }
  return { registryPromptVersions: config.value.registryPromptVersions, profilePromptVersions };
}

