import { AiConfig, type AiDeploymentBinding, type AiTaskConfig, type CapacityProfile } from './ai.config';
import { AiPreflightError, CapacityPreflightService, type TokenEstimator } from './capacity-preflight.service';

const task = 'STUDENT_STUDY_PLAN_GENERATION';
const taskConfig: AiTaskConfig = {
  reservedOutputTokens: 100,
  promptAndSchemaOverheadTokens: 50,
  promptVersion: 'prompt-v1',
};

function profile(overrides: Partial<CapacityProfile> = {}): CapacityProfile {
  return {
    capacityProfileVersion: 'profile-v1',
    modelId: 'model-v1',
    tokenizerId: 'tokenizer-v1',
    contractVersion: '1.0',
    contextWindowTokens: 1000,
    inputSafetyMarginTokens: 20,
    tasks: { [task]: taskConfig } as CapacityProfile['tasks'],
    ...overrides,
  };
}

function setup(estimate: (payload: string) => number, options: {
  profile?: CapacityProfile;
  missingProfile?: boolean;
  malformedProfile?: unknown;
  malformedDeployment?: unknown;
  deployment?: Partial<AiDeploymentBinding>;
  tokenizerId?: string;
  estimatorProfile?: string;
  registryPromptVersions?: unknown;
} = {}) {
  const estimator: TokenEstimator = {
    tokenizerId: options.tokenizerId ?? 'tokenizer-v1',
    capacityProfileVersion: options.estimatorProfile ?? 'profile-v1',
    estimate,
  };
  return new CapacityPreflightService(new AiConfig({
    capacityProfile: options.missingProfile ? undefined : options.malformedProfile as CapacityProfile | undefined ?? options.profile ?? profile(),
    deployment: (options.malformedDeployment as AiDeploymentBinding | undefined) ?? {
      modelId: options.deployment?.modelId ?? 'model-v1',
      tokenizerId: options.deployment?.tokenizerId ?? 'tokenizer-v1',
      contractVersion: options.deployment?.contractVersion ?? '1.0',
      promptVersions: options.deployment?.promptVersions ?? { [task]: 'prompt-v1' },
    },
    registryPromptVersions: options.registryPromptVersions as Partial<Record<typeof task, string>> ?? { [task]: 'prompt-v1' },
  }), estimator);
}

