import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { calculateProgress, classifyAssessmentScore, StudentDashboardService } from './student-dashboard.service';
import { MVP_COURSE_ID } from '../common/mvp-course';

const student: AuthUser = {
  id: '10000000-0000-4000-8000-000000000001',
  fullName: 'Student One',
  email: 'student.one@example.test',
  role: 'STUDENT',
  status: 'ACTIVE',
};

const topic = { id: '20000000-0000-4000-8000-000000000001', name: 'Algorithms' };

describe('StudentDashboardService', () => {
  const assessmentResult = { findMany: jest.fn() };
  const studyPlan = { findFirst: jest.fn() };
  let service: StudentDashboardService;

  beforeEach(() => {
    jest.clearAllMocks();
    assessmentResult.findMany.mockResolvedValue([]);
    studyPlan.findFirst.mockResolvedValue(null);
    service = new StudentDashboardService({ assessmentResult, studyPlan } as unknown as PrismaService);
  });

  it('uses only the authenticated Student ID and chooses the newest result for each Topic', async () => {
    assessmentResult.findMany.mockResolvedValue([
      { topicId: topic.id, topic, score: 59, evaluatedAt: new Date('2026-10-31T00:00:00.000Z') },
      { topicId: topic.id, topic, score: 80, evaluatedAt: new Date('2026-10-30T00:00:00.000Z') },
    ]);

    const result = await service.getDashboard(student);

    expect(assessmentResult.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: student.id, topic: { courseId: MVP_COURSE_ID } },
      orderBy: { evaluatedAt: 'desc' },
    }));
    expect(result.assessmentResults).toEqual([{
      topic,
      score: 59,
      classification: 'PRIORITY',
      evaluatedAt: new Date('2026-10-31T00:00:00.000Z'),
    }]);
  });

  it('classifies PostgreSQL Decimal scores before converting them to API numbers', async () => {
    assessmentResult.findMany.mockResolvedValue([
      { topicId: topic.id, topic, score: new Prisma.Decimal('79.999999999999999999'), evaluatedAt: new Date('2026-10-31T00:00:00.000Z') },
      { topicId: '20000000-0000-4000-8000-000000000002', topic: { id: '20000000-0000-4000-8000-000000000002', name: 'Databases' }, score: new Prisma.Decimal('59.999999999999999999'), evaluatedAt: new Date('2026-10-31T00:00:00.000Z') },
    ]);

    const result = await service.getDashboard(student);

    expect(result.assessmentResults).toEqual([
      expect.objectContaining({ topic, classification: 'NEEDS_REINFORCEMENT', evaluatedAt: new Date('2026-10-31T00:00:00.000Z') }),
      expect.objectContaining({ topic: { id: '20000000-0000-4000-8000-000000000002', name: 'Databases' }, classification: 'PRIORITY', evaluatedAt: new Date('2026-10-31T00:00:00.000Z') }),
    ]);
    expect(result.assessmentResults[0].score).toBeLessThan(80);
    expect(result.assessmentResults[1].score).toBeLessThan(60);
  });

  it('returns empty assessment and null plan metrics when no learning data exists', async () => {
    const result = await service.getDashboard(student);

    expect(result).toEqual({ assessmentResults: [], currentPlan: null, progress: null, nearDueTasks: [], overdueTaskItems: [] });
    expect(studyPlan.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: student.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
    }));
  });

  it('returns null metrics when the Student has no current plan', async () => {
    await expect(service.getProgress(student)).resolves.toEqual({
      hasCurrentPlan: false,
      planId: null,
      metrics: null,
    });
    expect(studyPlan.findFirst).toHaveBeenCalledWith({
      where: { studentId: student.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
      select: { id: true, tasks: { select: { status: true, dueDate: true } } },
    });
  });

  it('returns backend metrics for only the authenticated Student current plan', async () => {
    studyPlan.findFirst.mockResolvedValue({
      id: 'plan-current',
      tasks: [
        { status: 'TODO', dueDate: new Date('2000-01-01T00:00:00.000Z') },
        { status: 'COMPLETED', dueDate: new Date('2000-01-01T00:00:00.000Z') },
        { status: 'TODO', dueDate: new Date('2999-01-01T00:00:00.000Z') },
      ],
    });

    await expect(service.getProgress(student)).resolves.toEqual({
      hasCurrentPlan: true,
      planId: 'plan-current',
      metrics: {
        completedTasks: 1,
        totalTasks: 3,
        completionPercentage: 1 / 3 * 100,
        actualProgress: 1 / 3 * 100,
        expectedProgress: 2 / 3 * 100,
        overdueTasks: 1,
        slowProgress: true,
      },
    });
  });

  it('returns zero metrics for a current plan without tasks', async () => {
    studyPlan.findFirst.mockResolvedValue({ id: 'empty-plan', tasks: [] });

    await expect(service.getProgress(student)).resolves.toEqual({
      hasCurrentPlan: true,
      planId: 'empty-plan',
      metrics: {
        completedTasks: 0,
        totalTasks: 0,
        completionPercentage: 0,
        actualProgress: 0,
        expectedProgress: 0,
        overdueTasks: 0,
        slowProgress: false,
      },
    });
  });

  it('forbids non-Student progress access before querying a plan', async () => {
    await expect(service.getProgress({ ...student, role: 'ADMINISTRATOR' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(studyPlan.findFirst).not.toHaveBeenCalled();
  });

  it('returns current results scoped to the authenticated Student and MVP Course', async () => {
    const latest = new Date('2026-10-31T00:00:00.000Z');
    assessmentResult.findMany.mockResolvedValue([
      { topicId: topic.id, topic, score: new Prisma.Decimal('79.999999999999999999'), evaluatedAt: latest },
      { topicId: topic.id, topic, score: new Prisma.Decimal('101'), evaluatedAt: new Date(latest.getTime() - 1) },
    ]);

    const result = await service.getAssessmentResults(student);
    expect(result.items[0]).toMatchObject({ topic, classification: 'NEEDS_REINFORCEMENT', evaluatedAt: latest });
    expect(result.items[0].score).toBeLessThan(80);
    expect(assessmentResult.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: student.id, topic: { courseId: MVP_COURSE_ID } },
      orderBy: { evaluatedAt: 'desc' },
    }));
  });

  it('selects the current result before validating prior history', async () => {
    const latest = new Date('2026-10-31T00:00:00.000Z');
    assessmentResult.findMany.mockResolvedValue([
      { topicId: topic.id, topic, score: new Prisma.Decimal('79.5'), evaluatedAt: latest },
      { topicId: topic.id, topic, score: new Prisma.Decimal('101'), evaluatedAt: new Date(latest.getTime() - 1) },
    ]);

    await expect(service.getAssessmentResults(student)).resolves.toMatchObject({
      items: [{ score: 79.5, classification: 'NEEDS_REINFORCEMENT' }],
    });
  });

  it('returns an empty item list when no assessment result exists', async () => {
    await expect(service.getAssessmentResults(student)).resolves.toEqual({ items: [] });
  });

  it('denies assessment-result access to non-Student users', async () => {
    await expect(service.getAssessmentResults({ ...student, role: 'TEACHER' })).rejects.toMatchObject({
      response: { code: 'FORBIDDEN_RESOURCE' },
    });
    expect(assessmentResult.findMany).not.toHaveBeenCalled();
  });

  it('denies dashboard access to non-Student users', async () => {
    await expect(service.getDashboard({ ...student, role: 'TEACHER' })).rejects.toMatchObject({
      response: { code: 'FORBIDDEN_RESOURCE' },
    });
    expect(assessmentResult.findMany).not.toHaveBeenCalled();
    expect(studyPlan.findFirst).not.toHaveBeenCalled();
  });
});

