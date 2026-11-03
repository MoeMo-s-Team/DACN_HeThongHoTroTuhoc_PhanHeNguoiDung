import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { StudentTasksService } from './student-tasks.service';

const student: AuthUser = {
  id: '10000000-0000-4000-8000-000000000001',
  fullName: 'Student One',
  email: 'student.one@example.test',
  role: 'STUDENT',
  status: 'ACTIVE',
};
const topic = { id: '20000000-0000-4000-8000-000000000001', name: 'Algorithms' };
const planId = '40000000-0000-4000-8000-000000000001';
const taskId = '60000000-0000-4000-8000-000000000001';
const now = new Date('2026-11-02T10:00:00.000Z');

function task(id: string, status: 'TODO' | 'COMPLETED' = 'TODO', dueDate = new Date(now.getTime() + 86_400_000)) {
  return {
    id,
    studyPlanId: planId,
    title: `Task ${id}`,
    goal: 'Practice',
    expectedMinutes: 30,
    dueDate,
    priority: 'MEDIUM' as const,
    status,
    completedAt: status === 'COMPLETED' ? now : null,
    topic,
  };
}

function createHarness(options: { planStatus?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'; tasks?: ReturnType<typeof task>[] } = {}) {
  let state = {
    planStatus: options.planStatus ?? 'ACTIVE',
    tasks: options.tasks ?? [task(taskId)],
  };
  const studyPlan = { findFirst: jest.fn() };
  const transactions: Array<{ planStatus: string; tasks: ReturnType<typeof task>[] }> = [];
  const prisma = {
    studyPlan,
    $transaction: jest.fn(async (callback: (tx: any) => Promise<unknown>) => {
      const txState = structuredClone(state);
      const tx = {
        studyTask: {
          findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
            const found = txState.tasks.find((item) => item.id === where.id);
            return found ? { ...found, studyPlan: { id: planId, studentId: student.id, status: txState.planStatus } } : null;
          }),
          update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<ReturnType<typeof task>> }) => {
            const index = txState.tasks.findIndex((item) => item.id === where.id);
            txState.tasks[index] = { ...txState.tasks[index], ...data };
            return txState.tasks[index];
          }),
          findMany: jest.fn(async () => txState.tasks),
        },
        studyPlan: {
          update: jest.fn(async ({ data }: { data: { status: 'ACTIVE' | 'COMPLETED' } }) => {
            txState.planStatus = data.status;
            return { id: planId, status: txState.planStatus };
          }),
        },
      };
      const result = await callback(tx);
      state = txState;
      transactions.push(state);
      return result;
    }),
  };
  const service = new StudentTasksService(prisma as unknown as PrismaService);
  return { service, prisma, studyPlan, transactions, get state() { return state; } };
}

