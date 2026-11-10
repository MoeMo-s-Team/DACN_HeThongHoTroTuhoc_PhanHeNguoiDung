import { AI_TASK_KEYS, getAiTaskDefinition } from './ai-task.registry';

describe('AI task registry', () => {
  it('registers exactly the six released task keys and schema pairs', () => {
    expect(AI_TASK_KEYS).toEqual([
      'STUDENT_LEARNING_ANALYSIS',
      'STUDENT_STUDY_PLAN_GENERATION',
      'STUDENT_STUDY_PLAN_ADJUSTMENT',
      'TEACHER_CLASS_ANALYSIS',
      'ADMIN_FEEDBACK_GROUPING_STAGE1',
      'ADMIN_FEEDBACK_SUMMARY_STAGE2',
    ]);
    expect(AI_TASK_KEYS.map((key) => getAiTaskDefinition(key))).toEqual(expect.arrayContaining([
      expect.objectContaining({ inputSchema: expect.stringContaining('student-learning-analysis.input.schema.json'), outputSchema: expect.stringContaining('student-learning-analysis.output.schema.json') }),
      expect.objectContaining({ inputSchema: expect.stringContaining('student-study-plan-generation.input.schema.json'), outputSchema: expect.stringContaining('student-study-plan-generation.output.schema.json') }),
      expect.objectContaining({ inputSchema: expect.stringContaining('student-study-plan-adjustment.input.schema.json'), outputSchema: expect.stringContaining('student-study-plan-adjustment.output.schema.json') }),
      expect.objectContaining({ inputSchema: expect.stringContaining('teacher-class-analysis.input.schema.json'), outputSchema: expect.stringContaining('teacher-class-analysis.output.schema.json') }),
      expect.objectContaining({ inputSchema: expect.stringContaining('admin-feedback-grouping-stage1.input.schema.json'), outputSchema: expect.stringContaining('admin-feedback-grouping-stage1.output.schema.json') }),
      expect.objectContaining({ inputSchema: expect.stringContaining('admin-feedback-summary-stage2.input.schema.json'), outputSchema: expect.stringContaining('admin-feedback-summary-stage2.output.schema.json') }),
    ]));
    expect(AI_TASK_KEYS.map((key) => getAiTaskDefinition(key)?.promptVersion)).toEqual([
      'stu-learning-analysis-v1', 'stu-study-plan-v1', 'stu-study-adjust-v1',
      'tea-class-analysis-v1', 'adm-feedback-group-v1', 'adm-feedback-summary-v1',
    ]);
  });

  it('does not resolve unregistered task aliases', () => {
    expect(getAiTaskDefinition('student-learning-analysis')).toBeUndefined();
    expect(getAiTaskDefinition('UNKNOWN')).toBeUndefined();
    expect(getAiTaskDefinition('toString')).toBeUndefined();
    expect(getAiTaskDefinition('constructor')).toBeUndefined();
  });
});
