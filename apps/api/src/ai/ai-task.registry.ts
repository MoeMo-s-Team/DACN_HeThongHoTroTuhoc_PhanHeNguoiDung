export const AI_TASK_KEYS = Object.freeze([
  'STUDENT_LEARNING_ANALYSIS',
  'STUDENT_STUDY_PLAN_GENERATION',
  'STUDENT_STUDY_PLAN_ADJUSTMENT',
  'TEACHER_CLASS_ANALYSIS',
  'ADMIN_FEEDBACK_GROUPING_STAGE1',
  'ADMIN_FEEDBACK_SUMMARY_STAGE2',
] as const);

export type AiTaskKey = (typeof AI_TASK_KEYS)[number];

export type AiTaskDefinition = {
  inputSchema: string;
  outputSchema: string;
  contractVersion: '1.0';
  schemaPackVersion: 'release1';
  promptVersion: string;
  validateSemantics: (input: Record<string, unknown>, output: Record<string, unknown>) => AiSemanticFailure | undefined;
};

export type AiSemanticFailure = { code: 'AI_INCOMPLETE_DATA' | 'AI_INVALID_STRUCTURE'; reason: string };

const hasNonBlank = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const objects = (value: unknown) => value as Record<string, unknown>[];
const object = (value: unknown) => value as Record<string, unknown>;
const unique = (values: unknown[]) => new Set(values).size === values.length;
const inSet = (value: unknown, values: unknown[]) => values.includes(value);
const incomplete = (reason: string): AiSemanticFailure => ({ code: 'AI_INCOMPLETE_DATA', reason });
const invalid = (reason: string): AiSemanticFailure => ({ code: 'AI_INVALID_STRUCTURE', reason });
const datesWithin = (value: unknown, start: unknown, end: unknown) =>
  typeof value === 'string' && typeof start === 'string' && typeof end === 'string'
  && Date.parse(value) >= Date.parse(start) && Date.parse(value) <= Date.parse(end);

