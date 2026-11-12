import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../admin/admin.dto';

export class TeacherHistoryItemDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  classId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, nullable: true })
  summary!: string | null;
}

export class TeacherHistoryResponseDto {
  @ApiProperty({ type: () => [TeacherHistoryItemDto] })
  items!: TeacherHistoryItemDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class TeacherHistoryDetailDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  classId!: string;

  @ApiProperty({ type: Object })
  inputSnapshot!: Record<string, unknown>;

  @ApiProperty({ type: Object })
  analysisResult!: Record<string, unknown>;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}
