import { Prisma, PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });
dotenv.config({ path: '../../.env.example' });

const prisma = new PrismaClient();
const ids = {
  user: '90000000-0000-4000-8000-000000000001',
  course: '90000000-0000-4000-8000-000000000002',
  topic: '90000000-0000-4000-8000-000000000003',
  assessmentOne: '90000000-0000-4000-8000-000000000004',
  assessmentTwo: '90000000-0000-4000-8000-000000000005',
  planOne: '90000000-0000-4000-8000-000000000006',
  planTwo: '90000000-0000-4000-8000-000000000007',
};

describe('baseline database invariants', () => {
  afterAll(async () => prisma.$disconnect());

  it('persists unbounded scores and enforces the current-plan partial unique index', async () => {
    const columns = await prisma.$queryRaw<Array<{ numeric_precision: number | null; numeric_scale: number | null }>>`
      SELECT numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'assessment_results' AND column_name = 'score'
    `;
    const indexes = await prisma.$queryRaw<Array<{ indexdef: string }>>`
      SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'uq_study_plans_one_current_per_student'
    `;
    const constraints = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) FROM pg_constraint WHERE conname IN (
        'ck_users_email_normalized', 'ck_assessment_results_score_range',
        'ck_temporary_contexts_status_replay', 'ck_temporary_contexts_retention'
      )
    `;

    expect(columns).toEqual([{ numeric_precision: null, numeric_scale: null }]);
    expect(indexes[0]?.indexdef).toContain("WHERE (status = ANY (ARRAY['ACTIVE'::\"StudyPlanStatus\", 'COMPLETED'::\"StudyPlanStatus\"]))");
    expect(constraints[0]?.count).toBe(4n);

    await prisma.assessmentResult.deleteMany({ where: { id: { in: [ids.assessmentOne, ids.assessmentTwo] } } });
    await prisma.studyPlan.deleteMany({ where: { id: { in: [ids.planOne, ids.planTwo] } } });
    await prisma.topic.deleteMany({ where: { id: ids.topic } });
    await prisma.course.deleteMany({ where: { id: ids.course } });
    await prisma.user.deleteMany({ where: { id: ids.user } });
    try {
      await prisma.user.create({ data: { id: ids.user, fullName: 'Integration Test', email: 'integration.test@example.test', passwordHash: 'test-only', role: 'STUDENT' } });
      await prisma.course.create({ data: { id: ids.course, name: 'Integration Test Course' } });
      await prisma.topic.create({ data: { id: ids.topic, courseId: ids.course, name: 'Integration Test Topic' } });
      await prisma.assessmentResult.createMany({ data: [
        { id: ids.assessmentOne, studentId: ids.user, topicId: ids.topic, score: new Prisma.Decimal('59.999'), evaluatedAt: new Date('2026-10-25T00:00:00Z') },
        { id: ids.assessmentTwo, studentId: ids.user, topicId: ids.topic, score: new Prisma.Decimal('79.999'), evaluatedAt: new Date('2026-10-26T00:00:00Z') },
      ] });
      const results = await prisma.assessmentResult.findMany({ where: { studentId: ids.user }, orderBy: { evaluatedAt: 'asc' } });
      expect(results.map(({ score }) => score.toString())).toEqual(['59.999', '79.999']);

      const plan = { studentId: ids.user, title: 'Valid plan', goal: 'Test current plan uniqueness', availableMinutesPerWeek: 60, startDate: new Date('2026-10-01T00:00:00Z'), endDate: new Date('2026-11-01T00:00:00Z') };
      await prisma.studyPlan.create({ data: { id: ids.planOne, ...plan, status: 'ACTIVE' } });
      await expect(prisma.studyPlan.create({ data: { id: ids.planTwo, ...plan, status: 'COMPLETED' } })).rejects.toMatchObject({ code: 'P2002' });
    } finally {
      await prisma.assessmentResult.deleteMany({ where: { id: { in: [ids.assessmentOne, ids.assessmentTwo] } } });
      await prisma.studyPlan.deleteMany({ where: { id: { in: [ids.planOne, ids.planTwo] } } });
      await prisma.topic.deleteMany({ where: { id: ids.topic } });
      await prisma.course.deleteMany({ where: { id: ids.course } });
      await prisma.user.deleteMany({ where: { id: ids.user } });
    }
  });
});
