import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackTag } from '@prisma/client';
import { FeedbackTagStatisticsDto } from './admin-feedback.dto';
import { PaginationMetaDto } from './admin.dto';

export class FeedbackAnalysisFilterDto {
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) fromDate?: string | null;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true }) toDate?: string | null;
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 5, nullable: true }) rating?: number | null;
  @ApiPropertyOptional({ enum: FeedbackTag, nullable: true }) tag?: FeedbackTag | null;
}

export class FeedbackAnalysisInputSnapshotDto {
  @ApiProperty({ type: () => FeedbackAnalysisFilterDto }) filter!: FeedbackAnalysisFilterDto;
  @ApiProperty({ type: [String] }) feedbackIds!: string[];
  @ApiProperty({ type: Number }) totalFeedback!: number;
  @ApiProperty({ type: () => FeedbackTagStatisticsDto }) tagStatistics!: FeedbackTagStatisticsDto;
}

export class FeedbackIssueGroupDto {
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) summary!: string;
  @ApiProperty({ type: [String] }) feedbackIds!: string[];
  @ApiProperty({ type: Number }) count!: number;
}

export class FeedbackRecommendationDto {
  @ApiProperty({ type: String }) title!: string;
  @ApiProperty({ type: String }) description!: string;
}

export class FeedbackAnalysisResultDto {
  @ApiProperty({ type: () => [FeedbackIssueGroupDto] }) issueGroups!: FeedbackIssueGroupDto[];
  @ApiProperty({ type: String }) summary!: string;
  @ApiProperty({ type: [String] }) priorityAreas!: string[];
  @ApiProperty({ type: () => [FeedbackRecommendationDto] }) recommendations!: FeedbackRecommendationDto[];
}

export class AdminHistoryItemDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: Number }) totalFeedback!: number;
  @ApiProperty({ type: () => FeedbackAnalysisFilterDto }) filter!: FeedbackAnalysisFilterDto;
}

export class AdminHistoryResponseDto {
  @ApiProperty({ type: () => [AdminHistoryItemDto] }) items!: AdminHistoryItemDto[];
  @ApiProperty({ type: () => PaginationMetaDto }) meta!: PaginationMetaDto;
}

export class AdminHistoryDetailDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: () => FeedbackAnalysisInputSnapshotDto }) inputSnapshot!: FeedbackAnalysisInputSnapshotDto;
  @ApiProperty({ type: () => FeedbackAnalysisResultDto }) analysisResult!: FeedbackAnalysisResultDto;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
}
