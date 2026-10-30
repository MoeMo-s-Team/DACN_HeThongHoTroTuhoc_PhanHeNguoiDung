import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluate } from '../../../../ai/benchmark/evaluate';
import { referenceStatus } from '../../../../ai/benchmark/reference';
import { AiSemanticValidator } from './ai-semantic-validator';
import { SchemaRegistryService } from './schema-registry.service';

const root = join(process.cwd(), '../..');
const pack = join(root, 'docs/releases/ai-contract-v1.0-schema-pack-release1/fixtures/valid');
const corpus = join(root, 'ai/benchmark/fixtures/lite-smoke.jsonl');
const rows = readFileSync(corpus, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
const mapStrings = (value: unknown, fixtureId: string): unknown => {
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, fixtureId));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapStrings(item, fixtureId)]));
  if (typeof value === 'string') return value.replaceAll('topic_1', rows.find((row) => row.fixtureId === fixtureId)?.input.assessments?.[0]?.topicId ?? value)
    .replaceAll('student_1', rows.find((row) => row.fixtureId === fixtureId)?.input.needsAttentionStudents?.[0]?.studentId ?? value)
    .replaceAll('feedback_1', rows.find((row) => row.fixtureId === fixtureId)?.input.feedback?.[0]?.feedbackId ?? value)
    .replaceAll('task_1', rows.find((row) => row.fixtureId === fixtureId)?.input.todoTasks?.[0]?.taskId ?? value);
  return value;
};

