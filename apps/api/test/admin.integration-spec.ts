import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { FeedbackTag } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const ids = {
  admin: '94000000-0000-4000-8000-000000000001',
  target: '94000000-0000-4000-8000-000000000002',
  teacher: '94000000-0000-4000-8000-000000000003',
  disabled: '94000000-0000-4000-8000-000000000004',
  student: '94000000-0000-4000-8000-000000000005',
  absent: '94000000-0000-4000-8000-000000000006',
};
const feedbackIds = Array.from({ length: 30 }, (_, index) => `95000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`);
const analysisIds = ['96000000-0000-4000-8000-000000000001', '96000000-0000-4000-8000-000000000002'];
const historySnapshot = { filter: { fromDate: '2026-10-01T00:00:00.000Z', toDate: '2026-10-02T00:00:00.000Z', rating: null, tag: null }, feedbackIds: feedbackIds.slice(0, 2), totalFeedback: 2, tagStatistics: { AI_PERFORMANCE: 0, STUDY_PLAN: 0, UI_UX: 2, LEARNING_ANALYTICS: 0, OTHER: 0 } };
const historyResult = { issueGroups: [], summary: 'Saved summary before live feedback changes', priorityAreas: ['Navigation and clarity'], recommendations: [{ title: 'Improve navigation', description: 'Stored proposal only' }] };

