import { Injectable } from '@nestjs/common';
import { AiTask, SchemaRegistryService } from './schema-registry.service';

export type AiOutputErrorCode = 'AI_INCOMPLETE_DATA' | 'AI_INVALID_STRUCTURE' | 'AI_RUNTIME_FAILURE';

export class AiSemanticValidationError extends Error {
  constructor(readonly code: AiOutputErrorCode, message: string) {
    super(message);
    this.name = 'AiSemanticValidationError';
  }
}

export class AiInputSemanticError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiInputSemanticError';
  }
}

export interface PromptBindingContext extends Record<string, unknown> {
  runtimePromptVersion?: string;
  expectedPromptVersions?: string[];
}

const requiredTextFields = new Set([
  'summary', 'title', 'planTitle', 'goal', 'reason', 'description',
  'strengths', 'areasToImprove', 'reasons', 'priorityAreas',
]);

function hasBlankRequiredText(value: unknown, field = ''): boolean {
  if (typeof value === 'string') return requiredTextFields.has(field) && value.trim().length === 0;
  if (Array.isArray(value)) return value.some((item) => hasBlankRequiredText(item, field));
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, item]) => hasBlankRequiredText(item, key));
  }
  return false;
}

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function asTime(value: string): number {
  return Date.parse(value);
}

@Injectable()
export class AiSemanticValidator {
  constructor(private readonly schemas: SchemaRegistryService) {}

  validateInput(task: AiTask, input: any, _authoritativeContext: Record<string, unknown>): void {
    void _authoritativeContext;
    if (task === 'STUDENT_LEARNING_ANALYSIS') {
      if (!input.assessments?.length) throw new AiInputSemanticError('Assessment data is required');
      return;
    }
    if (task === 'STUDENT_STUDY_PLAN_GENERATION') {
      if (!input.goal?.trim() || input.availableMinutesPerWeek <= 0 || !input.assessments?.length || !input.topics?.length) {
        throw new AiInputSemanticError('Study-plan input is incomplete');
      }
      if (asTime(input.targetDeadline) <= asTime(input.planningStartAt)) {
        throw new AiInputSemanticError('Target deadline must follow planning start');
      }
    }
  }

  validateOutput(task: AiTask, input: any, output: any, authoritativeContext: PromptBindingContext): void {
    const validate = this.schemas.get(task).output;
    if (!validate(output)) {
      const code = validate.errors?.some(({ keyword }) => keyword === 'required')
        ? 'AI_INCOMPLETE_DATA'
        : 'AI_INVALID_STRUCTURE';
      throw new AiSemanticValidationError(code, 'AI output does not satisfy its task schema');
    }
    if (hasBlankRequiredText(output)) {
      throw new AiSemanticValidationError('AI_INCOMPLETE_DATA', 'AI output contains blank required text');
    }
    const result = output as Record<string, any>;

    switch (task) {
      case 'STUDENT_LEARNING_ANALYSIS': {
        const topics = new Set(input.assessments.map((item: any) => item.topicId));
        const ids = result.priorityTopics.map((item: any) => item.topicId);
        if (!ids.every((id: string) => topics.has(id)) || !unique(ids)) this.invalid('Invalid priority topic reference');
        break;
      }
      case 'STUDENT_STUDY_PLAN_GENERATION': {
        if (!result.tasks.length) this.incomplete('Study plan contains no tasks');
        const topics = new Set(input.topics.map((item: any) => item.topicId));
        for (const taskItem of result.tasks) {
          if (!topics.has(taskItem.topicId) || taskItem.expectedMinutes <= 0) this.invalid('Invalid study-plan task reference or duration');
          if (asTime(taskItem.dueDate) < asTime(input.planningStartAt)
            || asTime(taskItem.dueDate) > asTime(input.targetDeadline)) this.invalid('Study-plan due date is outside the planning window');
        }
        break;
      }
      case 'STUDENT_STUDY_PLAN_ADJUSTMENT': {
        if (!result.changes.length) this.incomplete('Adjustment contains no changes');
        const todos = new Set(input.todoTasks.map((item: any) => item.taskId));
        const ids = result.changes.map((change: any) => change.taskId);
        if (!ids.every((id: string) => todos.has(id)) || !unique(ids)) this.invalid('Invalid or duplicate TODO task reference');
        for (const change of result.changes) {
          if (change.expectedMinutes === undefined && change.dueDate === undefined && change.priority === undefined) this.invalid('Change contains no adjustable field');
          if (change.expectedMinutes !== undefined && change.expectedMinutes <= 0) this.invalid('Expected minutes must be positive');
          if (change.dueDate && (asTime(change.dueDate) < asTime(input.plan.startDate) || asTime(change.dueDate) > asTime(input.plan.endDate))) this.invalid('Adjustment due date is outside the plan window');
        }
        break;
      }
      case 'TEACHER_CLASS_ANALYSIS': {
        const weakTopics = new Set(input.topicAverageScores.filter((row: any) => row.weakTopic).map((row: any) => row.topic.id));
        const students = new Set([
          ...input.needsAttentionStudents.map((row: any) => row.studentId),
          ...input.progressWarnings.map((row: any) => row.studentId),
        ]);
        if (!result.weakTopics.every((item: any) => weakTopics.has(item.topicId))) this.invalid('Unknown or non-weak topic reference');
        if (!result.progressIssues.every((item: any) => students.has(item.studentId))) this.invalid('Unknown progress student reference');
        for (const group of result.attentionGroups) {
          if (!group.studentIds.every((id: string) => students.has(id)) || !unique(group.studentIds)) this.invalid('Invalid attention-group student reference');
        }
        break;
      }
      case 'ADMIN_FEEDBACK_GROUPING_STAGE1': {
        const feedbackIds = new Set(input.feedback.map((item: any) => item.feedbackId));
        if (!result.issueGroups.every((group: any) => group.feedbackIds.every((id: string) => feedbackIds.has(id)))) this.invalid('Unknown feedback reference');
        break;
      }
      case 'ADMIN_FEEDBACK_SUMMARY_STAGE2':
        break;
    }

    const expected = authoritativeContext.expectedPromptVersions;
    if (expected && (new Set(expected).size !== 1 || authoritativeContext.runtimePromptVersion !== expected[0])) {
      throw new AiSemanticValidationError('AI_RUNTIME_FAILURE', 'Runtime prompt version does not match deployment binding');
    }
  }

  validateCorrelation(request: any, response: any, _bindingContext: Record<string, unknown>): void {
    void _bindingContext;
    if (response.contractVersion !== request.contractVersion
      || response.requestId !== request.requestId
      || response.task !== request.task) this.invalid('Runtime response correlation mismatch');
  }

  private incomplete(message: string): never {
    throw new AiSemanticValidationError('AI_INCOMPLETE_DATA', message);
  }

  private invalid(message: string): never {
    throw new AiSemanticValidationError('AI_INVALID_STRUCTURE', message);
  }
}
