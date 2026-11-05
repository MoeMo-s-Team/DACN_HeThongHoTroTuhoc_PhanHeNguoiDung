import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ApiExceptionFilter } from '../common/api-exception.filter';
import { AuthGuard } from '../auth/auth.guard';
import { StudyContextController } from './study-context.controller';
import { StudyContextService } from './study-context.service';

describe('POST /api/v1/student/study-context/validate', () => {
  let app: INestApplication;
  let role: 'STUDENT' | 'TEACHER' = 'STUDENT';

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [StudyContextController],
      providers: [StudyContextService],
    }).overrideGuard(AuthGuard).useValue({ canActivate: (context: { switchToHttp(): { getRequest(): { user: unknown } } }) => {
      context.switchToHttp().getRequest().user = { id: 'student-1', role, status: 'ACTIVE' };
      return true;
    } }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });

  afterAll(async () => app.close());

  it('returns a trimmed goal and normalized weekly minutes', async () => {
    await request(app.getHttpServer()).post('/api/v1/student/study-context/validate').send({
      goal: '  Study algorithms  ', availableHoursPerWeek: 7.5, targetDeadline: '2099-12-01T00:00:00.000Z',
    }).expect(200).expect({
      goal: 'Study algorithms', availableMinutesPerWeek: 450, targetDeadline: '2099-12-01T00:00:00.000Z',
    });
  });

  it.each([
    [{ goal: '   ', availableHoursPerWeek: 1, targetDeadline: '2099-12-01T00:00:00.000Z' }],
    [{ goal: 'Goal', availableHoursPerWeek: 0, targetDeadline: '2099-12-01T00:00:00.000Z' }],
    [{ goal: 'Goal', availableHoursPerWeek: -1, targetDeadline: '2099-12-01T00:00:00.000Z' }],
    [{ goal: 'Goal', availableHoursPerWeek: '2', targetDeadline: '2099-12-01T00:00:00.000Z' }],
    [{ goal: 'Goal', availableHoursPerWeek: 1, targetDeadline: 'not-a-date' }],
    [{ goal: 'Goal', availableHoursPerWeek: 1, targetDeadline: '2020-01-01T00:00:00.000Z' }],
  ])('returns the standard validation error for invalid input %o', async (body) => {
    const response = await request(app.getHttpServer()).post('/api/v1/student/study-context/validate').send(body).expect(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR', details: expect.arrayContaining([expect.any(String)]) });
  });

  it('denies non-Student roles', async () => {
    role = 'TEACHER';
    await request(app.getHttpServer()).post('/api/v1/student/study-context/validate').send({
      goal: 'Goal', availableHoursPerWeek: 1, targetDeadline: '2099-12-01T00:00:00.000Z',
    }).expect(403).expect((response) => expect(response.body.code).toBe('FORBIDDEN_RESOURCE'));
    role = 'STUDENT';
  });
});
