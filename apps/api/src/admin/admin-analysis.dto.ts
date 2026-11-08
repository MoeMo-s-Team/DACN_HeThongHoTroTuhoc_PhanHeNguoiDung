import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SaveAnalysisRequestDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  analysisRef!: string;
}

export class SaveAnalysisResponseDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: Boolean }) replayed!: boolean;
}
