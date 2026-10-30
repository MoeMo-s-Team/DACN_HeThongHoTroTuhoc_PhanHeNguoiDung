import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { connect, createServer } from 'node:net';
import { join } from 'node:path';
import { HttpException } from '@nestjs/common';
import { AuthUser } from '../auth/auth.service';
import { AiInferenceService } from './ai-inference.service';
import { AiRequestLogRepository } from './ai-request-log.repository';
import { AiGatewayService } from './ai-gateway.service';
import { AiSemanticValidator } from './ai-semantic-validator';
import { RuntimeHttpClient } from './runtime-http.client';
import { buildRequest } from './capacity-preflight.service';
import { SchemaRegistryService, AiTask } from './schema-registry.service';
import { startScriptedRuntime } from './test-support/scripted-runtime-http';

const tasks: AiTask[] = [
  'STUDENT_LEARNING_ANALYSIS', 'STUDENT_STUDY_PLAN_GENERATION', 'STUDENT_STUDY_PLAN_ADJUSTMENT',
  'TEACHER_CLASS_ANALYSIS', 'ADMIN_FEEDBACK_GROUPING_STAGE1', 'ADMIN_FEEDBACK_SUMMARY_STAGE2',
];
const slugs: Record<AiTask, string> = {
  STUDENT_LEARNING_ANALYSIS: 'student-learning-analysis',
  STUDENT_STUDY_PLAN_GENERATION: 'student-study-plan-generation',
  STUDENT_STUDY_PLAN_ADJUSTMENT: 'student-study-plan-adjustment',
  TEACHER_CLASS_ANALYSIS: 'teacher-class-analysis',
  ADMIN_FEEDBACK_GROUPING_STAGE1: 'admin-feedback-grouping-stage1',
  ADMIN_FEEDBACK_SUMMARY_STAGE2: 'admin-feedback-summary-stage2',
};
const fixture = (name: string) => JSON.parse(readFileSync(join(
  process.cwd(), '../../docs/releases/ai-contract-v1.0-schema-pack-release1/fixtures/valid', name,
), 'utf8'));
const principal: AuthUser = {
  id: '00000000-0000-4000-8000-000000000001', fullName: 'A', email: 'a@example.test',
  role: 'STUDENT', status: 'ACTIVE',
};
const prompts = Object.fromEntries(tasks.map((task) => [task, `prompt-${task}`]));

describe('live-smoke configuration', () => {
  const promptBindings = JSON.stringify(prompts);
  const requiredEnv = {
    AI_RUNTIME_LIVE_SMOKE: '1',
    AI_RUNTIME_LIVE_ROUTE: 'loopback',
    AI_RUNTIME_EXPECTED_ORIGIN: 'http://127.0.0.1:8000',
    AI_RUNTIME_BASE_URL: 'http://127.0.0.1:8000',
    AI_RUNTIME_TOKEN: 'test-token',
    AI_RUNTIME_PROMPT_VERSIONS: promptBindings,
  };

  it.each([
    ['loopback', 'http://127.0.0.1:8000'],
    ['tailscale-serve', 'https://gpu-host.example.ts.net'],
  ])('accepts the explicit %s origin', (route, origin) => {
    const env = {
      ...requiredEnv,
      AI_RUNTIME_LIVE_ROUTE: route,
      AI_RUNTIME_EXPECTED_ORIGIN: origin,
      AI_RUNTIME_BASE_URL: origin,
    };
    expect(readLiveSmokeConfiguration(env)).toMatchObject({ baseUrl: origin, token: 'test-token' });
  });

  it.each([
    ['opt-in', { AI_RUNTIME_LIVE_SMOKE: undefined }],
    ['route', { AI_RUNTIME_LIVE_ROUTE: undefined }],
    ['expected origin', { AI_RUNTIME_EXPECTED_ORIGIN: undefined }],
    ['runtime URL', { AI_RUNTIME_BASE_URL: undefined }],
    ['token', { AI_RUNTIME_TOKEN: undefined }],
    ['prompt bindings', { AI_RUNTIME_PROMPT_VERSIONS: undefined }],
  ])('rejects missing %s before fetch', (_name, overrides) => {
    expect(() => readLiveSmokeConfiguration({ ...requiredEnv, ...overrides })).toThrow();
  });

  it.each([
    ['unknown route', { AI_RUNTIME_LIVE_ROUTE: 'public' }],
    ['origin mismatch', { AI_RUNTIME_BASE_URL: 'https://other-host.example.ts.net' }],
    ['loopback non-origin URL', { AI_RUNTIME_BASE_URL: 'http://127.0.0.1:8000/path' }],
    ['malformed prompt bindings', { AI_RUNTIME_PROMPT_VERSIONS: '{' }],
    ['incomplete prompt bindings', { AI_RUNTIME_PROMPT_VERSIONS: JSON.stringify({ STUDENT_LEARNING_ANALYSIS: 'v1' }) }],
    ['Serve URL with credentials', {
      AI_RUNTIME_LIVE_ROUTE: 'tailscale-serve',
      AI_RUNTIME_EXPECTED_ORIGIN: 'https://user:secret@gpu-host.example.ts.net',
      AI_RUNTIME_BASE_URL: 'https://user:secret@gpu-host.example.ts.net',
    }],
    ['Serve URL outside ts.net', {
      AI_RUNTIME_LIVE_ROUTE: 'tailscale-serve',
      AI_RUNTIME_EXPECTED_ORIGIN: 'https://gpu-host.example.com',
      AI_RUNTIME_BASE_URL: 'https://gpu-host.example.com',
    }],
  ])('rejects %s before fetch', (_name, overrides) => {
    expect(() => readLiveSmokeConfiguration({ ...requiredEnv, ...overrides })).toThrow();
  });

  it('rejects the live route when CI=true even with explicit opt-in', () => {
    expect(() => readLiveSmokeConfiguration({ ...requiredEnv, CI: 'true' })).toThrow();
  });
});

