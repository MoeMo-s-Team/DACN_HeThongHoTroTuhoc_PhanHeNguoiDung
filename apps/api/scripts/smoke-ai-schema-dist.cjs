const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync, rmSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

const dist = join(__dirname, '../dist');
const expected = {
  'admin-feedback-grouping-stage1.input.schema.json': 'd99fc8d61cf6ad08d251d970ccea1a05adf27b11c52ee81d87768b7339350f99',
  'admin-feedback-grouping-stage1.output.schema.json': '84a8cc06475ae943527aefe619ccb66e0813fa41fdf96945e4e734c60d3fa0ab',
  'admin-feedback-summary-stage2.input.schema.json': '0fddc413d13c189a949600c0ab0cf7523dd65e021c723f1b04a85c699218c6b1',
  'admin-feedback-summary-stage2.output.schema.json': '975ac435de19d64617456b7c348564b6bccde8d2d150ffcac93bb094021547dd',
  'inference-error-envelope.schema.json': '85320d16984b5da7282ace984ad86d4e47cf0566790c4cb0fcc77b18e28c3ffb',
  'inference-request-envelope.schema.json': 'a197b94dc6c7f00ce36b7ba12e30c5034db4ac1c4d5f955c97892c62afc30000',
  'inference-success-envelope.schema.json': 'e35cd9bcf14f8fa87041c89a3d4259c583abd01424a691b999e1a0887705c882',
  'student-learning-analysis.input.schema.json': '2353d9fef0ec75e57d98f8acc07d59d5d6c32612cc39e0d015a9bbd44f595bf5',
  'student-learning-analysis.output.schema.json': 'bfb6c9d5e209deabe9d13605df125bec3cec8495f2900035c2886d644cd82c8e',
  'student-study-plan-adjustment.input.schema.json': '4ec2b87008550d61379e4e7be6c883dc3e7497d165865b77780ce2b13a4d48c5',
  'student-study-plan-adjustment.output.schema.json': 'ffefe07d6b6f77b9cf2f9c5c3a4cb1357bde6aeb837ccb3749d2d0fc91b3a390',
  'student-study-plan-generation.input.schema.json': 'f79ed2035294514b3c9cad7e4cf275d3ec666b3fd5c6d7b53f96c30fea65492f',
  'student-study-plan-generation.output.schema.json': '12cedc9ae540a47760959619aaf7efdadad865e90f657f0f2425f489c84fe400',
  'teacher-class-analysis.input.schema.json': 'c2deee72b3ac12bb7a8f40aa048292228ba00be8fc0c4b5353ab901151edc0a4',
  'teacher-class-analysis.output.schema.json': '939bdc57932709e53e4ca5a03bb622e95e0f7aab776ab97b54854fc740e68041',
};

rmSync(dist, { recursive: true, force: true });
const build = spawnSync('pnpm', ['build'], { cwd: join(__dirname, '..'), stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);

const { SchemaRegistryService } = require('../dist/ai/schema-registry.service.js');
const registry = new SchemaRegistryService();
for (const [file, digest] of Object.entries(expected)) {
  const bytes = readFileSync(join(dist, 'ai/schemas', file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), digest, `${file} digest`);
}
for (const task of [
  'STUDENT_LEARNING_ANALYSIS',
  'STUDENT_STUDY_PLAN_GENERATION',
  'STUDENT_STUDY_PLAN_ADJUSTMENT',
  'TEACHER_CLASS_ANALYSIS',
  'ADMIN_FEEDBACK_GROUPING_STAGE1',
  'ADMIN_FEEDBACK_SUMMARY_STAGE2',
]) registry.get(task);
console.log('PASS: all 15 packaged schemas and task refs load from dist');
