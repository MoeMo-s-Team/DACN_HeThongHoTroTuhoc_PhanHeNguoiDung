import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class StudentLearningAnalysisRequestDto {
  @ApiPropertyOptional({ type: String, example: 'Cải thiện kiến thức cấu trúc dữ liệu' })
  @IsOptional() @IsString() goal?: string;
}

export class StudentPriorityTopicDto {
  @ApiProperty({ type: String }) topicId!: string;
  @ApiProperty({ type: String }) topicName!: string;
  @ApiProperty({ type: String }) reason!: string;
}

export class StudentLearningAnalysisResponseDto {
  @ApiProperty({ type: String, isArray: true }) strengths!: string[];
  @ApiProperty({ type: String, isArray: true }) areasToImprove!: string[];
  @ApiProperty({ type: () => StudentPriorityTopicDto, isArray: true }) priorityTopics!: StudentPriorityTopicDto[];
  @ApiProperty({ type: String, isArray: true }) reasons!: string[];
}
