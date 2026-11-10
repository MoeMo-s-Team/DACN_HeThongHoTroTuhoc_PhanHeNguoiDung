import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AI_TASK_KEYS, AiTaskKey } from './ai-task.registry';
import { AiOutputValidator } from './ai-output.validator';
import { AiRequestLogService } from './ai-request-log.service';
import { aiAttemptError } from './ai-errors';
import { assertAiCapacityProfileAvailable } from './ai-capacity-preflight';

const userId = '92000000-0000-4000-8000-000000000001';
const requestId = 'request-test-1';
const stems: Record<AiTaskKey, string> = {
  STUDENT_LEARNING_ANALYSIS: 'student-learning-analysis',
  STUDENT_STUDY_PLAN_GENERATION: 'student-study-plan-generation',
  STUDENT_STUDY_PLAN_ADJUSTMENT: 'student-study-plan-adjustment',
  TEACHER_CLASS_ANALYSIS: 'teacher-class-analysis',
  ADMIN_FEEDBACK_GROUPING_STAGE1: 'admin-feedback-grouping-stage1',
  ADMIN_FEEDBACK_SUMMARY_STAGE2: 'admin-feedback-summary-stage2',
};
const fixture = (task: AiTaskKey, kind: 'input' | 'output') => JSON.parse(readFileSync(join(
  __dirname, '__fixtures__', 'release1', 'valid', `${stems[task]}.${kind}.json`,
), 'utf8')) as Record<string, unknown>;
const validEnvelope = (feature: AiTaskKey, output: Record<string, unknown>, id = requestId) => ({
  contractVersion: '1.0', requestId: id, task: feature, output,
  runtime: { modelId: 'test-model', promptVersion: 'test-prompt' },
});

