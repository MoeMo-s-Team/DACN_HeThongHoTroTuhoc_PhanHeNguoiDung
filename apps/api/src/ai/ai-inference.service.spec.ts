import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AuthUser } from '../auth/auth.service';
import { buildRequest } from './capacity-preflight.service';
import { AiInferenceService, AiInvocationPolicy, DenyAllAiInvocationPolicy } from './ai-inference.service';
import { AiRequestLogRepository } from './ai-request-log.repository';
import { AiGatewayError, AiGatewayService } from './ai-gateway.service';
import { AiSemanticValidator } from './ai-semantic-validator';
import { SchemaRegistryService } from './schema-registry.service';

const principal: AuthUser = {
  id: '00000000-0000-4000-8000-000000000001', fullName: 'A', email: 'a@example.test', role: 'STUDENT', status: 'ACTIVE',
};
const fixtures = join(process.cwd(), '../../docs/releases/ai-contract-v1.0-schema-pack-release1/fixtures/valid');
const fixture = (name: string) => JSON.parse(readFileSync(join(fixtures, name), 'utf8'));
const input = fixture('student-learning-analysis.input.json');
const output = fixture('student-learning-analysis.output.json');

function createService(overrides: {
  policy?: Partial<AiInvocationPolicy>;
  infer?: jest.Mock;
  createLog?: jest.Mock;
} = {}) {
  const policy: AiInvocationPolicy = overrides.policy instanceof DenyAllAiInvocationPolicy
    ? overrides.policy
    : { authorize: jest.fn(), checkEligibility: jest.fn(), ...overrides.policy };
  const gateway = { assertReady: jest.fn(), infer: overrides.infer ?? jest.fn().mockResolvedValue({
    status: 200,
    body: {
      contractVersion: '1.0', requestId: 'r1', task: 'STUDENT_LEARNING_ANALYSIS', output,
      runtime: { modelId: 'model-1', promptVersion: 'p1' },
    },
  }) } as unknown as AiGatewayService;
  const preflight = { preflight: jest.fn().mockReturnValue({ serializedPayload: '{}', estimatedInputTokens: 1, inputBudgetTokens: 10 }) };
  const logs = { createTerminal: overrides.createLog ?? jest.fn().mockResolvedValue(undefined) } as unknown as AiRequestLogRepository;
  const schemas = new SchemaRegistryService();
  const semantic = new AiSemanticValidator(schemas);
  const now = jest.fn().mockReturnValue(new Date('2026-10-28T00:00:00.000Z'));
  const monotonic = jest.fn().mockReturnValue(100);
  return {
    service: new AiInferenceService(preflight as never, schemas, semantic, gateway, logs, policy, {
      registryPromptVersions: { STUDENT_LEARNING_ANALYSIS: 'p1' },
      profilePromptVersions: { STUDENT_LEARNING_ANALYSIS: 'p1' },
      now,
      monotonic,
    }),
    policy,
    preflight,
    schemas,
    semantic,
    gateway: gateway as unknown as { assertReady: jest.Mock; infer: jest.Mock },
    logs: logs as unknown as { createTerminal: jest.Mock },
    now,
    monotonic,
  };
}

