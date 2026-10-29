import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { requireTestDatabaseUrl } from '../prisma/test-database-url';
import { AuthService, AuthUser } from '../src/auth/auth.service';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';
import { buildRequest } from '../src/ai/capacity-preflight.service';
import { AiFlowService } from '../src/ai/ai-flow.service';
import { AiInvocationPolicy } from '../src/ai/ai-inference.service';
import { AiInputSemanticError } from '../src/ai/ai-semantic-validator';
import { AiSchemaValidationError } from '../src/ai/schema-registry.service';
import { makeAiInference, aiFixture, aiTasks, ScriptedAiRuntime } from './fixtures/ai/integration-harness';

const prisma = new PrismaClient({ datasourceUrl: requireTestDatabaseUrl() });
const ids = {
  student: '93000000-0000-4000-8000-000000000001',
  teacher: '93000000-0000-4000-8000-000000000002',
  admin: '93000000-0000-4000-8000-000000000003',
  disabled: '93000000-0000-4000-8000-000000000004',
  ineligible: '93000000-0000-4000-8000-000000000005',
  doomedAdmin: '93000000-0000-4000-8000-000000000006',
  course: '93000000-0000-4000-8000-000000000010',
  topic: '93000000-0000-4000-8000-000000000011',
  class: '93000000-0000-4000-8000-000000000012',
  feedback: '93000000-0000-4000-8000-000000000013',
  doomedFeedback: '93000000-0000-4000-8000-000000000014',
  assessment: '93000000-0000-4000-8000-000000000015',
};
const userIds = [ids.student, ids.teacher, ids.admin, ids.disabled, ids.ineligible, ids.doomedAdmin];
const taskRole: Record<string, AuthUser['role']> = {
  STUDENT_LEARNING_ANALYSIS: 'STUDENT',
  STUDENT_STUDY_PLAN_GENERATION: 'STUDENT',
  STUDENT_STUDY_PLAN_ADJUSTMENT: 'STUDENT',
  TEACHER_CLASS_ANALYSIS: 'TEACHER',
  ADMIN_FEEDBACK_GROUPING_STAGE1: 'ADMINISTRATOR',
  ADMIN_FEEDBACK_SUMMARY_STAGE2: 'ADMINISTRATOR',
};

class DatabaseInvocationPolicy implements AiInvocationPolicy {
  constructor(private readonly db: PrismaClient) {}

  async authorize(principal: AuthUser, task: keyof typeof taskRole, context: Record<string, unknown>) {
    const ownerId = context.ownerUserId;
    const user = typeof ownerId === 'string'
      ? await this.db.user.findUnique({ where: { id: ownerId }, select: { id: true, status: true } })
      : null;
    if (principal.role !== taskRole[task] || ownerId !== principal.id || !user || user.status !== 'ACTIVE') {
      throw new ForbiddenException({ code: 'FORBIDDEN_RESOURCE', message: 'No authorized AI resource.', details: null });
    }
  }

  async checkEligibility(principal: AuthUser) {
    const eligible = principal.role === 'STUDENT'
      ? await this.db.assessmentResult.count({ where: { studentId: principal.id } }) > 0
      : principal.role === 'TEACHER'
        ? await this.db.class.count({ where: { teacherId: principal.id } }) > 0
        : await this.db.feedback.count({ where: { userId: principal.id } }) > 0;
    if (!eligible) throw new ForbiddenException({ code: 'INSUFFICIENT_DATA', message: 'Task is ineligible.', details: null });
  }
}

const validInputs: Record<string, unknown> = {
  STUDENT_LEARNING_ANALYSIS: aiFixture('student-learning-analysis.input.json'),
  STUDENT_STUDY_PLAN_GENERATION: aiFixture('student-study-plan-generation.input.json'),
  STUDENT_STUDY_PLAN_ADJUSTMENT: aiFixture('student-study-plan-adjustment.input.json'),
  TEACHER_CLASS_ANALYSIS: aiFixture('teacher-class-analysis.input.json'),
  ADMIN_FEEDBACK_GROUPING_STAGE1: aiFixture('admin-feedback-grouping-stage1.input.json'),
  ADMIN_FEEDBACK_SUMMARY_STAGE2: aiFixture('admin-feedback-summary-stage2.input.json'),
};
const validOutputs: Record<string, unknown> = {
  STUDENT_LEARNING_ANALYSIS: aiFixture('student-learning-analysis.output.json'),
  STUDENT_STUDY_PLAN_GENERATION: aiFixture('student-study-plan-generation.output.json'),
  STUDENT_STUDY_PLAN_ADJUSTMENT: aiFixture('student-study-plan-adjustment.output.json'),
  TEACHER_CLASS_ANALYSIS: aiFixture('teacher-class-analysis.output.json'),
  ADMIN_FEEDBACK_GROUPING_STAGE1: aiFixture('admin-feedback-grouping-stage1.output.json'),
  ADMIN_FEEDBACK_SUMMARY_STAGE2: aiFixture('admin-feedback-summary-stage2.output.json'),
};

