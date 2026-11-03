import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { MVP_COURSE_ID } from '../src/common/mvp-course';
import { requireTestDatabaseUrl } from '../prisma/test-database-url';

const ids = {
  studentOne: '10000000-0000-4000-8000-000000000001',
  studentTwo: '10000000-0000-4000-8000-000000000002',
  teacher: '10000000-0000-4000-8000-000000000003',
  admin: '10000000-0000-4000-8000-000000000004',
  disabled: '10000000-0000-4000-8000-000000000005',
  newTeacher: '10000000-0000-4000-8000-000000000014',
  students: Array.from({ length: 8 }, (_, index) => `10000000-0000-4000-8000-${String(index + 6).padStart(12, '0')}`),
  classOne: '30000000-0000-4000-8000-000000000001',
  classTwo: '30000000-0000-4000-8000-000000000002',
  classThree: '30000000-0000-4000-8000-000000000003',
  activePlan: '40000000-0000-4000-8000-000000000001',
  dataStructures: '20000000-0000-4000-8000-000000000005',
  algorithms: '20000000-0000-4000-8000-000000000002',
} as const;

type Snapshot = Record<string, Record<string, string>>;

function run(command: string, args: string[], databaseUrl: string) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
  return { status: result.status, error: result.error?.message, output: `${result.stdout ?? ''}${result.stderr ?? ''}`.slice(-1200) };
}