describe('AiRequestLogService', () => {
  const create = jest.fn();
  const transaction = jest.fn();
  const prisma = { aIRequestLog: { create }, $transaction: transaction };
  const validator = new AiOutputValidator();
  let service: AiRequestLogService;
  let logger: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    create.mockResolvedValue({});
    service = new AiRequestLogService(prisma as unknown as PrismaService, validator);
    logger = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => logger.mockRestore());

  it.each(AI_TASK_KEYS)('writes terminal SUCCESS only after validating the released envelope and output for %s', async (feature) => {
    const input = fixture(feature, 'input');
    const output = fixture(feature, 'output');
    const dispatch = jest.fn().mockResolvedValue(validEnvelope(feature, output));
    await expect(service.runAttempt({ userId, feature, requestId, input, dispatch })).resolves.toEqual(output);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId, feature, status: 'SUCCESS', errorCode: null }) });
    expect(create.mock.calls[0][0].data.status).not.toBe('PENDING');
  });

  it.each([
    ['wrong contract version', (feature: AiTaskKey, output: Record<string, unknown>) => ({ ...validEnvelope(feature, output), contractVersion: '2.0' })],
    ['unknown envelope property', (feature: AiTaskKey, output: Record<string, unknown>) => ({ ...validEnvelope(feature, output), token: 'must-not-be-accepted' })],
    ['invalid runtime metadata', (feature: AiTaskKey, output: Record<string, unknown>) => ({ ...validEnvelope(feature, output), runtime: { modelId: '', promptVersion: 'p' } })],
    ['non-object output', (feature: AiTaskKey) => ({ ...validEnvelope(feature, {}), output: [] })],
  ])('logs FAILED for %s', async (_reason, makeEnvelope) => {
    const feature = 'STUDENT_STUDY_PLAN_GENERATION';
    await expect(service.runAttempt({
      userId, feature, requestId, input: fixture(feature, 'input'),
      dispatch: async () => makeEnvelope(feature, fixture(feature, 'output')),
    })).rejects.toMatchObject({ response: { code: 'AI_INVALID_STRUCTURE' } });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'FAILED', errorCode: 'AI_INVALID_STRUCTURE' }) });
  });

  it.each([
    ['wrong requestId', (feature: AiTaskKey, output: Record<string, unknown>) => validEnvelope(feature, output, 'other-request')],
    ['wrong task key', (feature: AiTaskKey, output: Record<string, unknown>) => ({ ...validEnvelope(feature, output), task: 'TEACHER_CLASS_ANALYSIS' })],
  ])('logs FAILED on response correlation mismatch: %s', async (_reason, makeEnvelope) => {
    const feature = 'STUDENT_STUDY_PLAN_GENERATION';
    await expect(service.runAttempt({
      userId, feature, requestId, input: fixture(feature, 'input'),
      dispatch: async () => makeEnvelope(feature, fixture(feature, 'output')),
    })).rejects.toMatchObject({ response: { code: 'AI_INVALID_STRUCTURE' } });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'FAILED', errorCode: 'AI_INVALID_STRUCTURE' }) });
  });

  const validPlanOutput = fixture('STUDENT_STUDY_PLAN_GENERATION', 'output');
  const validPlanTask = (validPlanOutput.tasks as Record<string, unknown>[])[0];
  it.each([
    ['schema type rejection', { ...validPlanOutput, tasks: [{ ...validPlanTask, expectedMinutes: '90' }] }, 'AI_INVALID_STRUCTURE'],
    ['semantic/reference rejection', { ...validPlanOutput, tasks: [{ ...validPlanTask, topicId: 'outside' }] }, 'AI_INVALID_STRUCTURE'],
    ['required-content rejection', { ...validPlanOutput, tasks: [] }, 'AI_INCOMPLETE_DATA'],
  ] as const)('logs FAILED after Task 3 %s', async (_reason, output, errorCode) => {
    const feature = 'STUDENT_STUDY_PLAN_GENERATION';
    await expect(service.runAttempt({
      userId, feature, requestId, input: fixture(feature, 'input'), dispatch: async () => validEnvelope(feature, output),
    })).rejects.toMatchObject({ response: { code: errorCode } });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'FAILED', errorCode }) });
  });

  it.each([
    ['AI_TIMEOUT', 'AI_TIMEOUT'],
    ['AI_CONNECTION_FAILURE', 'AI_CONNECTION_FAILURE'],
    ['AI_EMPTY_RESPONSE', 'AI_EMPTY_RESPONSE'],
    ['AI_RUNTIME_FAILURE', 'AI_RUNTIME_TECHNICAL_FAILURE'],
  ] as const)('persists %s inference failure with its internal code', async (publicCode, internalCode) => {
    const feature = 'STUDENT_LEARNING_ANALYSIS';
    await expect(service.runAttempt({
      userId, feature, requestId, input: fixture(feature, 'input'),
      dispatch: async () => { throw aiAttemptError(publicCode, internalCode); },
    })).rejects.toMatchObject({ response: { code: publicCode } });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'FAILED', errorCode: internalCode }) });
  });

  it('rejects an unknown task key before dispatch and persistence', async () => {
    const dispatch = jest.fn();
    await expect(service.runAttempt({
      userId, feature: 'NOT_A_TASK' as never, requestId, input: {}, dispatch,
    })).rejects.toThrow('Unknown AI task key');
    expect(dispatch).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a non-string requestId before dispatch and persistence', async () => {
    const feature = 'STUDENT_STUDY_PLAN_GENERATION';
    const invalidRequestId = 42 as unknown as string;
    const dispatch = jest.fn().mockResolvedValue(validEnvelope(feature, fixture(feature, 'output'), invalidRequestId));
    await expect(service.runAttempt({
      userId, feature, requestId: invalidRequestId, input: fixture(feature, 'input'), dispatch,
    })).rejects.toThrow('Invalid AI request ID');
    expect(dispatch).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('creates no row when preflight rejects before runAttempt is entered', () => {
    const dispatch = jest.fn();
    expect(() => {
      assertAiCapacityProfileAvailable();
      void service.runAttempt({
        userId, feature: 'STUDENT_STUDY_PLAN_GENERATION', requestId, input: fixture('STUDENT_STUDY_PLAN_GENERATION', 'input'), dispatch,
      });
    }).toThrow();
    expect(dispatch).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('captures attemptStartedAt before dispatch and stores monotonic duration', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-09T12:00:00.123Z'));
    const monotonic = jest.spyOn(performance, 'now').mockReturnValueOnce(100).mockReturnValueOnce(137.9);
    let dispatchObservedAt: Date | undefined;
    const feature = 'STUDENT_STUDY_PLAN_GENERATION';
    const dispatch = jest.fn(async () => {
      dispatchObservedAt = new Date();
      jest.advanceTimersByTime(50);
      return validEnvelope(feature, fixture(feature, 'output'));
    });

    await service.runAttempt({ userId, feature, requestId, input: fixture(feature, 'input'), dispatch });

    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({
      createdAt: new Date('2026-11-09T12:00:00.123Z'), durationMs: 37,
    }) });
    expect(dispatchObservedAt).toEqual(new Date('2026-11-09T12:00:00.123Z'));
    monotonic.mockRestore();
    jest.useRealTimers();
  });

  it('returns 502 and never exposes valid output after a definite insert failure', async () => {
    create.mockRejectedValue(new Error('postgres insert failed'));
    const feature = 'STUDENT_STUDY_PLAN_GENERATION';
    const output = fixture(feature, 'output');
    await expect(service.runAttempt({
      userId, feature, requestId, input: fixture(feature, 'input'),
      dispatch: async () => validEnvelope(feature, output),
    })).rejects.toMatchObject({ status: 502, response: { code: 'AI_RUNTIME_FAILURE' } });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('returns 502 after commit-then-ACK-timeout without retrying the insert', async () => {
    const committedRows: unknown[] = [];
    create.mockImplementationOnce(async ({ data }) => {
      committedRows.push(data);
      throw new Error('acknowledgement timeout after commit');
    });
    const feature = 'STUDENT_STUDY_PLAN_GENERATION';
    const dispatch = jest.fn().mockResolvedValue(validEnvelope(feature, fixture(feature, 'output')));
    await expect(service.runAttempt({ userId, feature, requestId, input: fixture(feature, 'input'), dispatch }))
      .rejects.toMatchObject({ response: { code: 'AI_RUNTIME_FAILURE' } });
    expect(committedRows).toEqual([expect.objectContaining({ status: 'SUCCESS', errorCode: null })]);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('preserves the original inference error when the FAILED row commits but its ACK is lost', async () => {
    const committedRows: unknown[] = [];
    create.mockImplementationOnce(async ({ data }) => {
      committedRows.push(data);
      throw new Error('acknowledgement timeout after commit');
    });
    const inferenceError = aiAttemptError('AI_TIMEOUT');
    const feature = 'TEACHER_CLASS_ANALYSIS';
    await expect(service.runAttempt({
      userId, feature, requestId, input: fixture(feature, 'input'), dispatch: async () => { throw inferenceError; },
    })).rejects.toBe(inferenceError);
    expect(committedRows).toEqual([expect.objectContaining({ status: 'FAILED', errorCode: 'AI_TIMEOUT' })]);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('records elapsed duration when terminal persistence fails', async () => {
    jest.spyOn(performance, 'now').mockReturnValueOnce(10).mockReturnValueOnce(25);
    create.mockRejectedValue(new Error('database unavailable'));
    const feature = 'STUDENT_STUDY_PLAN_GENERATION';
    await expect(service.runAttempt({
      userId, feature, requestId, input: fixture(feature, 'input'),
      dispatch: async () => validEnvelope(feature, fixture(feature, 'output')),
    })).rejects.toMatchObject({ response: { code: 'AI_RUNTIME_FAILURE' } });
    expect(create.mock.calls[0][0].data.durationMs).toBe(15);
    jest.restoreAllMocks();
  });

  it('emits safe persistence diagnostics with a DB code and preserves the original public inference error', async () => {
    create.mockRejectedValue(Object.assign(new Error('token=do-not-log database-password=secret'), { code: 'P1001' }));
    const inferenceError = aiAttemptError('AI_TIMEOUT');
    const feature = 'TEACHER_CLASS_ANALYSIS';
    await expect(service.runAttempt({
      userId, feature, requestId, input: fixture(feature, 'input'), dispatch: async () => { throw inferenceError; },
    })).rejects.toBe(inferenceError);
    const diagnostic = JSON.parse(String(logger.mock.calls[0][0]));
    expect(diagnostic).toMatchObject({
      code: 'AI_REQUEST_LOG_PERSISTENCE_FAILURE', feature, attemptOutcome: 'FAILED',
      persistenceErrorClass: 'Error', persistenceErrorCode: 'P1001',
    });
    expect(JSON.stringify(diagnostic)).not.toContain('do-not-log');
    expect(JSON.stringify(diagnostic)).not.toContain('database-password');
  });

  it('filters non-Prisma persistence codes out of diagnostics', async () => {
    create.mockRejectedValue(Object.assign(new Error('sensitive database detail'), { code: 'token-secret' }));
    const feature = 'STUDENT_LEARNING_ANALYSIS';
    await expect(service.runAttempt({
      userId, feature, requestId, input: fixture(feature, 'input'),
      dispatch: async () => validEnvelope(feature, fixture(feature, 'output')),
    })).rejects.toMatchObject({ response: { code: 'AI_RUNTIME_FAILURE' } });
    const diagnostic = JSON.parse(String(logger.mock.calls[0][0]));
    expect(diagnostic.persistenceErrorCode).toBe('UNKNOWN');
    expect(JSON.stringify(diagnostic)).not.toContain('token-secret');
    expect(JSON.stringify(diagnostic)).not.toContain('sensitive database detail');
  });

  it('does not open a Prisma transaction across dispatch or terminal persistence', async () => {
    const feature = 'ADMIN_FEEDBACK_SUMMARY_STAGE2';
    const dispatch = jest.fn().mockResolvedValue(validEnvelope(feature, fixture(feature, 'output')));
    await service.runAttempt({ userId, feature, requestId, input: fixture(feature, 'input'), dispatch });
    expect(transaction).not.toHaveBeenCalled();
  });
});
