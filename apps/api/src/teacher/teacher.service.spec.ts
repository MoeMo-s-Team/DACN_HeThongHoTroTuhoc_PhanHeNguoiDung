import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/auth.service';
import { TeacherService } from './teacher.service';

const teacher: AuthUser = {
  id: '95000000-0000-4000-8000-000000000001',
  fullName: 'Teacher A',
  email: 'teacher.a@example.test',
  role: 'TEACHER',
  status: 'ACTIVE',
};

const otherTeacherId = '95000000-0000-4000-8000-000000000002';
const validClassId = '95000000-0000-4000-8000-000000000010';
const validStudentId = '95000000-0000-4000-8000-000000000020';

describe('TeacherService', () => {
  const classModel = { findUnique: jest.fn(), findMany: jest.fn() };
  const classMember = { findMany: jest.fn(), findUnique: jest.fn() };
  const assessmentResult = { findMany: jest.fn() };
  const studyPlan = { findMany: jest.fn(), findFirst: jest.fn() };

  const prisma = {
    class: classModel,
    classMember,
    assessmentResult,
    studyPlan,
  };

  let service: TeacherService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new TeacherService(prisma as unknown as PrismaService);
  });

  describe('Authorization & Class Validation', () => {
    it('rejects Student and Administrator roles with FORBIDDEN_RESOURCE', async () => {
      for (const role of ['STUDENT', 'ADMINISTRATOR'] as const) {
        const otherUser = { ...teacher, role };
        await expect(service.getClasses(otherUser)).rejects.toMatchObject({
          response: { code: 'FORBIDDEN_RESOURCE' },
        });
        await expect(service.getDashboard(otherUser, validClassId)).rejects.toMatchObject({
          response: { code: 'FORBIDDEN_RESOURCE' },
        });
        await expect(service.getStudents(otherUser, validClassId)).rejects.toMatchObject({
          response: { code: 'FORBIDDEN_RESOURCE' },
        });
      }
    });

    it('rejects invalid or unresolvable class IDs with RESOURCE_NOT_FOUND', async () => {
      await expect(service.getDashboard(teacher, 'not-a-uuid')).rejects.toMatchObject({
        response: { code: 'RESOURCE_NOT_FOUND' },
      });
    });

    it('throws RESOURCE_NOT_FOUND when class does not exist', async () => {
      classModel.findUnique.mockResolvedValue(null);
      await expect(service.getDashboard(teacher, validClassId)).rejects.toMatchObject({
        response: { code: 'RESOURCE_NOT_FOUND' },
      });
    });

    it('throws FORBIDDEN_RESOURCE when class belongs to another teacher (BR-002)', async () => {
      classModel.findUnique.mockResolvedValue({
        id: validClassId,
        name: 'Class of Other Teacher',
        teacherId: otherTeacherId,
      });

      await expect(service.getDashboard(teacher, validClassId)).rejects.toMatchObject({
        response: { code: 'FORBIDDEN_RESOURCE' },
      });
    });
  });

  describe('getClasses', () => {
    it('returns only classes taught by the current teacher', async () => {
      classModel.findMany.mockResolvedValue([
        { id: validClassId, name: 'SE-K46' },
      ]);

      const result = await service.getClasses(teacher);
      expect(result).toEqual({
        items: [{ id: validClassId, name: 'SE-K46' }],
      });
      expect(classModel.findMany).toHaveBeenCalledWith({
        where: { teacherId: teacher.id },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getDashboard', () => {
    it('handles empty class gracefully with null averages and 0 counts', async () => {
      classModel.findUnique.mockResolvedValue({
        id: validClassId,
        name: 'Empty Class',
        teacherId: teacher.id,
      });
      classMember.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(teacher, validClassId);
      expect(result).toEqual({
        class: { id: validClassId, name: 'Empty Class' },
        studentCount: 0,
        classAverageScore: null,
        topicAverageScores: [],
        classCompletionRate: null,
        overdueTaskCount: 0,
        needsAttentionStudents: [],
        progressWarnings: [],
      });
    });

    it('computes class metrics and evaluates FR-TEA-004 rules correctly', async () => {
      classModel.findUnique.mockResolvedValue({
        id: validClassId,
        name: 'SE-K46',
        teacherId: teacher.id,
      });

      const s1 = '95000000-0000-4000-8000-000000000021';
      const s2 = '95000000-0000-4000-8000-000000000022';
      classMember.findMany.mockResolvedValue([
        { studentId: s1, student: { id: s1, fullName: 'Student One' } },
        { studentId: s2, student: { id: s2, fullName: 'Student Two' } },
      ]);

      const topic1 = { id: '95000000-0000-4000-8000-000000000031', name: 'Topic A' };
      const topic2 = { id: '95000000-0000-4000-8000-000000000032', name: 'Topic B' };

      // s1 has 50 on topic1 (weak) and 60 on topic2 (avg: 55 -> below 60!)
      // s2 has 70 on topic1 and 90 on topic2 (avg: 80)
      assessmentResult.findMany.mockResolvedValue([
        { studentId: s1, topicId: topic1.id, score: 50, topic: topic1, evaluatedAt: new Date('2026-11-01') },
        { studentId: s1, topicId: topic2.id, score: 60, topic: topic2, evaluatedAt: new Date('2026-11-01') },
        { studentId: s2, topicId: topic1.id, score: 70, topic: topic1, evaluatedAt: new Date('2026-11-01') },
        { studentId: s2, topicId: topic2.id, score: 90, topic: topic2, evaluatedAt: new Date('2026-11-01') },
      ]);

      const now = new Date('2026-11-12T00:00:00Z');
      const pastDue = new Date('2026-11-10T00:00:00Z');
      const futureDue = new Date('2026-11-15T00:00:00Z');

      studyPlan.findMany.mockResolvedValue([
        {
          studentId: s1,
          tasks: [
            { status: 'TODO', dueDate: pastDue },
            { status: 'TODO', dueDate: pastDue }, // 2 overdue tasks -> trigger OVERDUE_TASKS_AT_LEAST_2!
            { status: 'TODO', dueDate: futureDue },
            { status: 'COMPLETED', dueDate: pastDue }, // 1 completed out of 4 = 25% < 50% -> trigger COMPLETION_RATE_BELOW_50!
          ],
        },
        {
          studentId: s2,
          tasks: [
            { status: 'COMPLETED', dueDate: pastDue },
            { status: 'COMPLETED', dueDate: futureDue }, // 2 completed out of 2 = 100%
          ],
        },
      ]);

      const result = await service.getDashboard(teacher, validClassId, now);

      expect(result.studentCount).toBe(2);
      // All latest scores: 50, 60, 70, 90. Avg = 270 / 4 = 67.5
      expect(result.classAverageScore).toBe(67.5);

      // Topic A: (50 + 70)/2 = 60 (not < 60)
      // Topic B: (60 + 90)/2 = 75 (not < 60)
      expect(result.topicAverageScores).toEqual([
        { topic: topic1, averageScore: 60, weakTopic: false },
        { topic: topic2, averageScore: 75, weakTopic: false },
      ]);

      // Total tasks: 4 (s1) + 2 (s2) = 6. Completed: 1 (s1) + 2 (s2) = 3. Rate = 50%
      expect(result.classCompletionRate).toBe(50);
      expect(result.overdueTaskCount).toBe(2);

      // Student One should be in needsAttention with reasons
      expect(result.needsAttentionStudents).toEqual([
        {
          studentId: s1,
          fullName: 'Student One',
          reasons: ['AVERAGE_SCORE_BELOW_60', 'COMPLETION_RATE_BELOW_50', 'OVERDUE_TASKS_AT_LEAST_2'],
        },
      ]);
    });
  });

  describe('getStudentDetail', () => {
    it('throws RESOURCE_NOT_FOUND when student is not in the class', async () => {
      classModel.findUnique.mockResolvedValue({
        id: validClassId,
        name: 'Class A',
        teacherId: teacher.id,
      });
      classMember.findUnique.mockResolvedValue(null);

      await expect(service.getStudentDetail(teacher, validClassId, validStudentId)).rejects.toMatchObject({
        response: { code: 'RESOURCE_NOT_FOUND' },
      });
    });

    it('returns student detail with latest topic scores and read-only metrics', async () => {
      classModel.findUnique.mockResolvedValue({
        id: validClassId,
        name: 'Class A',
        teacherId: teacher.id,
      });
      classMember.findUnique.mockResolvedValue({
        classId: validClassId,
        studentId: validStudentId,
        student: { id: validStudentId, fullName: 'Student One' },
      });

      const topic1 = { id: '95000000-0000-4000-8000-000000000031', name: 'Topic A' };
      assessmentResult.findMany.mockResolvedValue([
        { topicId: topic1.id, score: 85, topic: topic1, evaluatedAt: new Date('2026-11-10') },
      ]);

      studyPlan.findFirst.mockResolvedValue({
        studentId: validStudentId,
        tasks: [
          { status: 'COMPLETED', dueDate: new Date('2026-11-05') },
        ],
      });

      const result = await service.getStudentDetail(teacher, validClassId, validStudentId);
      expect(result.student).toEqual({ id: validStudentId, fullName: 'Student One' });
      expect(result.assessmentResults).toEqual([
        {
          topic: topic1,
          score: 85,
          classification: 'GOOD',
          evaluatedAt: expect.any(Date),
        },
      ]);
      expect(result.metrics.averageScore).toBe(85);
      expect(result.metrics.completionRate).toBe(100);
      expect(result.metrics.overdueTaskCount).toBe(0);
    });
  });
});
