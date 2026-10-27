import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { UserSummaryDto } from './dto/user-summary.dto';
import { AuthService, AuthUser } from './auth.service';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('auth/login')
  @HttpCode(200)
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, example: { code: 'VALIDATION_ERROR', message: 'Dữ liệu đầu vào không hợp lệ.', details: ['email must be an email'] } })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto, example: { code: 'INVALID_CREDENTIALS', message: 'Thông tin đăng nhập không hợp lệ.', details: null } })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, example: { code: 'ACCOUNT_DISABLED', message: 'Tài khoản đã bị vô hiệu hóa.', details: null } })
  @ApiInternalServerErrorResponse({ type: ApiErrorResponseDto, example: { code: 'DATABASE_FAILURE', message: 'Không thể xử lý yêu cầu.', details: null } })
  login(@Body() input: LoginDto) {
    return this.auth.login(input);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOkResponse({ type: UserSummaryDto })
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto, example: { code: 'AUTH_REQUIRED', message: 'Yêu cầu đăng nhập hợp lệ.', details: null } })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, example: { code: 'ACCOUNT_DISABLED', message: 'Tài khoản đã bị vô hiệu hóa.', details: null } })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Post('auth/logout')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  @ApiBearerAuth('bearerAuth')
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ type: ApiErrorResponseDto, example: { code: 'AUTH_REQUIRED', message: 'Yêu cầu đăng nhập hợp lệ.', details: null } })
  @ApiForbiddenResponse({ type: ApiErrorResponseDto, example: { code: 'ACCOUNT_DISABLED', message: 'Tài khoản đã bị vô hiệu hóa.', details: null } })
  logout() {}
}
