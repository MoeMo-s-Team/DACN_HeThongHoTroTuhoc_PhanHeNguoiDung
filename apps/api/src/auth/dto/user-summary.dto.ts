import { ApiProperty } from '@nestjs/swagger';

export class UserSummaryDto {
  @ApiProperty({ type: String, example: 'user_opaque_id' })
  id!: string;

  @ApiProperty({ type: String, example: 'Nguyen Van A' })
  fullName!: string;

  @ApiProperty({ type: String, format: 'email', example: 'student@example.com' })
  email!: string;

  @ApiProperty({ type: String, enum: ['STUDENT', 'TEACHER', 'ADMINISTRATOR'] })
  role!: 'STUDENT' | 'TEACHER' | 'ADMINISTRATOR';

  @ApiProperty({ type: String, enum: ['ACTIVE'] })
  status!: 'ACTIVE';
}
