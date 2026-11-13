import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateStudyPlanAdjustmentResponseDto {
  @ApiProperty({ type: String }) adjustmentRef!: string;
  @ApiProperty({ type: String, format: 'date-time' }) expiresAt!: string;
  @ApiProperty({ type: () => Object }) preview!: {
    planId: string;
    changes: Array<{ taskId: string; title: string; expectedMinutes: number; dueDate: string; priority: string; reason?: string }>;
  };
}

export class ApplyStudyPlanAdjustmentRequestDto {
  @ApiProperty({ type: String }) @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @IsNotEmpty() adjustmentRef!: string;
}

export class ApplyStudyPlanAdjustmentResponseDto {
  @ApiProperty({ type: Boolean }) replayed!: boolean;
  @ApiProperty({ type: () => Object, isArray: true }) updatedTasks!: Array<{
    id: string; expectedMinutes: number; dueDate: string; priority: string; status: 'TODO'; completedAt: null;
  }>;
  @ApiProperty({ type: () => Object }) progress!: Record<string, number | boolean>;
}
