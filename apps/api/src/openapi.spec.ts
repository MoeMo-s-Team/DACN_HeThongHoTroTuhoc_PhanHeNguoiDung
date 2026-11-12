import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OpenAPIObject } from '@nestjs/swagger';
import request from 'supertest';
import { AppModule } from './app.module';
import { createOpenApiDocument } from './openapi';
import { PrismaService } from './prisma/prisma.service';

function responseSchema(response: unknown) {
  return (response as { content?: Record<string, { schema?: unknown }> } | undefined)
    ?.content?.['application/json']?.schema;
}

describe('OpenAPI auth contract', () => {
  let app: INestApplication;
  let document: OpenAPIObject;
  const generatedDocument = JSON.parse(readFileSync(resolve(__dirname, '../../../packages/contracts/openapi.json'), 'utf8')) as OpenAPIObject;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    document = createOpenApiDocument(app);
  });

  afterAll(async () => app.close());

  it('describes the baseline auth request, responses, and security without technical routes', () => {
    const login = document.paths['/api/v1/auth/login']?.post;
    const logout = document.paths['/api/v1/auth/logout']?.post;
    const me = document.paths['/api/v1/me']?.get;
    const schemas = document.components?.schemas ?? {};
    const schema = (name: string) => schemas[name] as {
      properties?: Record<string, { enum?: string[]; example?: unknown }>;
      required?: string[];
    };
    const errorSchema = { $ref: '#/components/schemas/ApiErrorResponseDto' };

    expect(document.components?.securitySchemes?.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer' });
    expect(login?.security).toBeUndefined();
    expect(login?.responses).toHaveProperty('401');
    expect(login?.responses).toHaveProperty('403');
    expect(login?.responses).toHaveProperty('500');
    expect((login?.requestBody as { required?: boolean } | undefined)?.required).toBe(true);
    expect((login?.requestBody as { content?: Record<string, { schema?: unknown }> } | undefined)?.content?.['application/json']?.schema)
      .toEqual({ $ref: '#/components/schemas/LoginDto' });
    expect(responseSchema(login?.responses['200'])).toEqual({ $ref: '#/components/schemas/LoginResponseDto' });
    expect(responseSchema(login?.responses['401'])).toEqual(errorSchema);
    expect(responseSchema(login?.responses['403'])).toEqual(errorSchema);
    expect(responseSchema(login?.responses['500'])).toEqual(errorSchema);
    expect(schema('LoginDto').required).toEqual(expect.arrayContaining(['email', 'password']));
    expect(schema('LoginDto').properties?.password.example).toBeUndefined();
    expect(schema('LoginResponseDto').properties?.accessToken.example).toBeUndefined();
    expect(schema('UserSummaryDto').properties?.role.enum).toEqual(['STUDENT', 'TEACHER', 'ADMINISTRATOR']);
    expect(schema('UserSummaryDto').properties?.status.enum).toEqual(['ACTIVE']);

    expect(me?.security).toEqual([{ bearerAuth: [] }]);
    expect(responseSchema(me?.responses['200'])).toEqual({ $ref: '#/components/schemas/UserSummaryDto' });
    expect(me?.responses).toHaveProperty('401');
    expect(me?.responses).toHaveProperty('403');
    expect(responseSchema(me?.responses['401'])).toEqual(errorSchema);
    expect(responseSchema(me?.responses['403'])).toEqual(errorSchema);
    expect(me?.responses).toHaveProperty('500');
    expect(responseSchema(me?.responses['500'])).toEqual(errorSchema);

    expect(logout?.security).toEqual([{ bearerAuth: [] }]);
    expect((logout?.responses['204'] as { content?: unknown } | undefined)?.content).toBeUndefined();
    expect(responseSchema(logout?.responses['401'])).toEqual(errorSchema);
    expect(responseSchema(logout?.responses['403'])).toEqual(errorSchema);
    expect(logout?.responses).toHaveProperty('500');
    expect(responseSchema(logout?.responses['500'])).toEqual(errorSchema);
    expect(document.paths).not.toHaveProperty('/api/v1/health');
  });

  it('preserves the login request and bearer security in the generated snapshot', () => {
    const login = generatedDocument.paths['/api/v1/auth/login']?.post;
    const me = generatedDocument.paths['/api/v1/me']?.get;
    const errorSchema = generatedDocument.components?.schemas?.ApiErrorResponseDto as {
      properties: { details: { oneOf: { type: string; items?: unknown }[] } };
    };

    expect((login?.requestBody as { required?: boolean } | undefined)?.required).toBe(true);
    expect(login?.responses).toHaveProperty('400');
    expect(errorSchema.properties.details.oneOf).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'array', items: {} }),
    ]));
    expect(me?.responses).toHaveProperty('500');
    expect(responseSchema(me?.responses['500'])).toEqual({ $ref: '#/components/schemas/ApiErrorResponseDto' });
    const logout = generatedDocument.paths['/api/v1/auth/logout']?.post;
    expect(logout?.responses).toHaveProperty('500');
    expect(responseSchema(logout?.responses['500'])).toEqual({ $ref: '#/components/schemas/ApiErrorResponseDto' });
    expect(me?.security).toEqual([{ bearerAuth: [] }]);
    expect(generatedDocument.components?.securitySchemes?.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer' });
    expect(generatedDocument.paths).not.toHaveProperty('/api/v1/health');
  });

  it('documents the Student dashboard contract and bearer authorization', () => {
    const dashboard = document.paths['/api/v1/student/dashboard']?.get;
    const dashboardSchema = document.components?.schemas?.StudentDashboardResponseDto;

    expect(dashboard?.security).toEqual([{ bearerAuth: [] }]);
    expect(responseSchema(dashboard?.responses['200'])).toEqual({ $ref: '#/components/schemas/StudentDashboardResponseDto' });
    expect(dashboard?.responses).toHaveProperty('401');
    expect(dashboard?.responses).toHaveProperty('403');
    expect(dashboard?.responses).toHaveProperty('500');
    expect(dashboardSchema).toBeDefined();

    const generatedDashboard = generatedDocument.paths['/api/v1/student/dashboard']?.get;
    expect(generatedDashboard?.security).toEqual([{ bearerAuth: [] }]);
    expect(responseSchema(generatedDashboard?.responses['200']))
      .toEqual({ $ref: '#/components/schemas/StudentDashboardResponseDto' });
    expect(generatedDocument.components?.schemas?.StudentDashboardResponseDto).toBeDefined();
  });

  it('generates all six Administrator Phase 1 contracts with bearer security and frozen response types', () => {
    const routes = [
      ['/api/v1/admin/dashboard', 'get', 'AdminDashboardResponseDto'],
      ['/api/v1/admin/users', 'get', 'AdminUsersResponseDto'],
      ['/api/v1/admin/users/{userId}/status', 'patch', 'AdminUserStatusResponseDto'],
      ['/api/v1/admin/feedback', 'get', 'AdminFeedbackResponseDto'],
      ['/api/v1/admin/feedback/analyses', 'get', 'AdminHistoryResponseDto'],
      ['/api/v1/admin/feedback/analyses/{analysisId}', 'get', 'AdminHistoryDetailDto'],
    ] as const;
    for (const source of [document, generatedDocument]) {
      for (const [path, method, responseType] of routes) {
        const operation = source.paths[path]?.[method];
        expect(operation?.security).toEqual([{ bearerAuth: [] }]);
        expect(responseSchema(operation?.responses['200'])).toEqual({ $ref: `#/components/schemas/${responseType}` });
        for (const status of ['401', '403', '500']) expect(responseSchema(operation?.responses[status])).toEqual({ $ref: '#/components/schemas/ApiErrorResponseDto' });
      }
      const changeStatus = source.paths['/api/v1/admin/users/{userId}/status']?.patch;
      for (const status of ['400', '404', '409']) expect(changeStatus?.responses).toHaveProperty(status);
      expect((changeStatus?.requestBody as { content: Record<string, { schema: unknown }> }).content['application/json'].schema)
        .toEqual({ $ref: '#/components/schemas/UpdateUserStatusDto' });
      expect(source.paths['/api/v1/admin/feedback/analyses']?.post).toBeUndefined();
      expect(source.paths).not.toHaveProperty('/api/v1/admin/feedback/analysis');
    }
  });

  it('generates all six Teacher Phase 1 contracts with bearer security and frozen response types', () => {
    const routes = [
      ['/api/v1/teacher/classes', 'get', 'TeacherClassesResponseDto'],
      ['/api/v1/teacher/classes/{classId}/dashboard', 'get', 'ClassDashboardResponseDto'],
      ['/api/v1/teacher/classes/{classId}/students', 'get', 'ClassStudentsResponseDto'],
      ['/api/v1/teacher/classes/{classId}/students/{studentId}', 'get', 'StudentDetailResponseDto'],
      ['/api/v1/teacher/classes/{classId}/analysis-reports', 'get', 'TeacherHistoryResponseDto'],
      ['/api/v1/teacher/classes/{classId}/analysis-reports/{reportId}', 'get', 'TeacherHistoryDetailDto'],
    ] as const;
    for (const source of [document, generatedDocument]) {
      for (const [path, method, responseType] of routes) {
        const operation = source.paths[path]?.[method];
        expect(operation?.security).toEqual([{ bearerAuth: [] }]);
        expect(responseSchema(operation?.responses['200'])).toEqual({ $ref: `#/components/schemas/${responseType}` });
        for (const status of ['401', '403', '500']) expect(responseSchema(operation?.responses[status])).toEqual({ $ref: '#/components/schemas/ApiErrorResponseDto' });
      }
    }
  });

  it('documents Administrator pagination, filters and reusable stored snapshot schemas', () => {
    for (const source of [document, generatedDocument]) {
      const parameters = source.paths['/api/v1/admin/feedback']?.get?.parameters?.filter((parameter) => 'name' in parameter) ?? [];
      expect(parameters.find(({ name }) => name === 'page')).toMatchObject({ required: false, schema: { default: 1, minimum: 1 } });
      expect(parameters.find(({ name }) => name === 'limit')).toMatchObject({ required: false, schema: { default: 20, minimum: 1, maximum: 100 } });
      expect(parameters.find(({ name }) => name === 'rating')).toMatchObject({ schema: { minimum: 1, maximum: 5 } });
      expect(parameters.find(({ name }) => name === 'tag')?.schema).toMatchObject({ enum: ['AI_PERFORMANCE', 'STUDY_PLAN', 'UI_UX', 'LEARNING_ANALYTICS', 'OTHER'] });
      for (const name of ['fromDate', 'toDate']) expect(parameters.find((item) => item.name === name)).toMatchObject({ required: false, schema: { type: 'string', format: 'date-time' } });
      const schemas = source.components?.schemas ?? {};
      const filter = schemas.FeedbackAnalysisFilterDto as { required?: string[]; properties: Record<string, { nullable?: boolean }> };
      expect(filter.required ?? []).toEqual([]);
      for (const name of ['fromDate', 'toDate', 'rating', 'tag']) expect(filter.properties[name].nullable).toBe(true);
      const snapshot = schemas.FeedbackAnalysisInputSnapshotDto as { required: string[]; properties: Record<string, unknown> };
      expect(snapshot.required).toEqual(expect.arrayContaining(['filter', 'feedbackIds', 'totalFeedback', 'tagStatistics']));
      const result = schemas.FeedbackAnalysisResultDto as { properties: Record<string, unknown> };
      expect(result.properties.priorityAreas).toEqual({ type: 'array', items: { type: 'string' } });
      expect(result.properties.recommendations).toEqual({ type: 'array', items: { $ref: '#/components/schemas/FeedbackRecommendationDto' } });
      const user = schemas.AdminUserDto as { properties: Record<string, unknown> };
      expect(user.properties).not.toHaveProperty('passwordHash');
    }
  });

  it('documents the Student task status path parameter and required request body', () => {
    const assertTaskStatusContract = (operation: OpenAPIObject['paths'][string]['patch']) => {
      expect(operation?.parameters).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: 'taskId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        }),
      ]));
      expect(operation?.requestBody).toMatchObject({
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateStudyTaskStatusRequestDto' },
          },
        },
      });
    };

    assertTaskStatusContract(document.paths['/api/v1/student/study-tasks/{taskId}/status']?.patch);
    assertTaskStatusContract(generatedDocument.paths['/api/v1/student/study-tasks/{taskId}/status']?.patch);
  });

  it('documents the authenticated feedback create contract and validation fields', () => {
    const feedback = document.paths['/api/v1/feedback']?.post;
    const schemas = document.components?.schemas ?? {};
    const requestSchema = schemas.CreateFeedbackRequestDto as {
      required?: string[];
      properties?: Record<string, { enum?: string[]; type?: string; minimum?: number; maximum?: number }>;
    };
    const assertContract = (operation: typeof feedback) => {
      expect(operation?.security).toEqual([{ bearerAuth: [] }]);
      expect(operation?.responses).toHaveProperty('201');
      expect(operation?.responses).toHaveProperty('400');
      expect(operation?.responses).toHaveProperty('401');
      expect(operation?.responses).toHaveProperty('403');
      expect(operation?.responses).toHaveProperty('500');
      expect(responseSchema(operation?.responses['201'])).toEqual({ $ref: '#/components/schemas/CreateFeedbackResponseDto' });
      expect(responseSchema(operation?.responses['400'])).toEqual({ $ref: '#/components/schemas/ApiErrorResponseDto' });
    };

    expect(feedback).toBeDefined();
    assertContract(feedback);
    assertContract(generatedDocument.paths['/api/v1/feedback']?.post);
    expect(requestSchema.required).toEqual(expect.arrayContaining(['tag', 'rating', 'content']));
    expect(requestSchema.properties?.tag.enum).toEqual(['AI_PERFORMANCE', 'STUDY_PLAN', 'UI_UX', 'LEARNING_ANALYTICS', 'OTHER']);
    expect(requestSchema.properties?.rating).toMatchObject({ type: 'integer', minimum: 1, maximum: 5 });
    expect(generatedDocument.components?.schemas?.CreateFeedbackRequestDto).toBeDefined();
    expect(generatedDocument.components?.schemas?.CreateFeedbackResponseDto).toBeDefined();
  });

  it('documents the validation error returned by the real login boundary', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'invalid-email' })
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Dữ liệu đầu vào không hợp lệ.',
      details: expect.arrayContaining([expect.any(String)]),
    });

    const login = document.paths['/api/v1/auth/login']?.post;
    const errorResponse = (login?.responses['400'] as {
      content?: Record<string, { schema?: unknown }>;
    } | undefined)?.content?.['application/json']?.schema;
    expect(errorResponse).toEqual({ $ref: '#/components/schemas/ApiErrorResponseDto' });
    const errorSchema = document.components?.schemas?.ApiErrorResponseDto as {
      properties: { details: { oneOf: { type: string; items?: unknown }[] } };
    };
    expect(errorSchema.properties.details.oneOf).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'array', items: {} }),
    ]));
  });
});
