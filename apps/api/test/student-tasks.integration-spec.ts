import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MVP_COURSE_ID } from '../src/common/mvp-course';
import { PrismaService } from '../src/prisma/prisma.service';

const ids = {
  student: '93000000-0000-4000-8000-000000000001',
  otherStudent: '93000000-0000-4000-8000-000000000002',
  administrator: '93000000-0000-4000-8000-000000000003',
  disabledStudent: '93000000-0000-4000-8000-000000000004',
  emptyStudent: '93000000-0000-4000-8000-000000000005',
  topic: '93000000-0000-4000-8000-000000000010',
  ownPlan: '93000000-0000-4000-8000-000000000020',
  otherPlan: '93000000-0000-4000-8000-000000000021',
  overdueTask: '93000000-0000-4000-8000-000000000030',
  nearDueTask: '93000000-0000-4000-8000-000000000031',
  dueNowTask: '93000000-0000-4000-8000-000000000032',
  otherTask: '93000000-0000-4000-8000-000000000033',
};

describe('Student tasks API (PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let studentToken: string;
  const now = new Date();
  const isoOffset = (milliseconds: number) => new Date(now.getTime() + milliseconds);

  async function token(userId: string) {
    return jwt.signAsync({ sub: userId }, { algorithm: 'HS256', expiresIn: '2h' });
  }

  function patchStatus(taskId: string, status: string, accessToken = studentToken) {
    return request(app.getHttpServer()).patch(`/api/v1/student/study-tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    studentToken = await token(ids.student);

    await prisma.studyTask.deleteMany({ where: { studyPlanId: { in: [ids.ownPlan, ids.otherPlan] } } });
    await prisma.studyPlan.deleteMany({ where: { id: { in: [ids.ownPlan, ids.otherPlan] } } });
    await prisma.topic.deleteMany({ where: { id: ids.topic } });
    await prisma.user.deleteMany({ where: { id: { in: [ids.student, ids.otherStudent, ids.administrator, ids.disabledStudent, ids.emptyStudent] } } });
    await prisma.user.createMany({ data: [
      { id: ids.student, fullName: 'Tasks Student', email: 'tasks.student@example.test', passwordHash: 'unused', role: 'STUDENT' },
      { id: ids.otherStudent, fullName: 'Other Tasks Student', email: 'tasks.other@example.test', passwordHash: 'unused', role: 'STUDENT' },
      { id: ids.administrator, fullName: 'Tasks Admin', email: 'tasks.admin@example.test', passwordHash: 'unused', role: 'ADMINISTRATOR' },
      { id: ids.disabledStudent, fullName: 'Disabled Tasks Student', email: 'tasks.disabled@example.test', passwordHash: 'unused', role: 'STUDENT', status: 'DISABLED' },
      { id: ids.emptyStudent, fullName: 'Empty Tasks Student', email: 'tasks.empty@example.test', passwordHash: 'unused', role: 'STUDENT' },
    ] });
    await prisma.topic.create({ data: { id: ids.topic, courseId: MVP_COURSE_ID, name: 'Task topic' } });
    await prisma.studyPlan.create({ data: {
      id: ids.ownPlan,
      studentId: ids.student,
      title: 'Student current plan',
      goal: 'Practice task management',
      availableMinutesPerWeek: 120,
      startDate: isoOffset(-10 * 86_400_000),
      endDate: isoOffset(30 * 86_400_000),
      tasks: { create: [
        { id: ids.overdueTask, topicId: ids.topic, title: 'Overdue task', goal: 'Review', expectedMinutes: 30, dueDate: isoOffset(-2 * 86_400_000), priority: 'HIGH' },
        { id: ids.nearDueTask, topicId: ids.topic, title: 'Near due task', goal: 'Practice', expectedMinutes: 45, dueDate: isoOffset(24 * 60 * 60_000), priority: 'MEDIUM' },
        { id: ids.dueNowTask, topicId: ids.topic, title: 'Future task', goal: 'Recall', expectedMinutes: 15, dueDate: isoOffset(3 * 86_400_000), priority: 'LOW' },
      ] },
    } });
    await prisma.studyPlan.create({ data: {
      id: ids.otherPlan,
      studentId: ids.otherStudent,
      title: 'Other plan',
      goal: 'Other goal',
      availableMinutesPerWeek: 60,
      startDate: isoOffset(-10 * 86_400_000),
      endDate: isoOffset(30 * 86_400_000),
      tasks: { create: [{
        id: ids.otherTask, topicId: ids.topic, title: 'Private task', goal: 'Private', expectedMinutes: 30,
        dueDate: isoOffset(86_400_000), priority: 'MEDIUM',
      }] },
    } });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.studyTask.deleteMany({ where: { studyPlanId: { in: [ids.ownPlan, ids.otherPlan] } } });
      await prisma.studyPlan.deleteMany({ where: { id: { in: [ids.ownPlan, ids.otherPlan] } } });
      await prisma.topic.deleteMany({ where: { id: ids.topic } });
      await prisma.user.deleteMany({ where: { id: { in: [ids.student, ids.otherStudent, ids.administrator, ids.disabledStudent, ids.emptyStudent] } } });
    }
    await app?.close();
  });

  beforeEach(async () => {
    await prisma.studyPlan.update({ where: { id: ids.ownPlan }, data: { status: 'ACTIVE', endDate: isoOffset(30 * 86_400_000) } });
    await prisma.studyTask.updateMany({ where: { studyPlanId: ids.ownPlan }, data: { status: 'TODO', completedAt: null } });
  });

  it('requires an active Student for listing and updates', async () => {
    await request(app.getHttpServer()).get('/api/v1/student/study-tasks').expect(401);
    await request(app.getHttpServer()).get('/api/v1/student/study-tasks')
      .set('Authorization', `Bearer ${await token(ids.administrator)}`).expect(403);
    await request(app.getHttpServer()).get('/api/v1/student/study-tasks')
      .set('Authorization', `Bearer ${await token(ids.disabledStudent)}`).expect(403);
    await request(app.getHttpServer()).patch(`/api/v1/student/study-tasks/${ids.overdueTask}/status`)
      .set('Authorization', `Bearer ${await token(ids.administrator)}`).send({ status: 'COMPLETED' }).expect(403);
    await request(app.getHttpServer()).patch(`/api/v1/student/study-tasks/${ids.overdueTask}/status`)
      .set('Authorization', `Bearer ${await token(ids.disabledStudent)}`).send({ status: 'COMPLETED' }).expect(403);
  });

  it('returns only own tasks for the current plan and returns empty current-plan values when none exists', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/student/study-tasks')
      .set('Authorization', `Bearer ${await token(ids.student)}`).expect(200);
    expect(response.body).toMatchObject({ planId: ids.ownPlan, planStatus: 'ACTIVE' });
    expect(response.body.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: ids.overdueTask, topic: { id: ids.topic, name: 'Task topic' }, expectedMinutes: 30, status: 'TODO' }),
      expect.objectContaining({ id: ids.nearDueTask, status: 'TODO' }),
      expect.objectContaining({ id: ids.dueNowTask, status: 'TODO' }),
    ]));
    expect(response.body.items).toHaveLength(3);
    expect(response.body.items[0]).not.toHaveProperty('studyPlanId');
    expect(response.body.items[0]).not.toHaveProperty('topicId');

    const empty = await request(app.getHttpServer()).get('/api/v1/student/study-tasks')
      .set('Authorization', `Bearer ${await token(ids.emptyStudent)}`).expect(200);
    expect(empty.body).toEqual({ planId: null, planStatus: null, items: [] });
  });

  it('validates the allowed statuses', async () => {
    const response = await patchStatus(ids.overdueTask, 'ARCHIVED');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(await prisma.studyTask.findUnique({ where: { id: ids.overdueTask } })).toMatchObject({ status: 'TODO', completedAt: null });
  });

  it('completes and undoes tasks while keeping status, completedAt, plan, and progress consistent', async () => {
    const completed = await patchStatus(ids.overdueTask, 'COMPLETED').expect(200);
    expect(completed.body).toMatchObject({
      task: { id: ids.overdueTask, status: 'COMPLETED', completedAt: expect.any(String) },
      planStatus: 'ACTIVE',
      progress: { completedTasks: 1, totalTasks: 3, overdueTasks: 0 },
    });
    expect(completed.body.task.completedAt).not.toBeNull();
    expect(completed.body.progress.actualProgress).toBeCloseTo(100 / 3);

    await patchStatus(ids.nearDueTask, 'COMPLETED').expect(200);
    const last = await patchStatus(ids.dueNowTask, 'COMPLETED').expect(200);
    expect(last.body.planStatus).toBe('COMPLETED');
    const completedList = await request(app.getHttpServer()).get('/api/v1/student/study-tasks')
      .set('Authorization', `Bearer ${studentToken}`).expect(200);
    expect(completedList.body.planStatus).toBe('COMPLETED');
    expect(completedList.body.items.every((item: { status: string }) => item.status === 'COMPLETED')).toBe(true);

    const undone = await patchStatus(ids.nearDueTask, 'TODO').expect(200);
    expect(undone.body).toMatchObject({
      task: { id: ids.nearDueTask, status: 'TODO', completedAt: null },
      planStatus: 'ACTIVE',
      progress: { completedTasks: 2, totalTasks: 3 },
    });
    expect(await prisma.studyTask.findUnique({ where: { id: ids.nearDueTask } })).toMatchObject({ status: 'TODO', completedAt: null });
    expect(await prisma.studyPlan.findUnique({ where: { id: ids.ownPlan } })).toMatchObject({ status: 'ACTIVE' });
  });

  it('keeps an expired plan ACTIVE with overdue TODO work', async () => {
    await prisma.studyPlan.update({ where: { id: ids.ownPlan }, data: { endDate: isoOffset(-86_400_000) } });
    const response = await request(app.getHttpServer()).get('/api/v1/student/study-tasks')
      .set('Authorization', `Bearer ${await token(ids.student)}`).expect(200);
    expect(response.body.planStatus).toBe('ACTIVE');
    expect(response.body.items).toContainEqual(expect.objectContaining({ id: ids.overdueTask, status: 'TODO' }));
  });

  it('rolls the task update back when the derived plan update fails', async () => {
    await prisma.studyTask.updateMany({
      where: { id: { in: [ids.nearDueTask, ids.dueNowTask] } },
      data: { status: 'COMPLETED', completedAt: now },
    });
    const originalTransaction = (prisma as any).$transaction.bind(prisma);
    const transactionSpy = jest.spyOn(prisma as any, '$transaction').mockImplementation(async (callback: any, options: any) => {
      return originalTransaction(async (tx: any) => {
        tx.studyPlan.update = async () => { throw new Error('forced plan update failure'); };
        return callback(tx);
      }, options);
    });

    try {
      const response = await patchStatus(ids.overdueTask, 'COMPLETED');
      expect(response.status).toBe(500);
      expect(response.body.code).toBe('DATABASE_FAILURE');
      expect(await prisma.studyTask.findUnique({ where: { id: ids.overdueTask } })).toMatchObject({ status: 'TODO', completedAt: null });
      expect(await prisma.studyPlan.findUnique({ where: { id: ids.ownPlan } })).toMatchObject({ status: 'ACTIVE' });
    } finally {
      transactionSpy.mockRestore();
    }
  });

  it('does not expose or update another Student task and rejects archived-plan updates', async () => {
    const foreign = await patchStatus(ids.otherTask, 'COMPLETED');
    expect(foreign.status).toBe(403);
    expect(foreign.body.code).toBe('FORBIDDEN_RESOURCE');
    expect(await prisma.studyTask.findUnique({ where: { id: ids.otherTask } })).toMatchObject({ status: 'TODO', completedAt: null });

    const missing = await patchStatus('93000000-0000-4000-8000-000000000099', 'COMPLETED');
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('RESOURCE_NOT_FOUND');

    await prisma.studyPlan.update({ where: { id: ids.ownPlan }, data: { status: 'ARCHIVED' } });
    const archived = await patchStatus(ids.overdueTask, 'COMPLETED');
    expect(archived.status).toBe(409);
    expect(archived.body.code).toBe('TASK_NOT_IN_CURRENT_PLAN');
    expect(await prisma.studyTask.findUnique({ where: { id: ids.overdueTask } })).toMatchObject({ status: 'TODO', completedAt: null });
    await request(app.getHttpServer()).get('/api/v1/student/study-tasks')
      .set('Authorization', `Bearer ${studentToken}`).expect(200).expect(({ body }) => {
        expect(body).toEqual({ planId: null, planStatus: null, items: [] });
      });
  });

  it('serializes concurrent completion of the last tasks and keeps task-plan state consistent', async () => {
    await prisma.studyTask.updateMany({ where: { studyPlanId: ids.ownPlan }, data: { status: 'COMPLETED', completedAt: now } });
    await prisma.studyPlan.update({ where: { id: ids.ownPlan }, data: { status: 'COMPLETED' } });
    await prisma.studyTask.updateMany({ where: { id: { in: [ids.overdueTask, ids.nearDueTask] } }, data: { status: 'TODO', completedAt: null } });
    await prisma.studyPlan.update({ where: { id: ids.ownPlan }, data: { status: 'ACTIVE' } });
    const [first, second] = await Promise.all([
      patchStatus(ids.overdueTask, 'COMPLETED'),
      patchStatus(ids.nearDueTask, 'COMPLETED'),
    ]);
    expect([first.status, second.status].every((status) => status === 200)).toBe(true);
    expect(await prisma.studyPlan.findUnique({ where: { id: ids.ownPlan } })).toMatchObject({ status: 'COMPLETED' });
    expect(await prisma.studyTask.count({ where: { studyPlanId: ids.ownPlan, status: 'TODO' } })).toBe(0);
  });
});