function readLivePromptBindings(raw = process.env.AI_RUNTIME_PROMPT_VERSIONS): Record<AiTask, string> {
  if (!raw) throw new Error('live smoke requires AI_RUNTIME_PROMPT_VERSIONS from the runtime registry');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('live prompt bindings are not valid JSON'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
    || tasks.some((task) => typeof (parsed as Record<string, unknown>)[task] !== 'string'
      || !(parsed as Record<string, string>)[task].trim())) {
    throw new Error('live prompt bindings must include every current AI task');
  }
  return parsed as Record<AiTask, string>;
}

function readLiveSmokeConfiguration(env: NodeJS.ProcessEnv): {
  baseUrl: string;
  token: string;
  promptVersions: Record<AiTask, string>;
} {
  if (env.CI?.toLowerCase() === 'true' || env.AI_RUNTIME_LIVE_SMOKE !== '1') {
    throw new Error('live smoke is not explicitly enabled outside CI');
  }
  const route = env.AI_RUNTIME_LIVE_ROUTE;
  const expectedOrigin = env.AI_RUNTIME_EXPECTED_ORIGIN;
  const baseUrl = env.AI_RUNTIME_BASE_URL;
  const token = env.AI_RUNTIME_TOKEN;
  if (!route || !expectedOrigin || !baseUrl || !token?.trim() || !env.AI_RUNTIME_PROMPT_VERSIONS) {
    throw new Error('live smoke configuration is incomplete');
  }

  let expectedUrl: URL;
  let configuredUrl: URL;
  try {
    expectedUrl = new URL(expectedOrigin);
    configuredUrl = new URL(baseUrl);
  } catch {
    throw new Error('live smoke origin is invalid');
  }
  const isExactOrigin = (value: string, parsed: URL) => value === parsed.origin
    && parsed.pathname === '/' && !parsed.search && !parsed.hash && !parsed.username && !parsed.password;
  if (!isExactOrigin(expectedOrigin, expectedUrl) || !isExactOrigin(baseUrl, configuredUrl)
    || baseUrl !== expectedOrigin) {
    throw new Error('live smoke must use the exact expected origin');
  }

  if (route === 'loopback') {
    if (expectedOrigin !== 'http://127.0.0.1:8000') throw new Error('loopback route must use the local runtime origin');
  } else if (route === 'tailscale-serve') {
    if (expectedUrl.protocol !== 'https:' || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.ts\.net$/i.test(expectedUrl.hostname)) {
      throw new Error('Tailscale Serve route must use an HTTPS ts.net origin');
    }
  } else {
    throw new Error('live smoke route is invalid');
  }

  return {
    baseUrl,
    token,
    promptVersions: readLivePromptBindings(env.AI_RUNTIME_PROMPT_VERSIONS),
  };
}

