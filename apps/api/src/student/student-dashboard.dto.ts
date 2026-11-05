import { ApiProperty } from '@nestjs/swagger';

export class TopicViewDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) name!: string;
}

export class AssessmentResultViewDto {
  @ApiProperty({ type: () => TopicViewDto }) topic!: TopicViewDto;
  @ApiProperty({ type: Number }) score!: number;
  @ApiProperty({ enum: ['GOOD', 'NEEDS_REINFORCEMENT', 'PRIORITY'] })
  classification!: 'GOOD' | 'NEEDS_REINFORCEMENT' | 'PRIORITY';
  @ApiProperty({ type: String, format: 'date-time' }) evaluatedAt!: Date;
}

export class StudentAssessmentResultsResponseDto {
  @ApiProperty({ type: () => AssessmentResultViewDto, isArray: true })
  items!: AssessmentResultViewDto[];
}

export class StudyTaskViewDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: () => TopicViewDto }) topic!: TopicViewDto;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) goal!: string;
  @ApiProperty({ type: Number }) expectedMinutes!: number;
  @ApiProperty({ type: String, format: 'date-time' }) dueDate!: Date;
  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH'] }) priority!: 'LOW' | 'MEDIUM' | 'HIGH';
  @ApiProperty({ enum: ['TODO', 'COMPLETED'] }) status!: 'TODO' | 'COMPLETED';
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) completedAt!: Date | null;
}

export class StudentDashboardPlanDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) goal!: string;
  @ApiProperty({ enum: ['ACTIVE', 'COMPLETED'] }) status!: 'ACTIVE' | 'COMPLETED';
  @ApiProperty({ type: String, format: 'date-time' }) startDate!: Date;
  @ApiProperty({ type: String, format: 'date-time' }) endDate!: Date;
}

export class ProgressViewDto {
  @ApiProperty({ type: Number }) completedTasks!: number;
  @ApiProperty({ type: Number }) totalTasks!: number;
  @ApiProperty({ type: Number }) completionPercentage!: number;
  @ApiProperty({ type: Number }) actualProgress!: number;
  @ApiProperty({ type: Number }) expectedProgress!: number;
  @ApiProperty({ type: Number }) overdueTasks!: number;
  @ApiProperty({ type: Boolean }) slowProgress!: boolean;
}

export class StudentProgressResponseDto {
  @ApiProperty({ type: Boolean }) hasCurrentPlan!: boolean;
  @ApiProperty({ type: String, nullable: true }) planId!: string | null;
  @ApiProperty({ type: () => ProgressViewDto, nullable: true }) metrics!: ProgressViewDto | null;
}

export class StudentDashboardResponseDto {
  @ApiProperty({ type: () => AssessmentResultViewDto, isArray: true })
  assessmentResults!: AssessmentResultViewDto[];

  @ApiProperty({ type: () => StudentDashboardPlanDto, nullable: true })
  currentPlan!: StudentDashboardPlanDto | null;

  @ApiProperty({ type: () => ProgressViewDto, nullable: true })
  progress!: ProgressViewDto | null;

  @ApiProperty({ type: () => StudyTaskViewDto, isArray: true })
  nearDueTasks!: StudyTaskViewDto[];

  @ApiProperty({ type: () => StudyTaskViewDto, isArray: true })
  overdueTaskItems!: StudyTaskViewDto[];
}