const definitions: Record<AiTaskKey, AiTaskDefinition> = {
  STUDENT_LEARNING_ANALYSIS: {
    inputSchema: 'student-learning-analysis.input.schema.json',
    outputSchema: 'student-learning-analysis.output.schema.json',
    contractVersion: '1.0',
    schemaPackVersion: 'release1',
    promptVersion: 'stu-learning-analysis-v1',
    validateSemantics: (input, output) => {
      const topicIds = objects(input.assessments).map((item) => item.topicId);
      const topics = objects(output.priorityTopics);
      if (topics.some((item) => !inSet(item.topicId, topicIds)) || !unique(topics.map((item) => item.topicId))) return invalid('AI output contains an invalid or duplicate topicId');
      if ([...(output.strengths as unknown[]), ...(output.areasToImprove as unknown[]), ...(output.reasons as unknown[])].some((item) => !hasNonBlank(item))) return incomplete('AI output contains blank required text');
      if (topics.some((item) => !hasNonBlank(item.reason))) return incomplete('AI output contains blank required text');
      return undefined;
    },
  },
  STUDENT_STUDY_PLAN_GENERATION: {
    inputSchema: 'student-study-plan-generation.input.schema.json',
    outputSchema: 'student-study-plan-generation.output.schema.json',
    contractVersion: '1.0',
    schemaPackVersion: 'release1',
    promptVersion: 'stu-study-plan-v1',
    validateSemantics: (input, output) => {
      const topicIds = objects(input.topics).map((item) => item.topicId);
      const tasks = objects(output.tasks);
      if (tasks.length === 0) return incomplete('AI output must contain at least one task');
      if (!hasNonBlank(output.planTitle) || tasks.some((task) => !hasNonBlank(task.title) || !hasNonBlank(task.goal) || (task.reason !== null && !hasNonBlank(task.reason)))) return incomplete('AI output contains blank required text');
      if (tasks.some((task) => typeof task.expectedMinutes !== 'number' || task.expectedMinutes <= 0)) return invalid('AI output contains a non-positive expectedMinutes');
      if (tasks.some((task) => !inSet(task.topicId, topicIds) || !datesWithin(task.dueDate, input.planningStartAt, input.targetDeadline))) return invalid('AI output contains an invalid topicId or dueDate');
      return undefined;
    },
  },
  STUDENT_STUDY_PLAN_ADJUSTMENT: {
    inputSchema: 'student-study-plan-adjustment.input.schema.json',
    outputSchema: 'student-study-plan-adjustment.output.schema.json',
    contractVersion: '1.0',
    schemaPackVersion: 'release1',
    promptVersion: 'stu-study-adjust-v1',
    validateSemantics: (input, output) => {
      const tasks = objects(output.changes);
      const allowedIds = objects(input.todoTasks).map((item) => item.taskId);
      if (tasks.length === 0) return incomplete('AI output must contain at least one change');
      if (tasks.some((task) => !inSet(task.taskId, allowedIds)) || !unique(tasks.map((task) => task.taskId))) return invalid('AI output contains an invalid or duplicate taskId');
      if (tasks.some((task) => !['expectedMinutes', 'dueDate', 'priority'].some((field) => task[field] !== undefined))) return invalid('AI output contains a change with no mutable field');
      if (tasks.some((task) => task.expectedMinutes !== undefined && (typeof task.expectedMinutes !== 'number' || task.expectedMinutes <= 0))) return invalid('AI output contains a non-positive expectedMinutes');
      if (tasks.some((task) => task.dueDate !== undefined && !datesWithin(task.dueDate, object(input.plan).startDate, object(input.plan).endDate))) return invalid('AI output contains an invalid dueDate');
      if (tasks.some((task) => task.reason !== undefined && !hasNonBlank(task.reason))) return incomplete('AI output contains blank required text');
      return undefined;
    },
  },
  TEACHER_CLASS_ANALYSIS: {
    inputSchema: 'teacher-class-analysis.input.schema.json',
    outputSchema: 'teacher-class-analysis.output.schema.json',
    contractVersion: '1.0',
    schemaPackVersion: 'release1',
    promptVersion: 'tea-class-analysis-v1',
    validateSemantics: (input, output) => {
      const topics = objects(input.topicAverageScores).filter((item) => item.weakTopic).map((item) => object(item.topic).id);
      const studentIds = [...objects(input.needsAttentionStudents), ...objects(input.progressWarnings)].map((item) => item.studentId);
      if (objects(output.weakTopics).some((item) => !inSet(item.topicId, topics))) return invalid('AI output contains a topic that is not backend-marked as weak');
      if (objects(output.progressIssues).some((item) => !inSet(item.studentId, studentIds))) return invalid('AI output contains an unknown studentId');
      for (const group of objects(output.attentionGroups)) {
        const ids = group.studentIds as unknown[];
        if (ids.length < 1 || ids.some((id) => !inSet(id, studentIds)) || !unique(ids)) return invalid('AI output contains an invalid attention group');
      }
      if (!hasNonBlank(output.summary)
        || [...objects(output.weakTopics), ...objects(output.progressIssues), ...objects(output.attentionGroups), ...objects(output.recommendations)]
          .some((item) => Object.values(item).some((value) => typeof value === 'string' && !hasNonBlank(value)))) return incomplete('AI output contains blank required text');
      return undefined;
    },
  },
  ADMIN_FEEDBACK_GROUPING_STAGE1: {
    inputSchema: 'admin-feedback-grouping-stage1.input.schema.json',
    outputSchema: 'admin-feedback-grouping-stage1.output.schema.json',
    contractVersion: '1.0',
    schemaPackVersion: 'release1',
    promptVersion: 'adm-feedback-group-v1',
    validateSemantics: (input, output) => {
      const feedbackIds = objects(input.feedback).map((item) => item.feedbackId);
      for (const group of objects(output.issueGroups)) {
        const ids = group.feedbackIds as unknown[];
        if (ids.some((id) => !inSet(id, feedbackIds))) return invalid('AI output contains an unknown feedbackId');
      }
      if (objects(output.issueGroups).some((item) => !hasNonBlank(item.title) || !hasNonBlank(item.summary))) return incomplete('AI output contains blank required text');
      return undefined;
    },
  },
  ADMIN_FEEDBACK_SUMMARY_STAGE2: {
    inputSchema: 'admin-feedback-summary-stage2.input.schema.json',
    outputSchema: 'admin-feedback-summary-stage2.output.schema.json',
    contractVersion: '1.0',
    schemaPackVersion: 'release1',
    promptVersion: 'adm-feedback-summary-v1',
    validateSemantics: (_input, output) => {
      if (!hasNonBlank(output.summary)
        || objects(output.recommendations).some((item) => !hasNonBlank(item.title) || !hasNonBlank(item.description))) return incomplete('AI output contains blank required text');
      if ((output.priorityAreas as unknown[]).some((item) => !hasNonBlank(item))) return incomplete('AI output contains blank required text');
      return undefined;
    },
  },
};

export function getAiTaskDefinition(task: string): AiTaskDefinition | undefined {
  return Object.hasOwn(definitions, task) ? definitions[task as AiTaskKey] : undefined;
}