async function startPythonRuntime(raw: string): Promise<{ baseUrl: string; close(): Promise<void> }> {
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const address = reservation.address();
  if (!address || typeof address === 'string') throw new Error('Could not reserve local port');
  const port = address.port;
  await new Promise<void>((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  const repoRoot = join(process.cwd(), '../..');
  const child: ChildProcess = spawn(process.env.DACN_PYTHON ?? 'python', [
    join(repoRoot, 'ai/tests/runtime_http_server.py'), String(port), raw,
  ], { cwd: repoRoot, stdio: 'ignore', env: { ...process.env, PYTHONPATH: repoRoot } });
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    if (child.exitCode !== null) throw new Error(`Python runtime exited with ${child.exitCode}`);
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = connect(port, '127.0.0.1', () => { socket.destroy(); resolve(); });
        socket.once('error', reject);
      });
      return {
        baseUrl: `http://127.0.0.1:${port}`,
        close: async () => { child.kill('SIGTERM'); await once(child, 'exit'); },
      };
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  child.kill('SIGKILL');
  throw new Error('Python runtime did not become ready');
}

function makeService(baseUrl: string, entries: unknown[], requests: string[]) {
  const schemas = new SchemaRegistryService();
  const client = new RuntimeHttpClient({ baseUrl, apiKey: 'test-runtime-token' }, (url, init) => {
    requests.push(String(url));
    return fetch(url, init);
  });
  const gateway = new AiGatewayService(client, schemas);
  return new AiInferenceService(
    { preflight: jest.fn() } as never,
    schemas,
    new AiSemanticValidator(schemas),
    gateway,
    { createTerminal: jest.fn(async (entry) => { entries.push(entry); }) } as unknown as AiRequestLogRepository,
    { authorize: jest.fn(), checkEligibility: jest.fn() },
    { registryPromptVersions: prompts, profilePromptVersions: prompts },
  );
}

async function publicError(action: Promise<unknown>): Promise<HttpException> {
  try {
    await action;
  } catch (error) {
    if (error instanceof HttpException) return error;
    throw error;
  }
  throw new Error('Expected inference to fail');
}