describe('AI inference pipeline (PostgreSQL)', () => {
  const jwt = new JwtService({ secret: process.env.JWT_ACCESS_SECRET, signOptions: { algorithm: 'HS256' } });
  const auth = new AuthService(prisma as never, jwt);
  const policy = new DatabaseInvocationPolicy(prisma);
  let activeUsers: Record<'student' | 'teacher' | 'admin' | 'ineligible' | 'doomedAdmin', AuthUser>;

  beforeAll(async () => {
    await prisma.aIRequestLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.assessmentResult.deleteMany({ where: { id: ids.assessment } });
    await prisma.feedback.deleteMany({ where: { id: { in: [ids.feedback, ids.doomedFeedback] } } });
    await prisma.class.deleteMany({ where: { id: ids.class } });
    await prisma.topic.deleteMany({ where: { id: ids.topic } });
    await prisma.course.deleteMany({ where: { id: ids.course } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.student, ids.teacher, ids.admin, ids.disabled, ids.ineligible, ids.doomedAdmin] } } });
    await prisma.user.createMany({ data: [
      { id: ids.student, fullName: 'AI Student', email: 'ai.student.integration@example.test', passwordHash: 'test', role: 'STUDENT' },
      { id: ids.teacher, fullName: 'AI Teacher', email: 'ai.teacher.integration@example.test', passwordHash: 'test', role: 'TEACHER' },
      { id: ids.admin, fullName: 'AI Admin', email: 'ai.admin.integration@example.test', passwordHash: 'test', role: 'ADMINISTRATOR' },
      { id: ids.disabled, fullName: 'AI Disabled', email: 'ai.disabled.integration@example.test', passwordHash: 'test', role: 'STUDENT', status: 'DISABLED' },
      { id: ids.ineligible, fullName: 'AI Ineligible', email: 'ai.ineligible.integration@example.test', passwordHash: 'test', role: 'STUDENT' },
      { id: ids.doomedAdmin, fullName: 'AI DB Failure', email: 'ai.dbfailure.integration@example.test', passwordHash: 'test', role: 'ADMINISTRATOR' },
    ] });
    await prisma.course.create({ data: { id: ids.course, name: 'AI Integration' } });
    await prisma.topic.create({ data: { id: ids.topic, courseId: ids.course, name: 'AI Integration Topic' } });
    await prisma.assessmentResult.create({ data: { id: ids.assessment, studentId: ids.student, topicId: ids.topic, score: 80, evaluatedAt: new Date('2026-10-28T00:00:00Z') } });
    await prisma.class.create({ data: { id: ids.class, name: 'AI Integration Class', teacherId: ids.teacher } });
    await prisma.feedback.createMany({ data: [
      { id: ids.feedback, userId: ids.admin, tag: 'UI_UX', rating: 4, content: 'Test feedback' },
      { id: ids.doomedFeedback, userId: ids.doomedAdmin, tag: 'OTHER', rating: 3, content: 'Delete before log persistence' },
    ] });
    const token = (userId: string) => jwt.signAsync({ sub: userId }, { expiresIn: '2h' });
    activeUsers = {
      student: await auth.authenticate(await token(ids.student)),
      teacher: await auth.authenticate(await token(ids.teacher)),
      admin: await auth.authenticate(await token(ids.admin)),
      ineligible: await auth.authenticate(await token(ids.ineligible)),
      doomedAdmin: await auth.authenticate(await token(ids.doomedAdmin)),
    };
  });

  afterAll(async () => {
    await prisma.aIRequestLog.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.assessmentResult.deleteMany({ where: { id: ids.assessment } });
    await prisma.feedback.deleteMany({ where: { id: { in: [ids.feedback, ids.doomedFeedback] } } });
    await prisma.class.deleteMany({ where: { id: ids.class } });
    await prisma.topic.deleteMany({ where: { id: ids.topic } });
    await prisma.course.deleteMany({ where: { id: ids.course } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.student, ids.teacher, ids.admin, ids.disabled, ids.ineligible, ids.doomedAdmin] } } });
    await prisma.$disconnect();
  });

  it('uses real AuthService and DB-backed ownership/eligibility ports before dispatch', async () => {
    await expect(auth.authenticate('invalid-token')).rejects.toMatchObject({ status: 401 });
    const disabledToken = await jwt.signAsync({ sub: ids.disabled }, { expiresIn: '2h' });
    await expect(auth.authenticate(disabledToken)).rejects.toMatchObject({ status: 403 });
    const runtime = new ScriptedAiRuntime();
    const inference = makeAiInference(prisma, runtime, policy);
    await expect(inference.execute(buildRequest('STUDENT_LEARNING_ANALYSIS', validInputs.STUDENT_LEARNING_ANALYSIS, 'denied'), activeUsers.student, { ownerUserId: ids.teacher })).rejects.toBeDefined();
    await expect(inference.execute(buildRequest('STUDENT_LEARNING_ANALYSIS', validInputs.STUDENT_LEARNING_ANALYSIS, 'ineligible'), activeUsers.ineligible, { ownerUserId: ids.ineligible })).rejects.toBeDefined();
    expect(runtime.calls).toBe(0);
    expect(await prisma.aIRequestLog.count({ where: { userId: { in: [ids.student, ids.ineligible] } } })).toBe(0);
  });

  it('orders request and minimum-data validation before capacity and returns preflight errors through the API filter', async () => {
    await prisma.aIRequestLog.deleteMany({ where: { userId: ids.student } });
    const runtime = new ScriptedAiRuntime();
    const oversized = makeAiInference(prisma, runtime, policy, () => 200_000);
    const deadlineInput = structuredClone(validInputs.STUDENT_STUDY_PLAN_GENERATION) as any;
    deadlineInput.targetDeadline = deadlineInput.planningStartAt;
    await expect(oversized.execute(buildRequest('STUDENT_STUDY_PLAN_GENERATION', deadlineInput, 'bad-deadline'), activeUsers.student, { ownerUserId: ids.student })).rejects.toBeInstanceOf(AiInputSemanticError);
    const malformedEnvelope = buildRequest('STUDENT_LEARNING_ANALYSIS', validInputs.STUDENT_LEARNING_ANALYSIS, 'bad-envelope') as any;
    delete malformedEnvelope.locale;
    await expect(oversized.execute(malformedEnvelope, activeUsers.student, { ownerUserId: ids.student })).rejects.toBeInstanceOf(AiSchemaValidationError);
    expect(runtime.calls).toBe(0);
    expect(await prisma.aIRequestLog.count({ where: { userId: ids.student } })).toBe(0);

    const malformedConfig = makeAiInference(prisma, runtime, policy, () => 1, {
      capacityProfile: { capacityProfileVersion: 'bad', modelId: 'model', tokenizerId: 'tok', contractVersion: '1.0', contextWindowTokens: 10, inputSafetyMarginTokens: 1, tasks: null } as any,
    });
    let failure: unknown;
    try {
      await malformedConfig.execute(buildRequest('STUDENT_LEARNING_ANALYSIS', validInputs.STUDENT_LEARNING_ANALYSIS, 'bad-config'), activeUsers.student, { ownerUserId: ids.student });
    } catch (error) { failure = error; }
    expect(failure).toBeInstanceOf(HttpException);
    expect((failure as HttpException).getStatus()).toBe(502);
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    new ApiExceptionFilter().catch(failure, { switchToHttp: () => ({ getResponse: () => response }) } as any);
    expect(response.status).toHaveBeenCalledWith(502);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'AI_RUNTIME_FAILURE' }));
    expect(runtime.calls).toBe(0);
    expect(await prisma.aIRequestLog.count({ where: { userId: ids.student } })).toBe(0);
  });

  it('validates all six tasks, logs each attempt, and orchestrates the two Admin stages', async () => {
    const runtime = new ScriptedAiRuntime();
    runtime.queue(...aiTasks.map((task) => validOutputs[task]));
    const inference = makeAiInference(prisma, runtime, policy);
    const callers: Record<string, AuthUser> = {
      STUDENT_LEARNING_ANALYSIS: activeUsers.student,
      STUDENT_STUDY_PLAN_GENERATION: activeUsers.student,
      STUDENT_STUDY_PLAN_ADJUSTMENT: activeUsers.student,
      TEACHER_CLASS_ANALYSIS: activeUsers.teacher,
      ADMIN_FEEDBACK_GROUPING_STAGE1: activeUsers.admin,
      ADMIN_FEEDBACK_SUMMARY_STAGE2: activeUsers.admin,
    };
    for (const task of aiTasks) {
      const caller = callers[task];
      await inference.execute(buildRequest(task, validInputs[task], `integration-${task}`), caller, { ownerUserId: caller.id });
    }
    expect(runtime.calls).toBe(6);
    const rows = await prisma.aIRequestLog.findMany({ where: { userId: { in: [ids.student, ids.teacher, ids.admin] } } });
    expect(rows.map(({ feature }) => feature).sort()).toEqual([...aiTasks].sort());
    expect(rows.every(({ status, errorCode, createdAt, durationMs }) => status === 'SUCCESS' && errorCode === null && createdAt instanceof Date && durationMs !== null && durationMs >= 0)).toBe(true);

    const adminFlow = new AiFlowService(inference);
    runtime.queue({ issueGroups: [] }, validOutputs.ADMIN_FEEDBACK_SUMMARY_STAGE2);
    const before = runtime.calls;
    await adminFlow.runAdminFeedbackAnalysis({
      feedback: (validInputs.ADMIN_FEEDBACK_GROUPING_STAGE1 as any).feedback,
      totalFeedback: 1,
      tagStatistics: { AI_PERFORMANCE: 0, STUDY_PLAN: 0, UI_UX: 1, LEARNING_ANALYTICS: 0, OTHER: 0 },
    }, 'admin-two-stage', activeUsers.admin, { ownerUserId: ids.admin });
    expect(runtime.calls - before).toBe(2);
  });

  it('records FAILED runtime attempts once and keeps prompt mismatch diagnostic private to the log', async () => {
    const runtime = new ScriptedAiRuntime().queue({ status: 504, body: '' });
    const inference = makeAiInference(prisma, runtime, policy);
    await expect(inference.execute(buildRequest('STUDENT_LEARNING_ANALYSIS', validInputs.STUDENT_LEARNING_ANALYSIS, 'timeout'), activeUsers.student, { ownerUserId: ids.student })).rejects.toMatchObject({ code: 'AI_TIMEOUT' });
    expect(runtime.calls).toBe(1);
    const timeout = await prisma.aIRequestLog.findFirst({ where: { userId: ids.student, feature: 'STUDENT_LEARNING_ANALYSIS', status: 'FAILED' }, orderBy: { createdAt: 'desc' } });
    expect(timeout).toMatchObject({ errorCode: 'AI_TIMEOUT', durationMs: expect.any(Number) });

    runtime.queue({
      status: 200,
      body: JSON.stringify({ contractVersion: '1.0', requestId: 'prompt-mismatch', task: 'STUDENT_LEARNING_ANALYSIS',
        output: validOutputs.STUDENT_LEARNING_ANALYSIS, runtime: { modelId: 'integration-model', promptVersion: 'old-prompt' } }),
    });
    await expect(inference.execute(buildRequest('STUDENT_LEARNING_ANALYSIS', validInputs.STUDENT_LEARNING_ANALYSIS, 'prompt-mismatch'), activeUsers.student, { ownerUserId: ids.student })).rejects.toMatchObject({ code: 'AI_RUNTIME_FAILURE' });
    const mismatch = await prisma.aIRequestLog.findFirst({ where: { userId: ids.student, errorCode: 'AI_RUNTIME_PROMPT_VERSION_MISMATCH' }, orderBy: { createdAt: 'desc' } });
    expect(mismatch).toMatchObject({ status: 'FAILED', errorCode: 'AI_RUNTIME_PROMPT_VERSION_MISMATCH' });
  });

  it.each([
    [200, '', 'AI_EMPTY_RESPONSE', 'AI_EMPTY_RESPONSE'],
    [200, '{broken', 'AI_INVALID_STRUCTURE', 'AI_INVALID_STRUCTURE'],
    [400, '{"error":{"code":"INVALID_REQUEST"}}', 'AI_RUNTIME_FAILURE', 'AI_RUNTIME_PROTOCOL_FAILURE'],
    [401, '', 'AI_RUNTIME_FAILURE', 'AI_RUNTIME_AUTH_FAILURE'],
    [500, '{"contractVersion":"1.0","requestId":"transport-500","error":{"code":"INFERENCE_FAILED","message":"runtime failed"}}', 'AI_RUNTIME_FAILURE', 'AI_RUNTIME_INFERENCE_FAILURE'],
    [503, '{"contractVersion":"1.0","requestId":"transport-503","error":{"code":"RUNTIME_UNAVAILABLE","message":"runtime unavailable"}}', 'AI_CONNECTION_FAILURE', 'AI_CONNECTION_FAILURE'],
    [408, '', 'AI_TIMEOUT', 'AI_TIMEOUT'],
    [504, '', 'AI_TIMEOUT', 'AI_TIMEOUT'],
  ])('maps integrated transport status %i without retry', async (status, body, publicCode, internalCode) => {
    await prisma.aIRequestLog.deleteMany({ where: { userId: ids.student } });
    const runtime = new ScriptedAiRuntime().queue({ status: status as number, body: body as string });
    const inference = makeAiInference(prisma, runtime, policy);
    await expect(inference.execute(buildRequest('STUDENT_LEARNING_ANALYSIS', validInputs.STUDENT_LEARNING_ANALYSIS, `transport-${status}`), activeUsers.student, { ownerUserId: ids.student })).rejects.toMatchObject({ code: publicCode });
    expect(runtime.calls).toBe(1);
    const row = await prisma.aIRequestLog.findFirst({ where: { userId: ids.student } });
    expect(row).toMatchObject({ status: 'FAILED', errorCode: internalCode });
  });

  it('keeps only the Stage 1 SUCCESS log when Stage 2 fails its own capacity preflight', async () => {
    await prisma.aIRequestLog.deleteMany({ where: { userId: ids.admin } });
    const runtime = new ScriptedAiRuntime().queue({ issueGroups: [] });
    const inference = makeAiInference(prisma, runtime, policy, (payload) =>
      JSON.parse(payload).task === 'ADMIN_FEEDBACK_SUMMARY_STAGE2' ? 200_000 : 1);
    await expect(new AiFlowService(inference).runAdminFeedbackAnalysis({
      feedback: (validInputs.ADMIN_FEEDBACK_GROUPING_STAGE1 as any).feedback,
      totalFeedback: 1,
      tagStatistics: { AI_PERFORMANCE: 0, STUDY_PLAN: 0, UI_UX: 1, LEARNING_ANALYTICS: 0, OTHER: 0 },
    }, 'stage2-overflow', activeUsers.admin, { ownerUserId: ids.admin })).rejects.toMatchObject({ code: 'AI_INPUT_TOO_LARGE' });
    expect(runtime.calls).toBe(1);
    const rows = await prisma.aIRequestLog.findMany({ where: { userId: ids.admin } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ feature: 'ADMIN_FEEDBACK_GROUPING_STAGE1', status: 'SUCCESS', errorCode: null });
  });

  it('returns no output when terminal DB persistence fails after one successful dispatch', async () => {
    const runtime = new ScriptedAiRuntime().queue(async () => {
      await prisma.feedback.delete({ where: { id: ids.doomedFeedback } });
      await prisma.user.delete({ where: { id: ids.doomedAdmin } });
      return validOutputs.ADMIN_FEEDBACK_GROUPING_STAGE1;
    });
    const inference = makeAiInference(prisma, runtime, policy);
    await expect(inference.execute(buildRequest('ADMIN_FEEDBACK_GROUPING_STAGE1', validInputs.ADMIN_FEEDBACK_GROUPING_STAGE1, 'db-failure'), activeUsers.doomedAdmin, { ownerUserId: ids.doomedAdmin })).rejects.toBeDefined();
    expect(runtime.calls).toBe(1);
    expect(await prisma.aIRequestLog.count({ where: { userId: ids.doomedAdmin } })).toBe(0);
  });
});
