import { AuthUser } from '../auth/auth.service';
import { StudyContextService } from './study-context.service';
import { StudyPlanGenerationService } from './study-plan-generation.service';

describe('StudyPlanGenerationService', () => {
  const student: AuthUser = { id: 'student-1', fullName: 'Student', email: 's@example.test', role: 'STUDENT', status: 'ACTIVE' };
  const request = { goal: 'Learn trees', availableHoursPerWeek: 5, targetDeadline: '2099-01-01T00:00:00.000Z' };
  const assessments = { items: [{ topic: { id: 'topic-1', name: 'Trees' }, score: 58, classification: 'PRIORITY' as const, evaluatedAt: new Date() }] };

  it('rejects missing assessments before inference or temporary context creation', async () => {
    const prisma = { topic: { findMany: jest.fn().mockResolvedValue([{ id: 'topic-1', name: 'Trees' }]) }, temporaryContext: { create: jest.fn() } };
    const dashboard = { getAssessmentResults: jest.fn().mockResolvedValue({ items: [] }) };
    const ai = { infer: jest.fn() };
    const service = new StudyPlanGenerationService(prisma as never, dashboard as never, new StudyContextService(), ai as never);

    await expect(service.generate(student, request)).rejects.toMatchObject({
      response: { code: 'INSUFFICIENT_DATA' },
    });
    expect(ai.infer).not.toHaveBeenCalled();
    expect(prisma.temporaryContext.create).not.toHaveBeenCalled();
  });

  it('stores only a validated server-owned preview context and returns its opaque reference', async () => {
    const prisma = {
      topic: { findMany: jest.fn().mockResolvedValue([{ id: 'topic-1', name: 'Trees' }]) },
      temporaryContext: { create: jest.fn().mockImplementation(async ({ data }) => ({ opaqueRef: data.opaqueRef })) },
    };
    const dashboard = { getAssessmentResults: jest.fn().mockResolvedValue(assessments) };
    const ai = { infer: jest.fn().mockResolvedValue({ planTitle: 'Tree plan', tasks: [{ title: 'Read trees', topicId: 'topic-1', goal: 'Understand trees', expectedMinutes: 60, dueDate: '2098-12-01T00:00:00.000Z', priority: 'HIGH', reason: null }] }) };
    const service = new StudyPlanGenerationService(prisma as never, dashboard as never, new StudyContextService(), ai as never);

    const result = await service.generate(student, request);

    expect(ai.infer).toHaveBeenCalledWith(student, 'STUDENT_STUDY_PLAN_GENERATION', expect.objectContaining({
      goal: 'Learn trees', assessments: [{ topicId: 'topic-1', topicName: 'Trees', score: 58, classification: 'PRIORITY' }],
    }));
    expect(prisma.temporaryContext.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      contextType: 'STUDY_PLAN_PREVIEW', ownerUserId: student.id, resourceKey: student.id,
    }) }));
    expect(result.preview.tasks[0].topic).toEqual({ id: 'topic-1', name: 'Trees' });
    expect(result.planPreviewRef).toBeTruthy();
  });

  it('preserves the contract conversion for fractional weekly hours', async () => {
    const prisma = {
      topic: { findMany: jest.fn().mockResolvedValue([{ id: 'topic-1', name: 'Trees' }]) },
      temporaryContext: { create: jest.fn().mockImplementation(async ({ data }) => ({ opaqueRef: data.opaqueRef })) },
    };
    const dashboard = { getAssessmentResults: jest.fn().mockResolvedValue(assessments) };
    const ai = { infer: jest.fn().mockResolvedValue({ planTitle: 'Tree plan', tasks: [{ title: 'Read trees', topicId: 'topic-1', goal: 'Understand trees', expectedMinutes: 60, dueDate: '2098-12-01T00:00:00.000Z', priority: 'HIGH', reason: null }] }) };
    const service = new StudyPlanGenerationService(prisma as never, dashboard as never, new StudyContextService(), ai as never);

    const result = await service.generate(student, { ...request, availableHoursPerWeek: 1.3333 });

    expect(result.preview.availableMinutesPerWeek).toBeCloseTo(79.998);
    expect(ai.infer).toHaveBeenCalledWith(student, 'STUDENT_STUDY_PLAN_GENERATION', expect.any(Object));
    expect(ai.infer.mock.calls[0][2].availableMinutesPerWeek).toBeCloseTo(79.998);
  });
});