describe('CapacityPreflightService', () => {
  it('builds the canonical request without a promptVersion field', () => {
    const service = setup(() => 1);
    const input = { goal: 'Study', nested: { value: 1 } };
    const request = service.buildRequest(task, input, 'request-1');
    expect(request).toEqual({ contractVersion: '1.0', requestId: 'request-1', task, locale: 'vi-VN', input });
    expect(request).not.toHaveProperty('promptVersion');
  });

  it('estimates the exact serialized request bytes without changing the request', () => {
    let measured = '';
    const service = setup((payload) => { measured = payload; return 10; });
    const request = service.buildRequest(task, { goal: 'A' }, 'request-2');
    const before = JSON.stringify(request);
    service.preflight(request);
    expect(measured).toBe(before);
    expect(JSON.stringify(request)).toBe(before);
  });

  it('accepts an input estimate exactly at the task budget', () => {
    const service = setup(() => 830);
    const request = service.buildRequest(task, {}, 'request-3');
    expect(service.preflight(request).inputBudgetTokens).toBe(830);
  });

  it('rejects one token over budget before returning a dispatchable result', () => {
    const service = setup(() => 831);
    const request = service.buildRequest(task, {}, 'request-4');
    let failure: unknown;
    try { service.preflight(request); } catch (error) { failure = error; }
    expect(failure).toMatchObject({ code: 'AI_INPUT_TOO_LARGE' });
    expect((failure as AiPreflightError).getStatus()).toBe(422);
  });

  it.each([
    ['modelId', { modelId: 'other' }],
    ['tokenizerId', { tokenizerId: 'other' }],
    ['contractVersion', { contractVersion: '2.0' }],
  ])('fails closed when deployment %s differs from the profile', (_field, deployment) => {
    const service = setup(() => 1, { deployment });
    const request = service.buildRequest(task, {}, 'request-5');
    expect(() => service.preflight(request)).toThrow(expect.objectContaining({
      code: 'AI_RUNTIME_FAILURE',
    }));
  });

  it('fails closed when profile prompt does not match registry and deployment', () => {
    const service = setup(() => 1, {
      profile: profile({ tasks: { [task]: { ...taskConfig, promptVersion: 'old' } } as CapacityProfile['tasks'] }),
    });
    expect(() => service.preflight(service.buildRequest(task, {}, 'request-6'))).toThrow(expect.objectContaining({
      code: 'AI_RUNTIME_FAILURE',
    }));
  });

  it('fails closed when estimator identity is not bound to the profile', () => {
    const service = setup(() => 1, { tokenizerId: 'wrong' });
    expect(() => service.preflight(service.buildRequest(task, {}, 'request-7'))).toThrow(expect.objectContaining({
      code: 'AI_RUNTIME_FAILURE',
    }));
  });

  it('fails closed when estimator profile version differs from the active profile', () => {
    const service = setup(() => 1, { estimatorProfile: 'old-profile' });
    expect(() => service.preflight(service.buildRequest(task, {}, 'request-10'))).toThrow(expect.objectContaining({
      code: 'AI_RUNTIME_FAILURE',
    }));
  });

  it('fails closed when profile is missing', () => {
    const service = setup(() => 1, { missingProfile: true });
    expect(() => service.preflight(service.buildRequest(task, {}, 'request-8'))).toThrow();
  });

  it.each([
    ['profile task map', { malformedProfile: { ...profile(), tasks: null } }],
    ['deployment prompt map', { malformedDeployment: { modelId: 'model-v1', tokenizerId: 'tokenizer-v1', contractVersion: '1.0', promptVersions: null } }],
  ])('maps malformed %s to a configuration mismatch', (_label, options) => {
    const service = setup(() => 1, options);
    expect(() => service.preflight(service.buildRequest(task, {}, 'malformed'))).toThrow(expect.objectContaining({ code: 'AI_RUNTIME_FAILURE' }));
  });

  it.each([
    ['model ID', {
      profile: profile({ modelId: 123 } as unknown as Partial<CapacityProfile>),
      deployment: { modelId: 123 } as unknown as Partial<AiDeploymentBinding>,
    }],
    ['prompt version', {
      profile: profile({ tasks: { [task]: { ...taskConfig, promptVersion: 123 } } as unknown as CapacityProfile['tasks'] }),
      deployment: { promptVersions: { [task]: 123 } } as unknown as Partial<AiDeploymentBinding>,
      registryPromptVersions: { [task]: 123 },
    }],
  ])('rejects a non-string %s binding before dispatch', (_label, options) => {
    const service = setup(() => 1, options);
    expect(() => service.preflight(service.buildRequest(task, {}, 'numeric-binding'))).toThrow(expect.objectContaining({ code: 'AI_RUNTIME_FAILURE' }));
  });

  it('fails closed when task budget fields are malformed', () => {
    const service = setup(() => 1, {
      profile: profile({ tasks: { [task]: { ...taskConfig, reservedOutputTokens: -1 } } as CapacityProfile['tasks'] }),
    });
    expect(() => service.preflight(service.buildRequest(task, {}, 'request-9'))).toThrow(expect.objectContaining({
      code: 'AI_RUNTIME_FAILURE',
    }));
  });

  it.each([
    ['context window', { contextWindowTokens: -1 }],
    ['safety margin', { inputSafetyMarginTokens: -1 }],
    ['overhead', { tasks: { [task]: { ...taskConfig, promptAndSchemaOverheadTokens: -1 } } }],
  ])('fails closed when %s is malformed', (_field, profileOverride) => {
    const service = setup(() => 1, { profile: profile(profileOverride) });
    expect(() => service.preflight(service.buildRequest(task, {}, 'request-11'))).toThrow(expect.objectContaining({
      code: 'AI_RUNTIME_FAILURE',
    }));
  });

  it('fails closed when task prompt is not registered for the active deployment', () => {
    const service = setup(() => 1, { deployment: { promptVersions: {} } });
    expect(() => service.preflight(service.buildRequest(task, {}, 'request-12'))).toThrow(expect.objectContaining({
      code: 'AI_RUNTIME_FAILURE',
    }));
  });
});
