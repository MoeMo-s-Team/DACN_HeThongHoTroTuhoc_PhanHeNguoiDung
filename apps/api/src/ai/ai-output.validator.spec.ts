import { readFileSync, mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AI_TASK_KEYS } from './ai-task.registry';
import { AiOutputValidator } from './ai-output.validator';

const fixtures = join(__dirname, '__fixtures__', 'release1');
const schemas = join(__dirname, 'schemas', 'release1');
const stem = {
  STUDENT_LEARNING_ANALYSIS: 'student-learning-analysis',
  STUDENT_STUDY_PLAN_GENERATION: 'student-study-plan-generation',
  STUDENT_STUDY_PLAN_ADJUSTMENT: 'student-study-plan-adjustment',
  TEACHER_CLASS_ANALYSIS: 'teacher-class-analysis',
  ADMIN_FEEDBACK_GROUPING_STAGE1: 'admin-feedback-grouping-stage1',
  ADMIN_FEEDBACK_SUMMARY_STAGE2: 'admin-feedback-summary-stage2',
} as const;
const fixture = (kind: 'valid' | 'invalid', name: string) => JSON.parse(readFileSync(join(fixtures, kind, `${name}.json`), 'utf8'));

describe('AiOutputValidator', () => {
  it.each(AI_TASK_KEYS)('accepts the official valid output fixture for %s', (task) => {
    const input = fixture('valid', `${stem[task]}.input`);
    const output = fixture('valid', `${stem[task]}.output`);
    expect(new AiOutputValidator().validate(task, input, output)).toEqual({ valid: true });
  });

  it.each(AI_TASK_KEYS)('rejects official invalid output cases for %s', (task) => {
    const input = fixture('valid', `${stem[task]}.input`);
    const cases = fixture('invalid', `${stem[task]}.output`);
    const validator = new AiOutputValidator();
    for (const item of cases) {
      expect(validator.validate(task, input, item.data).valid).toBe(false);
    }
  });

  it('rejects unknown task keys', () => {
    expect(() => new AiOutputValidator().validate('unknown', {}, {})).toThrow('Unknown AI task key');
  });

  it('rejects a task input that does not match its released input schema', () => {
    const validator = new AiOutputValidator();
    const output = fixture('valid', 'student-learning-analysis.output');
    expect(validator.validate('STUDENT_LEARNING_ANALYSIS', {}, output)).toMatchObject({ valid: false, code: 'AI_INVALID_STRUCTURE' });
  });

  it('classifies missing required output as incomplete and rejects whitespace-only required text', () => {
    const validator = new AiOutputValidator();
    const input = fixture('valid', 'admin-feedback-summary-stage2.input');
    expect(validator.validate('ADMIN_FEEDBACK_SUMMARY_STAGE2', input, {})).toMatchObject({ valid: false, code: 'AI_INCOMPLETE_DATA' });
    expect(validator.validate('ADMIN_FEEDBACK_SUMMARY_STAGE2', input, {
      summary: '   ', priorityAreas: [], recommendations: [],
    })).toMatchObject({ valid: false, code: 'AI_INCOMPLETE_DATA' });
  });

  it('rejects outputs with invalid references, duplicate IDs, dates or task semantics', () => {
    const validator = new AiOutputValidator();
    const learning = fixture('valid', 'student-learning-analysis.input');
    expect(validator.validate('STUDENT_LEARNING_ANALYSIS', learning, {
      strengths: [], areasToImprove: [], reasons: [], priorityTopics: [{ topicId: 'outside', reason: 'x' }],
    })).toMatchObject({ valid: false, code: 'AI_INVALID_STRUCTURE' });

    const plan = fixture('valid', 'student-study-plan-generation.input');
    expect(validator.validate('STUDENT_STUDY_PLAN_GENERATION', plan, {
      planTitle: 'Plan', tasks: [{ title: 'Task', topicId: 'outside', goal: 'Goal', expectedMinutes: 1,
        dueDate: plan.targetDeadline, priority: 'LOW', reason: null }],
    })).toMatchObject({ valid: false, code: 'AI_INVALID_STRUCTURE' });
    expect(validator.validate('STUDENT_STUDY_PLAN_GENERATION', plan, {
      planTitle: 'Plan', tasks: [{ title: 'Task', topicId: plan.topics[0].topicId, goal: 'Goal', expectedMinutes: -1,
        dueDate: plan.planningStartAt, priority: 'LOW', reason: null }],
    })).toMatchObject({ valid: false, code: 'AI_INVALID_STRUCTURE' });

    const adjustment = fixture('valid', 'student-study-plan-adjustment.input');
    expect(validator.validate('STUDENT_STUDY_PLAN_ADJUSTMENT', adjustment, {
      changes: [{ taskId: 'outside', expectedMinutes: 1 }],
    })).toMatchObject({ valid: false, code: 'AI_INVALID_STRUCTURE' });

    const teacher = fixture('valid', 'teacher-class-analysis.input');
    expect(validator.validate('TEACHER_CLASS_ANALYSIS', teacher, {
      summary: 'Summary', weakTopics: [{ topicId: 'outside', reason: 'Reason' }], progressIssues: [], attentionGroups: [], recommendations: [],
    })).toMatchObject({ valid: false, code: 'AI_INVALID_STRUCTURE' });

    const grouping = fixture('valid', 'admin-feedback-grouping-stage1.input');
    const duplicatedGroups = {
      issueGroups: [{ title: 'First', summary: 'Summary', feedbackIds: ['feedback_1', 'feedback_1'] },
        { title: 'Second', summary: 'Summary', feedbackIds: ['feedback_1'] }],
    };
    const unchangedGroups = structuredClone(duplicatedGroups);
    expect(validator.validate('ADMIN_FEEDBACK_GROUPING_STAGE1', grouping, duplicatedGroups)).toEqual({ valid: true });
    expect(duplicatedGroups).toEqual(unchangedGroups);
    expect(validator.validate('ADMIN_FEEDBACK_GROUPING_STAGE1', grouping, {
      issueGroups: [{ title: 'First', summary: 'Summary', feedbackIds: ['foreign'] }],
    })).toMatchObject({ valid: false, code: 'AI_INVALID_STRUCTURE' });
  });

  it('classifies empty plan content and blank nested required text as incomplete', () => {
    const validator = new AiOutputValidator();
    const input = fixture('valid', 'student-study-plan-generation.input');
    expect(validator.validate('STUDENT_STUDY_PLAN_GENERATION', input, { planTitle: 'Plan', tasks: [] }))
      .toMatchObject({ valid: false, code: 'AI_INCOMPLETE_DATA' });
    expect(validator.validate('STUDENT_STUDY_PLAN_GENERATION', input, {
      planTitle: 'Plan', tasks: [{ title: ' ', topicId: input.topics[0].topicId, goal: 'Goal', expectedMinutes: 1,
        dueDate: input.planningStartAt, priority: 'LOW', reason: null }],
    })).toMatchObject({ valid: false, code: 'AI_INCOMPLETE_DATA' });
  });

  it('accepts partial adjustment fields and rejects changes without a valid positive update', () => {
    const validator = new AiOutputValidator();
    const input = fixture('valid', 'student-study-plan-adjustment.input');
    expect(validator.validate('STUDENT_STUDY_PLAN_ADJUSTMENT', input, {
      changes: [{ taskId: 'task_1', expectedMinutes: 60 }],
    })).toEqual({ valid: true });
    expect(validator.validate('STUDENT_STUDY_PLAN_ADJUSTMENT', input, {
      changes: [{ taskId: 'task_1', expectedMinutes: 0, dueDate: input.plan.startDate }],
    })).toMatchObject({ valid: false, code: 'AI_INVALID_STRUCTURE' });
    expect(validator.validate('STUDENT_STUDY_PLAN_ADJUSTMENT', input, {
      changes: [{ taskId: 'task_1', reason: 'No field change' }],
    })).toMatchObject({ valid: false, code: 'AI_INVALID_STRUCTURE' });
  });

  it('does not coerce or mutate an E6 parsed object', () => {
    const validator = new AiOutputValidator();
    const input = fixture('valid', 'student-study-plan-generation.input');
    const output = { planTitle: 'Plan', tasks: [{ title: 'Task', topicId: input.topics[0].topicId, goal: 'Goal', expectedMinutes: '30',
      dueDate: input.planningStartAt, priority: 'LOW', reason: null }] };
    const original = structuredClone(output);
    expect(validator.validate('STUDENT_STUDY_PLAN_GENERATION', input, output)).toMatchObject({ valid: false, code: 'AI_INVALID_STRUCTURE' });
    expect(output).toEqual(original);
  });

  it('fails closed when a released schema cannot compile', () => {
    const brokenDir = mkdtempSync(join(tmpdir(), 'ai-schema-'));
    try {
      cpSync(schemas, brokenDir, { recursive: true });
      const file = join(brokenDir, 'student-learning-analysis.output.schema.json');
      writeFileSync(file, JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object', unsupportedKeyword: true }));
      expect(() => new AiOutputValidator(brokenDir)).toThrow();
    } finally {
      rmSync(brokenDir, { recursive: true, force: true });
    }
  });
});