describe('student dashboard metric rules', () => {
  const now = new Date('2026-10-31T00:00:00.000Z');
  const task = (id: string, dueDate: string, status: 'TODO' | 'COMPLETED' = 'TODO') => ({
    id,
    title: `Task ${id}`,
    goal: 'Practice',
    expectedMinutes: 30,
    dueDate: new Date(dueDate),
    priority: 'MEDIUM' as const,
    status,
    completedAt: status === 'COMPLETED' ? now : null,
    topic,
  });

  it('treats dueDate equal to now as due for expected progress but neither near due nor overdue', () => {
    const tasks = [
      task('completed-now', now.toISOString(), 'COMPLETED'),
      task('overdue', '2026-10-30T23:59:59.999Z'),
      task('due-now', now.toISOString()),
      task('near-due-end', '2026-11-02T00:00:00.000Z'),
      task('after-near-due', '2026-11-02T00:00:00.001Z'),
      task('completed-future', '2026-11-01T00:00:00.000Z', 'COMPLETED'),
    ];

    expect(calculateProgress(tasks, now)).toEqual({
      completedTasks: 2,
      totalTasks: 6,
      completionPercentage: 33.33333333333333,
      actualProgress: 33.33333333333333,
      expectedProgress: 50,
      overdueTasks: 1,
      slowProgress: false,
      nearDueTasks: [expect.objectContaining({ id: 'near-due-end' })],
      overdueTaskItems: [expect.objectContaining({ id: 'overdue' })],
    });
  });

  it('uses a strict 20 percentage-point threshold on unrounded progress', () => {
    const allDue = Array.from({ length: 10 }, (_, index) => task(`due-${index}`, '2026-10-30T23:00:00.000Z'));
    const exactlyTwentyBehind = allDue.map((item, index) => index < 8 ? { ...item, status: 'COMPLETED' as const, completedAt: now } : item);
    const moreThanTwentyBehind = allDue.map((item, index) => index < 7 ? { ...item, status: 'COMPLETED' as const, completedAt: now } : item);

    expect(calculateProgress(exactlyTwentyBehind, now).slowProgress).toBe(false);
    expect(calculateProgress(moreThanTwentyBehind, now).slowProgress).toBe(true);
  });

  it('returns zero metrics for a current plan with no tasks', () => {
    expect(calculateProgress([], now)).toMatchObject({
      completedTasks: 0,
      totalTasks: 0,
      completionPercentage: 0,
      actualProgress: 0,
      expectedProgress: 0,
      overdueTasks: 0,
      slowProgress: false,
      nearDueTasks: [],
      overdueTaskItems: [],
    });
  });

  it.each([
    [0, 'PRIORITY'],
    [80, 'GOOD'],
    [79, 'NEEDS_REINFORCEMENT'],
    [60, 'NEEDS_REINFORCEMENT'],
    [59, 'PRIORITY'],
    [100, 'GOOD'],
  ] as const)('classifies score %s as %s', (score, classification) => {
    expect(classifyAssessmentScore(score)).toBe(classification);
  });

  it.each([-0.01, 100.01])('rejects score %s outside 0–100', (score) => {
    expect(() => classifyAssessmentScore(score)).toThrow();
  });
});
