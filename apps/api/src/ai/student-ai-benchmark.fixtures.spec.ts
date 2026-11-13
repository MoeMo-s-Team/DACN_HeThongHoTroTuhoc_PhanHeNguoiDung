import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { AI_TASK_KEYS, AiTaskKey, getAiTaskDefinition } from './ai-task.registry';
import { buildStudentAiBenchmarkFixtures, selectStudentBenchmarkRun, summarizeBenchmarkOutcomes } from './student-ai-benchmark.fixtures';
import { assertServingSourceHashesMatch, buildInferenceRequest, listServingSourceFiles, resolveRuntimeConfig, withInferenceTimeout } from '../../scripts/benchmark-student-ai';

describe('Student AI benchmark fixtures', () => {
  it('binds engine and all validator schemas to the serving runtime source set', () => {
    const files = listServingSourceFiles();
    expect(files).toContainEqual({ checkoutPath: 'ai/app/engine/ollama.py', containerPath: '/app/app/engine/ollama.py' });
    expect(files).toContainEqual({ checkoutPath: 'ai/app/schemas/release1/student-study-plan-generation.output.schema.json', containerPath: '/app/app/schemas/release1/student-study-plan-generation.output.schema.json' });
    expect(files.filter(({ checkoutPath }) => checkoutPath.endsWith('.schema.json'))).toHaveLength(15);
    expect(() => assertServingSourceHashesMatch(['main-hash', 'schema-hash'], ['main-hash', 'changed-schema'])).toThrow(/does not match/);
  });

  it('defaults to all official Student fixtures and labels a selected fixture as triage only', () => {
    const full = selectStudentBenchmarkRun([]);
    expect(full.status).toBe('UNAPPROVED_PARTIAL_SCOPE');
    expect(full.taskFixtures.map(({ fixtures }) => fixtures.length)).toEqual([20, 20, 20]);

    const generation = selectStudentBenchmarkRun(['--', '--task', 'STUDENT_STUDY_PLAN_GENERATION', '--fixture', 'student_study_plan_generation-boundary-02']);
    expect(generation).toMatchObject({ status: 'TRIAGE_ONLY' });
    expect(generation.taskFixtures).toHaveLength(1);
    expect(generation.taskFixtures[0].fixtures).toHaveLength(1);
    expect(generation.taskFixtures[0].fixtures[0].input.topics).toHaveLength(24);
  });

  it.each([
    [['--fixture', 'student_study_plan_generation-boundary-02'], /requires --task/],
    [['--task', 'STUDENT_STUDY_PLAN_GENERATION', '--task', 'STUDENT_STUDY_PLAN_GENERATION'], /Duplicate --task/],
    [['--task', 'STUDENT_STUDY_PLAN_GENERATION', '--fixture', 'missing'], /Unknown benchmark fixture/],
    [['--task', 'TEACHER_CLASS_ANALYSIS'], /Unknown Student benchmark task/],
    [['--unknown'], /Unknown benchmark argument/],
    [['--report=one.json', '--report=two.json'], /Duplicate --report/],
  ])('rejects invalid selector arguments %j before inference', (args, message) => {
    expect(() => selectStudentBenchmarkRun(args)).toThrow(message);
  });

  it('builds 20 deterministic inputs per Student task with 10 normal and 10 boundary cases', () => {
    const ajv = new Ajv2020({ strict: true });
    addFormats(ajv);
    for (const task of AI_TASK_KEYS.slice(0, 3)) {
      const fixtures = buildStudentAiBenchmarkFixtures(task);
      const definition = getAiTaskDefinition(task)!;
      const schema = JSON.parse(readFileSync(join(__dirname, 'schemas/release1', definition.inputSchema), 'utf8'));
      const validate = ajv.compile(schema);
      expect(fixtures).toHaveLength(20);
      expect(fixtures.filter((fixture) => fixture.kind === 'normal')).toHaveLength(10);
      expect(fixtures.filter((fixture) => fixture.kind === 'boundary')).toHaveLength(10);
      expect(buildStudentAiBenchmarkFixtures(task)).toEqual(fixtures);
      expect(fixtures.every(({ input }) => input && typeof input === 'object')).toBe(true);
      expect(fixtures.every(({ input }) => validate(input))).toBe(true);
    }
  });

  it('keeps failed requests in schema and semantic denominators', () => {
    const summary = summarizeBenchmarkOutcomes([
      { timeout: false, outputSchemaPass: true, semanticPass: true, referenceBoundaryViolation: false, hardBoundaryViolation: false, manualQuality: 4 },
      { timeout: true, outputSchemaPass: false, semanticPass: false, referenceBoundaryViolation: false, hardBoundaryViolation: false, manualQuality: null },
    ]);

    expect(summary).toEqual({
      caseCount: 2,
      timeoutViolations: 1,
      outputSchemaPassRate: 0.5,
      semanticPassRate: 0.5,
      referenceBoundaryViolations: 0,
      referenceBoundaryEvaluations: 2,
      hardBoundaryViolations: 0,
      hardBoundaryReviews: 2,
      manualQualityMean: 4,
    });
  });

  it('falls back to the private .env values when shell variables are present but empty', () => {
    expect(resolveRuntimeConfig({ AI_RUNTIME_BASE_URL: '', AI_RUNTIME_TOKEN: '' },
      'AI_RUNTIME_BASE_URL=http://127.0.0.1:8001\nAI_RUNTIME_TOKEN=private-test-token'))
      .toEqual({ runtimeBaseUrl: 'http://127.0.0.1:8001', token: 'private-test-token' });
  });

  it('uses the local runtime port when no AI base URL is configured', () => {
    expect(resolveRuntimeConfig({ AI_RUNTIME_BASE_URL: '', AI_RUNTIME_TOKEN: '' }, 'AI_RUNTIME_TOKEN=private-test-token'))
      .toEqual({ runtimeBaseUrl: 'http://127.0.0.1:8001', token: 'private-test-token' });
  });

  it('sends the complete release 1 inference envelope', () => {
    expect(buildInferenceRequest('STUDENT_LEARNING_ANALYSIS' as AiTaskKey, 'request-1', { assessments: [] }))
      .toEqual({ contractVersion: '1.0', requestId: 'request-1', task: 'STUDENT_LEARNING_ANALYSIS', locale: 'vi-VN', input: { assessments: [] } });
  });

  it('aborts and reports an inference that does not finish before its deadline', async () => {
    let requestSignal: AbortSignal | undefined;
    await expect(withInferenceTimeout((signal) => {
      requestSignal = signal;
      return new Promise<string>(() => undefined);
    }, 5)).rejects.toMatchObject({ code: 'INFERENCE_TIMEOUT' });
    expect(requestSignal?.aborted).toBe(true);
  });

  it('counts a hard-boundary violation even when its manual score is high', () => {
    const summary = summarizeBenchmarkOutcomes([
      { timeout: false, outputSchemaPass: true, semanticPass: false, referenceBoundaryViolation: true, hardBoundaryViolation: true, manualQuality: 5 },
    ]);

    expect(summary).toMatchObject({ hardBoundaryViolations: 1, referenceBoundaryViolations: 1, manualQualityMean: 5 });
  });

  it('keeps unreviewed manual quality and hard-boundary outcomes unverified', () => {
    const summary = summarizeBenchmarkOutcomes([
      { timeout: false, outputSchemaPass: true, semanticPass: true, referenceBoundaryViolation: null, hardBoundaryViolation: null, manualQuality: null },
    ]);

    expect(summary).toMatchObject({ referenceBoundaryEvaluations: 0, hardBoundaryReviews: 0, manualQualityMean: null });
  });
});