describe('StudentTasksService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => jest.useRealTimers());

  it('returns an empty list when the authenticated Student has no current plan', async () => {
    const harness = createHarness();
    harness.studyPlan.findFirst.mockResolvedValue(null);

    await expect(harness.service.list(student)).resolves.toEqual({ planId: null, planStatus: null, items: [] });
    expect(harness.studyPlan.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: student.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
    }));
  });

  it('lists task details from only the authenticated Student current plan', async () => {
    const currentTask = {
      id: taskId,
      topic,
      title: `Task ${taskId}`,
      goal: 'Practice',
      expectedMinutes: 30,
      dueDate: new Date(now.getTime() + 86_400_000),
      priority: 'MEDIUM' as const,
      status: 'TODO' as const,
      completedAt: null,
    };
    const harness = createHarness();
    harness.studyPlan.findFirst.mockResolvedValue({ id: planId, status: 'ACTIVE', tasks: [currentTask] });

    await expect(harness.service.list(student)).resolves.toEqual({
      planId,
      planStatus: 'ACTIVE',
      items: [currentTask],
    });
    expect(harness.studyPlan.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: student.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
    }));
  });

  it('rejects non-Student access before querying tasks', async () => {
    const harness = createHarness();
    await expect(harness.service.list({ ...student, role: 'TEACHER' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(harness.studyPlan.findFirst).not.toHaveBeenCalled();
  });

  it('completes the last TODO task, timestamps it, completes the plan, and returns progress', async () => {
    const harness = createHarness({ tasks: [task(taskId)] });
    const response = await harness.service.updateStatus(student, taskId, 'COMPLETED');

    expect(response.task).toMatchObject({ id: taskId, status: 'COMPLETED', completedAt: expect.any(Date) });
    expect(response.task.completedAt!.getTime()).toBeGreaterThanOrEqual(now.getTime() - 60_000);
    expect(response.planStatus).toBe('COMPLETED');
    expect(response.progress).toMatchObject({ completedTasks: 1, totalTasks: 1, completionPercentage: 100, overdueTasks: 0 });
    expect(harness.prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('undoes completion, clears completedAt, and reactivates a completed plan', async () => {
    const completed = task(taskId, 'COMPLETED');
    const harness = createHarness({ planStatus: 'COMPLETED', tasks: [completed] });
    const response = await harness.service.updateStatus(student, taskId, 'TODO');

    expect(response.task).toMatchObject({ id: taskId, status: 'TODO', completedAt: null });
    expect(response.planStatus).toBe('ACTIVE');
    expect(response.progress).toMatchObject({ completedTasks: 0, totalTasks: 1, completionPercentage: 0 });
  });

  it('keeps overdue and near-due TODO tasks unchanged and does not change the plan lifecycle', async () => {
    const overdue = task('overdue', 'TODO', new Date(now.getTime() - 60_000));
    const nearDue = task('near-due', 'TODO', new Date(now.getTime() + 24 * 60 * 60_000));
    const dueNow = task('due-now', 'TODO', now);
    const harness = createHarness({ tasks: [overdue, nearDue, dueNow] });
    harness.studyPlan.findFirst.mockResolvedValue({ id: planId, status: 'ACTIVE', tasks: [overdue, nearDue, dueNow] });

    const list = await harness.service.list(student);
    const response = await harness.service.updateStatus(student, overdue.id, 'TODO');

    expect(list.items.map((item: ReturnType<typeof task>) => item.status)).toEqual(['TODO', 'TODO', 'TODO']);
    expect(response.planStatus).toBe('ACTIVE');
    expect(response.progress).toMatchObject({ totalTasks: 3, overdueTasks: 1 });
    expect(response.progress.expectedProgress).toBeCloseTo(200 / 3);
  });

  it('returns 404 when a task does not exist', async () => {
    const harness = createHarness();
    await expect(harness.service.updateStatus(student, 'missing', 'COMPLETED')).rejects.toBeInstanceOf(NotFoundException);
    expect(harness.transactions).toHaveLength(0);
  });

  it('forbids updating a task owned by another Student', async () => {
    const harness = createHarness();
    const txFind = jest.fn().mockResolvedValue({ ...task(taskId), studyPlan: { id: planId, studentId: 'other-student', status: 'ACTIVE' } });
    harness.prisma.$transaction.mockImplementationOnce(async (callback: (tx: any) => Promise<unknown>) => {
      const tx = {
        studyTask: { findUnique: txFind, update: jest.fn(), findMany: jest.fn() },
        studyPlan: { update: jest.fn() },
      };
      return callback(tx);
    });
    await expect(harness.service.updateStatus(student, taskId, 'COMPLETED')).rejects.toBeInstanceOf(ForbiddenException);
    expect(txFind).toHaveBeenCalled();
  });

  it('rejects an owned task whose plan is archived without committing changes', async () => {
    const archived = createHarness({ planStatus: 'ARCHIVED' });
    await expect(archived.service.updateStatus(student, taskId, 'COMPLETED')).rejects.toBeInstanceOf(ConflictException);
    expect(archived.state.tasks[0]).toMatchObject({ status: 'TODO', completedAt: null });
  });

  it('rolls back task changes when the plan update fails', async () => {
    const harness = createHarness({ tasks: [task(taskId)] });
    harness.prisma.$transaction.mockImplementationOnce(async (callback: (tx: any) => Promise<unknown>) => {
      const tx = {
        studyTask: {
          findUnique: jest.fn(async () => ({ ...task(taskId), studyPlan: { id: planId, studentId: student.id, status: 'ACTIVE' } })),
          update: jest.fn(async () => ({ ...task(taskId), status: 'COMPLETED', completedAt: now })),
          findMany: jest.fn(async () => [task(taskId, 'COMPLETED')]),
        },
        studyPlan: { update: jest.fn().mockRejectedValue(new Error('plan update failed')) },
      };
      return callback(tx);
    });

    await expect(harness.service.updateStatus(student, taskId, 'COMPLETED')).rejects.toThrow('plan update failed');
    expect(harness.state.tasks[0]).toMatchObject({ status: 'TODO', completedAt: null });
  });

  it('retries Prisma serialization conflicts', async () => {
    const harness = createHarness({ tasks: [task(taskId)] });
    harness.prisma.$transaction.mockRejectedValueOnce({ code: 'P2034' });

    await expect(harness.service.updateStatus(student, taskId, 'COMPLETED')).resolves.toMatchObject({ planStatus: 'COMPLETED' });
    expect(harness.prisma.$transaction).toHaveBeenCalledTimes(2);
  });
});