describe('AiInferenceService trusted invocation and attempt lifecycle', () => {
  it('checks trusted principal, authorization, eligibility, preflight, then dispatches and logs one terminal success', async () => {
    const ctx = createService();
    const request = buildRequest('STUDENT_LEARNING_ANALYSIS', input, 'r1');
    const order: string[] = [];
    (ctx.policy.authorize as jest.Mock).mockImplementation(() => order.push('authorize'));
    (ctx.policy.checkEligibility as jest.Mock).mockImplementation(() => order.push('eligibility'));
    const validateEnvelope = ctx.schemas.validateEnvelope.bind(ctx.schemas);
    jest.spyOn(ctx.schemas, 'validateEnvelope').mockImplementation((kind, value) => {
      if (kind === 'request') order.push('request-envelope');
      return validateEnvelope(kind, value);
    });
    const validateInput = ctx.semantic.validateInput.bind(ctx.semantic);
    jest.spyOn(ctx.semantic, 'validateInput').mockImplementation((...args) => {
      order.push('input-semantic');
      return validateInput(...args);
    });
    ctx.preflight.preflight.mockImplementation(() => {
      order.push('preflight');
      return { serializedPayload: '{}', estimatedInputTokens: 1, inputBudgetTokens: 10 };
    });
    ctx.gateway.assertReady.mockImplementation(() => order.push('runtime-ready'));
    ctx.now.mockImplementation(() => {
      order.push('dispatch-time');
      return new Date('2026-10-28T00:00:00.000Z');
    });
    ctx.gateway.infer.mockImplementation(async () => {
      order.push('dispatch');
      expect(ctx.now).toHaveBeenCalledTimes(1);
      return { status: 200, body: {
        contractVersion: '1.0', requestId: 'r1', task: 'STUDENT_LEARNING_ANALYSIS', output,
        runtime: { modelId: 'model-1', promptVersion: 'p1' },
      } };
    });
    ctx.logs.createTerminal.mockImplementation(async () => { order.push('terminal-log'); });
    await expect(ctx.service.execute(request, principal, { studentId: principal.id })).resolves.toEqual(output);
    expect(ctx.policy.authorize).toHaveBeenCalledWith(principal, request.task, { studentId: principal.id });
    expect(ctx.policy.checkEligibility).toHaveBeenCalledWith(principal, request.task, { studentId: principal.id });
    expect(ctx.gateway.infer).toHaveBeenCalledTimes(1);
    expect(ctx.logs.createTerminal).toHaveBeenCalledWith(expect.objectContaining({
      userId: principal.id, feature: request.task, status: 'SUCCESS', errorCode: null,
      durationMs: expect.any(Number), createdAt: new Date('2026-10-28T00:00:00.000Z'),
    }));
    expect(ctx.logs.createTerminal.mock.calls[0][0]).not.toHaveProperty('request');
    expect(order).toEqual(['authorize', 'eligibility', 'request-envelope', 'input-semantic', 'preflight', 'runtime-ready', 'dispatch-time', 'dispatch', 'terminal-log']);
  });

  it('stores null duration when monotonic timing is unavailable', async () => {
    const ctx = createService();
    ctx.monotonic.mockReturnValueOnce(Number.NaN);
    await ctx.service.execute(buildRequest('STUDENT_LEARNING_ANALYSIS', input, 'r1'), principal, {});
    expect(ctx.logs.createTerminal).toHaveBeenCalledWith(expect.objectContaining({ durationMs: null }));
  });

  it.each([
    ['missing principal', undefined, {}],
    ['authorization denial', principal, { authorize: jest.fn().mockRejectedValue(new Error('denied')) }],
    ['eligibility denial', principal, { checkEligibility: jest.fn().mockRejectedValue(new Error('ineligible')) }],
  ])('rejects %s before dispatch or logging', async (_label, actor, policyOverride) => {
    expect(_label).toBeTruthy();
    const ctx = createService({ policy: policyOverride as Partial<AiInvocationPolicy> });
    await expect(ctx.service.execute(buildRequest('STUDENT_LEARNING_ANALYSIS', input, 'r1'), actor as AuthUser, {})).rejects.toBeDefined();
    expect(ctx.gateway.infer).not.toHaveBeenCalled();
    expect(ctx.logs.createTerminal).not.toHaveBeenCalled();
  });

  it('keeps the production deny-all policy before preflight and dispatch', async () => {
    const deny = new DenyAllAiInvocationPolicy();
    const ctx = createService({ policy: deny });
    await expect(ctx.service.execute(buildRequest('STUDENT_LEARNING_ANALYSIS', input, 'r1'), principal, {})).rejects.toBeDefined();
    expect(ctx.gateway.infer).not.toHaveBeenCalled();
    expect(ctx.logs.createTerminal).not.toHaveBeenCalled();
  });

  it('does not create an attempt log when runtime configuration fails readiness checks', async () => {
    const ctx = createService();
    ctx.gateway.assertReady.mockImplementation(() => { throw new AiGatewayError('AI_RUNTIME_FAILURE', 502, 'AI_RUNTIME_CONFIGURATION_FAILURE'); });
    await expect(ctx.service.execute(buildRequest('STUDENT_LEARNING_ANALYSIS', input, 'r1'), principal, {})).rejects.toMatchObject({
      internalCode: 'AI_RUNTIME_CONFIGURATION_FAILURE',
    });
    expect(ctx.gateway.infer).not.toHaveBeenCalled();
    expect(ctx.logs.createTerminal).not.toHaveBeenCalled();
  });

  it.each([
    'STUDENT_LEARNING_ANALYSIS', 'STUDENT_STUDY_PLAN_GENERATION', 'STUDENT_STUDY_PLAN_ADJUSTMENT',
    'TEACHER_CLASS_ANALYSIS', 'ADMIN_FEEDBACK_GROUPING_STAGE1', 'ADMIN_FEEDBACK_SUMMARY_STAGE2',
  ] as const)('uses the contract feature key for %s', async (task) => {
    const ctx = createService();
    const response = { contractVersion: '1.0', requestId: 'r1', task, output, runtime: { modelId: 'model-1', promptVersion: 'p1' } };
    ctx.gateway.infer.mockResolvedValue({ status: 200, body: response });
    const taskInput = task === 'STUDENT_LEARNING_ANALYSIS' ? input : fixture(`${task.toLowerCase().replaceAll('_', '-')}.input.json`);
    await ctx.service.execute(buildRequest(task, taskInput, 'r1'), principal, {}).catch(() => undefined);
    expect(ctx.logs.createTerminal).toHaveBeenCalledWith(expect.objectContaining({ feature: task }));
  });

  it('records prompt mismatch as one failed attempt and returns no output', async () => {
    const infer = jest.fn().mockResolvedValue({ status: 200, body: {
      contractVersion: '1.0', requestId: 'r1', task: 'STUDENT_LEARNING_ANALYSIS', output,
      runtime: { modelId: 'model-1', promptVersion: 'p2' },
    } });
    const ctx = createService({ infer });
    await expect(ctx.service.execute(buildRequest('STUDENT_LEARNING_ANALYSIS', input, 'r1'), principal, {})).rejects.toMatchObject({
      code: 'AI_RUNTIME_FAILURE',
    });
    expect(infer).toHaveBeenCalledTimes(1);
    expect(ctx.logs.createTerminal).toHaveBeenCalledTimes(1);
    expect(ctx.logs.createTerminal).toHaveBeenCalledWith(expect.objectContaining({
      status: 'FAILED', errorCode: 'AI_RUNTIME_PROMPT_VERSION_MISMATCH',
    }));
  });

  it('persists a terminal failure on runtime error, without retry', async () => {
    const infer = jest.fn().mockRejectedValue(new AiGatewayError('AI_TIMEOUT'));
    const ctx = createService({ infer });
    await expect(ctx.service.execute(buildRequest('STUDENT_LEARNING_ANALYSIS', input, 'r1'), principal, {})).rejects.toMatchObject({ code: 'AI_TIMEOUT' });
    expect(infer).toHaveBeenCalledTimes(1);
    expect(ctx.logs.createTerminal).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILED', errorCode: 'AI_TIMEOUT' }));
  });

  it('fails closed when terminal persistence fails and returns no output', async () => {
    const ctx = createService({ createLog: jest.fn().mockRejectedValue(new Error('database unavailable')) });
    await expect(ctx.service.execute(buildRequest('STUDENT_LEARNING_ANALYSIS', input, 'r1'), principal, {})).rejects.toThrow('database unavailable');
    expect(ctx.gateway.infer).toHaveBeenCalledTimes(1);
    expect(ctx.logs.createTerminal).toHaveBeenCalledTimes(1);
  });
});
