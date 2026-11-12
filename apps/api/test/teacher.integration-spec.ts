import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const ids = {
  teacher1: '81000000-0000-4000-8000-000000000001',
  teacher2: '81000000-0000-4000-8000-000000000002',
  student1: '81000000-0000-4000-8000-000000000003',
  student2: '81000000-0000-4000-8000-000000000004',
  otherStudent: '81000000-0000-4000-8000-000000000005',
  course1: '82000000-0000-4000-8000-000000000001',
  class1: '83000000-0000-4000-8000-000000000001',
  class2: '83000000-0000-4000-8000-000000000002',
  topic1: '84000000-0000-4000-8000-000000000001',
  studyPlan1: '85000000-0000-4000-8000-000000000001',
  report1: '86000000-0000-4000-8000-000000000001',
};

describe('Teacher Phase 1 API (PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let teacher1Token: string;
  let teacher2Token: string;
  let studentToken: string;

  function token(id: string) {
    return jwt.signAsync({ sub: id }, { algorithm: 'HS256', expiresIn: '2h' });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);

    // Clean up any test records
    await prisma.classAnalysisReport.deleteMany({ where: { id: ids.report1 } });
    await prisma.studyTask.deleteMany({ where: { studyPlanId: ids.studyPlan1 } });
    await prisma.studyPlan.deleteMany({ where: { id: ids.studyPlan1 } });
    await prisma.assessmentResult.deleteMany({ where: { studentId: { in: [ids.student1, ids.student2, ids.otherStudent] } } });
    await prisma.classMember.deleteMany({ where: { classId: { in: [ids.class1, ids.class2] } } });
    await prisma.class.deleteMany({ where: { id: { in: [ids.class1, ids.class2] } } });
    await prisma.topic.deleteMany({ where: { id: ids.topic1 } });
    await prisma.course.deleteMany({ where: { id: ids.course1 } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(ids).slice(0, 5) } } });

    // Seed test users
    await prisma.user.createMany({
      data: [
        { id: ids.teacher1, fullName: 'Teacher One', email: 'teacher1.test@example.test', role: 'TEACHER', passwordHash: 'unused' },
        { id: ids.teacher2, fullName: 'Teacher Two', email: 'teacher2.test@example.test', role: 'TEACHER', passwordHash: 'unused' },
        { id: ids.student1, fullName: 'Student One', email: 'student1.test@example.test', role: 'STUDENT', passwordHash: 'unused' },
        { id: ids.student2, fullName: 'Student Two', email: 'student2.test@example.test', role: 'STUDENT', passwordHash: 'unused' },
        { id: ids.otherStudent, fullName: 'Other Student', email: 'otherstudent.test@example.test', role: 'STUDENT', passwordHash: 'unused' },
      ],
    });

    // Seed course & topic
    await prisma.course.create({
      data: { id: ids.course1, name: 'Toán Cao Cấp' },
    });
    await prisma.topic.create({
      data: { id: ids.topic1, courseId: ids.course1, name: 'Toán Rời Rạc' },
    });

    // Seed classes
    await prisma.class.createMany({
      data: [
        { id: ids.class1, name: 'Lớp Kiểm Thử 1', teacherId: ids.teacher1 },
        { id: ids.class2, name: 'Lớp Kiểm Thử 2', teacherId: ids.teacher2 },
      ],
    });

    // Enroll students in Class 1
    await prisma.classMember.createMany({
      data: [
        { classId: ids.class1, studentId: ids.student1 },
        { classId: ids.class1, studentId: ids.student2 },
      ],
    });

    // Assessment result for student1 on topic1 (score = 55 -> weak topic & needs attention)
    await prisma.assessmentResult.create({
      data: {
        studentId: ids.student1,
        topicId: ids.topic1,
        score: 55,
        evaluatedAt: new Date(),
      },
    });

    // Study plan and overdue tasks for student1
    await prisma.studyPlan.create({
      data: {
        id: ids.studyPlan1,
        studentId: ids.student1,
        title: 'Kế hoạch học tập kiểm thử',
        goal: 'Ôn tập toán rời rạc',
        availableMinutesPerWeek: 300,
        startDate: new Date('2026-10-01T00:00:00.000Z'),
        endDate: new Date('2026-12-31T00:00:00.000Z'),
        status: 'ACTIVE',
      },
    });

    await prisma.studyTask.createMany({
      data: [
        {
          studyPlanId: ids.studyPlan1,
          topicId: ids.topic1,
          title: 'Bài tập 1 quá hạn',
          goal: 'Luyện tập bài tập 1',
          expectedMinutes: 60,
          priority: 'HIGH',
          status: 'TODO',
          dueDate: new Date(Date.now() - 86400000 * 2), // 2 days ago
        },
        {
          studyPlanId: ids.studyPlan1,
          topicId: ids.topic1,
          title: 'Bài tập 2 quá hạn',
          goal: 'Luyện tập bài tập 2',
          expectedMinutes: 60,
          priority: 'MEDIUM',
          status: 'TODO',
          dueDate: new Date(Date.now() - 86400000 * 3), // 3 days ago
        },
      ],
    });

    // Stored analysis report for class1
    await prisma.classAnalysisReport.create({
      data: {
        id: ids.report1,
        classId: ids.class1,
        inputSnapshot: { totalStudents: 2, enrolledCount: 2 },
        analysisResult: {
          summary: 'Báo cáo mẫu lớp 1',
          weakTopics: ['Toán Rời Rạc'],
          recommendations: [{ title: 'Cần phụ đạo', description: 'Ôn tập lý thuyết đồ thị' }],
        },
      },
    });

    teacher1Token = await token(ids.teacher1);
    teacher2Token = await token(ids.teacher2);
    studentToken = await token(ids.student1);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.classAnalysisReport.deleteMany({ where: { id: ids.report1 } });
      await prisma.studyTask.deleteMany({ where: { studyPlanId: ids.studyPlan1 } });
      await prisma.studyPlan.deleteMany({ where: { id: ids.studyPlan1 } });
      await prisma.assessmentResult.deleteMany({ where: { studentId: { in: [ids.student1, ids.student2, ids.otherStudent] } } });
      await prisma.classMember.deleteMany({ where: { classId: { in: [ids.class1, ids.class2] } } });
      await prisma.class.deleteMany({ where: { id: { in: [ids.class1, ids.class2] } } });
      await prisma.topic.deleteMany({ where: { id: ids.topic1 } });
      await prisma.course.deleteMany({ where: { id: ids.course1 } });
      await prisma.user.deleteMany({ where: { id: { in: Object.values(ids).slice(0, 5) } } });
    }
    if (app) await app.close();
  });

  describe('GET /api/v1/teacher/classes (SCR-TEA-001)', () => {
    it('returns 401 when unauthenticated', async () => {
      await request(app.getHttpServer()).get('/api/v1/teacher/classes').expect(401);
    });

    it('returns 403 when user is not a teacher', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/teacher/classes')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
      expect(res.body.code).toBe('FORBIDDEN_RESOURCE');
    });

    it('returns only classes taught by the requesting teacher', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/teacher/classes')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(ids.class1);
      expect(res.body.items[0].name).toBe('Lớp Kiểm Thử 1');
    });
  });

  describe('GET /api/v1/teacher/classes/:classId/dashboard (SCR-TEA-002)', () => {
    it('returns 403 when teacher does not teach this class (BR-002)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/teacher/classes/${ids.class2}/dashboard`)
        .set('Authorization', `Bearer ${teacher1Token}`)
        .expect(403);
      expect(res.body.code).toBe('FORBIDDEN_RESOURCE');
    });

    it('returns 404 for nonexistent class', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/teacher/classes/99000000-0000-4000-8000-000000000099/dashboard')
        .set('Authorization', `Bearer ${teacher1Token}`)
        .expect(404);
      expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('returns dashboard metrics and detects weak topics and students needing attention (FR-TEA-004)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/teacher/classes/${ids.class1}/dashboard`)
        .set('Authorization', `Bearer ${teacher1Token}`)
        .expect(200);

      expect(res.body.class.id).toBe(ids.class1);
      expect(res.body.class.name).toBe('Lớp Kiểm Thử 1');
      expect(res.body.studentCount).toBe(2);
      expect(res.body.summaryMetrics.totalStudents).toBe(2);

      // Weak topics rule: score < 60
      expect(res.body.weakTopics).toHaveLength(1);
      expect(res.body.weakTopics[0].topicName).toBe('Toán Rời Rạc');
      expect(res.body.weakTopics[0].averageScore).toBe(55);

      // Needs attention: score < 60 and overdueTaskCount >= 2
      expect(res.body.needsAttentionStudents).toHaveLength(1);
      expect(res.body.needsAttentionStudents[0].studentId).toBe(ids.student1);
      expect(res.body.needsAttentionStudents[0].overdueTaskCount).toBe(2);
      expect(res.body.needsAttentionStudents[0].reasons).toEqual(
        expect.arrayContaining(['Điểm trung bình dưới 60 (55.0)', 'Có 2 nhiệm vụ quá hạn']),
      );
    });
  });

  describe('GET /api/v1/teacher/classes/:classId/students (SCR-TEA-003)', () => {
    it('returns 403 when accessing another teacher\'s class', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/teacher/classes/${ids.class1}/students`)
        .set('Authorization', `Bearer ${teacher2Token}`)
        .expect(403);
    });

    it('returns student roster for own class', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/teacher/classes/${ids.class1}/students`)
        .set('Authorization', `Bearer ${teacher1Token}`)
        .expect(200);

      expect(res.body.class.id).toBe(ids.class1);
      expect(res.body.totalStudents).toBe(2);
      expect(res.body.students).toHaveLength(2);
      const s1 = res.body.students.find((s: { studentId: string }) => s.studentId === ids.student1);
      expect(s1).toBeDefined();
      expect(s1.needsAttention).toBe(true);
      expect(s1.averageScore).toBe(55);
    });
  });

  describe('GET /api/v1/teacher/classes/:classId/students/:studentId (SCR-TEA-004)', () => {
    it('returns 404 when student is not in the class', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/teacher/classes/${ids.class1}/students/${ids.otherStudent}`)
        .set('Authorization', `Bearer ${teacher1Token}`)
        .expect(404);
      expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('returns read-only student details with topic scores', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/teacher/classes/${ids.class1}/students/${ids.student1}`)
        .set('Authorization', `Bearer ${teacher1Token}`)
        .expect(200);

      expect(res.body.studentId).toBe(ids.student1);
      expect(res.body.fullName).toBe('Student One');
      expect(res.body.topicScores).toHaveLength(1);
      expect(res.body.topicScores[0].topicName).toBe('Toán Rời Rạc');
      expect(res.body.topicScores[0].score).toBe(55);
      expect(res.body.summary.overdueTaskCount).toBe(2);
    });
  });

  describe('GET /api/v1/teacher/classes/:classId/analysis-reports (SCR-TEA-006)', () => {
    it('returns 403 when accessing another teacher\'s class', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/teacher/classes/${ids.class1}/analysis-reports`)
        .set('Authorization', `Bearer ${teacher2Token}`)
        .expect(403);
    });

    it('returns history of reports for own class', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/teacher/classes/${ids.class1}/analysis-reports`)
        .set('Authorization', `Bearer ${teacher1Token}`)
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(ids.report1);
      expect(res.body.items[0].summary).toBe('Báo cáo mẫu lớp 1');
    });

    it('returns report detail by reportId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/teacher/classes/${ids.class1}/analysis-reports/${ids.report1}`)
        .set('Authorization', `Bearer ${teacher1Token}`)
        .expect(200);

      expect(res.body.id).toBe(ids.report1);
      expect(res.body.analysisResult.summary).toBe('Báo cáo mẫu lớp 1');
      expect(res.body.analysisResult.weakTopics).toEqual(['Toán Rời Rạc']);
      expect(res.body.inputSnapshot).toBeDefined();
    });

    it('returns 404 when report does not belong to the class', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/teacher/classes/${ids.class2}/analysis-reports/${ids.report1}`)
        .set('Authorization', `Bearer ${teacher2Token}`)
        .expect(404);
    });
  });
});
