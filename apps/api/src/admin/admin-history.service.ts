import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertAdministrator, assertStoredResourceId, resourceNotFound } from './admin.service';
import { paginationMeta, PaginationQueryDto } from './admin.dto';
import { AdminHistoryDetailDto, AdminHistoryResponseDto, FeedbackAnalysisInputSnapshotDto, FeedbackAnalysisResultDto } from './admin-history.dto';

@Injectable()
export class AdminHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listAnalyses(user: AuthUser, query: PaginationQueryDto): Promise<AdminHistoryResponseDto> {
    assertAdministrator(user);
    const skip = (query.page - 1) * query.limit;
    return this.prisma.$transaction(async (tx) => {
      const [records, total] = await Promise.all([
        skip > 2_147_483_647 ? Promise.resolve([]) : tx.feedbackAnalysis.findMany({
          select: { id: true, inputSnapshot: true, createdAt: true },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take: query.limit,
        }),
        tx.feedbackAnalysis.count(),
      ]);
      const items = records.map((record) => {
        // Persisted JSON follows the frozen snapshot schema; never enrich it with live data.
        const snapshot = record.inputSnapshot as unknown as FeedbackAnalysisInputSnapshotDto;
        return { id: record.id, createdAt: record.createdAt, totalFeedback: snapshot.totalFeedback, filter: snapshot.filter };
      });
      return { items, meta: paginationMeta(query, total) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async getAnalysis(user: AuthUser, analysisId: string): Promise<AdminHistoryDetailDto> {
    assertAdministrator(user);
    assertStoredResourceId(analysisId);
    const record = await this.prisma.feedbackAnalysis.findUnique({ where: { id: analysisId }, select: { id: true, inputSnapshot: true, analysisResult: true, createdAt: true } });
    if (!record) throw resourceNotFound();
    return {
      ...record,
      inputSnapshot: record.inputSnapshot as unknown as FeedbackAnalysisInputSnapshotDto,
      analysisResult: record.analysisResult as unknown as FeedbackAnalysisResultDto,
    };
  }
}