describe('Administrator Phase 1 API (PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let adminToken: string;

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
    await prisma.feedbackAnalysis.deleteMany({ where: { id: { in: analysisIds } } });
    await prisma.feedback.deleteMany({ where: { id: { in: feedbackIds } } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await prisma.user.createMany({ data: [
      { id: ids.admin, fullName: 'Admin Phase1 Administrator', email: 'admin.phase1.admin@example.test', role: 'ADMINISTRATOR', passwordHash: 'unused' },
      { id: ids.target, fullName: 'Admin Phase1 Target', email: 'admin.phase1.target@example.test', role: 'STUDENT', passwordHash: 'unused' },
      { id: ids.teacher, fullName: 'Admin Phase1 Teacher', email: 'admin.phase1.teacher@example.test', role: 'TEACHER', passwordHash: 'unused' },
      { id: ids.disabled, fullName: 'Admin Phase1 Disabled', email: 'admin.phase1.disabled@example.test', role: 'ADMINISTRATOR', status: 'DISABLED', passwordHash: 'unused' },
      { id: ids.student, fullName: 'Admin Phase1 Student', email: 'admin.phase1.student@example.test', role: 'STUDENT', passwordHash: 'unused' },
    ] });
    const from = new Date('2026-10-01T00:00:00.000Z');
    const to = new Date('2026-10-02T00:00:00.000Z');
    await prisma.feedback.createMany({ data: [
      ...Array.from({ length: 21 }, (_, index) => ({
        id: feedbackIds[index], userId: ids.target, tag: FeedbackTag.UI_UX, rating: 2, content: `Phase1 matching feedback ${index}`,
        createdAt: index === 0 ? from : index === 20 ? to : new Date(from.getTime() + index * 1000),
      })),
      { id: feedbackIds[21], userId: ids.target, tag: FeedbackTag.UI_UX, rating: 2, content: 'Before boundary', createdAt: new Date(from.getTime() - 1) },
      { id: feedbackIds[22], userId: ids.target, tag: FeedbackTag.UI_UX, rating: 2, content: 'After boundary', createdAt: new Date(to.getTime() + 1) },
      { id: feedbackIds[23], userId: ids.target, tag: FeedbackTag.UI_UX, rating: 3, content: 'Different rating', createdAt: from },
      { id: feedbackIds[24], userId: ids.teacher, tag: FeedbackTag.OTHER, rating: 2, content: 'Different tag', createdAt: from },
      ...Object.values(FeedbackTag).map((tag, index) => ({ id: feedbackIds[25 + index], userId: ids.teacher, tag, rating: 5, content: `Official tag ${tag}`, createdAt: new Date('2026-09-01T00:00:00.000Z') })),
    ] });
    await prisma.feedbackAnalysis.createMany({ data: [
      { id: analysisIds[0], inputSnapshot: historySnapshot, analysisResult: historyResult, createdAt: new Date('2099-01-02T00:00:00.000Z') },
      { id: analysisIds[1], inputSnapshot: { ...historySnapshot, filter: {} }, analysisResult: { ...historyResult, recommendations: [] }, createdAt: new Date('2099-01-01T00:00:00.000Z') },
    ] });
    adminToken = await token(ids.admin);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.feedbackAnalysis.deleteMany({ where: { id: { in: analysisIds } } });
      await prisma.feedback.deleteMany({ where: { id: { in: feedbackIds } } });
      await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    }
    await app?.close();
  });

  it('authenticates active Administrators and rejects other roles, missing and disabled users', async () => {
    for (const path of ['/admin/dashboard', '/admin/users', '/admin/feedback', '/admin/feedback/analyses', `/admin/feedback/analyses/${analysisIds[0]}`]) {
      expect((await request(app.getHttpServer()).get(`/api/v1${path}`).expect(401)).body.code).toBe('AUTH_REQUIRED');
      for (const id of [ids.student, ids.teacher]) {
        const response = await request(app.getHttpServer()).get(`/api/v1${path}`).set('Authorization', `Bearer ${await token(id)}`).expect(403);
        expect(response.body.code).toBe('FORBIDDEN_RESOURCE');
      }
      const disabled = await request(app.getHttpServer()).get(`/api/v1${path}`).set('Authorization', `Bearer ${await token(ids.disabled)}`).expect(403);
      expect(disabled.body.code).toBe('ACCOUNT_DISABLED');
      await request(app.getHttpServer()).get(`/api/v1${path}`).set('Authorization', `Bearer ${await token(ids.absent)}`).expect(401);
    }
    await request(app.getHttpServer()).patch(`/api/v1/admin/users/${ids.target}/status`)
      .set('Authorization', `Bearer ${await token(ids.student)}`).send({ status: 'DISABLED' }).expect(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: ids.target } })).status).toBe('ACTIVE');
  });

  it('returns all five all-time dashboard metrics with disabled users included', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(Object.keys(body).sort()).toEqual(['failedAIRequests', 'totalAIRequests', 'totalFeedback', 'totalUsers', 'usersByRole'].sort());
    expect(body.totalUsers).toBe(await prisma.user.count());
    for (const role of ['STUDENT', 'TEACHER', 'ADMINISTRATOR'] as const) expect(body.usersByRole[role]).toBe(await prisma.user.count({ where: { role } }));
    expect(body.totalFeedback).toBe(await prisma.feedback.count());
    expect(body.totalAIRequests).toBe(await prisma.aIRequestLog.count());
    expect(body.failedAIRequests).toBe(await prisma.aIRequestLog.count({ where: { status: 'FAILED' } }));
    expect(body.failedAIRequests).toBeLessThanOrEqual(body.totalAIRequests);
  });

  it('searches name/email with pagination and never returns passwordHash', async () => {
    const { body } = await request(app.getHttpServer()).get('/api/v1/admin/users?q=PHASE1.TARGET&page=1&limit=1').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(body).toEqual({ items: [{ id: ids.target, fullName: 'Admin Phase1 Target', email: 'admin.phase1.target@example.test', role: 'STUDENT', status: 'ACTIVE' }], meta: { page: 1, limit: 1, total: 1, totalPages: 1 } });
    expect(JSON.stringify(body)).not.toContain('passwordHash');
    const byName = await request(app.getHttpServer()).get('/api/v1/admin/users?q=ADMIN%20PHASE1&limit=1&page=2').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(byName.body.meta).toEqual({ page: 2, limit: 1, total: 5, totalPages: 5 });
    expect(byName.body.items).toHaveLength(1);
    const empty = await request(app.getHttpServer()).get('/api/v1/admin/users?q=no-phase1-match').set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(empty.body).toMatchObject({ items: [], meta: { total: 0, totalPages: 0 } });
    for (const query of ['page=0', 'page=1.5', 'limit=101', 'limit=', 'q[x]=bad', 'unknown=1']) {
      const invalid = await request(app.getHttpServer()).get(`/api/v1/admin/users?${query}`).set('Authorization', `Bearer ${adminToken}`).expect(400);
      expect(invalid.body.code).toBe('VALIDATION_ERROR');
    }
  });

  it('blocks self-disable including alternate UUID casing and handles invalid targets', async () => {
    for (const id of [ids.admin, ids.admin.toUpperCase()]) {
      const response = await request(app.getHttpServer()).patch(`/api/v1/admin/users/${id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'DISABLED' }).expect(409);
      expect(response.body.code).toBe('SELF_DISABLE_NOT_ALLOWED');
    }
    expect((await prisma.user.findUniqueOrThrow({ where: { id: ids.admin } })).status).toBe('ACTIVE');
    for (const id of [ids.absent, 'opaque-missing-id']) {
      const response = await request(app.getHttpServer()).patch(`/api/v1/admin/users/${id}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status: 'ACTIVE' }).expect(404);
      expect(response.body.code).toBe('RESOURCE_NOT_FOUND');
    }
    for (const body of [{}, { status: 'OTHER' }, { status: 'ACTIVE', role: 'ADMINISTRATOR' }]) {
      await request(app.getHttpServer()).patch(`/api/v1/admin/users/${ids.target}/status`).set('Authorization', `Bearer ${adminToken}`).send(body).expect(400);
    }
  });

  it('refuses the already-issued target token immediately after disable, then allows reactivation', async () => {
    const targetToken = await token(ids.target);
    const change = (status: 'ACTIVE' | 'DISABLED') => request(app.getHttpServer()).patch(`/api/v1/admin/users/${ids.target}/status`).set('Authorization', `Bearer ${adminToken}`).send({ status });
    try {
      expect((await change('DISABLED').expect(200)).body).toEqual({ id: ids.target, status: 'DISABLED' });
      for (const path of ['/me', '/student/dashboard']) {
        const response = await request(app.getHttpServer()).get(`/api/v1${path}`).set('Authorization', `Bearer ${targetToken}`).expect(403);
        expect(response.body.code).toBe('ACCOUNT_DISABLED');
      }
      await change('ACTIVE').expect(200);
      await request(app.getHttpServer()).get('/api/v1/me').set('Authorization', `Bearer ${targetToken}`).expect(200);
    } finally {
      await prisma.user.update({ where: { id: ids.target }, data: { status: 'ACTIVE' } });
    }
  });

  it('filters inclusively while statistics cover all matching pages', async () => {
    const filter = { fromDate: '2026-10-01T00:00:00.000Z', toDate: '2026-10-02T00:00:00.000Z', tag: 'UI_UX', rating: 2 };
    const get = (query: Record<string, unknown>) => request(app.getHttpServer()).get('/api/v1/admin/feedback').query(query).set('Authorization', `Bearer ${adminToken}`);
    const first = (await get({ ...filter, page: 1 }).expect(200)).body;
    const second = (await get({ ...filter, page: 2 }).expect(200)).body;
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(1);
    expect(first.meta).toEqual({ page: 1, limit: 20, total: 21, totalPages: 2 });
    expect(first.tagStatistics).toEqual({ AI_PERFORMANCE: 0, STUDY_PLAN: 0, UI_UX: 21, LEARNING_ANALYTICS: 0, OTHER: 0 });
    expect(second.tagStatistics).toEqual(first.tagStatistics);
    expect(first.items[0].id).toBe(feedbackIds[20]);
    expect(second.items[0].id).toBe(feedbackIds[0]);
    expect(first.items[0].sender).toEqual({ id: ids.target, fullName: 'Admin Phase1 Target', role: 'STUDENT' });
    expect(JSON.stringify(first)).not.toMatch(/passwordHash|userId|email/);
    const allTags = (await get({ fromDate: '2026-09-01T00:00:00Z', toDate: '2026-09-01T00:00:00Z' }).expect(200)).body;
    expect(Object.values(allTags.tagStatistics)).toEqual([1, 1, 1, 1, 1]);
    const empty = (await get({ fromDate: '2000-01-01T00:00:00Z', toDate: '2000-01-02T00:00:00Z' }).expect(200)).body;
    expect(empty).toMatchObject({ items: [], meta: { total: 0, totalPages: 0 } });
    expect(Object.values(empty.tagStatistics)).toEqual([0, 0, 0, 0, 0]);
    for (const query of [{ fromDate: 'invalid' }, { rating: 6 }, { tag: 'UNKNOWN' }, { fromDate: filter.toDate, toDate: filter.fromDate }]) {
      const response = await get(query).expect(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    }
  });

  it('reads stored history without recomputing snapshots or creating AI logs', async () => {
    const logsBefore = await prisma.aIRequestLog.count();
    const get = (path: string) => request(app.getHttpServer()).get(`/api/v1/admin/feedback/analyses${path}`).set('Authorization', `Bearer ${adminToken}`);
    const list = (await get('?page=1&limit=1').expect(200)).body;
    expect(list.items).toEqual([{ id: analysisIds[0], createdAt: '2099-01-02T00:00:00.000Z', totalFeedback: 2, filter: historySnapshot.filter }]);
    expect(list.meta.total).toBe(await prisma.feedbackAnalysis.count());
    const second = (await get('?page=2&limit=1').expect(200)).body;
    expect(second.items[0]).toMatchObject({ id: analysisIds[1], filter: {} });
    const before = (await get(`/${analysisIds[0]}`).expect(200)).body;
    expect(before).toEqual({ id: analysisIds[0], inputSnapshot: historySnapshot, analysisResult: historyResult, createdAt: '2099-01-02T00:00:00.000Z' });
    await prisma.feedback.update({ where: { id: feedbackIds[0] }, data: { tag: 'OTHER', content: 'Changed live feedback after analysis' } });
    expect((await get(`/${analysisIds[0]}`).expect(200)).body).toEqual(before);
    expect(await prisma.aIRequestLog.count()).toBe(logsBefore);
    for (const id of ['96000000-0000-4000-8000-000000000003', 'opaque-missing-analysis']) {
      expect((await get(`/${id}`).expect(404)).body.code).toBe('RESOURCE_NOT_FOUND');
    }
    await get('?page=0').expect(400);
    await get('?limit=101').expect(400);
    const emptyPage = (await get('?page=999999&limit=1').expect(200)).body;
    expect(emptyPage.items).toEqual([]);
    expect(emptyPage.meta.total).toBe(list.meta.total);
  });
});