describe('AI Runtime E5/E6 receive boundary', () => {
  it('loads live prompt bindings from the runtime configuration map', () => {
    const expected = Object.fromEntries(tasks.map((task) => [task, `runtime-${task}`]));
    expect(readLivePromptBindings(JSON.stringify(expected))).toEqual(expected);
  });

  (process.env.AI_RUNTIME_LIVE_SMOKE === '1' && process.env.CI?.toLowerCase() !== 'true' ? it : it.skip)(
    'validates one real output through the explicitly selected live Runtime route', async () => {
    const { baseUrl, token, promptVersions: livePromptBindings } = readLiveSmokeConfiguration(process.env);
    const task: AiTask = 'STUDENT_LEARNING_ANALYSIS';
    const schemas = new SchemaRegistryService();
    const client = new RuntimeHttpClient({ baseUrl, apiKey: token });
    const gateway = new AiGatewayService(client, schemas);
    const logs: unknown[] = [];
    const service = new AiInferenceService(
      { preflight: jest.fn() } as never,
      schemas,
      new AiSemanticValidator(schemas),
      gateway,
      { createTerminal: jest.fn(async (entry) => { logs.push(entry); }) } as unknown as AiRequestLogRepository,
      { authorize: jest.fn(), checkEligibility: jest.fn() },
      { registryPromptVersions: livePromptBindings, profilePromptVersions: livePromptBindings },
    );
    const output = await service.execute(
      buildRequest(task, fixture(`${slugs[task]}.input.json`), `live-${Date.now()}`), principal, {},
    );
    expect(schemas.get(task).output(output)).toBe(true);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ feature: task, status: 'SUCCESS' });
    }, 60_000,
  );

  it.each(tasks)('maps E5 inference failure for %s to one failed log', async (task) => {
    const requestId = `wire-${task}`;
    const server = await startPythonRuntime('{malformed-model-output');
    const logs: unknown[] = [];
    const requests: string[] = [];
    try {
      const service = makeService(server.baseUrl, logs, requests);
      const error = await publicError(service.execute(
        buildRequest(task, fixture(`${slugs[task]}.input.json`), requestId), principal, {},
      ));
      expect(error.getResponse()).toEqual({
        code: 'AI_RUNTIME_FAILURE',
        message: 'AI tạm thời chưa thể xử lý yêu cầu. Vui lòng thử lại sau.',
        details: null,
      });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({ feature: task, status: 'FAILED', errorCode: 'AI_RUNTIME_INFERENCE_FAILURE' });
      expect(requests).toHaveLength(1);
    } finally {
      await server.close();
    }
  });

  it.each(tasks)('keeps NestJS authoritative for parsed objects on %s', async (task) => {
    const requestId = `invalid-${task}`;
    const server = await startPythonRuntime('{}');
    const logs: unknown[] = [];
    const requests: string[] = [];
    try {
      const service = makeService(server.baseUrl, logs, requests);
      const error = await publicError(service.execute(
        buildRequest(task, fixture(`${slugs[task]}.input.json`), requestId), principal, {},
      ));
      expect(error.getResponse()).toEqual({
        code: 'AI_INCOMPLETE_DATA', message: 'AI trả dữ liệu chưa đầy đủ.', details: null,
      });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({ feature: task, status: 'FAILED', errorCode: 'AI_INCOMPLETE_DATA' });
      expect(requests).toHaveLength(1);
    } finally {
      await server.close();
    }
  });

  it('maps whitespace-only required output to incomplete data after Python pass-through', async () => {
    const server = await startPythonRuntime(JSON.stringify({ strengths: [], areasToImprove: ['   '], priorityTopics: [], reasons: [] }));
    const logs: unknown[] = [];
    const requests: string[] = [];
    try {
      const service = makeService(server.baseUrl, logs, requests);
      const error = await publicError(service.execute(
        buildRequest('STUDENT_LEARNING_ANALYSIS', fixture('student-learning-analysis.input.json'), 'whitespace'),
        principal, {},
      ));
      expect(error.getResponse()).toEqual({
        code: 'AI_INCOMPLETE_DATA', message: 'AI trả dữ liệu chưa đầy đủ.', details: null,
      });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({ status: 'FAILED', errorCode: 'AI_INCOMPLETE_DATA' });
      expect(requests).toHaveLength(1);
    } finally {
      await server.close();
    }
  });

  it.each([
    [503, 'RUNTIME_UNAVAILABLE', 'AI_CONNECTION_FAILURE', 'Không thể kết nối AI runtime.'],
    [504, 'RUNTIME_UNAVAILABLE', 'AI_TIMEOUT', 'AI tạm thời chưa phản hồi. Vui lòng thử lại.'],
  ] as const)('maps runtime status %s with one failed attempt and no retry', async (status, runtimeCode, publicCode, message) => {
    const requestId = `status-${status}`;
    const server = await startScriptedRuntime({
      status,
      body: JSON.stringify({
        contractVersion: '1.0', requestId,
        error: { code: runtimeCode, message: 'Runtime is unavailable' },
      }),
    });
    const logs: unknown[] = [];
    const requests: string[] = [];
    try {
      const service = makeService(server.baseUrl, logs, requests);
      const error = await publicError(service.execute(
        buildRequest('STUDENT_LEARNING_ANALYSIS', fixture('student-learning-analysis.input.json'), requestId),
        principal, {},
      ));
      expect(error.getResponse()).toEqual({ code: publicCode, message, details: null });
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({ status: 'FAILED', errorCode: publicCode });
      expect(requests).toHaveLength(1);
      expect(server.requests).toHaveLength(1);
    } finally {
      await server.close();
    }
  });

  it('maps malformed and empty 2xx HTTP bodies separately without retry', async () => {
    for (const [body, code, message] of [
      ['{', 'AI_INVALID_STRUCTURE', 'AI trả dữ liệu không hợp lệ.'],
      ['', 'AI_EMPTY_RESPONSE', 'AI trả response rỗng.'],
    ] as const) {
      const server = await startScriptedRuntime({ status: 200, body });
      const logs: unknown[] = [];
      const requests: string[] = [];
      try {
        const service = makeService(server.baseUrl, logs, requests);
        const error = await publicError(service.execute(
          buildRequest('STUDENT_LEARNING_ANALYSIS', fixture('student-learning-analysis.input.json'), `body-${code}`),
          principal, {},
        ));
        expect(error.getResponse()).toEqual({ code, message, details: null });
        expect(logs).toHaveLength(1);
        expect(logs[0]).toMatchObject({ status: 'FAILED', errorCode: code });
        expect(requests).toHaveLength(1);
        expect(server.requests).toHaveLength(1);
      } finally {
        await server.close();
      }
    }
  });
});
