import { createHash, randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ContextType, Prisma, PrismaClient, Role, UserStatus } from '@prisma/client';
import request from 'supertest';
import { requireTestDatabaseUrl } from '../prisma/test-database-url';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const savePath = '/api/v1/admin/feedback/analyses';
const ownerId = randomUUID();
const otherAdminId = randomUUID();
const studentId = randomUUID();
const disabledId = randomUUID();
const fixtureIds = [ownerId, otherAdminId, studentId, disabledId];
const feedbackId = randomUUID();
const inputSnapshot = {
  filter: { rating: 2, tag: 'UI_UX' }, feedbackIds: [feedbackId], totalFeedback: 1,
  tagStatistics: { AI_PERFORMANCE: 0, STUDY_PLAN: 0, UI_UX: 1, LEARNING_ANALYTICS: 0, OTHER: 0 },
};
const analysisResult = {
  issueGroups: [{ title: 'Điều hướng', summary: 'Khó tìm nút.', feedbackIds: [feedbackId], count: 1 }],
  summary: 'Kết quả của lần phân tích.', priorityAreas: ['Điều hướng'],
  recommendations: [{ title: 'Làm rõ nút', description: 'Bổ sung nhãn dễ đọc.' }],
};
const resourceKey = `feedback-dataset:${createHash('sha256').update(JSON.stringify({ filter: inputSnapshot.filter, feedbackIds: inputSnapshot.feedbackIds })).digest('hex')}`;

