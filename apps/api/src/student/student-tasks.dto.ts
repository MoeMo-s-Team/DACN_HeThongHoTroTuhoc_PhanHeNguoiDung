import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { StudyTaskStatus } from '@prisma/client';
import { ProgressViewDto, StudyTaskViewDto } from './student-dashboard.dto';

export class UpdateStudyTaskStatusRequestDto {
  @ApiProperty({ enum: ['TODO', 'COMPLETED'] })
  @IsEnum(StudyTaskStatus)
  status!: StudyTaskStatus;
}

export class StudentStudyTasksResponseDto {
  @ApiProperty({ type: String, nullable: true })
  planId!: string | null;

  @ApiProperty({ enum: ['ACTIVE', 'COMPLETED'], nullable: true })
  planStatus!: 'ACTIVE' | 'COMPLETED' | null;

  @ApiProperty({ type: () => StudyTaskViewDto, isArray: true })
  items!: StudyTaskViewDto[];
}

export class UpdatedStudyTaskDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ enum: ['TODO', 'COMPLETED'] })
  status!: StudyTaskStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completedAt!: Date | null;
}

export class UpdateStudyTaskStatusResponseDto {
  @ApiProperty({ type: () => UpdatedStudyTaskDto })
  task!: UpdatedStudyTaskDto;

  @ApiProperty({ enum: ['ACTIVE', 'COMPLETED'] })
  planStatus!: 'ACTIVE' | 'COMPLETED';

  @ApiProperty({ type: () => ProgressViewDto })
  progress!: ProgressViewDto;
}
