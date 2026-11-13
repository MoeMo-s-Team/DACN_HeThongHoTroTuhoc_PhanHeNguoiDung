import { AuthUser } from '../auth/auth.service';
import { StudyPlanApplyService } from './study-plan-apply.service';

describe('StudyPlanApplyService', () => {
  const student: AuthUser = { id: 'student-1', fullName: 'Student', email: 's@example.test', role: 'STUDENT', status: 'ACTIVE' };

  it('rejects a preview reference that is not owned by this Student without mutating a plan', async () => {
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      temporaryContext: { findUnique: jest.fn().mockResolvedValue(null) },
      studyPlan: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((callback) => callback(transaction)) };
    const service = new StudyPlanApplyService(prisma as never);

    await expect(service.apply(student, { planPreviewRef: 'unknown-ref' })).rejects.toMatchObject({
      response: { code: 'CONTEXT_INVALID_OR_EXPIRED' },
    });
    expect(transaction.studyPlan.create).not.toHaveBeenCalled();
  });

  it('creates plan/tasks and consumes the preview with replay data in the same transaction', async () => {
    const preview = {
      planTitle: 'Tree plan', goal: 'Learn trees', availableMinutesPerWeek: 300, targetDeadline: '2099-01-01T00:00:00.000Z',
      tasks: [{ previewTaskId: 'preview-task-1', topic: { id: 'topic-1', name: 'Trees' }, title: 'Read trees', goal: 'Understand trees',
        expectedMinutes: 60, dueDate: '2098-12-01T00:00:00.000Z', priority: 'HIGH', reason: null }],
    };
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'context-1' }]),
      temporaryContext: {
        findUnique: jest.fn().mockResolvedValue({ id: 'context-1', opaqueRef: 'preview-1', ownerUserId: student.id, resourceKey: student.id,
          contextType: 'STUDY_PLAN_PREVIEW', status: 'OPEN', payload: { preview }, expiresAt: new Date('2098-01-01T00:00:00.000Z') }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      studyPlan: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'plan-1', title: 'Tree plan', goal: 'Learn trees', availableMinutesPerWeek: 300,
          startDate: new Date('2026-11-10T00:00:00.000Z'), endDate: new Date('2099-01-01T00:00:00.000Z'), status: 'ACTIVE',
          createdAt: new Date('2026-11-10T00:00:00.000Z'), tasks: [{ id: 'task-1', topic: { id: 'topic-1', name: 'Trees' }, title: 'Read trees',
            goal: 'Understand trees', expectedMinutes: 60, dueDate: new Date('2098-12-01T00:00:00.000Z'), priority: 'HIGH', status: 'TODO', completedAt: null }] }),
        update: jest.fn(),
      },
      topic: { findMany: jest.fn().mockResolvedValue([{ id: 'topic-1' }]) },
    };
    const prisma = { $transaction: jest.fn((callback) => callback(transaction)) };
    const service = new StudyPlanApplyService(prisma as never);

    const result = await service.apply(student, { planPreviewRef: 'preview-1' });

    expect(result).toMatchObject({ replayed: false, plan: { id: 'plan-1' }, tasks: [{ id: 'task-1' }] });
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(2);
    expect(transaction.topic.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['topic-1'] }, courseId: expect.any(String) } }));
    expect(transaction.studyPlan.create).toHaveBeenCalledTimes(1);
    expect(transaction.temporaryContext.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'OPEN', ownerUserId: student.id }),
      data: expect.objectContaining({ status: 'CONSUMED', requestFingerprint: expect.any(String), replayResult: expect.any(Object), consumedAt: expect.any(Date) }),
    }));
  });
});
