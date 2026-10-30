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
const registryPrompts: Record<AiTask, string> = {
  STUDENT_LEARNING_ANALYSIS: 'stu-learning-analysis-v1',
  STUDENT_STUDY_PLAN_GENERATION: 'stu-study-plan-v1',
  STUDENT_STUDY_PLAN_ADJUSTMENT: 'stu-study-adjust-v1',
  TEACHER_CLASS_ANALYSIS: 'tea-class-analysis-v1',
  ADMIN_FEEDBACK_GROUPING_STAGE1: 'adm-feedback-group-v1',
  ADMIN_FEEDBACK_SUMMARY_STAGE2: 'adm-feedback-summary-v1',
};

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
  (process.env.AI_RUNTIME_LIVE_SMOKE === '1' ? it : it.skip)('validates one real output through the live Colab runtime', async () => {
    const baseUrl = process.env.AI_RUNTIME_BASE_URL;
    const token = process.env.AI_RUNTIME_TOKEN;
    if (baseUrl !== 'http://127.0.0.1:8000' || !token) throw new Error('live smoke requires the notebook loopback runtime and token');
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
      { registryPromptVersions: registryPrompts, profilePromptVersions: registryPrompts },
    );
    const output = await service.execute(
      buildRequest(task, fixture(`${slugs[task]}.input.json`), `live-${Date.now()}`), principal, {},
    );
    expect(schemas.get(task).output(output)).toBe(true);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ feature: task, status: 'SUCCESS' });
  }, 60_000);

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
