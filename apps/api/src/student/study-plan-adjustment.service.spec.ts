import { AuthUser } from '../auth/auth.service';
import { StudyPlanAdjustmentService } from './study-plan-adjustment.service';

describe('StudyPlanAdjustmentService', () => {
  const student: AuthUser = { id: 'student-1', fullName: 'Student', email: 's@example.test', role: 'STUDENT', status: 'ACTIVE' };

  it('rejects missing current plans before inference or temporary context creation', async () => {
    const prisma = { studyPlan: { findFirst: jest.fn().mockResolvedValue(null) }, temporaryContext: { create: jest.fn() } };
    const dashboard = { getProgress: jest.fn() };
    const ai = { infer: jest.fn() };
    const service = new StudyPlanAdjustmentService(prisma as never, dashboard as never, ai as never);

    await expect(service.generate(student)).rejects.toMatchObject({ response: { code: 'NO_CURRENT_PLAN' } });
    expect(ai.infer).not.toHaveBeenCalled();
    expect(prisma.temporaryContext.create).not.toHaveBeenCalled();
  });

  it('takes the shared Student row lock before loading the current plan for apply', async () => {
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'student-1' }]),
      temporaryContext: { findUnique: jest.fn().mockResolvedValue({
        id: 'context-1', ownerUserId: student.id, contextType: 'STUDY_PLAN_ADJUSTMENT', status: 'OPEN',
        resourceKey: 'plan-1', expiresAt: new Date('2099-01-01T00:00:00.000Z'),
        payload: { planId: 'plan-1', changes: [] },
      }) },
      studyPlan: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const prisma = { $transaction: jest.fn((callback) => callback(transaction)) };
    const service = new StudyPlanAdjustmentService(prisma as never, {} as never, {} as never);

    await expect(service.apply(student, { adjustmentRef: 'adjustment-1' })).rejects.toMatchObject({
      response: { code: 'STALE_PREVIEW' },
    });
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(2);
    expect(transaction.studyPlan.findFirst).toHaveBeenCalledTimes(1);
  });
});
