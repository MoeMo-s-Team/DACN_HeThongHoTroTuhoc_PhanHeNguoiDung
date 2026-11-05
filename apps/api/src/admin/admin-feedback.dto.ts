import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackTag, Role } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsISO8601, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationMetaDto, PaginationQueryDto } from './admin.dto';

export class AdminFeedbackQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @IsISO8601({ strict: true, strictSeparator: true }) fromDate?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @IsISO8601({ strict: true, strictSeparator: true }) toDate?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 5 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) rating?: number;

  @ApiPropertyOptional({ enum: FeedbackTag })
  @IsOptional() @IsEnum(FeedbackTag) tag?: FeedbackTag;
}

export class FeedbackTagStatisticsDto {
  @ApiProperty({ type: Number }) AI_PERFORMANCE!: number;
  @ApiProperty({ type: Number }) STUDY_PLAN!: number;
  @ApiProperty({ type: Number }) UI_UX!: number;
  @ApiProperty({ type: Number }) LEARNING_ANALYTICS!: number;
  @ApiProperty({ type: Number }) OTHER!: number;
}

export class FeedbackSenderDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) fullName!: string;
  @ApiProperty({ enum: Role }) role!: Role;
}

export class AdminFeedbackItemDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: () => FeedbackSenderDto }) sender!: FeedbackSenderDto;
  @ApiProperty({ enum: FeedbackTag }) tag!: FeedbackTag;
  @ApiProperty({ type: Number, minimum: 1, maximum: 5 }) rating!: number;
  @ApiProperty({ type: String }) content!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}

export class AdminFeedbackResponseDto {
  @ApiProperty({ type: () => [AdminFeedbackItemDto] }) items!: AdminFeedbackItemDto[];
  @ApiProperty({ type: () => FeedbackTagStatisticsDto }) tagStatistics!: FeedbackTagStatisticsDto;
  @ApiProperty({ type: () => PaginationMetaDto }) meta!: PaginationMetaDto;
}
