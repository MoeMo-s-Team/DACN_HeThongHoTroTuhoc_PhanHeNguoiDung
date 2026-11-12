import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { AI_TASK_KEYS, getAiTaskDefinition } from './ai-task.registry';

const RELEASED_SCHEMA_FILES = [
  'admin-feedback-grouping-stage1.input.schema.json',
  'admin-feedback-grouping-stage1.output.schema.json',
  'admin-feedback-summary-stage2.input.schema.json',
  'admin-feedback-summary-stage2.output.schema.json',
  'inference-error-envelope.schema.json',
  'inference-request-envelope.schema.json',
  'inference-success-envelope.schema.json',
  'student-learning-analysis.input.schema.json',
  'student-learning-analysis.output.schema.json',
  'student-study-plan-adjustment.input.schema.json',
  'student-study-plan-adjustment.output.schema.json',
  'student-study-plan-generation.input.schema.json',
  'student-study-plan-generation.output.schema.json',
  'teacher-class-analysis.input.schema.json',
  'teacher-class-analysis.output.schema.json',
].sort();

function defaultSchemaDirectory(): string {
  const distDir = join(__dirname, 'schemas', 'release1');
  if (existsSync(distDir)) return distDir;
  const srcDir = join(__dirname, '..', '..', '..', 'src', 'ai', 'schemas', 'release1');
  if (existsSync(srcDir)) return srcDir;
  return distDir;
}

type ValidationIssue = { path: string; keyword: string };
export type AiOutputValidation =
  | { valid: true }
  | { valid: false; code: 'AI_INCOMPLETE_DATA' | 'AI_INVALID_STRUCTURE'; issues: ValidationIssue[]; reason?: string };

export class AiOutputValidator {
  private readonly validators = new Map<string, ReturnType<Ajv2020['compile']>>();
  private readonly ajv: Ajv2020;

  constructor(schemaDirectory = defaultSchemaDirectory()) {
    this.ajv = new Ajv2020({
      strict: true,
      allErrors: true,
      coerceTypes: false,
      removeAdditional: false,
      useDefaults: false,
    });
    addFormats(this.ajv);

    const files = readdirSync(schemaDirectory).filter((name) => name.endsWith('.schema.json')).sort();
    if (JSON.stringify(files) !== JSON.stringify(RELEASED_SCHEMA_FILES)) throw new Error('AI Release 1 schema inventory is invalid');
    for (const file of files) {
      const schema = JSON.parse(readFileSync(join(schemaDirectory, file), 'utf8'));
      if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema'
        || typeof schema.$id !== 'string'
        || !schema.$id.startsWith('urn:dacn:ai-contract:v1.0:schema-pack-release1:')) {
        throw new Error(`Invalid AI Release 1 schema: ${file}`);
      }
      this.ajv.addSchema(schema);
      const validate = this.ajv.getSchema(schema.$id);
      if (!validate) throw new Error(`Could not compile AI Release 1 schema: ${file}`);
      this.validators.set(file, validate);
    }
    for (const task of AI_TASK_KEYS) {
      const definition = getAiTaskDefinition(task);
      if (!definition || !this.validators.has(definition.inputSchema) || !this.validators.has(definition.outputSchema)) {
        throw new Error(`AI Release 1 schema registration is incomplete for ${task}`);
      }
    }
  }

  validate(task: string, input: unknown, output: unknown): AiOutputValidation {
    const definition = getAiTaskDefinition(task);
    if (!definition) throw new Error(`Unknown AI task key: ${task}`);

    const validateInput = this.validators.get(definition.inputSchema);
    if (!validateInput) throw new Error(`Missing AI input schema for ${task}`);
    if (!validateInput(input)) {
      return {
        valid: false,
        code: 'AI_INVALID_STRUCTURE',
        issues: (validateInput.errors ?? []).map(({ instancePath, keyword }) => ({ path: instancePath, keyword })),
      };
    }

    const validateOutput = this.validators.get(definition.outputSchema);
    if (!validateOutput) throw new Error(`Missing AI output schema for ${task}`);
    if (!validateOutput(output)) {
      const errors = validateOutput.errors ?? [];
      const incomplete = errors.some((error) => error.keyword === 'required'
        || (error.keyword === 'minItems' && ['/tasks', '/changes'].includes(error.instancePath)));
      return {
        valid: false,
        code: incomplete ? 'AI_INCOMPLETE_DATA' : 'AI_INVALID_STRUCTURE',
        issues: errors.map(({ instancePath, keyword }) => ({ path: instancePath, keyword })),
      };
    }

    const failure = definition.validateSemantics(input as Record<string, unknown>, output as Record<string, unknown>);
    if (failure) return { valid: false, code: failure.code, issues: [], reason: failure.reason };
    return { valid: true };
  }
}
