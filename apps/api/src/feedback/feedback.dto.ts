import { ApiProperty } from '@nestjs/swagger';
import { FeedbackTag } from '@prisma/client';
import { IsEnum, IsInt, IsString, Matches, Max, Min } from 'class-validator';

export class CreateFeedbackRequestDto {
  @ApiProperty({ enum: FeedbackTag })
  @IsEnum(FeedbackTag)
  tag!: FeedbackTag;

  @ApiProperty({ minimum: 1, maximum: 5, type: 'integer' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ type: String })
  @IsString()
  @Matches(/\S/)
  content!: string;
}

export class CreateFeedbackResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ enum: FeedbackTag })
  tag!: FeedbackTag;

  @ApiProperty({ type: 'integer' })
  rating!: number;

  @ApiProperty({ type: String })
  content!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}
