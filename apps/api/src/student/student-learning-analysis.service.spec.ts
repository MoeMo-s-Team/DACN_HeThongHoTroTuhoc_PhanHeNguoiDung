import { AuthUser } from '../auth/auth.service';
import { StudentLearningAnalysisService } from './student-learning-analysis.service';

describe('StudentLearningAnalysisService', () => {
  const student: AuthUser = { id: 'student-1', fullName: 'Student', email: 's@example.test', role: 'STUDENT', status: 'ACTIVE' };

  it('returns INSUFFICIENT_DATA without AI when no assessment exists', async () => {
    const dashboard = { getAssessmentResults: jest.fn().mockResolvedValue({ items: [] }), getProgress: jest.fn() };
    const ai = { infer: jest.fn() };
    const service = new StudentLearningAnalysisService(dashboard as never, ai as never);

    await expect(service.analyze(student)).rejects.toMatchObject({ response: { code: 'INSUFFICIENT_DATA' } });
    expect(dashboard.getProgress).not.toHaveBeenCalled();
    expect(ai.infer).not.toHaveBeenCalled();
  });

  it('sends backend-owned latest scores and enriches returned topic names', async () => {
    const assessmentResults = { items: [{ topic: { id: 'topic-1', name: 'Trees' }, score: 58, classification: 'PRIORITY' as const, evaluatedAt: new Date() }] };
    const dashboard = { getAssessmentResults: jest.fn().mockResolvedValue(assessmentResults), getProgress: jest.fn().mockResolvedValue({ hasCurrentPlan: true, planId: 'plan-1', metrics: { completedTasks: 1 } }) };
    const ai = { infer: jest.fn().mockResolvedValue({ strengths: [], areasToImprove: ['Review trees'], priorityTopics: [{ topicId: 'topic-1', reason: 'Low score' }], reasons: ['Latest results'] }) };
    const service = new StudentLearningAnalysisService(dashboard as never, ai as never);

    const result = await service.analyze(student, '  Improve trees  ');

    expect(ai.infer).toHaveBeenCalledWith(student, 'STUDENT_LEARNING_ANALYSIS', {
      goal: 'Improve trees', assessments: [{ topicId: 'topic-1', topicName: 'Trees', score: 58, classification: 'PRIORITY' }],
      progress: { completedTasks: 1 },
    });
    expect(result.priorityTopics).toEqual([{ topicId: 'topic-1', topicName: 'Trees', reason: 'Low score' }]);
  });
});
