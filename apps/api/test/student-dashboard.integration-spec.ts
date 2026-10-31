import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const ids = {
  student: '92000000-0000-4000-8000-000000000001',
  otherStudent: '92000000-0000-4000-8000-000000000002',
  administrator: '92000000-0000-4000-8000-000000000003',
  disabledStudent: '92000000-0000-4000-8000-000000000004',
  course: '92000000-0000-4000-8000-000000000010',
  topicAlgorithms: '92000000-0000-4000-8000-000000000011',
  topicDatabases: '92000000-0000-4000-8000-000000000012',
  plan: '92000000-0000-4000-8000-000000000020',
  taskOverdue: '92000000-0000-4000-8000-000000000021',
  taskNearDue: '92000000-0000-4000-8000-000000000022',
  taskCompleted: '92000000-0000-4000-8000-000000000023',
};

describe('Student dashboard API (PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  const now = new Date();

  async function token(userId: string) {
    return jwt.signAsync({ sub: userId }, { algorithm: 'HS256', expiresIn: '2h' });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);

    await prisma.studyTask.deleteMany({ where: { studyPlanId: ids.plan } });
    await prisma.studyPlan.deleteMany({ where: { id: ids.plan } });
    await prisma.assessmentResult.deleteMany({ where: { studentId: { in: [ids.student, ids.otherStudent] } } });
    await prisma.topic.deleteMany({ where: { id: { in: [ids.topicAlgorithms, ids.topicDatabases] } } });
    await prisma.course.deleteMany({ where: { id: ids.course } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.student, ids.otherStudent, ids.administrator, ids.disabledStudent] } } });

    await prisma.user.createMany({ data: [
      { id: ids.student, fullName: 'Dashboard Student', email: 'dashboard.student@example.test', passwordHash: 'unused', role: 'STUDENT' },
      { id: ids.otherStudent, fullName: 'Other Student', email: 'dashboard.other@example.test', passwordHash: 'unused', role: 'STUDENT' },
      { id: ids.administrator, fullName: 'Dashboard Admin', email: 'dashboard.admin@example.test', passwordHash: 'unused', role: 'ADMINISTRATOR' },
      { id: ids.disabledStudent, fullName: 'Disabled Student', email: 'dashboard.disabled@example.test', passwordHash: 'unused', role: 'STUDENT', status: 'DISABLED' },
    ] });
    await prisma.course.create({ data: {
      id: ids.course,
      name: 'Dashboard Test Course',
      topics: { create: [
        { id: ids.topicAlgorithms, name: 'Algorithms' },
        { id: ids.topicDatabases, name: 'Databases' },
      ] },
    } });
    await prisma.assessmentResult.createMany({ data: [
      { studentId: ids.student, topicId: ids.topicAlgorithms, score: 59, evaluatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
      { studentId: ids.student, topicId: ids.topicAlgorithms, score: 80, evaluatedAt: new Date(now.getTime() - 30 * 60 * 1000) },
      { studentId: ids.student, topicId: ids.topicDatabases, score: 60, evaluatedAt: new Date(now.getTime() - 15 * 60 * 1000) },
      { studentId: ids.otherStudent, topicId: ids.topicAlgorithms, score: 100, evaluatedAt: new Date(now.getTime() - 5 * 60 * 1000) },
    ] });
    await prisma.studyPlan.create({ data: {
      id: ids.plan,
      studentId: ids.student,
      title: 'Current plan',
      goal: 'Learn algorithms',
      availableMinutesPerWeek: 120,
      startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      tasks: { create: [
        { id: ids.taskOverdue, topicId: ids.topicAlgorithms, title: 'Overdue', goal: 'Review', expectedMinutes: 30, dueDate: new Date(now.getTime() - 60 * 60 * 1000), priority: 'HIGH' },
        { id: ids.taskNearDue, topicId: ids.topicDatabases, title: 'Near due', goal: 'Practice', expectedMinutes: 45, dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), priority: 'MEDIUM' },
        { id: ids.taskCompleted, topicId: ids.topicAlgorithms, title: 'Completed', goal: 'Recall', expectedMinutes: 30, dueDate: now, priority: 'LOW', status: 'COMPLETED', completedAt: now },
      ] },
    } });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.studyTask.deleteMany({ where: { studyPlanId: ids.plan } });
      await prisma.studyPlan.deleteMany({ where: { id: ids.plan } });
      await prisma.assessmentResult.deleteMany({ where: { studentId: { in: [ids.student, ids.otherStudent] } } });
      await prisma.topic.deleteMany({ where: { id: { in: [ids.topicAlgorithms, ids.topicDatabases] } } });
      await prisma.course.deleteMany({ where: { id: ids.course } });
      await prisma.user.deleteMany({ where: { id: { in: [ids.student, ids.otherStudent, ids.administrator, ids.disabledStudent] } } });
    }
    await app?.close();
  });

  it('requires an authenticated active Student and denies other roles', async () => {
    const unauthenticated = await request(app.getHttpServer()).get('/api/v1/student/dashboard').expect(401);
    expect(unauthenticated.body.code).toBe('AUTH_REQUIRED');

    const adminToken = await token(ids.administrator);
    const forbidden = await request(app.getHttpServer()).get('/api/v1/student/dashboard')
      .set('Authorization', `Bearer ${adminToken}`).expect(403);
    expect(forbidden.body.code).toBe('FORBIDDEN_RESOURCE');

    const disabledToken = await token(ids.disabledStudent);
    const disabled = await request(app.getHttpServer()).get('/api/v1/student/dashboard')
      .set('Authorization', `Bearer ${disabledToken}`).expect(403);
    expect(disabled.body.code).toBe('ACCOUNT_DISABLED');
  });

  it('returns latest own-topic results, complete task views, and backend metrics', async () => {
    const studentToken = await token(ids.student);
    const response = await request(app.getHttpServer()).get(`/api/v1/student/dashboard?studentId=${ids.otherStudent}`)
      .set('Authorization', `Bearer ${studentToken}`).expect(200);

    expect(response.body.assessmentResults).toEqual(expect.arrayContaining([
      { topic: { id: ids.topicAlgorithms, name: 'Algorithms' }, score: 80, classification: 'GOOD', evaluatedAt: expect.any(String) },
      { topic: { id: ids.topicDatabases, name: 'Databases' }, score: 60, classification: 'NEEDS_REINFORCEMENT', evaluatedAt: expect.any(String) },
    ]));
    expect(response.body.assessmentResults).toHaveLength(2);
    expect(response.body.currentPlan).toMatchObject({
      id: ids.plan,
      title: 'Current plan',
      goal: 'Learn algorithms',
      status: 'ACTIVE',
      startDate: expect.any(String),
      endDate: expect.any(String),
    });
    expect(response.body.progress).toMatchObject({
      completedTasks: 1,
      totalTasks: 3,
      overdueTasks: 1,
      slowProgress: true,
    });
    expect(response.body.progress.actualProgress).toBeCloseTo(100 / 3);
    expect(response.body.progress.expectedProgress).toBeCloseTo(200 / 3);
    expect(response.body.progress.completionPercentage).toBe(response.body.progress.actualProgress);
    expect(response.body.nearDueTasks).toEqual([{
      id: ids.taskNearDue,
      topic: { id: ids.topicDatabases, name: 'Databases' },
      title: 'Near due',
      goal: 'Practice',
      expectedMinutes: 45,
      dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      priority: 'MEDIUM',
      status: 'TODO',
      completedAt: null,
    }]);
    expect(response.body.overdueTaskItems).toEqual([{
      id: ids.taskOverdue,
      topic: { id: ids.topicAlgorithms, name: 'Algorithms' },
      title: 'Overdue',
      goal: 'Review',
      expectedMinutes: 30,
      dueDate: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      priority: 'HIGH',
      status: 'TODO',
      completedAt: null,
    }]);
    expect(JSON.stringify(response.body)).not.toContain('Other Student');
  });

  it('treats ACTIVE and COMPLETED plans as current but excludes ARCHIVED plans', async () => {
    const studentToken = await token(ids.student);
    await request(app.getHttpServer()).get('/api/v1/student/dashboard')
      .set('Authorization', `Bearer ${studentToken}`).expect(200).expect(({ body }) => expect(body.currentPlan.status).toBe('ACTIVE'));

    await prisma.studyTask.updateMany({ where: { studyPlanId: ids.plan }, data: { status: 'COMPLETED', completedAt: now } });
    await prisma.studyPlan.update({ where: { id: ids.plan }, data: { status: 'COMPLETED' } });
    await request(app.getHttpServer()).get('/api/v1/student/dashboard')
      .set('Authorization', `Bearer ${studentToken}`).expect(200).expect(({ body }) => expect(body.currentPlan.status).toBe('COMPLETED'));

    await prisma.studyPlan.update({ where: { id: ids.plan }, data: { status: 'ARCHIVED' } });
    await request(app.getHttpServer()).get('/api/v1/student/dashboard')
      .set('Authorization', `Bearer ${studentToken}`).expect(200).expect(({ body }) => {
        expect(body.currentPlan).toBeNull();
        expect(body.progress).toBeNull();
        expect(body.assessmentResults).toHaveLength(2);
      });
  });
});
