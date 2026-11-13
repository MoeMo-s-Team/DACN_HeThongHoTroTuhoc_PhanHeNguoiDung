import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth.service';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { ApplyStudyPlanAdjustmentRequestDto, ApplyStudyPlanAdjustmentResponseDto, GenerateStudyPlanAdjustmentResponseDto } from './study-plan-adjustment.dto';
import { StudyPlanAdjustmentService } from './study-plan-adjustment.service';

@ApiTags('student')
@Controller('student/study-plan-adjustments')
export class StudyPlanAdjustmentController {
  constructor(private readonly adjustments: StudyPlanAdjustmentService) {}

  @Post('generate')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: GenerateStudyPlanAdjustmentResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  generate(@CurrentUser() user: AuthUser) {
    return this.adjustments.generate(user);
  }

  @Post('apply')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: ApplyStudyPlanAdjustmentResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  apply(@CurrentUser() user: AuthUser, @Body() request: ApplyStudyPlanAdjustmentRequestDto) {
    return this.adjustments.apply(user, request);
  }
}
