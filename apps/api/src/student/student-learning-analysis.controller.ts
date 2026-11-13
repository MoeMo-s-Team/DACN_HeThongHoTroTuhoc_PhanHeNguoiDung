import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth.service';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { StudentLearningAnalysisRequestDto, StudentLearningAnalysisResponseDto } from './student-learning-analysis.dto';
import { StudentLearningAnalysisService } from './student-learning-analysis.service';

@ApiTags('student')
@Controller('student/ai')
export class StudentLearningAnalysisController {
  constructor(private readonly analysis: StudentLearningAnalysisService) {}

  @Post('learning-analysis')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: StudentLearningAnalysisResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto })
  @ApiUnprocessableEntityResponse({ type: ApiErrorResponseDto })
  analyze(@CurrentUser() user: AuthUser, @Body() request: StudentLearningAnalysisRequestDto) {
    return this.analysis.analyze(user, request.goal);
  }
}
