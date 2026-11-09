import { HttpException, HttpStatus } from '@nestjs/common';

export type AiPublicErrorCode =
  | 'AI_CONNECTION_FAILURE'
  | 'AI_RUNTIME_FAILURE'
  | 'AI_EMPTY_RESPONSE'
  | 'AI_INVALID_STRUCTURE'
  | 'AI_INCOMPLETE_DATA'
  | 'AI_TIMEOUT';

export type AiInternalErrorCode = Exclude<AiPublicErrorCode, 'AI_RUNTIME_FAILURE'>
  | 'AI_RUNTIME_PROTOCOL_FAILURE'
  | 'AI_RUNTIME_AUTH_FAILURE'
  | 'AI_RUNTIME_INFERENCE_FAILURE'
  | 'AI_RUNTIME_TECHNICAL_FAILURE';

const errors: Record<AiPublicErrorCode, { status: number; message: string }> = {
  AI_CONNECTION_FAILURE: { status: HttpStatus.BAD_GATEWAY, message: 'Không kết nối AI runtime' },
  AI_RUNTIME_FAILURE: { status: HttpStatus.BAD_GATEWAY, message: 'AI tạm thời chưa thể xử lý yêu cầu. Vui lòng thử lại sau.' },
  AI_EMPTY_RESPONSE: { status: HttpStatus.BAD_GATEWAY, message: 'AI trả response rỗng' },
  AI_INVALID_STRUCTURE: { status: HttpStatus.BAD_GATEWAY, message: 'AI output parse/schema invalid' },
  AI_INCOMPLETE_DATA: { status: HttpStatus.BAD_GATEWAY, message: 'AI thiếu field bắt buộc' },
  AI_TIMEOUT: { status: HttpStatus.GATEWAY_TIMEOUT, message: 'AI tạm thời chưa phản hồi. Vui lòng thử lại.' },
};

function defaultInternalCode(publicCode: AiPublicErrorCode): AiInternalErrorCode {
  return publicCode === 'AI_RUNTIME_FAILURE' ? 'AI_RUNTIME_TECHNICAL_FAILURE' : publicCode;
}

export class AiAttemptException extends HttpException {
  constructor(readonly publicCode: AiPublicErrorCode, readonly internalCode: AiInternalErrorCode = defaultInternalCode(publicCode)) {
    const error = errors[publicCode];
    super({ code: publicCode, message: error.message, details: null }, error.status);
  }
}

export function aiAttemptError(publicCode: AiPublicErrorCode, internalCode: AiInternalErrorCode = defaultInternalCode(publicCode)): AiAttemptException {
  return new AiAttemptException(publicCode, internalCode);
}

export function normalizeAiAttemptError(error: unknown): AiAttemptException {
  return error instanceof AiAttemptException
    ? error
    : aiAttemptError('AI_RUNTIME_FAILURE', 'AI_RUNTIME_TECHNICAL_FAILURE');
}
