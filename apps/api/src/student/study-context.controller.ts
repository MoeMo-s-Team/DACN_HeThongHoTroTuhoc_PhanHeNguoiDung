import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser } from '../auth/auth.service';
import { ValidateStudyContextRequestDto, ValidateStudyContextResponseDto } from './study-context.dto';
import { StudyContextService } from './study-context.service';

@ApiTags('student')
@Controller('student/study-context')
export class StudyContextController {
  constructor(private readonly studyContext: StudyContextService) {}

  @Post('validate')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: ValidateStudyContextResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, example: { code: 'VALIDATION_ERROR', message: 'Dữ liệu đầu vào không hợp lệ.', details: ['goal must not be empty'] } })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto, example: { code: 'AUTH_REQUIRED', message: 'Yêu cầu đăng nhập hợp lệ.', details: null } })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, example: { code: 'FORBIDDEN_RESOURCE', message: 'Không có quyền truy cập tài nguyên này.', details: null } })
  validate(@CurrentUser() user: AuthUser, @Body() input: ValidateStudyContextRequestDto) {
    return this.studyContext.validate(user, input);
  }
}
