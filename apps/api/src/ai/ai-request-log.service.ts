import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AI_TASK_KEYS, AiTaskKey } from './ai-task.registry';
import { AiAttemptException, normalizeAiAttemptError } from './ai-errors';
import { AiOutputValidator } from './ai-output.validator';

type Attempt = {
  userId: string;
  feature: AiTaskKey;
  requestId: string;
  input: unknown;
  dispatch: () => Promise<unknown>;
};

function isJsonObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function elapsedMilliseconds(startedAt: number | undefined): number | null {
  if (startedAt === undefined || typeof globalThis.performance?.now !== 'function') return null;
  const elapsed = globalThis.performance.now() - startedAt;
  return Number.isFinite(elapsed) ? Math.max(0, Math.floor(elapsed)) : null;
}

function safePersistenceError(error: unknown): { persistenceErrorClass: string; persistenceErrorCode: string } {
  const typeName = error instanceof Error ? error.constructor.name : '';
  const knownTypes = [
    'Error',
    'PrismaClientKnownRequestError',
    'PrismaClientInitializationError',
    'PrismaClientUnknownRequestError',
    'PrismaClientRustPanicError',
  ];
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string' && /^P\d{4}$/.test(error.code)
    ? error.code
    : 'UNKNOWN';
  return {
    persistenceErrorClass: knownTypes.includes(typeName) ? typeName : 'Error',
    persistenceErrorCode: code,
  };
}

@Injectable()
export class AiRequestLogService {
  private readonly logger = new Logger(AiRequestLogService.name);

  constructor(private readonly prisma: PrismaService, private readonly outputValidator: AiOutputValidator) {}

  async runAttempt({ userId, feature, requestId, input, dispatch }: Attempt): Promise<Record<string, unknown>> {
    if (!(AI_TASK_KEYS as readonly string[]).includes(feature)) throw new Error('Unknown AI task key');
    if (typeof requestId !== 'string') throw new Error('Invalid AI request ID');

    const attemptStartedAt = new Date();
    const monotonicStartedAt = typeof globalThis.performance?.now === 'function' ? globalThis.performance.now() : undefined;
    let output: Record<string, unknown> | undefined;
    let failure: AiAttemptException | undefined;

    try {
      const response = await dispatch();
      output = this.validateSuccessEnvelope(response, feature, requestId);
      const validation = this.outputValidator.validate(feature, input, output);
      if (!validation.valid) throw new AiAttemptException(validation.code);
    } catch (error: unknown) {
      failure = normalizeAiAttemptError(error);
    }

    const terminalStatus = failure ? 'FAILED' : 'SUCCESS';
    try {
      await this.prisma.aIRequestLog.create({ data: {
        userId,
        feature,
        status: terminalStatus,
        errorCode: failure?.internalCode ?? null,
        durationMs: elapsedMilliseconds(monotonicStartedAt),
        createdAt: attemptStartedAt,
      } });
    } catch (persistenceError) {
      this.logPersistenceFailure(feature, terminalStatus, persistenceError);
      if (!failure) throw normalizeAiAttemptError(undefined);
    }

    if (failure) throw failure;
    return output!;
  }

  private validateSuccessEnvelope(response: unknown, feature: AiTaskKey, requestId: string): Record<string, unknown> {
    if (!isJsonObject(response)
      || !hasExactKeys(response, ['contractVersion', 'requestId', 'task', 'output', 'runtime'])
      || response.contractVersion !== '1.0'
      || typeof response.requestId !== 'string'
      || response.requestId !== requestId
      || response.task !== feature
      || !isJsonObject(response.output)
      || !isJsonObject(response.runtime)
      || !hasExactKeys(response.runtime, ['modelId', 'promptVersion'])
      || typeof response.runtime.modelId !== 'string' || response.runtime.modelId.length < 1
      || typeof response.runtime.promptVersion !== 'string' || response.runtime.promptVersion.length < 1) {
      throw new AiAttemptException('AI_INVALID_STRUCTURE');
    }
    return response.output;
  }

  private logPersistenceFailure(feature: AiTaskKey, outcome: 'SUCCESS' | 'FAILED', error: unknown): void {
    this.logger.error(JSON.stringify({
      code: 'AI_REQUEST_LOG_PERSISTENCE_FAILURE',
      feature,
      attemptOutcome: outcome,
      ...safePersistenceError(error),
    }));
  }
}
