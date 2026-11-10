import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { AI_RUNTIME_TIMEOUT_MS, loadAiConfig } from './ai.config';
import { AI_CONFIG } from './ai.module';

describe('AI runtime configuration', () => {
  it('loads valid server-side settings and fixes the attempt timeout at 60 seconds', () => {
    expect(loadAiConfig({
      AI_RUNTIME_BASE_URL: 'https://runtime.example/v1',
      AI_RUNTIME_TOKEN: 'runtime-secret',
    })).toEqual({
      available: true,
      baseUrl: 'https://runtime.example/v1',
      token: 'runtime-secret',
      timeoutMs: 60_000,
    });
    expect(AI_RUNTIME_TIMEOUT_MS).toBe(60_000);
  });

  it('marks missing AI settings unavailable without throwing', () => {
    expect(loadAiConfig({})).toEqual({
      available: false,
      reason: 'missing_configuration',
      timeoutMs: 60_000,
    });
  });

  it.each([
    ['malformed URL', { AI_RUNTIME_BASE_URL: 'file:///runtime', AI_RUNTIME_TOKEN: 'runtime-secret' }],
    ['blank token', { AI_RUNTIME_BASE_URL: 'https://runtime.example', AI_RUNTIME_TOKEN: '   ' }],
  ])('marks %s unavailable without exposing the token', (_case, values) => {
    const config = loadAiConfig(values);
    expect(config).toEqual({ available: false, reason: 'invalid_configuration', timeoutMs: 60_000 });
    expect(JSON.stringify(config)).not.toContain('runtime-secret');
  });

  it('initializes the API application when AI settings are absent', async () => {
    const original = {
      AI_RUNTIME_BASE_URL: process.env.AI_RUNTIME_BASE_URL,
      AI_RUNTIME_TOKEN: process.env.AI_RUNTIME_TOKEN,
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    };
    delete process.env.AI_RUNTIME_BASE_URL;
    delete process.env.AI_RUNTIME_TOKEN;
    process.env.JWT_ACCESS_SECRET = 'test-only-jwt-secret-with-enough-entropy';

    let app: TestingModule | undefined;
    try {
      app = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();
      await app.init();
      expect(app.get(AI_CONFIG)).toEqual({
        available: false,
        reason: 'missing_configuration',
        timeoutMs: 60_000,
      });
    } finally {
      await app?.close();
      for (const [key, value] of Object.entries(original)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
