import { HttpException, HttpStatus } from '@nestjs/common';

export function assertAiCapacityProfileAvailable(): never {
  throw new HttpException({
    code: 'AI_RUNTIME_FAILURE',
    message: 'AI tạm thời chưa thể xử lý yêu cầu. Vui lòng thử lại sau.',
    details: null,
  }, HttpStatus.BAD_GATEWAY);
}
