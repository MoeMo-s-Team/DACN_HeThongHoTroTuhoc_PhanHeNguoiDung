import { applyDecorators, Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { FeedbackTag } from '@prisma/client';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiConflictResponse, ApiCreatedResponse, ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiNotFoundResponse, ApiOkResponse, ApiParam, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiErrorResponseDto } from '../common/api-error-response.dto';
import { AdminDashboardResponseDto, AdminUsersQueryDto, AdminUsersResponseDto, AdminUserStatusResponseDto, PaginationQueryDto, UpdateUserStatusDto } from './admin.dto';
import { AdminService } from './admin.service';
import { AdminFeedbackQueryDto, AdminFeedbackResponseDto } from './admin-feedback.dto';
import { AdminFeedbackService } from './admin-feedback.service';
import { AdminHistoryService } from './admin-history.service';
import { AdminHistoryDetailDto, AdminHistoryResponseDto } from './admin-history.dto';
import { AdminAnalysisSaveService } from './admin-analysis-save.service';
import { SaveAnalysisRequestDto, SaveAnalysisResponseDto } from './admin-analysis.dto';

type SaveHttpResponse = {
  status(code: number): unknown;
  setHeader(name: string, value: string): unknown;
};

// Explicit transport metadata also works when the generator uses tsx without design:paramtypes.
function ApiPaginationQuery() {
  return applyDecorators(
    ApiQuery({ name: 'page', required: false, schema: { type: 'integer', default: 1, minimum: 1 } }),
    ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } }),
  );
}

@ApiTags('admin')
@ApiBearerAuth('bearerAuth')
@UseGuards(AuthGuard)
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto })
@ApiForbiddenResponse({ type: ApiErrorResponseDto })
@ApiInternalServerErrorResponse({ type: ApiErrorResponseDto })
@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly feedback: AdminFeedbackService,
    private readonly history: AdminHistoryService,
    private readonly analysisSave: AdminAnalysisSaveService,
  ) {}

  @Get('dashboard')
  @ApiOkResponse({ type: AdminDashboardResponseDto })
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.admin.getDashboard(user);
  }

  @Get('users')
  @ApiPaginationQuery()
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiOkResponse({ type: AdminUsersResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  listUsers(@CurrentUser() user: AuthUser, @Query() query: AdminUsersQueryDto) {
    return this.admin.listUsers(user, query);
  }

  @Patch('users/:userId/status')
  @ApiParam({ name: 'userId', type: String })
  @ApiBody({ type: UpdateUserStatusDto })
  @ApiOkResponse({ type: AdminUserStatusResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto, description: 'SELF_DISABLE_NOT_ALLOWED' })
  updateUserStatus(@CurrentUser() user: AuthUser, @Param('userId') userId: string, @Body() input: UpdateUserStatusDto) {
    return this.admin.updateUserStatus(user, userId, input);
  }

  @Get('feedback')
  @ApiPaginationQuery()
  @ApiQuery({ name: 'fromDate', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'toDate', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'rating', required: false, schema: { type: 'integer', minimum: 1, maximum: 5 } })
  @ApiQuery({ name: 'tag', required: false, enum: FeedbackTag })
  @ApiOkResponse({ type: AdminFeedbackResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  listFeedback(@CurrentUser() user: AuthUser, @Query() query: AdminFeedbackQueryDto) {
    return this.feedback.listFeedback(user, query);
  }

  @Post('feedback/analyses')
  @ApiBody({ type: SaveAnalysisRequestDto })
  @ApiCreatedResponse({ type: SaveAnalysisResponseDto, headers: { Location: { schema: { type: 'string' } } } })
  @ApiOkResponse({ type: SaveAnalysisResponseDto, description: 'Replay of a saved analysis' })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  @ApiConflictResponse({ type: ApiErrorResponseDto, description: 'CONTEXT_INVALID_OR_EXPIRED' })
  async saveAnalysis(@CurrentUser() user: AuthUser, @Body() input: SaveAnalysisRequestDto, @Res({ passthrough: true }) response: SaveHttpResponse) {
    const result = await this.analysisSave.save(user, input.analysisRef);
    response.status(result.replayed ? 200 : 201);
    if (!result.replayed) response.setHeader('Location', `/api/v1/admin/feedback/analyses/${encodeURIComponent(result.id)}`);
    return result;
  }

  @Get('feedback/analyses')
  @ApiPaginationQuery()
  @ApiOkResponse({ type: AdminHistoryResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto })
  listAnalyses(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.history.listAnalyses(user, query);
  }

  @Get('feedback/analyses/:analysisId')
  @ApiParam({ name: 'analysisId', type: String })
  @ApiOkResponse({ type: AdminHistoryDetailDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  getAnalysis(@CurrentUser() user: AuthUser, @Param('analysisId') analysisId: string) {
    return this.history.getAnalysis(user, analysisId);
  }
}
