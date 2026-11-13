import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import os from 'node:os';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import dotenv from 'dotenv';
import { performance } from 'node:perf_hooks';
import { AiOutputValidator } from '../src/ai/ai-output.validator';
import { AI_TASK_KEYS, AiTaskKey, getAiTaskDefinition } from '../src/ai/ai-task.registry';
import { buildStudentAiBenchmarkFixtures, StudentBenchmarkOutcome, summarizeBenchmarkOutcomes } from '../src/ai/student-ai-benchmark.fixtures';

const studentTasks = AI_TASK_KEYS.slice(0, 3);
const repoRoot = resolve(__dirname, '../../..');
const schemaDir = join(repoRoot, 'apps/api/src/ai/schemas/release1');
const manifestPath = join(repoRoot, 'deployment/model-manifest.json');
const runtimeTimeoutMs = 60_000;
const sourceFiles = [
  'ai/app/main.py',
  'ai/app/config.py',
  'ai/app/tasks/registry.py',
  'deployment/model-manifest.json',
];

type Manifest = {
  contractVersion: string;
  modelName: string;
  modelDigest: string;
  ollama: { version: string; runtimeModel: string; options: Record<string, unknown> };
  promptVersions: Record<string, string>;
};

export function resolveRuntimeConfig(environment: NodeJS.ProcessEnv, envFileContents: string) {
  const envFile = dotenv.parse(envFileContents);
  const port = environment.AI_RUNTIME_PORT?.trim() || envFile.AI_RUNTIME_PORT?.trim() || '8001';
  return {
    runtimeBaseUrl: (environment.AI_RUNTIME_BASE_URL?.trim() || envFile.AI_RUNTIME_BASE_URL?.trim() || `http://127.0.0.1:${port}`).replace(/\/$/, ''),
    token: environment.AI_RUNTIME_TOKEN?.trim() || envFile.AI_RUNTIME_TOKEN?.trim() || '',
  };
}

export function buildInferenceRequest(task: AiTaskKey, requestId: string, input: Record<string, unknown>) {
  return { contractVersion: '1.0', requestId, task, locale: 'vi-VN', input };
}

export function withInferenceTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number) {
  const controller = new AbortController();
  let timer: NodeJS.Timeout;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(Object.assign(new Error('Inference exceeded its deadline'), { code: 'INFERENCE_TIMEOUT' }));
    }, timeoutMs);
  });
  return Promise.race([operation(controller.signal), deadline]).finally(() => clearTimeout(timer));
}

