import { AuthUser } from '../auth/auth.service';
import { AiService } from './ai.service';

describe('AiService', () => {
  it('fails before network dispatch or AIRequestLog creation when no profile is released', async () => {
    const gateway = { infer: jest.fn() };
    const requestLog = { runAttempt: jest.fn() };
    const service = new AiService(gateway as never, requestLog as never);
    const student: AuthUser = {
      id: 'student-1', fullName: 'Student', email: 'student@example.test', role: 'STUDENT', status: 'ACTIVE',
    };

    await expect(service.infer(student, 'STUDENT_STUDY_PLAN_GENERATION', {})).rejects.toMatchObject({
      response: { code: 'AI_RUNTIME_FAILURE' },
    });
    expect(gateway.infer).not.toHaveBeenCalled();
    expect(requestLog.runAttempt).not.toHaveBeenCalled();
  });
});
