import { ApiProperty } from '@nestjs/swagger';

export class TeacherClassItemDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;
}

export class TeacherClassesResponseDto {
  @ApiProperty({ type: () => [TeacherClassItemDto] })
  items!: TeacherClassItemDto[];
}

export class ClassBriefDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;
}

export class TopicBriefDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  name!: string;
}

export class TopicAverageScoreDto {
  @ApiProperty({ type: () => TopicBriefDto })
  topic!: TopicBriefDto;

  @ApiProperty({ type: Number })
  averageScore!: number;

  @ApiProperty({ type: Boolean })
  weakTopic!: boolean;
}

export class NeedsAttentionStudentDto {
  @ApiProperty({ type: String })
  studentId!: string;

  @ApiProperty({ type: String })
  fullName!: string;

  @ApiProperty({ type: [String], example: ['AVERAGE_SCORE_BELOW_60', 'OVERDUE_TASKS_AT_LEAST_2'] })
  reasons!: string[];
}

export class ProgressWarningStudentDto {
  @ApiProperty({ type: String })
  studentId!: string;

  @ApiProperty({ type: String })
  fullName!: string;

  @ApiProperty({ type: Number, example: 40.0 })
  actualProgress!: number;

  @ApiProperty({ type: Number, example: 70.0 })
  expectedProgress!: number;
}

export class ClassDashboardResponseDto {
  @ApiProperty({ type: () => ClassBriefDto })
  class!: ClassBriefDto;

  @ApiProperty({ type: Number })
  studentCount!: number;

  @ApiProperty({ type: Number, nullable: true })
  classAverageScore!: number | null;

  @ApiProperty({ type: () => [TopicAverageScoreDto] })
  topicAverageScores!: TopicAverageScoreDto[];

  @ApiProperty({ type: Number, nullable: true })
  classCompletionRate!: number | null;

  @ApiProperty({ type: Number })
  overdueTaskCount!: number;

  @ApiProperty({ type: () => [NeedsAttentionStudentDto] })
  needsAttentionStudents!: NeedsAttentionStudentDto[];

  @ApiProperty({ type: () => [ProgressWarningStudentDto] })
  progressWarnings!: ProgressWarningStudentDto[];
}

export class StudentBriefDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  fullName!: string;
}

export class ClassStudentItemDto {
  @ApiProperty({ type: () => StudentBriefDto })
  student!: StudentBriefDto;

  @ApiProperty({ type: Number, nullable: true })
  averageScore!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  completionRate!: number | null;

  @ApiProperty({ type: Number })
  overdueTaskCount!: number;

  @ApiProperty({ type: Boolean })
  needsAttention!: boolean;
}

export class ClassStudentsResponseDto {
  @ApiProperty({ type: () => ClassBriefDto })
  class!: ClassBriefDto;

  @ApiProperty({ type: () => [ClassStudentItemDto] })
  items!: ClassStudentItemDto[];
}

export class StudentAssessmentResultItemDto {
  @ApiProperty({ type: () => TopicBriefDto })
  topic!: TopicBriefDto;

  @ApiProperty({ type: Number })
  score!: number;

  @ApiProperty({ enum: ['GOOD', 'NEEDS_REINFORCEMENT', 'PRIORITY'] })
  classification!: 'GOOD' | 'NEEDS_REINFORCEMENT' | 'PRIORITY';

  @ApiProperty({ type: String, format: 'date-time' })
  evaluatedAt!: Date;
}

export class StudentMetricsDto {
  @ApiProperty({ type: Number, nullable: true })
  averageScore!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  completionRate!: number | null;

  @ApiProperty({ type: Number })
  overdueTaskCount!: number;

  @ApiProperty({ type: Number, nullable: true })
  actualProgress!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  expectedProgress!: number | null;
}

export class StudentDetailResponseDto {
  @ApiProperty({ type: () => StudentBriefDto })
  student!: StudentBriefDto;

  @ApiProperty({ type: () => [StudentAssessmentResultItemDto] })
  assessmentResults!: StudentAssessmentResultItemDto[];

  @ApiProperty({ type: () => StudentMetricsDto })
  metrics!: StudentMetricsDto;
}
