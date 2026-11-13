import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsPositive, IsString } from 'class-validator';

export class GenerateStudyPlanRequestDto {
  @ApiProperty({ type: String, example: 'Cải thiện kiến thức cấu trúc dữ liệu' })
  @IsString()
  goal!: string;

  @ApiProperty({ type: Number, example: 7.5, minimum: 0, exclusiveMinimum: true })
  @IsNumber()
  @IsPositive()
  availableHoursPerWeek!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  targetDeadline!: string;
}

export class StudyPlanPreviewTaskDto {
  @ApiProperty({ type: String }) previewTaskId!: string;
  @ApiProperty({ type: () => Object }) topic!: { id: string; name: string };
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) goal!: string;
  @ApiProperty({ type: Number }) expectedMinutes!: number;
  @ApiProperty({ type: String, format: 'date-time' }) dueDate!: string;
  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH'] }) priority!: 'LOW' | 'MEDIUM' | 'HIGH';
  @ApiProperty({ type: String, nullable: true }) reason!: string | null;
}

export class StudyPlanPreviewDto {
  @ApiProperty({ type: String }) planTitle!: string;
  @ApiProperty({ type: String }) goal!: string;
  @ApiProperty({ type: Number }) availableMinutesPerWeek!: number;
  @ApiProperty({ type: String, format: 'date-time' }) targetDeadline!: string;
  @ApiProperty({ type: () => StudyPlanPreviewTaskDto, isArray: true }) tasks!: StudyPlanPreviewTaskDto[];
}

export class GenerateStudyPlanResponseDto {
  @ApiProperty({ type: String }) planPreviewRef!: string;
  @ApiProperty({ type: String, format: 'date-time' }) expiresAt!: string;
  @ApiProperty({ type: () => StudyPlanPreviewDto }) preview!: StudyPlanPreviewDto;
}
