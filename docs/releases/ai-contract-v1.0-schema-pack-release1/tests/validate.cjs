const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020').default;
const addFormats = require('ajv-formats');

const root = path.resolve(__dirname, '..');
const schemasDir = path.join(root, 'schemas');
const fixturesDir = path.join(root, 'fixtures');
const expectedFiles = [
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

const files = fs.readdirSync(schemasDir).filter((file) => file.endsWith('.schema.json')).sort();
assert.deepEqual(files, expectedFiles, 'schema registry must contain the exact AI Contract §20 filename set');
const schemas = files.map((file) => JSON.parse(fs.readFileSync(path.join(schemasDir, file), 'utf8')));
assert.equal(new Set(schemas.map((schema) => schema.$id)).size, schemas.length, 'schema $id values must be unique');
for (const schema of schemas) {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.ok(schema.$id.startsWith('urn:dacn:ai-contract:v1.0:schema-pack-release1:'), 'schema id must use release1 namespace');
  assert.ok(!Object.hasOwn(schema, '$comment'), 'released schema must not carry candidate marker');
}
function assertClosedDefinedObjects(schema, label) {
  if (!schema || typeof schema !== 'object') return;
  if (schema.type === 'object' && schema.properties) assert.equal(schema.additionalProperties, false, `${label}: defined object must be closed`);
  for (const value of Object.values(schema)) {
    if (Array.isArray(value)) value.forEach((entry) => assertClosedDefinedObjects(entry, label));
    else if (value && typeof value === 'object') assertClosedDefinedObjects(value, label);
  }
}
for (const schema of schemas) assertClosedDefinedObjects(schema, schema.$id);

const ajv = new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, removeAdditional: false, useDefaults: false });
addFormats(ajv);
for (const schema of schemas) ajv.addSchema(schema);
const validators = new Map(files.map((file) => [file, ajv.getSchema(schemas[files.indexOf(file)].$id)]));
assert.ok([...validators.values()].every(Boolean), 'all schemas compile in one Ajv2020 registry');

let checks = 0;
for (const file of files) {
  const validate = validators.get(file);
  const stem = file.replace(/\.schema\.json$/, '');
  const valid = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'valid', `${stem}.json`), 'utf8'));
  assert.equal(validate(valid), true, `${file}: valid fixture rejected: ${JSON.stringify(validate.errors)}`);
  checks += 1;
  const negatives = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'invalid', `${stem}.json`), 'utf8'));
  for (const item of negatives) {
    assert.equal(validate(item.data), false, `${file}: negative fixture unexpectedly passed (${item.name})`);
    assert.ok(validate.errors.some((error) => error.keyword === item.keyword && error.instancePath === item.instancePath && (!item.missingProperty || error.params.missingProperty === item.missingProperty) && (!item.additionalProperty || error.params.additionalProperty === item.additionalProperty)), `${file}: ${item.name} expected ${item.keyword} at ${item.instancePath}; got ${JSON.stringify(validate.errors)}`);
    checks += 1;
  }
}

const edgeCases = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'edge-cases.json'), 'utf8'));
for (const item of edgeCases) {
  assert.equal(validators.get(item.schema)(item.data), true, `${item.schema}: edge fixture rejected: ${JSON.stringify(validators.get(item.schema).errors)}`);
  checks += 1;
}
const stage1CountFixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'invalid', 'admin-feedback-grouping-stage1.output.json'), 'utf8'))
  .find((item) => item.name === 'ai-supplied-count');
assert.ok(stage1CountFixture, 'AI Contract §18.2 requires an invalid Stage 1 output fixture containing AI-supplied count');
const emptyStage2Fixture = edgeCases.find((item) => item.case === 'admin-stage2-empty-issue-groups' && item.schema === 'admin-feedback-summary-stage2.input.schema.json');
assert.ok(emptyStage2Fixture && emptyStage2Fixture.data.issueGroups.length === 0, 'AI Contract §18.2 requires Stage 2 empty issueGroups input to pass');
checks += 2;

// These records document approved policy; no runtime mapper is implemented in this Phase 1D.1 release.
const semanticProposals = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'semantic-proposals.json'), 'utf8'));
for (const item of semanticProposals) {
  assert.equal(validators.get(item.schema)(item.data), item.schemaExpectedValid, `${item.case}: unexpected schema-layer result`);
  assert.equal(item.data[item.property].trim().length, 0, `${item.case}: fixture must be whitespace-only`);
  assert.equal(item.scope, 'post-dispatch-ai-output');
  assert.equal(item.proposedClassification, 'AI_INCOMPLETE_DATA');
  assert.equal(item.proposedLogState, 'FAILED');
  assert.equal(item.approvalStatus, 'APPROVED');
  checks += 6;
}

const requestSchema = JSON.parse(fs.readFileSync(path.join(schemasDir, 'inference-request-envelope.schema.json'), 'utf8'));
const stage1Schema = JSON.parse(fs.readFileSync(path.join(schemasDir, 'admin-feedback-grouping-stage1.output.schema.json'), 'utf8'));
const stage2Schema = JSON.parse(fs.readFileSync(path.join(schemasDir, 'admin-feedback-summary-stage2.input.schema.json'), 'utf8'));
assert.ok(!Object.hasOwn(requestSchema.properties, 'promptVersion'), 'request envelope must not add promptVersion');
assert.ok(requestSchema.properties.task.$ref, 'request task enum must use a compiled local $ref');
assert.equal(ajv.validateSchema(requestSchema), true, 'request envelope must be valid Draft 2020-12 schema');
assert.ok(!schemas.find((schema) => schema.$id.endsWith(':inference-request-envelope'))?.properties?.promptVersion);
assert.ok(!Object.hasOwn(stage1Schema.$defs.issueGroup.properties, 'count'), 'Stage 1 AI output must not supply computed count');
assert.ok(stage2Schema.$defs.issueGroup.required.includes('count'), 'Stage 2 input must receive backend-computed count');
checks += 5;

console.log(`PASS: ${schemas.length} schemas compiled; ${checks} valid/invalid, registry, format, and contract assertions passed.`);
