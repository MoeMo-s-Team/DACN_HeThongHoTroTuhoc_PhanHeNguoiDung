import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth.service';
import { StudentAssessmentResultsResponseDto, StudentDashboardResponseDto } from './student-dashboard.dto';
import { StudentDashboardService } from './student-dashboard.service';

@ApiTags('student')
@Controller('student')
export class StudentDashboardController {
  constructor(private readonly dashboard: StudentDashboardService) {}

  @Get('dashboard')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: StudentDashboardResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto, example: { code: 'AUTH_REQUIRED', message: 'Yêu cầu đăng nhập hợp lệ.', details: null } })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, example: { code: 'FORBIDDEN_RESOURCE', message: 'Không có quyền truy cập tài nguyên này.', details: null } })
  @ApiInternalServerErrorResponse({ type: ApiErrorResponseDto, example: { code: 'DATABASE_FAILURE', message: 'Không thể xử lý yêu cầu.', details: null } })
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.dashboard.getDashboard(user);
  }

  @Get('assessment-results')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: StudentAssessmentResultsResponseDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto, example: { code: 'AUTH_REQUIRED', message: 'Yêu cầu đăng nhập hợp lệ.', details: null } })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, example: { code: 'FORBIDDEN_RESOURCE', message: 'Không có quyền truy cập tài nguyên này.', details: null } })
  @ApiInternalServerErrorResponse({ type: ApiErrorResponseDto, example: { code: 'DATABASE_FAILURE', message: 'Không thể xử lý yêu cầu.', details: null } })
  getAssessmentResults(@CurrentUser() user: AuthUser) {
    return this.dashboard.getAssessmentResults(user);
  }
}
