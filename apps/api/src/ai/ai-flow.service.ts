import { Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/auth.service';
import { buildRequest } from './capacity-preflight.service';
import { AiAuthoritativeContext, AiInferenceService, ValidatedTaskOutput } from './ai-inference.service';
import { AiInputSemanticError, AiSemanticValidationError } from './ai-semantic-validator';
import { AiTask } from './schema-registry.service';

interface AdminFeedbackInput {
  feedback: Array<{ feedbackId: string; tag: string; rating: number; content: string }>;
  totalFeedback: number;
  tagStatistics: Record<string, number>;
}

@Injectable()
export class AiFlowService {
  constructor(private readonly inference: AiInferenceService) {}

  runTask(task: AiTask, input: unknown, requestId: string, principal: AuthUser, context: AiAuthoritativeContext): Promise<ValidatedTaskOutput> {
    switch (task) {
      case 'STUDENT_LEARNING_ANALYSIS':
      case 'STUDENT_STUDY_PLAN_GENERATION':
      case 'STUDENT_STUDY_PLAN_ADJUSTMENT':
      case 'TEACHER_CLASS_ANALYSIS':
      case 'ADMIN_FEEDBACK_GROUPING_STAGE1':
      case 'ADMIN_FEEDBACK_SUMMARY_STAGE2':
        return this.inference.execute(buildRequest(task, input, requestId), principal, context);
    }
  }

  async runAdminFeedbackAnalysis(input: AdminFeedbackInput, requestId: string, principal: AuthUser, context: AiAuthoritativeContext): Promise<ValidatedTaskOutput> {
    if (!input.feedback.length) throw new AiInputSemanticError('Admin feedback dataset is empty');
    const grouping = await this.runTask(
      'ADMIN_FEEDBACK_GROUPING_STAGE1',
      { feedback: input.feedback },
      `${requestId}:stage1`,
      principal,
      context,
    );
    const knownIds = new Set(input.feedback.map(({ feedbackId }) => feedbackId));
    const seen = new Set<string>();
    const issueGroups = (grouping.issueGroups as Array<{ title: string; summary: string; feedbackIds: string[] }>).flatMap((group) => {
      if ('count' in group) throw new AiSemanticValidationError('AI_INVALID_STRUCTURE', 'AI supplied a derived issue count');
      const feedbackIds = group.feedbackIds.filter((id) => {
        if (!knownIds.has(id)) throw new AiSemanticValidationError('AI_INVALID_STRUCTURE', 'Unknown feedback reference');
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      return feedbackIds.length ? [{ title: group.title, summary: group.summary, feedbackIds, count: feedbackIds.length }] : [];
    });
    return this.runTask('ADMIN_FEEDBACK_SUMMARY_STAGE2', {
      feedback: input.feedback,
      totalFeedback: input.totalFeedback,
      tagStatistics: input.tagStatistics,
      issueGroups,
    }, `${requestId}:stage2`, principal, context);
  }
}
