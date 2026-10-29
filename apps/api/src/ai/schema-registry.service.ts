import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

export type AiTask =
  | 'STUDENT_LEARNING_ANALYSIS'
  | 'STUDENT_STUDY_PLAN_GENERATION'
  | 'STUDENT_STUDY_PLAN_ADJUSTMENT'
  | 'TEACHER_CLASS_ANALYSIS'
  | 'ADMIN_FEEDBACK_GROUPING_STAGE1'
  | 'ADMIN_FEEDBACK_SUMMARY_STAGE2';

export type EnvelopeKind = 'request' | 'success' | 'error';
export type RuntimeEnvelope = Record<string, unknown>;

export interface TaskSchemas {
  input: ValidateFunction;
  output: ValidateFunction;
}

export class AiSchemaValidationError extends Error {
  constructor(readonly errors: readonly { keyword: string; instancePath: string; params: Record<string, unknown> }[]) {
    super('AI data does not satisfy its JSON Schema');
    this.name = 'AiSchemaValidationError';
  }
}

const taskFiles: Record<AiTask, [string, string]> = {
  STUDENT_LEARNING_ANALYSIS: ['student-learning-analysis.input.schema.json', 'student-learning-analysis.output.schema.json'],
  STUDENT_STUDY_PLAN_GENERATION: ['student-study-plan-generation.input.schema.json', 'student-study-plan-generation.output.schema.json'],
  STUDENT_STUDY_PLAN_ADJUSTMENT: ['student-study-plan-adjustment.input.schema.json', 'student-study-plan-adjustment.output.schema.json'],
  TEACHER_CLASS_ANALYSIS: ['teacher-class-analysis.input.schema.json', 'teacher-class-analysis.output.schema.json'],
  ADMIN_FEEDBACK_GROUPING_STAGE1: ['admin-feedback-grouping-stage1.input.schema.json', 'admin-feedback-grouping-stage1.output.schema.json'],
  ADMIN_FEEDBACK_SUMMARY_STAGE2: ['admin-feedback-summary-stage2.input.schema.json', 'admin-feedback-summary-stage2.output.schema.json'],
};

const envelopeFiles: Record<EnvelopeKind, string> = {
  request: 'inference-request-envelope.schema.json',
  success: 'inference-success-envelope.schema.json',
  error: 'inference-error-envelope.schema.json',
};

@Injectable()
export class SchemaRegistryService {
  private readonly validators = new Map<string, ValidateFunction>();

  constructor() {
    const ajv = new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, removeAdditional: false, useDefaults: false });
    addFormats(ajv);
    const files = [...Object.values(taskFiles).flat(), ...Object.values(envelopeFiles)];
    for (const file of files) {
      const schema = JSON.parse(readFileSync(join(__dirname, 'schemas', file), 'utf8')) as { $id: string };
      ajv.addSchema(schema);
      this.validators.set(file, ajv.getSchema(schema.$id)!);
    }
  }

  get(task: AiTask): TaskSchemas {
    const files = taskFiles[task];
    if (!files) throw new Error(`Unknown AI task: ${String(task)}`);
    return { input: this.validator(files[0]), output: this.validator(files[1]) };
  }

  validateEnvelope(kind: EnvelopeKind, value: unknown): asserts value is RuntimeEnvelope {
    const file = envelopeFiles[kind];
    if (!file) throw new Error(`Unknown AI envelope: ${String(kind)}`);
    const validate = this.validator(file);
    if (!validate(value)) {
      throw new AiSchemaValidationError((validate.errors ?? []).map(({ keyword, instancePath, params }) => ({
        keyword, instancePath, params: params as Record<string, unknown>,
      })));
    }
  }

  private validator(file: string): ValidateFunction {
    const validator = this.validators.get(file);
    if (!validator) throw new Error(`AI schema is not registered: ${file}`);
    return validator;
  }
}
