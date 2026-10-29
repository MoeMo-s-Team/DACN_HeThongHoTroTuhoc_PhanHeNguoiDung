import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { SchemaRegistryService } from './schema-registry.service';

const releaseSchemas = join(
  process.cwd(),
  '../../docs/releases/ai-contract-v1.0-schema-pack-release1/schemas',
);

const taskFiles = {
  STUDENT_LEARNING_ANALYSIS: [
    'student-learning-analysis.input.schema.json',
    'student-learning-analysis.output.schema.json',
  ],
  STUDENT_STUDY_PLAN_GENERATION: [
    'student-study-plan-generation.input.schema.json',
    'student-study-plan-generation.output.schema.json',
  ],
  STUDENT_STUDY_PLAN_ADJUSTMENT: [
    'student-study-plan-adjustment.input.schema.json',
    'student-study-plan-adjustment.output.schema.json',
  ],
  TEACHER_CLASS_ANALYSIS: [
    'teacher-class-analysis.input.schema.json',
    'teacher-class-analysis.output.schema.json',
  ],
  ADMIN_FEEDBACK_GROUPING_STAGE1: [
    'admin-feedback-grouping-stage1.input.schema.json',
    'admin-feedback-grouping-stage1.output.schema.json',
  ],
  ADMIN_FEEDBACK_SUMMARY_STAGE2: [
    'admin-feedback-summary-stage2.input.schema.json',
    'admin-feedback-summary-stage2.output.schema.json',
  ],
} as const;

const envelopes = {
  request: 'inference-request-envelope.schema.json',
  success: 'inference-success-envelope.schema.json',
  error: 'inference-error-envelope.schema.json',
} as const;

const validFixtureName = (schemaName: string) =>
  schemaName.replace('.schema.json', '.json');

function schemaFiles() {
  return [
    ...Object.values(taskFiles).flat(),
    ...Object.values(envelopes),
  ];
}

function compiledReleaseSchemas() {
  const ajv = new Ajv2020({
    strict: true,
    allErrors: true,
    coerceTypes: false,
    removeAdditional: false,
    useDefaults: false,
  });
  addFormats(ajv);
  const schemas = schemaFiles().map((name) => ({
    name,
    schema: JSON.parse(readFileSync(join(releaseSchemas, name), 'utf8')),
  }));
  schemas.forEach(({ schema }) => ajv.addSchema(schema));
  return schemas.map(({ name, schema }) => ({
    name,
    schema,
    validate: ajv.getSchema(schema.$id) as ValidateFunction,
  }));
}

function invalidByType(schema: Record<string, any>, value: Record<string, any>) {
  for (const [key, property] of Object.entries(schema.properties ?? {})) {
    const type = (property as { type?: string }).type;
    if (type === 'string') return { ...value, [key]: 42 };
    if (type === 'number' || type === 'integer') return { ...value, [key]: 'wrong' };
    if (type === 'boolean') return { ...value, [key]: 'wrong' };
    if (type === 'array') return { ...value, [key]: {} };
    if (type === 'object') return { ...value, [key]: [] };
  }
}

function invalidByEnum(schema: Record<string, any>, value: Record<string, any>) {
  for (const [key, property] of Object.entries(schema.properties ?? {})) {
    if (Array.isArray((property as { enum?: unknown[] }).enum)) {
      return { ...value, [key]: '__invalid_enum__' };
    }
  }
}

function invalidByDateTime(schema: Record<string, any>, value: Record<string, any>) {
  for (const [key, property] of Object.entries(schema.properties ?? {})) {
    if ((property as { format?: string }).format === 'date-time') {
      return { ...value, [key]: 'not-a-date-time' };
    }
  }
}

describe('SchemaRegistryService', () => {
  const registry = new SchemaRegistryService();

  it.each(Object.entries(taskFiles))('loads valid schemas for %s', (task, [inputName, outputName]) => {
    const fixtures = join(
      process.cwd(),
      '../../docs/releases/ai-contract-v1.0-schema-pack-release1/fixtures/valid',
    );
    const pair = registry.get(task as keyof typeof taskFiles);
    expect(pair.input(JSON.parse(readFileSync(join(fixtures, validFixtureName(inputName)), 'utf8')))).toBe(true);
    expect(pair.output(JSON.parse(readFileSync(join(fixtures, validFixtureName(outputName)), 'utf8')))).toBe(true);
  });

  it.each(Object.entries(envelopes))('validates %s envelope', (kind, schemaName) => {
    const fixture = join(
      process.cwd(),
      '../../docs/releases/ai-contract-v1.0-schema-pack-release1/fixtures/valid',
      validFixtureName(schemaName),
    );
    expect(() => registry.validateEnvelope(kind as keyof typeof envelopes,
      JSON.parse(readFileSync(fixture, 'utf8')))).not.toThrow();
  });

  it('loads all 15 Release 1 schema bytes without modification', () => {
    for (const name of schemaFiles()) {
      const expected = readFileSync(join(releaseSchemas, name));
      const actual = readFileSync(join(__dirname, 'schemas', name));
      expect(createHash('sha256').update(actual).digest('hex')).toBe(
        createHash('sha256').update(expected).digest('hex'),
      );
    }
  });

  it.each(compiledReleaseSchemas())('validates the Release 1 fixture for $name', ({ name, validate }) => {
    const fixture = JSON.parse(readFileSync(
      join(releaseSchemas, '..', 'fixtures', 'valid', validFixtureName(name)),
      'utf8',
    ));
    expect(validate(fixture)).toBe(true);
  });

  it.each(compiledReleaseSchemas())('rejects applicable invalid cases for $name', ({ name, schema, validate }) => {
    const fixture = JSON.parse(readFileSync(
      join(releaseSchemas, '..', 'fixtures', 'valid', validFixtureName(name)),
      'utf8',
    ));
    const clone = (value: unknown) => JSON.parse(JSON.stringify(value));
    const required = schema.required?.[0];
    if (required) {
      const missing = clone(fixture);
      delete missing[required];
      expect(validate(missing)).toBe(false);
      expect(validate.errors?.some(({ keyword }) => keyword === 'required')).toBe(true);
    }
    const wrongType = invalidByType(schema, clone(fixture));
    if (wrongType) {
      expect(validate(wrongType)).toBe(false);
      expect(validate.errors?.some(({ keyword }) => keyword === 'type')).toBe(true);
    }
    if (schema.additionalProperties === false) {
      const unknown = { ...clone(fixture), __unknown_property__: true };
      expect(validate(unknown)).toBe(false);
      expect(validate.errors?.some(({ keyword }) => keyword === 'additionalProperties')).toBe(true);
      expect(unknown).toHaveProperty('__unknown_property__');
    }
    const wrongEnum = invalidByEnum(schema, clone(fixture));
    if (wrongEnum) {
      expect(validate(wrongEnum)).toBe(false);
      expect(validate.errors?.some(({ keyword }) => keyword === 'enum')).toBe(true);
    }
    const wrongDate = invalidByDateTime(schema, clone(fixture));
    if (wrongDate) {
      expect(validate(wrongDate)).toBe(false);
      expect(validate.errors?.some(({ keyword }) => keyword === 'format')).toBe(true);
    }
  });

  it('does not add promptVersion to the request envelope', () => {
    const request = JSON.parse(readFileSync(join(releaseSchemas, envelopes.request), 'utf8'));
    expect(request.properties).not.toHaveProperty('promptVersion');
  });

  it('rejects unknown tasks', () => {
    expect(() => registry.get('UNKNOWN' as keyof typeof taskFiles)).toThrow();
  });
});
