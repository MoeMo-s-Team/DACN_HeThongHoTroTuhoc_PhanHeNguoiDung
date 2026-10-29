import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AiSemanticValidator, AiSemanticValidationError } from './ai-semantic-validator';
import { SchemaRegistryService } from './schema-registry.service';

const fixtures = join(
  process.cwd(),
  '../../docs/releases/ai-contract-v1.0-schema-pack-release1/fixtures/valid',
);

function fixture(name: string) {
  return JSON.parse(readFileSync(join(fixtures, name), 'utf8'));
}

function validator() {
  return new AiSemanticValidator(new SchemaRegistryService());
}

function expectCode(run: () => void, code: string) {
  try {
    run();
    throw new Error('expected validation to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(AiSemanticValidationError);
    expect((error as AiSemanticValidationError).code).toBe(code);
  }
}

describe('AiSemanticValidator', () => {
  it('allows missing Student goal when assessments exist', () => {
    expect(() => validator().validateInput(
      'STUDENT_LEARNING_ANALYSIS', fixture('student-learning-analysis.input.json'), {},
    )).not.toThrow();
  });

  it('maps any required output error to incomplete before other Ajv errors', () => {
    const output = fixture('student-learning-analysis.output.json');
    delete output.strengths;
    output.priorityTopics[0].topicId = 9;
    output.extra = true;
    expectCode(() => validator().validateOutput(
      'STUDENT_LEARNING_ANALYSIS', fixture('student-learning-analysis.input.json'), output, {},
    ), 'AI_INCOMPLETE_DATA');
  });

  it('maps type, enum, and unknown properties to invalid structure', () => {
    const output = fixture('student-study-plan-generation.output.json');
    output.tasks[0].priority = 'URGENT';
    output.tasks[0].title = 7;
    output.extra = true;
    expectCode(() => validator().validateOutput(
      'STUDENT_STUDY_PLAN_GENERATION', fixture('student-study-plan-generation.input.json'), output, {},
    ), 'AI_INVALID_STRUCTURE');
  });

  it('uses schema errors before blank-text checks when output is structurally invalid', () => {
    const output = fixture('student-study-plan-generation.output.json');
    output.planTitle = '   ';
    output.extra = true;
    expectCode(() => validator().validateOutput(
      'STUDENT_STUDY_PLAN_GENERATION', fixture('student-study-plan-generation.input.json'), output, {},
    ), 'AI_INVALID_STRUCTURE');
  });

  it('rejects a planning deadline not after planningStartAt before dispatch', () => {
    const input = fixture('student-study-plan-generation.input.json');
    input.targetDeadline = input.planningStartAt;
    expect(() => validator().validateInput('STUDENT_STUDY_PLAN_GENERATION', input, {})).toThrow();
  });

  it('treats empty study plans as incomplete', () => {
    const output = fixture('student-study-plan-generation.output.json');
    output.tasks = [];
    expectCode(() => validator().validateOutput(
      'STUDENT_STUDY_PLAN_GENERATION', fixture('student-study-plan-generation.input.json'), output, {},
    ), 'AI_INCOMPLETE_DATA');
  });

  it('rejects unknown or duplicate Student topic references', () => {
    const output = fixture('student-learning-analysis.output.json');
    output.priorityTopics.push({ ...output.priorityTopics[0] });
    expectCode(() => validator().validateOutput(
      'STUDENT_LEARNING_ANALYSIS', fixture('student-learning-analysis.input.json'), output, {},
    ), 'AI_INVALID_STRUCTURE');
    output.priorityTopics = [{ topicId: 'outside', reason: 'unsupported' }];
    expectCode(() => validator().validateOutput(
      'STUDENT_LEARNING_ANALYSIS', fixture('student-learning-analysis.input.json'), output, {},
    ), 'AI_INVALID_STRUCTURE');
  });

  it('rejects study-plan tasks outside allowed topics and dates', () => {
    const input = fixture('student-study-plan-generation.input.json');
    const output = fixture('student-study-plan-generation.output.json');
    output.tasks[0].topicId = 'outside';
    expectCode(() => validator().validateOutput('STUDENT_STUDY_PLAN_GENERATION', input, output, {}), 'AI_INVALID_STRUCTURE');
    output.tasks[0].topicId = 'topic_1';
    output.tasks[0].dueDate = '2026-12-01T00:00:00.000Z';
    expectCode(() => validator().validateOutput('STUDENT_STUDY_PLAN_GENERATION', input, output, {}), 'AI_INVALID_STRUCTURE');
  });

  it('rejects empty adjustment changes as incomplete and reason-only changes as invalid', () => {
    const input = fixture('student-study-plan-adjustment.input.json');
    const output = fixture('student-study-plan-adjustment.output.json');
    output.changes = [];
    expectCode(() => validator().validateOutput('STUDENT_STUDY_PLAN_ADJUSTMENT', input, output, {}), 'AI_INCOMPLETE_DATA');
    output.changes = [{ taskId: 'task_1', reason: 'Only a reason' }];
    expectCode(() => validator().validateOutput('STUDENT_STUDY_PLAN_ADJUSTMENT', input, output, {}), 'AI_INVALID_STRUCTURE');
  });

  it('rejects adjustment task membership, duplicates, and whitespace-only required text', () => {
    const input = fixture('student-study-plan-adjustment.input.json');
    const output = fixture('student-study-plan-adjustment.output.json');
    output.changes[0].taskId = 'outside';
    expectCode(() => validator().validateOutput('STUDENT_STUDY_PLAN_ADJUSTMENT', input, output, {}), 'AI_INVALID_STRUCTURE');
    output.changes[0].taskId = 'task_1';
    output.changes[0].reason = '   ';
    expectCode(() => validator().validateOutput('STUDENT_STUDY_PLAN_ADJUSTMENT', input, output, {}), 'AI_INCOMPLETE_DATA');
  });

  it('checks Teacher weak-topic and attention-student references', () => {
    const input = fixture('teacher-class-analysis.input.json');
    const output = fixture('teacher-class-analysis.output.json');
    output.weakTopics[0].topicId = 'unknown';
    expectCode(() => validator().validateOutput('TEACHER_CLASS_ANALYSIS', input, output, {}), 'AI_INVALID_STRUCTURE');
    output.weakTopics[0].topicId = 'topic_1';
    output.attentionGroups[0].studentIds = ['unknown'];
    expectCode(() => validator().validateOutput('TEACHER_CLASS_ANALYSIS', input, output, {}), 'AI_INVALID_STRUCTURE');
  });

  it('rejects Admin references, AI-supplied counts, and blank required output', () => {
    const input = fixture('admin-feedback-grouping-stage1.input.json');
    const output = fixture('admin-feedback-grouping-stage1.output.json');
    output.issueGroups[0].feedbackIds = ['outside'];
    expectCode(() => validator().validateOutput('ADMIN_FEEDBACK_GROUPING_STAGE1', input, output, {}), 'AI_INVALID_STRUCTURE');
    output.issueGroups[0].feedbackIds = ['feedback_1'];
    output.issueGroups[0].count = 1;
    expectCode(() => validator().validateOutput('ADMIN_FEEDBACK_GROUPING_STAGE1', input, output, {}), 'AI_INVALID_STRUCTURE');
    const summary = fixture('admin-feedback-summary-stage2.output.json');
    summary.summary = '   ';
    expectCode(() => validator().validateOutput('ADMIN_FEEDBACK_SUMMARY_STAGE2', fixture('admin-feedback-summary-stage2.input.json'), summary, {}), 'AI_INCOMPLETE_DATA');
  });

  it('validates correlation triplet and prompt binding after semantic validation', () => {
    const request = { contractVersion: '1.0', requestId: 'req-1', task: 'STUDENT_LEARNING_ANALYSIS' };
    const response = { contractVersion: '1.0', requestId: 'req-2', task: request.task };
    expectCode(() => validator().validateCorrelation(request, response, {}), 'AI_INVALID_STRUCTURE');
    const output = fixture('student-learning-analysis.output.json');
    expectCode(() => validator().validateOutput('STUDENT_LEARNING_ANALYSIS', fixture('student-learning-analysis.input.json'), output, {
      expectedPromptVersions: ['registry-v1', 'profile-v1', 'deployed-v1'],
      runtimePromptVersion: 'runtime-v2',
    }), 'AI_RUNTIME_FAILURE');
  });
});
