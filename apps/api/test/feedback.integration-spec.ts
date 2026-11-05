import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const ids = {
  student: '94000000-0000-4000-8000-000000000001',
  teacher: '94000000-0000-4000-8000-000000000002',
  administrator: '94000000-0000-4000-8000-000000000003',
  disabled: '94000000-0000-4000-8000-000000000004',
};

describe('Feedback API (PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  async function token(userId: string) {
    return jwt.signAsync({ sub: userId }, { algorithm: 'HS256', expiresIn: '2h' });
  }

  function submit(body: object, accessToken?: string) {
    const req = request(app.getHttpServer()).post('/api/v1/feedback');
    return accessToken ? req.set('Authorization', `Bearer ${accessToken}`).send(body) : req.send(body);
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    await prisma.feedback.deleteMany({ where: { userId: { in: Object.values(ids) } } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await prisma.user.createMany({ data: [
      { id: ids.student, fullName: 'Feedback Student', email: 'feedback.student@example.test', passwordHash: 'unused', role: 'STUDENT' },
      { id: ids.teacher, fullName: 'Feedback Teacher', email: 'feedback.teacher@example.test', passwordHash: 'unused', role: 'TEACHER' },
      { id: ids.administrator, fullName: 'Feedback Admin', email: 'feedback.admin@example.test', passwordHash: 'unused', role: 'ADMINISTRATOR' },
      { id: ids.disabled, fullName: 'Disabled Feedback User', email: 'feedback.disabled@example.test', passwordHash: 'unused', role: 'STUDENT', status: 'DISABLED' },
    ] });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.feedback.deleteMany({ where: { userId: { in: Object.values(ids) } } });
      await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    }
    await app?.close();
  });

  beforeEach(async () => {
    await prisma.feedback.deleteMany({ where: { userId: { in: Object.values(ids) } } });
  });

  it('creates feedback for an ACTIVE Student and stores it for later Admin queries', async () => {
    const created = await submit({ tag: 'UI_UX', rating: 3, content: 'Navigation feedback' }, await token(ids.student))
      .expect(201);

    expect(created.body).toMatchObject({
      id: expect.any(String), tag: 'UI_UX', rating: 3, content: 'Navigation feedback',
      createdAt: expect.stringMatching(/^\d{4}-\d\d-\d\dT.*Z$/),
    });
    expect(created.body.userId).toBeUndefined();
    const rows = await prisma.feedback.findMany({ where: { tag: 'UI_UX', content: 'Navigation feedback' } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: created.body.id, userId: ids.student, createdAt: new Date(created.body.createdAt) });
  });

  it('allows Teacher role at the API contract boundary', async () => {
    await submit({ tag: 'OTHER', rating: 1, content: 'Teacher feedback' }, await token(ids.teacher)).expect(201);
    expect(await prisma.feedback.count({ where: { userId: ids.teacher } })).toBe(1);
  });

  it('requires a valid token and an ACTIVE Student or Teacher', async () => {
    const body = { tag: 'OTHER', rating: 5, content: 'Feedback' };
    await submit(body).expect(401).expect(({ body: error }) => expect(error.code).toBe('AUTH_REQUIRED'));
    await submit(body, 'not-a-jwt').expect(401).expect(({ body: error }) => expect(error.code).toBe('AUTH_REQUIRED'));
    await submit(body, await token(ids.disabled)).expect(403).expect(({ body: error }) => expect(error.code).toBe('ACCOUNT_DISABLED'));
    await submit(body, await token(ids.administrator)).expect(403).expect(({ body: error }) => expect(error.code).toBe('FORBIDDEN_RESOURCE'));
    expect(await prisma.feedback.count({ where: { userId: { in: Object.values(ids) } } })).toBe(0);
  });

  it.each([
    ['missing tag', { rating: 3, content: 'Feedback' }],
    ['unknown tag', { tag: 'NOT_A_TAG', rating: 3, content: 'Feedback' }],
    ['rating below range', { tag: 'OTHER', rating: 0, content: 'Feedback' }],
    ['rating above range', { tag: 'OTHER', rating: 6, content: 'Feedback' }],
    ['fractional rating', { tag: 'OTHER', rating: 1.5, content: 'Feedback' }],
    ['empty content', { tag: 'OTHER', rating: 3, content: '' }],
    ['whitespace content', { tag: 'OTHER', rating: 3, content: ' \n\t ' }],
    ['client-supplied userId', { tag: 'OTHER', rating: 3, content: 'Feedback', userId: ids.administrator }],
  ])('rejects %s without persisting a row', async (_name, body) => {
    await submit(body, await token(ids.student)).expect(400)
      .expect(({ body: error }) => expect(error).toMatchObject({ code: 'VALIDATION_ERROR', message: 'Dữ liệu đầu vào không hợp lệ.' }));
    expect(await prisma.feedback.count({ where: { userId: { in: Object.values(ids) } } })).toBe(0);
  });

  it.each([1, 5])('accepts rating boundary %i', async (rating) => {
    await submit({ tag: 'OTHER', rating, content: 'Boundary feedback' }, await token(ids.student)).expect(201);
  });

  it('maps a persistence failure to the standard API error', async () => {
    const create = jest.spyOn(prisma.feedback, 'create').mockRejectedValueOnce(new Error('database unavailable'));
    try {
      const response = await submit({ tag: 'OTHER', rating: 3, content: 'Feedback' }, await token(ids.student)).expect(500);
      expect(response.body).toEqual({ code: 'DATABASE_FAILURE', message: 'Không thể xử lý yêu cầu.', details: null });
    } finally {
      create.mockRestore();
    }
  });
});
