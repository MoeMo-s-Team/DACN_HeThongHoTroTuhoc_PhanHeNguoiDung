import { HttpException } from '@nestjs/common';
import { aiAttemptError, normalizeAiAttemptError } from './ai-errors';

describe('AI public errors', () => {
  it.each([
    ['AI_CONNECTION_FAILURE', 502, 'AI_CONNECTION_FAILURE', 'Không kết nối AI runtime'],
    ['AI_RUNTIME_FAILURE', 502, 'AI_RUNTIME_FAILURE', 'AI tạm thời chưa thể xử lý yêu cầu. Vui lòng thử lại sau.'],
    ['AI_EMPTY_RESPONSE', 502, 'AI_EMPTY_RESPONSE', 'AI trả response rỗng'],
    ['AI_INVALID_STRUCTURE', 502, 'AI_INVALID_STRUCTURE', 'AI output parse/schema invalid'],
    ['AI_INCOMPLETE_DATA', 502, 'AI_INCOMPLETE_DATA', 'AI thiếu field bắt buộc'],
    ['AI_TIMEOUT', 504, 'AI_TIMEOUT', 'AI tạm thời chưa phản hồi. Vui lòng thử lại.'],
  ] as const)('maps %s to its released public status and shape', (code, status, publicCode, message) => {
    const error = aiAttemptError(code);
    expect(error).toBeInstanceOf(HttpException);
    expect(error.getStatus()).toBe(status);
    expect(error.getResponse()).toEqual({ code: publicCode, message, details: null });
  });

  it('keeps safe internal categories separate from the public error', () => {
    const error = aiAttemptError('AI_RUNTIME_FAILURE', 'AI_RUNTIME_AUTH_FAILURE');
    expect(error.internalCode).toBe('AI_RUNTIME_AUTH_FAILURE');
    expect(error.getResponse()).toMatchObject({ code: 'AI_RUNTIME_FAILURE' });
  });

  it('defaults generic runtime errors to the internal technical category', () => {
    expect(aiAttemptError('AI_RUNTIME_FAILURE').internalCode).toBe('AI_RUNTIME_TECHNICAL_FAILURE');
  });

  it('normalizes unknown runtime exceptions without exposing their message', () => {
    const normalized = normalizeAiAttemptError(new Error('token=super-secret prompt=private'));
    expect(normalized.internalCode).toBe('AI_RUNTIME_TECHNICAL_FAILURE');
    expect(normalized.getResponse()).toEqual({
      code: 'AI_RUNTIME_FAILURE',
      message: 'AI tạm thời chưa thể xử lý yêu cầu. Vui lòng thử lại sau.',
      details: null,
    });
    expect(JSON.stringify(normalized.getResponse())).not.toContain('super-secret');
  });
});
