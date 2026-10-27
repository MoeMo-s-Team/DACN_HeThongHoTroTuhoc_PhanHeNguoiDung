import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OpenAPIObject } from '@nestjs/swagger';
import request from 'supertest';
import { AppModule } from './app.module';
import { createOpenApiDocument } from './openapi';
import { PrismaService } from './prisma/prisma.service';

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
    const responseSchema = (response: unknown) => (response as {
      content?: Record<string, { schema?: unknown }>;
    } | undefined)?.content?.['application/json']?.schema;
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

    expect(logout?.security).toEqual([{ bearerAuth: [] }]);
    expect((logout?.responses['204'] as { content?: unknown } | undefined)?.content).toBeUndefined();
    expect(responseSchema(logout?.responses['401'])).toEqual(errorSchema);
    expect(responseSchema(logout?.responses['403'])).toEqual(errorSchema);
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
    expect(me?.security).toEqual([{ bearerAuth: [] }]);
    expect(generatedDocument.components?.securitySchemes?.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer' });
    expect(generatedDocument.paths).not.toHaveProperty('/api/v1/health');
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
