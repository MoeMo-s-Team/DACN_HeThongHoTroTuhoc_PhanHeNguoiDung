import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';

export class StudyPlanTaskEditDto {
  @ApiProperty({ type: String }) @IsString() @IsNotEmpty() previewTaskId!: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @IsNotEmpty() title?: string;
  @ApiPropertyOptional({ type: Number, minimum: 1 }) @IsOptional() @IsInt() @IsPositive() expectedMinutes?: number;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional({ enum: Priority }) @IsOptional() @IsEnum(Priority) priority?: Priority;
}

export class ApplyStudyPlanRequestDto {
  @ApiProperty({ type: String }) @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @IsNotEmpty() planPreviewRef!: string;
  @ApiPropertyOptional({ type: String }) @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @IsNotEmpty() planTitle?: string;
  @ApiPropertyOptional({ type: () => StudyPlanTaskEditDto, isArray: true })
  @IsOptional() @IsArray() @ArrayUnique((edit: StudyPlanTaskEditDto) => edit.previewTaskId) @ValidateNested({ each: true }) @Type(() => StudyPlanTaskEditDto)
  taskEdits?: StudyPlanTaskEditDto[];
}

export class AppliedStudyPlanDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) goal!: string;
  @ApiProperty({ type: Number }) availableMinutesPerWeek!: number;
  @ApiProperty({ type: String, format: 'date-time' }) startDate!: string;
  @ApiProperty({ type: String, format: 'date-time' }) endDate!: string;
  @ApiProperty({ enum: ['ACTIVE', 'COMPLETED'] }) status!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
}

export class AppliedStudyTaskDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: () => Object }) topic!: { id: string; name: string };
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) goal!: string;
  @ApiProperty({ type: Number }) expectedMinutes!: number;
  @ApiProperty({ type: String, format: 'date-time' }) dueDate!: string;
  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH'] }) priority!: string;
  @ApiProperty({ enum: ['TODO', 'COMPLETED'] }) status!: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) completedAt!: string | null;
}

export class ApplyStudyPlanResponseDto {
  @ApiProperty({ type: Boolean }) replayed!: boolean;
  @ApiProperty({ type: () => AppliedStudyPlanDto }) plan!: AppliedStudyPlanDto;
  @ApiProperty({ type: () => AppliedStudyTaskDto, isArray: true }) tasks!: AppliedStudyTaskDto[];
}

export class CurrentStudyPlanResponseDto {
  @ApiProperty({ type: () => CurrentStudyPlanDto, nullable: true }) plan!: CurrentStudyPlanDto | null;
  @ApiProperty({ type: () => AppliedStudyTaskDto, isArray: true }) tasks!: AppliedStudyTaskDto[];
}

export class CurrentStudyPlanDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) goal!: string;
  @ApiProperty({ type: Number }) availableMinutesPerWeek!: number;
  @ApiProperty({ type: String, format: 'date-time' }) startDate!: string;
  @ApiProperty({ type: String, format: 'date-time' }) endDate!: string;
  @ApiProperty({ enum: ['ACTIVE', 'COMPLETED'] }) status!: string;
}
