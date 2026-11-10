import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../src/admin/admin.service';
import { AppModule } from '../src/app.module';
import { AuthUser } from '../src/auth/auth.service';
import { AiOutputValidator } from '../src/ai/ai-output.validator';
import { AiRequestLogService } from '../src/ai/ai-request-log.service';
import { aiAttemptError } from '../src/ai/ai-errors';
import { PrismaService } from '../src/prisma/prisma.service';
import { requireTestDatabaseUrl } from '../prisma/test-database-url';

describe('AIRequestLog terminal lifecycle (PostgreSQL)', () => {
  const userId = randomUUID();
  const adminId = randomUUID();
  const planFeature = 'STUDENT_STUDY_PLAN_GENERATION' as const;
  const stems = {
    STUDENT_LEARNING_ANALYSIS: 'student-learning-analysis',
    STUDENT_STUDY_PLAN_GENERATION: 'student-study-plan-generation',
    TEACHER_CLASS_ANALYSIS: 'teacher-class-analysis',
  } as const;
  const fixture = (feature: keyof typeof stems, kind: 'input' | 'output') => JSON.parse(readFileSync(join(
    __dirname, '../src/ai/__fixtures__/release1/valid', `${stems[feature]}.${kind}.json`,
  ), 'utf8')) as Record<string, unknown>;
  const envelope = (feature: string, requestId: string, output: Record<string, unknown>) => ({
    contractVersion: '1.0', requestId, task: feature, output,
    runtime: { modelId: 'test-model', promptVersion: 'test-prompt' },
  });
  let module: TestingModule;
  let prisma: PrismaService;
  let logs: AiRequestLogService;
  let validator: AiOutputValidator;

  beforeAll(async () => {
    requireTestDatabaseUrl();
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await module.init();
    prisma = module.get(PrismaService);
    logs = module.get(AiRequestLogService);
    validator = module.get(AiOutputValidator);
    await prisma.user.create({ data: {
      id: userId,
      fullName: 'AIRequestLog integration fixture',
      email: `${userId}@example.test`,
      passwordHash: 'unused',
      role: 'STUDENT',
    } });
    await prisma.user.create({ data: {
      id: adminId, fullName: 'AIRequestLog dashboard fixture', email: `${adminId}@example.test`,
      passwordHash: 'unused', role: 'ADMINISTRATOR',
    } });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.aIRequestLog.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: { in: [userId, adminId] } } });
    }
    await module?.close();
  });

  it('persists one confirmed terminal SUCCESS row after the mocked dispatch validates', async () => {
    const attemptStartedAt = new Date('2026-11-09T12:00:00.000Z');
    const attemptRequestId = randomUUID();
    jest.useFakeTimers().setSystemTime(attemptStartedAt);
    try {
      await logs.runAttempt({
        userId,
        feature: planFeature,
        requestId: attemptRequestId,
        input: fixture(planFeature, 'input'),
        dispatch: async () => envelope(planFeature, attemptRequestId, fixture(planFeature, 'output')),
      });
    } finally {
      jest.useRealTimers();
    }

    const rows = await prisma.aIRequestLog.findMany({ where: { userId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId,
      feature: 'STUDENT_STUDY_PLAN_GENERATION',
      status: 'SUCCESS',
      errorCode: null,
      createdAt: attemptStartedAt,
    });
  });

  it('persists a terminal FAILED row with the internal error code for rejected output', async () => {
    const { aiAttemptError } = await import('../src/ai/ai-errors');
    await expect(logs.runAttempt({
      userId,
      feature: 'STUDENT_LEARNING_ANALYSIS',
      requestId: randomUUID(),
      input: {},
      dispatch: async () => { throw aiAttemptError('AI_INCOMPLETE_DATA'); },
    })).rejects.toMatchObject({ response: { code: 'AI_INCOMPLETE_DATA' } });

    const row = await prisma.aIRequestLog.findFirstOrThrow({ where: { userId, feature: 'STUDENT_LEARNING_ANALYSIS', status: 'FAILED' } });
    expect(row).toMatchObject({ status: 'FAILED', errorCode: 'AI_INCOMPLETE_DATA' });
  });

  it('returns 502 after a real SUCCESS commit loses its ACK; the persisted-row dashboard still counts it', async () => {
    const request = randomUUID();
    let writes = 0;
    const commitThenLoseAck = {
      aIRequestLog: { create: async (args: Parameters<PrismaService['aIRequestLog']['create']>[0]) => {
        writes += 1;
        await prisma.aIRequestLog.create(args);
        throw new Error('acknowledgement lost after commit');
      } },
    } as unknown as PrismaService;
    const uncertainLogs = new AiRequestLogService(commitThenLoseAck, validator);
    await expect(uncertainLogs.runAttempt({
      userId, feature: 'STUDENT_LEARNING_ANALYSIS', requestId: request,
      input: fixture('STUDENT_LEARNING_ANALYSIS', 'input'),
      dispatch: async () => envelope('STUDENT_LEARNING_ANALYSIS', request, fixture('STUDENT_LEARNING_ANALYSIS', 'output')),
    })).rejects.toMatchObject({ status: 502, response: { code: 'AI_RUNTIME_FAILURE' } });
    expect(writes).toBe(1);

    const row = await prisma.aIRequestLog.findFirstOrThrow({ where: { userId, feature: 'STUDENT_LEARNING_ANALYSIS', status: 'SUCCESS' } });
    expect(row.status).toBe('SUCCESS');
    const dashboard = await new AdminService(prisma).getDashboard({
      id: adminId, fullName: 'Admin', email: `${adminId}@example.test`, role: 'ADMINISTRATOR', status: 'ACTIVE',
    } satisfies AuthUser);
    expect(dashboard.totalAIRequests).toBe(await prisma.aIRequestLog.count());
    expect(dashboard.failedAIRequests).toBe(await prisma.aIRequestLog.count({ where: { status: 'FAILED' } }));
    expect(dashboard.totalAIRequests).toBeGreaterThanOrEqual(3);
  });

  it('preserves inference error when a FAILED row commits and its ACK is lost', async () => {
    const commitThenLoseAck = {
      aIRequestLog: { create: async (args: Parameters<PrismaService['aIRequestLog']['create']>[0]) => {
        await prisma.aIRequestLog.create(args);
        throw new Error('acknowledgement lost after commit');
      } },
    } as unknown as PrismaService;
    const uncertainLogs = new AiRequestLogService(commitThenLoseAck, validator);
    const inferenceError = aiAttemptError('AI_TIMEOUT');
    await expect(uncertainLogs.runAttempt({
      userId, feature: 'TEACHER_CLASS_ANALYSIS', requestId: randomUUID(), input: fixture('TEACHER_CLASS_ANALYSIS', 'input'),
      dispatch: async () => { throw inferenceError; },
    })).rejects.toBe(inferenceError);
    const row = await prisma.aIRequestLog.findFirstOrThrow({ where: { userId, feature: 'TEACHER_CLASS_ANALYSIS' } });
    expect(row).toMatchObject({ status: 'FAILED', errorCode: 'AI_TIMEOUT' });
  });
});
