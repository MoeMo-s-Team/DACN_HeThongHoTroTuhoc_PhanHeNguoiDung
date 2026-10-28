import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { AppModule } from '../src/app.module';

const ids = {
  active: '91000000-0000-4000-8000-000000000001',
  disabled: '91000000-0000-4000-8000-000000000002',
};
const password = 'AuthIntegrationPassword_123';

describe('Auth API (PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await prisma.user.createMany({ data: [
      { id: ids.active, fullName: 'Auth Student', email: 'auth.student@example.test', passwordHash, role: 'STUDENT' },
      { id: ids.disabled, fullName: 'Disabled Student', email: 'auth.disabled@example.test', passwordHash, role: 'STUDENT', status: 'DISABLED' },
    ] });
  });

  afterAll(async () => {
    if (prisma) await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
    await app?.close();
  });

  it('normalizes email, returns a 2-hour HS256 JWT with only identity/time claims, and returns a public User', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login')
      .send({ email: ' Auth.Student@Example.Test ', password }).expect(200);
    expect(response.body.user).toEqual({ id: ids.active, fullName: 'Auth Student', email: 'auth.student@example.test', role: 'STUDENT', status: 'ACTIVE' });
    const claims = jwt.decode(response.body.accessToken) as Record<string, unknown>;
    expect(Object.keys(claims).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(claims.sub).toBe(ids.active);
    expect((claims.exp as number) - (claims.iat as number)).toBe(7200);
  });

  it('uses the same 401 response for an unknown email and a wrong password', async () => {
    const unknown = await request(app.getHttpServer()).post('/api/v1/auth/login')
      .send({ email: 'missing@example.test', password }).expect(401);
    const wrong = await request(app.getHttpServer()).post('/api/v1/auth/login')
      .send({ email: 'auth.student@example.test', password: 'wrong-password' }).expect(401);
    expect(unknown.body.code).toBe('INVALID_CREDENTIALS');
    expect(wrong.body).toEqual(unknown.body);
  });

  it('rejects login for a disabled User', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/auth/login')
      .send({ email: 'auth.disabled@example.test', password }).expect(403);
    expect(response.body.code).toBe('ACCOUNT_DISABLED');
    expect(response.body.accessToken).toBeUndefined();
  });

  it('returns the current active database User from /me and requires a token', async () => {
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login')
      .send({ email: 'auth.student@example.test', password }).expect(200);
    await request(app.getHttpServer()).get('/api/v1/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`).expect(200)
      .expect({ id: ids.active, fullName: 'Auth Student', email: 'auth.student@example.test', role: 'STUDENT', status: 'ACTIVE' });
    await request(app.getHttpServer()).get('/api/v1/me').expect(401).expect(({ body }) => expect(body.code).toBe('AUTH_REQUIRED'));
  });

  it('rejects malformed, expired, wrong-signature, and wrong-algorithm tokens', async () => {
    const secret = Buffer.from(process.env.JWT_ACCESS_SECRET!, 'base64');
    const wrongSignature = await new JwtService({ secret: Buffer.alloc(32, 1) }).signAsync({ sub: ids.active }, { algorithm: 'HS256', expiresIn: '2h' });
    const wrongAlgorithm = await new JwtService({ secret, signOptions: { algorithm: 'HS384' } })
      .signAsync({ sub: ids.active }, { algorithm: 'HS384', expiresIn: '2h' });
    const expired = await jwt.signAsync({ sub: ids.active }, { algorithm: 'HS256', expiresIn: -1 });
    const invalidSubject = await jwt.signAsync({ sub: 'not-a-uuid' }, { algorithm: 'HS256', expiresIn: '2h' });
    const missingTimeClaims = await jwt.signAsync({ sub: ids.active }, { algorithm: 'HS256', noTimestamp: true });
    for (const token of ['not.a.jwt', wrongSignature, wrongAlgorithm, expired, invalidSubject, missingTimeClaims]) {
      const response = await request(app.getHttpServer()).get('/api/v1/me')
        .set('Authorization', `Bearer ${token}`).expect(401);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    }
  });

  it('rejects the next protected request after the User becomes disabled', async () => {
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login')
      .send({ email: 'auth.student@example.test', password }).expect(200);
    await prisma.user.update({ where: { id: ids.active }, data: { status: 'DISABLED' } });
    try {
      const response = await request(app.getHttpServer()).get('/api/v1/me')
        .set('Authorization', `Bearer ${login.body.accessToken}`).expect(403);
      expect(response.body.code).toBe('ACCOUNT_DISABLED');
    } finally {
      await prisma.user.update({ where: { id: ids.active }, data: { status: 'ACTIVE' } });
    }
  });

  it('requires authentication for logout and returns no content when authorized', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(401);
    const login = await request(app.getHttpServer()).post('/api/v1/auth/login')
      .send({ email: 'auth.student@example.test', password }).expect(200);
    await request(app.getHttpServer()).post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${login.body.accessToken}`).expect(204);
  });

  it('keeps unknown routes within the common API error contract', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/unknown').expect(404);
    expect(response.body).toMatchObject({ code: 'RESOURCE_NOT_FOUND', message: expect.any(String), details: null });
  });
});
