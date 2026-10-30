import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ type: String, example: 'INVALID_CREDENTIALS' })
  code!: string;

  @ApiProperty({ type: String, example: 'Thông tin đăng nhập không hợp lệ.' })
  message!: string;

  @ApiProperty({
    type: Object,
    oneOf: [
      { type: 'object', nullable: true, additionalProperties: true },
      { type: 'array', items: {} },
    ],
    description: 'Additional safe error details; may be null, an object, or an array.',
  })
  details!: Record<string, unknown> | unknown[] | null;
}
