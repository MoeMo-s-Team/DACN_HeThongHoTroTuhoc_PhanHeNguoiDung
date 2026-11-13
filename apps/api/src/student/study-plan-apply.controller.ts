import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiForbiddenResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth.service';
import { ApplyStudyPlanRequestDto, ApplyStudyPlanResponseDto, CurrentStudyPlanResponseDto } from './study-plan-apply.dto';
import { StudyPlanApplyService } from './study-plan-apply.service';

@ApiTags('student')
@Controller('student/study-plans')
@UseGuards(AuthGuard)
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({ description: 'Invalid or missing access token.' })
@ApiForbiddenResponse({ description: 'Student role or ownership check failed.' })
export class StudyPlanApplyController {
  constructor(private readonly plans: StudyPlanApplyService) {}

  @Get('current')
  @ApiOkResponse({ type: CurrentStudyPlanResponseDto })
  getCurrent(@CurrentUser() user: AuthUser) {
    return this.plans.getCurrent(user);
  }

  @Post('apply')
  @HttpCode(201)
  @ApiCreatedResponse({ type: ApplyStudyPlanResponseDto })
  @ApiOkResponse({ type: ApplyStudyPlanResponseDto, description: 'Idempotent replay of an earlier successful apply.' })
  async apply(@CurrentUser() user: AuthUser, @Body() request: ApplyStudyPlanRequestDto, @Res({ passthrough: true }) response: { status(code: number): unknown }) {
    const result = await this.plans.apply(user, request);
    response.status(result.replayed ? 200 : 201);
    return result;
  }
}
