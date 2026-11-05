import { Body, Controller, Get, HttpCode, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth.service';
import { StudentTasksService } from './student-tasks.service';
import {
  StudentStudyTasksResponseDto,
  UpdateStudyTaskStatusRequestDto,
  UpdateStudyTaskStatusResponseDto,
} from './student-tasks.dto';

@ApiTags('student')
@Controller('student/study-tasks')
@UseGuards(AuthGuard)
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto, example: { code: 'AUTH_REQUIRED', message: 'Yêu cầu đăng nhập hợp lệ.', details: null } })
@ApiForbiddenResponse({ type: ApiErrorResponseDto, example: { code: 'FORBIDDEN_RESOURCE', message: 'Không có quyền truy cập tài nguyên này.', details: null } })
export class StudentTasksController {
  constructor(private readonly tasks: StudentTasksService) {}

  @Get()
  @ApiOkResponse({ type: StudentStudyTasksResponseDto })
  list(@CurrentUser() user: AuthUser) {
    return this.tasks.list(user);
  }

  @Patch(':taskId/status')
  @HttpCode(200)
  @ApiParam({ name: 'taskId', type: String })
  @ApiBody({ type: UpdateStudyTaskStatusRequestDto })
  @ApiOkResponse({ type: UpdateStudyTaskStatusResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, example: { code: 'VALIDATION_ERROR', message: 'Dữ liệu đầu vào không hợp lệ.', details: ['status must be one of the following values: TODO, COMPLETED'] } })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto, example: { code: 'RESOURCE_NOT_FOUND', message: 'Không tìm thấy tài nguyên.', details: null } })
  @ApiConflictResponse({ type: ApiErrorResponseDto, example: { code: 'TASK_NOT_IN_CURRENT_PLAN', message: 'Nhiệm vụ không thuộc kế hoạch hiện tại.', details: null } })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('taskId') taskId: string,
    @Body() input: UpdateStudyTaskStatusRequestDto,
  ) {
    return this.tasks.updateStatus(user, taskId, input.status);
  }
}
