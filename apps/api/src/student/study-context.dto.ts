import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsPositive, IsString } from 'class-validator';

export class ValidateStudyContextRequestDto {
  @ApiProperty({ type: String, example: 'Cải thiện kiến thức cấu trúc dữ liệu' })
  @IsString()
  goal!: string;

  @ApiProperty({ type: Number, example: 7.5, minimum: 0, exclusiveMinimum: true })
  @IsNumber()
  @IsPositive()
  availableHoursPerWeek!: number;

  @ApiProperty({ type: String, format: 'date-time', example: '2026-11-30T16:59:59.000Z' })
  @IsDateString()
  targetDeadline!: string;
}

export class ValidateStudyContextResponseDto {
  @ApiProperty({ type: String })
  goal!: string;

  @ApiProperty({ type: Number, example: 450, minimum: 0, exclusiveMinimum: true })
  availableMinutesPerWeek!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  targetDeadline!: string;
}
