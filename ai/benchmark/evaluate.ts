import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { AiSemanticValidationError, AiSemanticValidator } from '../../apps/api/src/ai/ai-semantic-validator';
import { SchemaRegistryService, type AiTask } from '../../apps/api/src/ai/schema-registry.service';
import { referenceStatus } from './reference';

const schemas = new SchemaRegistryService();
const semantic = new AiSemanticValidator(schemas);
const tasks = new Set<AiTask>([
  'STUDENT_LEARNING_ANALYSIS', 'STUDENT_STUDY_PLAN_GENERATION', 'STUDENT_STUDY_PLAN_ADJUSTMENT',
  'TEACHER_CLASS_ANALYSIS', 'ADMIN_FEEDBACK_GROUPING_STAGE1', 'ADMIN_FEEDBACK_SUMMARY_STAGE2',
]);

export function evaluate(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('input record must be an object');
  const row = value as Record<string, unknown>;
  if (typeof row.fixtureId !== 'string' || !tasks.has(row.task as AiTask) || !('input' in row) || !('authoritativeContext' in row)) {
    throw new Error('input record is missing required fields');
  }
  const task = row.task as AiTask;
  let schemaPass = false;
  if (row.output !== null && row.output !== undefined) schemaPass = schemas.get(task).output(row.output) === true;
  let semanticPass = false;
  let diagnostic: string | null = null;
  if (schemaPass) {
    try { semantic.validateOutput(task, row.input, row.output, (row.authoritativeContext ?? {}) as Record<string, unknown>); semanticPass = true; }
    catch (error) { diagnostic = error instanceof AiSemanticValidationError ? error.message : 'semantic validation failed'; }
  } else diagnostic = row.output == null ? 'output is unavailable' : 'output does not satisfy schema';
  const ref = row.output == null ? 'UNKNOWN' : referenceStatus(task, row.input, row.output);
  return { fixtureId: row.fixtureId, schemaPass, semanticPass, referenceStatus: ref, diagnostic };
}

if (process.argv[1] && resolve(process.argv[1]).endsWith('/ai/benchmark/evaluate.ts')) {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  rl.on('line', (line: string) => {
    try { process.stdout.write(`${JSON.stringify(evaluate(JSON.parse(line)))}\n`); }
    catch (error) { process.stderr.write(`${error instanceof Error ? error.message : 'invalid evaluator input'}\n`); process.exitCode = 1; rl.close(); }
  });
}
