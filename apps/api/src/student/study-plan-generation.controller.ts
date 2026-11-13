import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth.service';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { GenerateStudyPlanRequestDto, GenerateStudyPlanResponseDto } from './study-plan-generation.dto';
import { StudyPlanGenerationService } from './study-plan-generation.service';

@ApiTags('student')
@Controller('student/study-plans')
export class StudyPlanGenerationController {
  constructor(private readonly plans: StudyPlanGenerationService) {}

  @Post('generate')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: GenerateStudyPlanResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  generate(@CurrentUser() user: AuthUser, @Body() request: GenerateStudyPlanRequestDto) {
    return this.plans.generate(user, request);
  }
}
