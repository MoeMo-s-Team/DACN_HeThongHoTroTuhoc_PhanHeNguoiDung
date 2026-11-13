import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { MVP_COURSE_ID } from '../src/common/mvp-course';
import { StudyPlanApplyService } from '../src/student/study-plan-apply.service';
import { StudyPlanAdjustmentService } from '../src/student/study-plan-adjustment.service';
import { requireTestDatabaseUrl } from '../prisma/test-database-url';

describe('Student AI Apply concurrency (PostgreSQL)', () => {
  const prisma = new PrismaClient({ datasourceUrl: requireTestDatabaseUrl() });
  const studentId = randomUUID();
  const topicId = randomUUID();
  const student = { id: studentId, fullName: 'Concurrency Student', email: '', role: 'STUDENT' as const, status: 'ACTIVE' as const };
  const plans = new StudyPlanApplyService(prisma as unknown as PrismaService);
  const adjustments = new StudyPlanAdjustmentService(prisma as unknown as PrismaService, {} as never, {} as never);
  const future = new Date('2099-12-31T00:00:00.000Z');
  const start = new Date('2099-11-01T00:00:00.000Z');
  const due = new Date('2099-11-15T00:00:00.000Z');

  function barrier(parties: number) {
    let waiting = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    return async () => {
      waiting += 1;
      if (waiting === parties) release();
      await gate;
    };
  }

  async function createPreview(opaqueRef: string, title = 'Preview plan', expectedMinutes = 60) {
    const preview = { planTitle: title, goal: 'Practice algorithms', availableMinutesPerWeek: 240,
      targetDeadline: future.toISOString(), tasks: [{ previewTaskId: 'preview-task', topic: { id: topicId, name: 'Algorithms' },
        title: 'Review graphs', goal: 'Understand graph traversal', expectedMinutes, dueDate: due.toISOString(), priority: 'HIGH', reason: null }] };
    await prisma.temporaryContext.create({ data: { opaqueRef, contextType: 'STUDY_PLAN_PREVIEW', ownerUserId: studentId,
      resourceKey: studentId, payload: { preview }, expiresAt: future, retentionUntil: future } });
  }

  async function createPlan(title: string, taskMinutes = 60) {
    return prisma.studyPlan.create({ data: { studentId, title, goal: 'Practice algorithms', availableMinutesPerWeek: 240,
      startDate: start, endDate: future, status: 'ACTIVE', tasks: { create: [
        { topicId, title: 'Review graphs', goal: 'Read graph examples', expectedMinutes: taskMinutes, dueDate: due, priority: 'HIGH' },
        { topicId, title: 'Solve graph problems', goal: 'Practice traversal', expectedMinutes: taskMinutes, dueDate: due, priority: 'MEDIUM' },
      ] } }, include: { tasks: true } });
  }

  async function createAdjustmentContext(planId: string, opaqueRef: string, taskIds: string[]) {
    await prisma.temporaryContext.create({ data: { opaqueRef, contextType: 'STUDY_PLAN_ADJUSTMENT', ownerUserId: studentId,
      resourceKey: planId, payload: { planId, changes: taskIds.map((taskId) => ({ taskId, expectedMinutes: 30, priority: 'MEDIUM', reason: 'Reduce this review block.' })) },
      expiresAt: future, retentionUntil: future } });
  }

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.user.create({ data: { id: studentId, fullName: student.fullName, email: `ai-concurrency-${studentId}@example.test`,
      passwordHash: 'unused', role: 'STUDENT' } });
    await prisma.topic.create({ data: { id: topicId, courseId: MVP_COURSE_ID, name: 'Algorithms' } });
  });

  afterEach(async () => {
    await prisma.temporaryContext.deleteMany({ where: { ownerUserId: studentId } });
    await prisma.studyTask.deleteMany({ where: { studyPlan: { studentId } } });
    await prisma.studyPlan.deleteMany({ where: { studentId } });
  });

  afterAll(async () => {
    await prisma.topic.deleteMany({ where: { id: topicId } });
    await prisma.user.deleteMany({ where: { id: studentId } });
    await prisma.$disconnect();
  });

  it('serializes simultaneous generation applies with the same reference and replays one persisted plan', async () => {
    const ref = randomUUID();
    await createPreview(ref);
    const waitAtBarrier = barrier(2);
    const apply = async () => { await waitAtBarrier(); return plans.apply(student, { planPreviewRef: ref }); };

    const results = await Promise.all([apply(), apply()]);
    expect(results.map(({ replayed }) => replayed).sort()).toEqual([false, true]);
    const persistedPlan = await prisma.studyPlan.findFirstOrThrow({ where: { studentId } });
    const replayResult = await prisma.temporaryContext.findUniqueOrThrow({ where: { opaqueRef: ref } });
    expect((replayResult.replayResult as { plan: { id: string } }).plan.id).toBe(persistedPlan.id);
    expect(await prisma.studyPlan.count({ where: { studentId } })).toBe(1);
    expect(await prisma.studyTask.count({ where: { studyPlan: { studentId } } })).toBe(1);
    expect(await prisma.temporaryContext.findUniqueOrThrow({ where: { opaqueRef: ref } })).toMatchObject({ status: 'CONSUMED' });
  });

  it('rejects a simultaneous apply using the consumed reference with a different normalized payload', async () => {
    const ref = randomUUID();
    await createPreview(ref);
    const waitAtBarrier = barrier(2);
    const first = async () => { await waitAtBarrier(); return plans.apply(student, { planPreviewRef: ref, planTitle: 'First title' }); };
    const second = async () => { await waitAtBarrier(); return plans.apply(student, { planPreviewRef: ref, planTitle: 'Second title' }); };

    const results = await Promise.allSettled([first(), second()]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({ reason: { response: { code: 'CONTEXT_ALREADY_CONSUMED' } } });
    expect(await prisma.studyPlan.count({ where: { studentId } })).toBe(1);
    expect(await prisma.studyPlan.count({ where: { studentId, title: { in: ['First title', 'Second title'] } } })).toBe(1);
  });

  it('rolls back plan replacement and leaves the preview open after task persistence fails', async () => {
    const existing = await createPlan('Existing plan');
    const ref = randomUUID();
    await createPreview(ref, 'Replacement plan', 2_147_483_648);

    await expect(plans.apply(student, { planPreviewRef: ref })).rejects.toBeDefined();
    expect(await prisma.studyPlan.findUniqueOrThrow({ where: { id: existing.id } })).toMatchObject({ status: 'ACTIVE' });
    expect(await prisma.studyPlan.count({ where: { studentId } })).toBe(1);
    expect(await prisma.temporaryContext.findUniqueOrThrow({ where: { opaqueRef: ref } })).toMatchObject({ status: 'OPEN' });

    const context = await prisma.temporaryContext.findUniqueOrThrow({ where: { opaqueRef: ref } });
    const payload = context.payload as { preview: { tasks: Array<{ expectedMinutes: number }> } };
    payload.preview.tasks[0].expectedMinutes = 30;
    await prisma.temporaryContext.update({ where: { id: context.id }, data: { payload } });
    await plans.apply(student, { planPreviewRef: ref });
    expect(await prisma.studyPlan.findFirstOrThrow({ where: { studentId, status: 'ACTIVE' } })).toMatchObject({ title: 'Replacement plan' });
    expect(await prisma.studyPlan.findUniqueOrThrow({ where: { id: existing.id } })).toMatchObject({ status: 'ARCHIVED' });
  });

  it('keeps one current plan when independent previews are applied simultaneously', async () => {
    const existing = await createPlan('Existing plan');
    const firstRef = randomUUID();
    const secondRef = randomUUID();
    await Promise.all([createPreview(firstRef, 'First replacement'), createPreview(secondRef, 'Second replacement')]);
    const waitAtBarrier = barrier(2);
    const apply = (planPreviewRef: string) => async () => { await waitAtBarrier(); return plans.apply(student, { planPreviewRef }); };

    const results = await Promise.allSettled([apply(firstRef)(), apply(secondRef)()]);
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
    const persistedPlans = await prisma.studyPlan.findMany({ where: { studentId }, include: { tasks: true } });
    expect(persistedPlans.filter(({ status }) => status === 'ACTIVE' || status === 'COMPLETED')).toHaveLength(1);
    expect(persistedPlans.find(({ id }) => id === existing.id)).toMatchObject({ status: 'ARCHIVED', tasks: expect.arrayContaining([expect.anything(), expect.anything()]) });
    expect(persistedPlans.filter(({ id }) => id !== existing.id).every(({ tasks }) => tasks.length === 1)).toBe(true);
  });

  it('serializes simultaneous adjustment applies and rejects a stale task set atomically', async () => {
    const plan = await createPlan('Current plan');
    const ref = randomUUID();
    await createAdjustmentContext(plan.id, ref, plan.tasks.map(({ id }) => id));
    const waitAtBarrier = barrier(2);
    const apply = async () => { await waitAtBarrier(); return adjustments.apply(student, { adjustmentRef: ref }); };

    const results = await Promise.all([apply(), apply()]);
    expect(results.map(({ replayed }) => replayed).sort()).toEqual([false, true]);
    const updatedTasks = await prisma.studyTask.findMany({ where: { studyPlanId: plan.id } });
    expect(updatedTasks).toHaveLength(2);
    expect(updatedTasks.every(({ expectedMinutes, priority }) => expectedMinutes === 30 && priority === 'MEDIUM')).toBe(true);

    const staleRef = randomUUID();
    await createAdjustmentContext(plan.id, staleRef, plan.tasks.map(({ id }) => id));
    await prisma.studyTask.update({ where: { id: plan.tasks[1].id }, data: { status: 'COMPLETED', completedAt: new Date() } });
    await expect(adjustments.apply(student, { adjustmentRef: staleRef })).rejects.toMatchObject({
      response: { code: 'STALE_PREVIEW' },
    });
    expect(await prisma.studyTask.findUniqueOrThrow({ where: { id: plan.tasks[0].id } })).toMatchObject({ expectedMinutes: 30, priority: 'MEDIUM' });
    expect(await prisma.temporaryContext.findUniqueOrThrow({ where: { opaqueRef: staleRef } })).toMatchObject({ status: 'OPEN' });
  });
});