async function withIsolatedDatabase<T>(test: (prisma: PrismaClient, databaseUrl: string) => Promise<T>): Promise<T> {
  const baseUrl = requireTestDatabaseUrl();
  const schema = `seed_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new PrismaClient({ datasourceUrl: baseUrl });
  const schemaUrl = new URL(baseUrl);
  schemaUrl.searchParams.set('schema', schema);
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);

  try {
    const migration = run('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], schemaUrl.toString());
    if (migration.status !== 0) throw new Error(`Temporary schema migration failed: ${migration.error ?? migration.status}`);
    const prisma = new PrismaClient({ datasourceUrl: schemaUrl.toString() });
    try {
      return await test(prisma, schemaUrl.toString());
    } finally {
      await prisma.$disconnect();
    }
  } finally {
    await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
  }
}

async function snapshot(prisma: PrismaClient): Promise<Snapshot> {
  const [users, courses, topics, classes, members, results, plans, tasks, feedback] = await Promise.all([
    prisma.user.findMany({ orderBy: { id: 'asc' } }),
    prisma.course.findMany({ orderBy: { id: 'asc' } }),
    prisma.topic.findMany({ orderBy: { id: 'asc' } }),
    prisma.class.findMany({ orderBy: { id: 'asc' } }),
    prisma.classMember.findMany({ orderBy: [{ classId: 'asc' }, { studentId: 'asc' }] }),
    prisma.assessmentResult.findMany({ orderBy: { id: 'asc' } }),
    prisma.studyPlan.findMany({ orderBy: { id: 'asc' } }),
    prisma.studyTask.findMany({ orderBy: { id: 'asc' } }),
    prisma.feedback.findMany({ orderBy: { id: 'asc' } }),
  ]);
  const keyedRows = (rows: Array<{ id?: string; classId?: string; studentId?: string } & object>) => Object.fromEntries(
    rows.map((row) => {
      const key = 'id' in row ? row.id : `${row.classId}:${row.studentId}`;
      return [key, createHash('sha256').update(JSON.stringify(row)).digest('hex')];
    }),
  );
  return {
    users: keyedRows(users),
    courses: keyedRows(courses),
    topics: keyedRows(topics),
    classes: keyedRows(classes),
    members: keyedRows(members),
    results: keyedRows(results),
    plans: keyedRows(plans),
    tasks: keyedRows(tasks),
    feedback: keyedRows(feedback),
  };
}

async function createExistingDemoRows(prisma: PrismaClient) {
  const now = new Date();
  await prisma.user.createMany({ data: [
    { id: ids.studentOne, fullName: 'Preserved Student One', email: 'student.one@example.test', passwordHash: 'sentinel-hash-1', role: 'STUDENT' },
    { id: ids.studentTwo, fullName: 'Preserved Student Two', email: 'student.two@example.test', passwordHash: 'sentinel-hash-2', role: 'STUDENT' },
    { id: ids.teacher, fullName: 'Preserved Teacher', email: 'teacher@example.test', passwordHash: 'sentinel-hash-3', role: 'TEACHER' },
    { id: ids.admin, fullName: 'Preserved Admin', email: 'admin@example.test', passwordHash: 'sentinel-hash-4', role: 'ADMINISTRATOR' },
    { id: ids.disabled, fullName: 'Preserved Disabled', email: 'disabled.student@example.test', passwordHash: 'sentinel-hash-5', role: 'STUDENT', status: 'DISABLED' },
  ] });
  await prisma.course.create({ data: { id: MVP_COURSE_ID, name: 'Preserved Course', description: 'sentinel' } });
  const topics = [
    [ids.algorithms, 'Algorithms'],
    ['20000000-0000-4000-8000-000000000003', 'Databases'],
    ['20000000-0000-4000-8000-000000000004', 'Networking'],
    [ids.dataStructures, 'Cấu trúc dữ liệu'],
    ['20000000-0000-4000-8000-000000000006', 'JavaScript'],
    ['20000000-0000-4000-8000-000000000007', 'Database'],
    ['20000000-0000-4000-8000-000000000008', 'Testing'],
    ['20000000-0000-4000-8000-000000000009', 'API'],
    ['20000000-0000-4000-8000-000000000010', 'Git'],
  ] as const;
  await prisma.topic.createMany({ data: topics.map(([id, name]) => ({ id, courseId: MVP_COURSE_ID, name })) });
  await prisma.class.createMany({ data: [
    { id: ids.classOne, name: 'Preserved Class A', teacherId: ids.teacher },
    { id: ids.classTwo, name: 'Preserved Class B', teacherId: ids.teacher },
  ] });
  await prisma.classMember.createMany({ data: [
    { classId: ids.classOne, studentId: ids.studentOne },
    { classId: ids.classOne, studentId: ids.studentTwo },
    { classId: ids.classTwo, studentId: ids.studentOne },
  ] });
  await prisma.assessmentResult.create({ data: {
    id: '50000000-0000-4000-8000-000000000001', studentId: ids.studentOne, topicId: ids.dataStructures,
    score: 41, evaluatedAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000),
  } });
  await prisma.studyPlan.createMany({ data: [
    { id: ids.activePlan, studentId: ids.studentOne, title: 'Preserved active plan', goal: 'sentinel',
      availableMinutesPerWeek: 99, startDate: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000), status: 'ACTIVE' },
    { id: '40000000-0000-4000-8000-000000000002', studentId: ids.studentTwo, title: 'Preserved completed plan', goal: 'sentinel',
      availableMinutesPerWeek: 99, startDate: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000), status: 'COMPLETED' },
  ] });
  await prisma.studyTask.create({ data: {
    id: '60000000-0000-4000-8000-000000000001', studyPlanId: ids.activePlan, topicId: ids.algorithms,
    title: 'Preserved task', goal: 'sentinel', expectedMinutes: 99, dueDate: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    priority: 'LOW', status: 'COMPLETED', completedAt: now,
  } });
  await prisma.feedback.create({ data: {
    id: '70000000-0000-4000-8000-000000000001', userId: ids.studentOne, tag: 'UI_UX', rating: 5, content: 'sentinel',
  } });
}

async function verifyScenarios(prisma: PrismaClient) {
  const activeStudents = await prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } });
  const teachers = await prisma.user.count({ where: { role: 'TEACHER' } });
  const classes = await prisma.class.count();
  expect(activeStudents).toBe(10);
  expect(teachers).toBe(2);
  expect(classes).toBe(3);

  const newStudentIds = ids.students;
  const results = await prisma.assessmentResult.findMany({
    where: { studentId: { in: [ids.studentOne, ids.studentTwo, ...newStudentIds] }, topic: { courseId: MVP_COURSE_ID } },
    orderBy: { evaluatedAt: 'desc' },
    select: { studentId: true, topicId: true, score: true },
  });
  const latest = new Map<string, { studentId: string; topicId: string; score: number }>();
  for (const result of results) {
    const key = `${result.studentId}:${result.topicId}`;
    if (!latest.has(key)) latest.set(key, { ...result, score: Number(result.score) });
  }

  const classMembers = await prisma.classMember.findMany({
    where: { classId: { in: [ids.classOne, ids.classTwo, ids.classThree] } },
  });
  const topicAverages = (classId: string) => {
    const memberIds = new Set(classMembers.filter((member) => member.classId === classId).map((member) => member.studentId));
    const byTopic = new Map<string, number[]>();
    for (const result of latest.values()) {
      if (!memberIds.has(result.studentId)) continue;
      byTopic.set(result.topicId, [...(byTopic.get(result.topicId) ?? []), result.score]);
    }
    return [...byTopic.values()].map((scores) => scores.reduce((sum, score) => sum + score, 0) / scores.length);
  };
  expect(topicAverages(ids.classOne).every((average) => average >= 60)).toBe(true);
  expect(topicAverages(ids.classTwo).some((average) => average < 60)).toBe(true);

  const studentSevenId = newStudentIds[4];
  const studentSevenScores = [...latest.values()].filter((result) => result.studentId === studentSevenId).map((result) => result.score);
  expect(studentSevenScores.length).toBeGreaterThan(0);
  expect(studentSevenScores.reduce((sum, score) => sum + score, 0) / studentSevenScores.length).toBeLessThan(60);
  const currentPlan = await prisma.studyPlan.findFirst({
    where: { studentId: studentSevenId, status: { in: ['ACTIVE', 'COMPLETED'] } },
    include: { tasks: true },
  });
  expect(currentPlan).not.toBeNull();
  const tasks = currentPlan!.tasks;
  const now = new Date();
  const completed = tasks.filter((task) => task.status === 'COMPLETED').length;
  const actualProgress = completed / tasks.length * 100;
  const dueByNow = tasks.filter((task) => task.dueDate <= now).length;
  const expectedProgress = dueByNow / tasks.length * 100;
  expect(tasks.filter((task) => task.status === 'TODO' && task.dueDate < now).length).toBeGreaterThanOrEqual(2);
  expect(tasks.some((task) => task.status === 'TODO' && task.dueDate > now && task.dueDate <= new Date(now.getTime() + 48 * 60 * 60 * 1000))).toBe(true);
  expect(actualProgress).toBeLessThan(expectedProgress - 20);

  const classThreeStudents = classMembers.filter((member) => member.classId === ids.classThree).map((member) => member.studentId);
  expect(classThreeStudents).toEqual(newStudentIds.slice(6));
  expect(await prisma.assessmentResult.count({ where: { studentId: { in: classThreeStudents } } })).toBe(0);
  expect(await prisma.studyPlan.count({ where: { studentId: { in: classThreeStudents }, status: { in: ['ACTIVE', 'COMPLETED'] }, tasks: { some: {} } } })).toBe(0);

  const historyCounts = await prisma.assessmentResult.groupBy({ by: ['studentId', 'topicId'], where: { studentId: { in: newStudentIds.slice(0, 6) } }, _count: { _all: true } });
  expect(historyCounts.every(({ _count }) => _count._all >= 2 && _count._all <= 4)).toBe(true);
}

describe('development seed (PostgreSQL)', () => {
  jest.setTimeout(120_000);

  it('preserves existing rows and is idempotent across two runs', async () => {
    await withIsolatedDatabase(async (prisma, databaseUrl) => {
      await createExistingDemoRows(prisma);
      const before = await snapshot(prisma);
      const firstRun = run('pnpm', ['exec', 'tsx', 'prisma/seed.ts'], databaseUrl);
      expect(firstRun.error).toBeUndefined();
      if (firstRun.status !== 0) throw new Error(`First seed run failed: ${firstRun.output}`);
      expect(firstRun.status).toBe(0);
      const afterFirstRun = await snapshot(prisma);
      for (const [table, rows] of Object.entries(before)) {
        for (const [key, digest] of Object.entries(rows)) expect(afterFirstRun[table][key]).toBe(digest);
      }
      await verifyScenarios(prisma);

      const secondRun = run('pnpm', ['exec', 'tsx', 'prisma/seed.ts'], databaseUrl);
      expect(secondRun.error).toBeUndefined();
      if (secondRun.status !== 0) throw new Error(`Second seed run failed: ${secondRun.output}`);
      expect(secondRun.status).toBe(0);
      expect(await snapshot(prisma)).toEqual(afterFirstRun);
    });
  });

  it('rejects fixed user ID or email conflicts before inserting other fixtures', async () => {
    await withIsolatedDatabase(async (prisma, databaseUrl) => {
      await prisma.user.createMany({ data: [
        { id: ids.students[0], fullName: 'Conflicting ID', email: 'conflict.id@example.test', passwordHash: 'sentinel', role: 'STUDENT' },
        { id: '10000000-0000-4000-8000-000000000099', fullName: 'Conflicting email', email: 'student.04@example.test', passwordHash: 'sentinel', role: 'STUDENT' },
      ] });
      const failedRun = run('pnpm', ['exec', 'tsx', 'prisma/seed.ts'], databaseUrl);
      expect(failedRun.error).toBeUndefined();
      expect(failedRun.status).not.toBe(0);
      expect(await prisma.user.count()).toBe(2);
      expect(await prisma.course.count()).toBe(0);
      expect(await prisma.class.count()).toBe(0);
      expect(await prisma.assessmentResult.count()).toBe(0);
    });
  });

  it('rejects an existing Class C member with results before inserting fixtures', async () => {
    await withIsolatedDatabase(async (prisma, databaseUrl) => {
      const extraStudentId = '10000000-0000-4000-8000-000000000099';
      await prisma.user.createMany({ data: [
        { id: ids.newTeacher, fullName: 'Teacher Two', email: 'teacher.two@example.test', passwordHash: 'sentinel', role: 'TEACHER' },
        { id: extraStudentId, fullName: 'Existing Class C Student', email: 'extra.class.c@example.test', passwordHash: 'sentinel', role: 'STUDENT' },
      ] });
      await prisma.course.create({ data: { id: MVP_COURSE_ID, name: 'Existing Course' } });
      await prisma.topic.create({ data: { id: ids.dataStructures, courseId: MVP_COURSE_ID, name: 'Cấu trúc dữ liệu' } });
      await prisma.class.create({ data: { id: ids.classThree, name: 'Existing Class C', teacherId: ids.newTeacher } });
      await prisma.classMember.create({ data: { classId: ids.classThree, studentId: extraStudentId } });
      await prisma.assessmentResult.create({ data: {
        id: '80000000-0000-4000-8000-000000000001', studentId: extraStudentId, topicId: ids.dataStructures,
        score: 45, evaluatedAt: new Date(),
      } });
      const failedRun = run('pnpm', ['exec', 'tsx', 'prisma/seed.ts'], databaseUrl);
      expect(failedRun.error).toBeUndefined();
      expect(failedRun.status).not.toBe(0);
      expect(await prisma.user.count()).toBe(2);
      expect(await prisma.class.count()).toBe(1);
      expect(await prisma.classMember.count()).toBe(1);
      expect(await prisma.assessmentResult.count()).toBe(1);
    });
  });

  it.each(['COMPLETED', 'ARCHIVED'] as const)('rejects a %s fixture plan that would receive missing TODO tasks', async (status) => {
    await withIsolatedDatabase(async (prisma, databaseUrl) => {
      const studentId = ids.students[0];
      const now = new Date();
      await prisma.user.create({ data: {
        id: studentId, fullName: 'Existing Student 03', email: 'student.03@example.test',
        passwordHash: 'sentinel', role: 'STUDENT',
      } });
      await prisma.studyPlan.create({ data: {
        id: '40000000-0000-4000-8000-000000000003', studentId, title: 'Completed existing plan', goal: 'sentinel',
        availableMinutesPerWeek: 120, startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), status,
      } });

      const failedRun = run('pnpm', ['exec', 'tsx', 'prisma/seed.ts'], databaseUrl);
      expect(failedRun.error).toBeUndefined();
      expect(failedRun.status).not.toBe(0);
      expect(await prisma.user.count()).toBe(1);
      expect(await prisma.studyPlan.count()).toBe(1);
      expect(await prisma.studyTask.count()).toBe(0);
    });
  });

  it('resumes Student 7 progress checks when only part of the task fixture exists', async () => {
    await withIsolatedDatabase(async (prisma, databaseUrl) => {
      const studentId = ids.students[4];
      const planId = '40000000-0000-4000-8000-000000000007';
      const now = new Date();
      await prisma.user.create({ data: {
        id: studentId, fullName: 'Existing Student 07', email: 'student.07@example.test',
        passwordHash: 'sentinel', role: 'STUDENT',
      } });
      await prisma.studyPlan.create({ data: {
        id: planId, studentId, title: 'Existing recovery plan', goal: 'sentinel',
        availableMinutesPerWeek: 240, startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), status: 'ACTIVE',
      } });
      await prisma.course.create({ data: { id: MVP_COURSE_ID, name: 'Existing Course' } });
      await prisma.topic.createMany({ data: [
        { id: '20000000-0000-4000-8000-000000000005', courseId: MVP_COURSE_ID, name: 'Cấu trúc dữ liệu' },
        { id: '20000000-0000-4000-8000-000000000006', courseId: MVP_COURSE_ID, name: 'JavaScript' },
      ] });
      await prisma.studyTask.createMany({ data: [
        { id: '60000000-0000-4000-8000-000000000018', studyPlanId: planId, topicId: '20000000-0000-4000-8000-000000000005',
          title: 'Existing completed task 1', goal: 'sentinel', expectedMinutes: 30, dueDate: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000),
          priority: 'HIGH', status: 'COMPLETED', completedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) },
        { id: '60000000-0000-4000-8000-000000000019', studyPlanId: planId, topicId: '20000000-0000-4000-8000-000000000006',
          title: 'Existing completed task 2', goal: 'sentinel', expectedMinutes: 45, dueDate: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
          priority: 'MEDIUM', status: 'COMPLETED', completedAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000) },
      ] });

      const seedRun = run('pnpm', ['exec', 'tsx', 'prisma/seed.ts'], databaseUrl);
      expect(seedRun.error).toBeUndefined();
      if (seedRun.status !== 0) throw new Error(`Partial seed recovery failed: ${seedRun.output}`);
      expect(seedRun.status).toBe(0);
      expect(await prisma.studyTask.count({ where: { studyPlanId: planId } })).toBe(7);
      await verifyScenarios(prisma);
    });
  });
});