describe('AI benchmark evaluator', () => {
  it('validates one Lite fixture per task through production schema and input semantic validators', () => {
    const schemas = new SchemaRegistryService(); const validator = new AiSemanticValidator(schemas);
    expect(rows).toHaveLength(6);
    expect(new Set(rows.map((row) => row.task)).size).toBe(6);
    for (const row of rows) {
      expect(schemas.get(row.task).input(row.input)).toBe(true);
      expect(() => validator.validateInput(row.task, row.input, row.authoritativeContext)).not.toThrow();
    }
  });

  it('accepts a valid Teacher input with no students requiring attention', () => {
    const schemas = new SchemaRegistryService(); const validator = new AiSemanticValidator(schemas);
    const row = rows.find((item) => item.task === 'TEACHER_CLASS_ANALYSIS');
    const input = { ...row.input, needsAttentionStudents: [] };
    expect(schemas.get(row.task).input(input)).toBe(true);
    expect(() => validator.validateInput(row.task, input, row.authoritativeContext)).not.toThrow();
  });

  it('uses the backend oracle and distinguishes invalid, unknown and invented references', () => {
    const schemas = new SchemaRegistryService();
    const row = rows.find((item) => item.task === 'STUDENT_LEARNING_ANALYSIS');
    const output = mapStrings(JSON.parse(readFileSync(join(pack, 'student-learning-analysis.output.json'), 'utf8')), row.fixtureId);
    expect(evaluate({ ...row, output }).referenceStatus).toBe('PASS');
    expect(evaluate({ ...row, output: { ...output as object, priorityTopics: [{ topicId: 'invented', reason: 'unsupported' }] } }).referenceStatus).toBe('VIOLATION');
    expect(evaluate({ ...row, output: null }).referenceStatus).toBe('UNKNOWN');
    expect(evaluate({ ...row, output: { ...output as object, extra: true } }).schemaPass).toBe(false);
    expect(schemas.get(row.task).output({ ...output as object, extra: true })).toBe(false);
  });

  it('guards reference arrays and checks TODO, teacher weak-topic/student and feedback boundaries', () => {
    expect(referenceStatus('STUDENT_STUDY_PLAN_ADJUSTMENT', { todoTasks: [{ taskId: 't1' }] }, { changes: [{ taskId: 'outside' }] })).toBe('VIOLATION');
    expect(referenceStatus('STUDENT_STUDY_PLAN_ADJUSTMENT', { todoTasks: null }, { changes: [] })).toBe('UNKNOWN');
    expect(referenceStatus('TEACHER_CLASS_ANALYSIS', {
      topicAverageScores: [{ topic: { id: 'weak' }, weakTopic: true }], needsAttentionStudents: [], progressWarnings: [],
    }, { weakTopics: [{ topicId: 'strong' }], progressIssues: [], attentionGroups: [] })).toBe('VIOLATION');
    expect(referenceStatus('TEACHER_CLASS_ANALYSIS', {
      topicAverageScores: [{ topic: { id: 'weak' }, weakTopic: false }], needsAttentionStudents: [], progressWarnings: [],
    }, { weakTopics: [{ topicId: 'weak' }], progressIssues: [], attentionGroups: [] })).toBe('VIOLATION');
    expect(referenceStatus('TEACHER_CLASS_ANALYSIS', {
      topicAverageScores: [{ topic: { id: 'weak' }, weakTopic: true }], needsAttentionStudents: [], progressWarnings: [],
    }, { weakTopics: [], progressIssues: [{ studentId: 'outsider' }], attentionGroups: [] })).toBe('VIOLATION');
    expect(referenceStatus('ADMIN_FEEDBACK_GROUPING_STAGE1', { feedback: [{ feedbackId: 'f1' }] }, { issueGroups: [{ feedbackIds: ['f2'] }] })).toBe('VIOLATION');
    expect(referenceStatus('ADMIN_FEEDBACK_GROUPING_STAGE1', { feedback: [{ feedbackId: 'f1' }] }, { issueGroups: [{ feedbackIds: 'malformed' }] })).toBe('UNKNOWN');
    expect(referenceStatus('STUDENT_LEARNING_ANALYSIS', { assessments: [{ topicId: 'ok' }] }, { priorityTopics: [{ topicId: 'outside' }] })).toBe('VIOLATION');
    expect(referenceStatus('ADMIN_FEEDBACK_SUMMARY_STAGE2', { feedback: [{ feedbackId: 'f1' }], issueGroups: [{ feedbackIds: ['outside'] }] }, { recommendations: [{}] })).toBe('VIOLATION');
    expect(referenceStatus('ADMIN_FEEDBACK_SUMMARY_STAGE2', { feedback: null, issueGroups: [] }, { recommendations: [{}] })).toBe('UNKNOWN');
    const validStudents = { needsAttentionStudents: [{ studentId: 's1' }], progressWarnings: [] };
    expect(referenceStatus('TEACHER_CLASS_ANALYSIS', { ...validStudents, topicAverageScores: null }, {
      weakTopics: [], progressIssues: [], attentionGroups: [{ studentIds: 'malformed' }, { studentIds: ['outsider'] }],
    })).toBe('VIOLATION');
    expect(referenceStatus('TEACHER_CLASS_ANALYSIS', { ...validStudents, topicAverageScores: [] }, {
      weakTopics: [], progressIssues: [], attentionGroups: [{ studentIds: 'malformed' }, { studentIds: ['outsider'] }],
    })).toBe('VIOLATION');
    expect(referenceStatus('ADMIN_FEEDBACK_SUMMARY_STAGE2', { feedback: [{ feedbackId: 'f1' }], issueGroups: [{ feedbackIds: ['outside'] }] }, {
      recommendations: null,
    })).toBe('VIOLATION');
  });

  it('emits one exact JSONL record per line and rejects malformed input with nonzero exit', () => {
    const command = spawnSync('pnpm', ['--filter', '@dacn/api', 'exec', 'tsx', '../../ai/benchmark/evaluate.ts'], {
      cwd: root, input: `${JSON.stringify({ ...rows[0], output: null })}\n`, encoding: 'utf8',
    });
    expect(command.status).toBe(0);
    expect(command.stdout.trim().split('\n')).toHaveLength(1);
    expect(JSON.parse(command.stdout)).toEqual({ fixtureId: rows[0].fixtureId, schemaPass: false, semanticPass: false, referenceStatus: 'UNKNOWN', diagnostic: 'output is unavailable' });
    const bad = spawnSync('pnpm', ['--filter', '@dacn/api', 'exec', 'tsx', '../../ai/benchmark/evaluate.ts'], { cwd: root, input: '{bad json}\n', encoding: 'utf8' });
    expect(bad.status).not.toBe(0);
    expect(bad.stderr).toContain('JSON');
  });
});
