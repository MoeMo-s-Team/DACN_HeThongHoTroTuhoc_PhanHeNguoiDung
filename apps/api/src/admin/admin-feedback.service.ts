import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertAdministrator } from './admin.service';
import { paginationMeta } from './admin.dto';
import { AdminFeedbackQueryDto, AdminFeedbackResponseDto } from './admin-feedback.dto';

@Injectable()
export class AdminFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async listFeedback(user: AuthUser, query: AdminFeedbackQueryDto): Promise<AdminFeedbackResponseDto> {
    assertAdministrator(user);
    if (query.fromDate && query.toDate && new Date(query.fromDate) > new Date(query.toDate)) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.', details: [{ field: 'fromDate', reason: 'must_not_exceed_toDate' }] });
    }
    const where: Prisma.FeedbackWhereInput = {
      ...(query.tag ? { tag: query.tag } : {}),
      ...(query.rating !== undefined ? { rating: query.rating } : {}),
      ...(query.fromDate || query.toDate ? { createdAt: {
        ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
        ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
      } } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    return this.prisma.$transaction(async (tx) => {
      const [records, total, groups] = await Promise.all([
        skip > 2_147_483_647 ? Promise.resolve([]) : tx.feedback.findMany({
          where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take: query.limit,
          select: { id: true, tag: true, rating: true, content: true, createdAt: true, user: { select: { id: true, fullName: true, role: true } } },
        }),
        tx.feedback.count({ where }),
        tx.feedback.groupBy({ by: ['tag'], where, _count: { _all: true } }),
      ]);
      const tagStatistics = { AI_PERFORMANCE: 0, STUDY_PLAN: 0, UI_UX: 0, LEARNING_ANALYTICS: 0, OTHER: 0 };
      for (const group of groups) tagStatistics[group.tag] = group._count._all;
      const items = records.map(({ user: sender, ...item }) => ({ ...item, sender }));
      return { items, tagStatistics, meta: paginationMeta(query, total) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }
}
