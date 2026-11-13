import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { AuthUser } from '../auth/auth.service';
import { AiService } from '../ai/ai.service';
import { StudentDashboardService } from './student-dashboard.service';

function forbidden() {
  return new ForbiddenException({ code: 'FORBIDDEN_RESOURCE', message: 'Không có quyền truy cập tài nguyên này.', details: null });
}
function insufficientData() {
  return new UnprocessableEntityException({ code: 'INSUFFICIENT_DATA', message: 'Chưa có kết quả đánh giá để phân tích.', details: null });
}

@Injectable()
export class StudentLearningAnalysisService {
  constructor(private readonly dashboard: StudentDashboardService, private readonly ai: AiService) {}

  async analyze(user: AuthUser, goal?: string) {
    if (user.role !== 'STUDENT') throw forbidden();
    const assessmentResults = await this.dashboard.getAssessmentResults(user);
    if (!assessmentResults.items.length) throw insufficientData();
    const progressResponse = await this.dashboard.getProgress(user);
    const input = {
      goal: goal?.trim() || null,
      assessments: assessmentResults.items.map((item) => ({
        topicId: item.topic.id, topicName: item.topic.name, score: item.score, classification: item.classification,
      })),
      progress: progressResponse.metrics,
    };
    const output = await this.ai.infer(user, 'STUDENT_LEARNING_ANALYSIS', input);
    const topicNames = new Map(assessmentResults.items.map((item) => [item.topic.id, item.topic.name]));
    return {
      strengths: output.strengths as string[],
      areasToImprove: output.areasToImprove as string[],
      priorityTopics: (output.priorityTopics as Array<{ topicId: string; reason: string }>).map((topic) => ({
        topicId: topic.topicId, topicName: topicNames.get(topic.topicId)!, reason: topic.reason,
      })),
      reasons: output.reasons as string[],
    };
  }
}
