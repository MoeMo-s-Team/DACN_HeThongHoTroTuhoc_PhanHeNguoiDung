import { applyDecorators, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { PaginationQueryDto } from '../admin/admin.dto';
import {
  ClassDashboardResponseDto,
  ClassStudentsResponseDto,
  StudentDetailResponseDto,
  TeacherClassesResponseDto,
} from './teacher.dto';
import { TeacherHistoryDetailDto, TeacherHistoryResponseDto } from './teacher-history.dto';
import { TeacherService } from './teacher.service';
import { TeacherHistoryService } from './teacher-history.service';

function ApiPaginationQuery() {
  return applyDecorators(
    ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1, minimum: 1 } }),
    ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } }),
  );
}

@ApiTags('teacher')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard)
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
@ApiForbiddenResponse({ type: ApiErrorResponseDto })
@ApiInternalServerErrorResponse({ type: ApiErrorResponseDto })
@Controller('teacher')
export class TeacherController {
  constructor(
    private readonly teacherService: TeacherService,
    private readonly historyService: TeacherHistoryService,
  ) {}

  @Get('classes')
  @ApiOkResponse({ type: TeacherClassesResponseDto })
  getClasses(@CurrentUser() user: AuthUser) {
    return this.teacherService.getClasses(user);
  }

  @Get('classes/:classId/dashboard')
  @ApiParam({ name: 'classId', type: String })
  @ApiOkResponse({ type: ClassDashboardResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getDashboard(@CurrentUser() user: AuthUser, @Param('classId') classId: string) {
    return this.teacherService.getDashboard(user, classId);
  }

  @Get('classes/:classId/students')
  @ApiParam({ name: 'classId', type: String })
  @ApiOkResponse({ type: ClassStudentsResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getStudents(@CurrentUser() user: AuthUser, @Param('classId') classId: string) {
    return this.teacherService.getStudents(user, classId);
  }

  @Get('classes/:classId/students/:studentId')
  @ApiParam({ name: 'classId', type: String })
  @ApiParam({ name: 'studentId', type: String })
  @ApiOkResponse({ type: StudentDetailResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getStudentDetail(
    @CurrentUser() user: AuthUser,
    @Param('classId') classId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.teacherService.getStudentDetail(user, classId, studentId);
  }

  @Get('classes/:classId/analysis-reports')
  @ApiParam({ name: 'classId', type: String })
  @ApiPaginationQuery()
  @ApiOkResponse({ type: TeacherHistoryResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  listReports(
    @CurrentUser() user: AuthUser,
    @Param('classId') classId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.historyService.listReports(user, classId, query);
  }

  @Get('classes/:classId/analysis-reports/:reportId')
  @ApiParam({ name: 'classId', type: String })
  @ApiParam({ name: 'reportId', type: String })
  @ApiOkResponse({ type: TeacherHistoryDetailDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getReport(
    @CurrentUser() user: AuthUser,
    @Param('classId') classId: string,
    @Param('reportId') reportId: string,
  ) {
    return this.historyService.getReport(user, classId, reportId);
  }
}
