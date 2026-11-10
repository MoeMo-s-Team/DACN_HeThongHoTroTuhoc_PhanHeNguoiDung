import { HttpException } from '@nestjs/common';
import { assertAiCapacityProfileAvailable } from './ai-capacity-preflight';

describe('AI capacity preflight', () => {
  it('rejects before runtime dispatch or AIRequestLog creation when no profile is released', async () => {
    const dispatch = jest.fn();
    const createAiRequestLog = jest.fn();

    try {
      assertAiCapacityProfileAvailable();
      dispatch();
      createAiRequestLog();
      fail('preflight should reject without an approved capacity profile');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(502);
      expect((error as HttpException).getResponse()).toEqual({
        code: 'AI_RUNTIME_FAILURE',
        message: 'AI tạm thời chưa thể xử lý yêu cầu. Vui lòng thử lại sau.',
        details: null,
      });
    }

    expect(dispatch).not.toHaveBeenCalled();
    expect(createAiRequestLog).not.toHaveBeenCalled();
  });
});