describe('Administrator analysis Save (PostgreSQL)', () => {
  let app: INestApplication | undefined;
  let db: PrismaClient;
  let jwt: JwtService;
  let ownerToken: string;
  const analysisIds = new Set<string>();
  let beforeClaim: (() => Promise<void>) | undefined;
  let failNextConsume = false;

  function token(id: string) {
    return jwt.signAsync({ sub: id }, { algorithm: 'HS256', expiresIn: '2h' });
  }

  function save(ref: string, bearer = ownerToken) {
    return request(app!.getHttpServer()).post(savePath).set('Authorization', `Bearer ${bearer}`).send({ analysisRef: ref });
  }

  async function context(overrides: Partial<Prisma.TemporaryContextUncheckedCreateInput> = {}) {
    const expiresAt = overrides.expiresAt ?? new Date(Date.now() + 3_600_000);
    return db.temporaryContext.create({ data: {
      opaqueRef: randomUUID(), contextType: ContextType.ADMIN_FEEDBACK_ANALYSIS, ownerUserId: ownerId,
      resourceKey, payload: { inputSnapshot, analysisResult }, expiresAt, retentionUntil: expiresAt, ...overrides,
    } });
  }

  function rendezvous() {
    let arrivals = 0;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => { release = resolve; });
    beforeClaim = async () => {
      if (++arrivals === 2) release();
      await ready;
    };
    return () => arrivals;
  }

  beforeAll(async () => {
    const datasourceUrl = requireTestDatabaseUrl();
    if (process.env.DATABASE_URL !== datasourceUrl) throw new Error('Save integration requires DATABASE_URL to match the isolated TEST_DATABASE_URL');
    db = new PrismaClient({ datasourceUrl });
    const instrumented = db.$extends({ query: { temporaryContext: {
      async updateMany({ args, query }) {
        await beforeClaim?.();
        return query(args);
      },
      async update({ args, query }) {
        if (failNextConsume && args.data.status === 'CONSUMED') {
          failNextConsume = false;
          throw new Error('Injected consume failure after the insert');
        }
        return query(args);
      },
    } } });
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue(instrumented).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    jwt = app.get(JwtService);
    await db.user.createMany({ data: fixtureIds.map((id) => ({
      id, fullName: 'Save integration fixture', email: `save-${id}@example.test`, passwordHash: 'unused',
      role: id === studentId ? Role.STUDENT : Role.ADMINISTRATOR,
      status: id === disabledId ? UserStatus.DISABLED : UserStatus.ACTIVE,
    })) });
    ownerToken = await token(ownerId);
  });

  afterEach(() => { beforeClaim = undefined; failNextConsume = false; });

  afterAll(async () => {
    try {
      if (db) {
        await db.temporaryContext.deleteMany({ where: { ownerUserId: { in: fixtureIds } } });
        await db.feedbackAnalysis.deleteMany({ where: { id: { in: [...analysisIds] } } });
        await db.user.deleteMany({ where: { id: { in: fixtureIds } } });
      }
    } finally {
      await app?.close();
      await db?.$disconnect();
    }
  });

  it('saves the stored snapshot, returns its Location and replays after the OPEN expiry within retention', async () => {
    const source = await context();
    expect(await db.feedback.findUnique({ where: { id: feedbackId } })).toBeNull();
    const first = await save(source.opaqueRef).expect(201);
    analysisIds.add(first.body.id);
    expect(first.body).toEqual({ id: expect.any(String), createdAt: expect.any(String), replayed: false });
    expect(first.headers.location).toBe(`${savePath}/${first.body.id}`);
    const consumed = await db.temporaryContext.findUniqueOrThrow({ where: { id: source.id } });
    expect(consumed.status).toBe('CONSUMED');
    expect(consumed.retentionUntil.getTime()).toBe(Math.max(source.expiresAt.getTime(), consumed.consumedAt!.getTime() + 600_000));
    await db.temporaryContext.update({ where: { id: source.id }, data: { expiresAt: new Date(Date.now() - 1_000) } });
    const replay = await save(source.opaqueRef).expect(200);
    expect(replay.body).toEqual({ ...first.body, replayed: true });
    const detail = await request(app!.getHttpServer()).get(`${savePath}/${first.body.id}`)
      .set('Authorization', `Bearer ${ownerToken}`).expect(200);
    expect(detail.body).toEqual({ id: first.body.id, createdAt: first.body.createdAt, inputSnapshot, analysisResult });
    expect(await db.aIRequestLog.count({ where: { userId: ownerId } })).toBe(0);
  });

  it('blocks absent tokens, wrong roles, disabled users, foreign owners and unexpected body fields', async () => {
    const source = await context();
    await request(app!.getHttpServer()).post(savePath).send({ analysisRef: source.opaqueRef }).expect(401);
    expect((await save(source.opaqueRef, await token(studentId)).expect(403)).body.code).toBe('FORBIDDEN_RESOURCE');
    expect((await save(source.opaqueRef, await token(disabledId)).expect(403)).body.code).toBe('ACCOUNT_DISABLED');
    expect((await save(source.opaqueRef, await token(otherAdminId)).expect(409)).body.code).toBe('CONTEXT_INVALID_OR_EXPIRED');
    await request(app!.getHttpServer()).post(savePath).set('Authorization', `Bearer ${ownerToken}`)
      .send({ analysisRef: source.opaqueRef, inputSnapshot }).expect(400);
    expect((await db.temporaryContext.findUniqueOrThrow({ where: { id: source.id } })).status).toBe('OPEN');
  });

  it('rejects missing, expired, wrong-type, mismatched and invalid stored contexts', async () => {
    const now = Date.now();
    const contexts = await Promise.all([
      context({ expiresAt: new Date(now - 1_000) }),
      context({ contextType: ContextType.TEACHER_CLASS_ANALYSIS }),
      context({ resourceKey: 'feedback-dataset:wrong' }),
      context({ payload: { inputSnapshot, analysisResult: { ...analysisResult, issueGroups: [{ ...analysisResult.issueGroups[0], feedbackIds: ['unknown'] }] } } }),
      context({ status: 'CONSUMED', expiresAt: new Date(now - 1_200_000), consumedAt: new Date(now - 900_000),
        retentionUntil: new Date(now - 300_000), replayResult: { id: randomUUID(), createdAt: new Date(now - 900_000).toISOString() } }),
    ]);
    for (const ref of [randomUUID(), ...contexts.map(({ opaqueRef }) => opaqueRef)]) {
      expect((await save(ref).expect(409)).body.code).toBe('CONTEXT_INVALID_OR_EXPIRED');
    }
  });

  it('serializes two overlapping saves into one insert and one replay', async () => {
    const source = await context();
    const count = await db.feedbackAnalysis.count();
    const arrivals = rendezvous();
    const responses = await Promise.all([save(source.opaqueRef), save(source.opaqueRef)]);
    const created = responses.find(({ status }) => status === 201);
    if (created) analysisIds.add(created.body.id);
    expect(arrivals()).toBe(2);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 201]);
    expect(responses.find(({ status }) => status === 200)!.body).toEqual({ ...created!.body, replayed: true });
    expect(await db.feedbackAnalysis.count()).toBe(count + 1);
  });

  it('rolls back an insert when context consumption fails and lets the waiting save succeed', async () => {
    const source = await context();
    const count = await db.feedbackAnalysis.count();
    const arrivals = rendezvous();
    failNextConsume = true;
    const responses = await Promise.all([save(source.opaqueRef), save(source.opaqueRef)]);
    const created = responses.find(({ status }) => status === 201);
    if (created) analysisIds.add(created.body.id);
    expect(arrivals()).toBe(2);
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 500]);
    expect(responses.find(({ status }) => status === 500)!.body.code).toBe('DATABASE_FAILURE');
    expect(await db.feedbackAnalysis.count()).toBe(count + 1);
  });
});