function hashFile(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function docker(args: string[]) {
  return execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function loadSchema(file: string, ajv: Ajv2020) {
  return ajv.compile(JSON.parse(readFileSync(join(schemaDir, file), 'utf8')));
}

function assertSchema(valid: ReturnType<Ajv2020['compile']>, value: unknown, label: string) {
  if (!valid(value)) throw new Error(`${label} fixture is invalid: ${JSON.stringify(valid.errors ?? [])}`);
}

function checkReferenceBoundary(task: string, input: Record<string, unknown>, output: Record<string, unknown>) {
  if (task === 'STUDENT_LEARNING_ANALYSIS') {
    const allowed = new Set((input.assessments as Array<{ topicId: string }>).map(({ topicId }) => topicId));
    return (output.priorityTopics as Array<{ topicId: string }>).some(({ topicId }) => !allowed.has(topicId));
  }
  if (task === 'STUDENT_STUDY_PLAN_GENERATION') {
    const allowed = new Set((input.topics as Array<{ topicId: string }>).map(({ topicId }) => topicId));
    return (output.tasks as Array<{ topicId: string }>).some(({ topicId }) => !allowed.has(topicId));
  }
  const allowed = new Set((input.todoTasks as Array<{ taskId: string }>).map(({ taskId }) => taskId));
  return (output.changes as Array<{ taskId: string }>).some(({ taskId }) => !allowed.has(taskId));
}

function verifyServingBinding(manifest: Manifest, runtimeConfig: ReturnType<typeof resolveRuntimeConfig>) {
  const { runtimeBaseUrl, token } = runtimeConfig;
  if (!runtimeBaseUrl || !token) throw new Error('AI_RUNTIME_BASE_URL and AI_RUNTIME_TOKEN must be configured in the backend environment');

  const expectedModel = `${manifest.modelName}@sha256:${manifest.modelDigest}`;
  const tags = JSON.parse(docker(['exec', 'ai-runtime-1', 'python', '-c',
    'import json,urllib.request; print(json.dumps(json.load(urllib.request.urlopen("http://ollama:11434/api/tags"))["models"]))'])) as Array<{ name: string; digest: string }>;
  if (!tags.some((model) => model.name === manifest.ollama.runtimeModel && model.digest === manifest.modelDigest)) {
    throw new Error('Ollama model digest does not match deployment/model-manifest.json');
  }

  const remoteHashes = docker(['exec', 'ai-runtime-1', 'sha256sum',
    '/app/app/main.py', '/app/app/config.py', '/app/app/tasks/registry.py', '/app/model-manifest.json'])
    .split('\n').map((line) => line.trim().split(/\s+/)[0]);
  const localHashes = sourceFiles.map((file) => hashFile(join(repoRoot, file)));
  if (JSON.stringify(remoteHashes) !== JSON.stringify(localHashes)) throw new Error('Serving FastAPI source/manifest does not match this benchmark checkout');

  const runtimeImageId = docker(['inspect', '--format={{.Image}}', 'ai-runtime-1']);
  const ollamaVersion = docker(['exec', 'ai-ollama-1', 'ollama', '--version']);
  if (!ollamaVersion.includes(manifest.ollama.version)) throw new Error('Running Ollama version does not match deployment/model-manifest.json');
  return { runtimeBaseUrl: runtimeBaseUrl.replace(/\/$/, ''), token, expectedModel, runtimeImageId, ollamaVersion,
    modelDigest: manifest.modelDigest, manifestSha256: hashFile(manifestPath), sourceSha256: Object.fromEntries(sourceFiles.map((file, index) => [file, localHashes[index]])) };
}

async function run() {
  const envFile = join(repoRoot, '.env');
  const runtimeConfig = resolveRuntimeConfig(process.env, existsSync(envFile) ? readFileSync(envFile, 'utf8') : '');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest;
  const binding = verifyServingBinding(manifest, runtimeConfig);
  const ready = await fetch(`${binding.runtimeBaseUrl}/health/ready`, { signal: AbortSignal.timeout(5_000) });
  if (!ready.ok) throw new Error(`FastAPI readiness failed with HTTP ${ready.status}`);

  const ajv = new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, removeAdditional: false, useDefaults: false });
  addFormats(ajv);
  const outputValidator = new AiOutputValidator(schemaDir);
  const report = {
    reportVersion: '1.0',
    status: 'UNAPPROVED_PARTIAL_SCOPE',
    startedAt: new Date().toISOString(),
    host: { platform: `${os.platform()} ${os.release()}`, cpuModel: os.cpus()[0]?.model,
      logicalCpuCount: os.cpus().length, totalMemoryBytes: os.totalmem() },
    contractVersion: manifest.contractVersion,
    manifest: { modelName: manifest.modelName, modelDigest: manifest.modelDigest, options: manifest.ollama.options,
      sha256: binding.manifestSha256, tokenizerId: 'UNVERIFIED', tokenizerMethod: 'UNVERIFIED' },
    binding: { runtimeImageId: binding.runtimeImageId, ollamaVersion: binding.ollamaVersion,
      sourceSha256: binding.sourceSha256, runtimeModelId: binding.expectedModel },
    fixtureSet: Object.fromEntries(studentTasks.map((task) => [task, createHash('sha256')
      .update(JSON.stringify(buildStudentAiBenchmarkFixtures(task))).digest('hex')])),
    capacityProfile: { status: 'BLOCKED_PENDING_TOKENIZER_AND_OWNER_APPROVAL', contextWindowTokens: manifest.ollama.options.num_ctx,
      reservedOutputTokens: manifest.ollama.options.num_predict, promptAndSchemaOverheadTokens: null, inputSafetyMarginTokens: null,
      capacityFixtureStatus: 'STRESS_CASES_PRESENT_BUT_NEAR_BUDGET_CANNOT_BE_PROVEN_WITHOUT_TOKENIZER_AND_BUDGET' },
    tasks: {} as Record<string, unknown>,
  };

  const capturePath = process.argv.find((arg) => arg.startsWith('--capture-output='))?.split('=')[1];
  const reportPath = process.argv.find((arg) => arg.startsWith('--report='))?.split('=')[1];
  const captured: Record<string, unknown>[] = [];

  for (const task of studentTasks) {
    const definition = getAiTaskDefinition(task)!;
    if (manifest.promptVersions[task] !== definition.promptVersion) throw new Error(`Manifest promptVersion mismatch for ${task}`);
    const inputSchema = loadSchema(definition.inputSchema, ajv);
    const outputSchema = loadSchema(definition.outputSchema, ajv);
    const fixtures = buildStudentAiBenchmarkFixtures(task);
    for (const fixture of fixtures) assertSchema(inputSchema, fixture.input, `${fixture.id} input`);
    const outcomes: StudentBenchmarkOutcome[] = [];
    const cases: Record<string, unknown>[] = [];

    for (const fixture of fixtures) {
      const requestId = randomUUID();
      const startedAt = performance.now();
      let timeout = false;
      let transportError: string | null = null;
      let httpStatus: number | null = null;
      let envelopeValid = false;
      let output: Record<string, unknown> | null = null;
      let responseBody = '';
      try {
        const result = await withInferenceTimeout(async (signal) => {
          const response = await fetch(`${binding.runtimeBaseUrl}/v1/infer`, {
            method: 'POST',
            headers: { authorization: `Bearer ${binding.token}`, 'content-type': 'application/json' },
            body: JSON.stringify(buildInferenceRequest(task, requestId, fixture.input)),
            signal,
          });
          return { status: response.status, body: await response.text() };
        }, runtimeTimeoutMs);
        httpStatus = result.status;
        responseBody = result.body;
        if (httpStatus === 200) {
          try {
            const envelope: unknown = JSON.parse(responseBody);
            if (envelope && typeof envelope === 'object' && !Array.isArray(envelope)) {
              const item = envelope as Record<string, unknown>;
              const runtime = item.runtime as Record<string, unknown> | undefined;
              envelopeValid = Object.keys(item).length === 5 && item.contractVersion === '1.0' && item.requestId === requestId
                && item.task === task && !!item.output && typeof item.output === 'object' && !Array.isArray(item.output)
                && !!runtime && runtime.modelId === binding.expectedModel && runtime.promptVersion === definition.promptVersion;
              if (envelopeValid) output = item.output as Record<string, unknown>;
            }
          } catch {
            transportError = 'MALFORMED_RESPONSE';
          }
        } else {
          const errorCode = (() => {
            try { return (JSON.parse(responseBody) as { error?: { code?: string } }).error?.code; } catch { return undefined; }
          })();
          transportError = errorCode ?? `HTTP_${httpStatus}`;
        }
      } catch (error) {
        timeout = error && typeof error === 'object' && 'code' in error && error.code === 'INFERENCE_TIMEOUT';
        transportError = timeout ? 'TIMEOUT' : 'TRANSPORT_OR_PROTOCOL_FAILURE';
      }
      const elapsedMs = Math.round(performance.now() - startedAt);
      const outputSchemaPass = !!output && !!outputSchema(output);
      const semanticFailure = outputSchemaPass ? definition.validateSemantics(fixture.input, output!) : undefined;
      const semanticPass = outputSchemaPass && !semanticFailure;
      const referenceBoundaryViolation = outputSchemaPass ? checkReferenceBoundary(task, fixture.input, output!) : null;
      const crossCheck = output ? outputValidator.validate(task, fixture.input, output) : null;
      const combinedValidatorPass = crossCheck?.valid ?? false;
      const outcome: StudentBenchmarkOutcome = { timeout, outputSchemaPass, semanticPass,
        referenceBoundaryViolation, hardBoundaryViolation: null, manualQuality: null };
      outcomes.push(outcome);
      const result = { fixtureId: fixture.id, fixtureKind: fixture.kind, requestId, elapsedMs, httpStatus,
        transportError, envelopeValid, outputSchemaPass, semanticPass, semanticReason: semanticFailure?.reason ?? null,
        referenceBoundaryViolation, combinedValidatorPass, hardBoundaryViolation: null, manualQuality: null };
      cases.push(result);
      if (output) captured.push({ task, fixtureId: fixture.id, input: fixture.input, output });
      process.stderr.write(`${task} ${fixture.id} ${elapsedMs}ms ${timeout ? 'TIMEOUT' : httpStatus ?? transportError}\n`);
    }
    const metrics = summarizeBenchmarkOutcomes(outcomes);
    const checks = { fixtureCoverage: cases.length === 20 && cases.filter(({ fixtureKind }) => fixtureKind === 'normal').length === 10
      && cases.filter(({ fixtureKind }) => fixtureKind === 'boundary').length === 10,
      timeout: metrics.timeoutViolations === 0, schema: metrics.outputSchemaPassRate >= 0.95,
      semantics: metrics.semanticPassRate >= 0.95, references: metrics.referenceBoundaryEvaluations === metrics.caseCount && metrics.referenceBoundaryViolations === 0,
      manualQuality: metrics.manualQualityMean !== null && metrics.manualQualityMean >= 4,
      hardBoundaryReview: metrics.hardBoundaryReviews === metrics.caseCount && metrics.hardBoundaryViolations === 0 };
    report.tasks[task] = { promptVersion: definition.promptVersion, metrics, checks,
      status: Object.values(checks).every(Boolean) ? 'PASS_PENDING_PROFILE_GATES' : 'UNVERIFIED_OR_FAIL', cases };
  }

  (report as { finishedAt?: string }).finishedAt = new Date().toISOString();
  if (capturePath) {
    mkdirSync(dirname(resolve(capturePath)), { recursive: true });
    writeFileSync(resolve(capturePath), `${captured.map((item) => JSON.stringify(item)).join('\n')}\n`, { mode: 0o600 });
  }
  if (reportPath) {
    mkdirSync(dirname(resolve(reportPath)), { recursive: true });
    writeFileSync(resolve(reportPath), `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (require.main === module) {
  run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown benchmark error';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
