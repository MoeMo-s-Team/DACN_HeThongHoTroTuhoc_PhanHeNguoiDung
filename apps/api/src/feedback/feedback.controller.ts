import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { CreateFeedbackRequestDto, CreateFeedbackResponseDto } from './feedback.dto';
import { FeedbackService } from './feedback.service';

@ApiTags('feedback')
@Controller('feedback')
@UseGuards(AuthGuard)
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto, example: { code: 'AUTH_REQUIRED', message: 'Yêu cầu đăng nhập hợp lệ.', details: null } })
@ApiForbiddenResponse({ type: ApiErrorResponseDto, example: { code: 'FORBIDDEN_RESOURCE', message: 'Không có quyền thực hiện thao tác này.', details: null } })
@ApiInternalServerErrorResponse({ type: ApiErrorResponseDto, example: { code: 'DATABASE_FAILURE', message: 'Không thể xử lý yêu cầu.', details: null } })
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Post()
  @HttpCode(201)
  @ApiBearerAuth('bearerAuth')
  @ApiBody({ type: CreateFeedbackRequestDto })
  @ApiCreatedResponse({ type: CreateFeedbackResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, example: { code: 'VALIDATION_ERROR', message: 'Dữ liệu đầu vào không hợp lệ.', details: ['rating must not be greater than 5'] } })
  create(@CurrentUser() user: AuthUser, @Body() input: CreateFeedbackRequestDto) {
    return this.feedback.create(user, input);
  }
}
