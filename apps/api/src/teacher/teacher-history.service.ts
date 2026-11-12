import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { paginationMeta, PaginationQueryDto } from '../admin/admin.dto';
import { assertStoredResourceId, resourceNotFound, TeacherService } from './teacher.service';
import { TeacherHistoryDetailDto, TeacherHistoryResponseDto } from './teacher-history.dto';

@Injectable()
export class TeacherHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherService: TeacherService,
  ) {}

  async listReports(user: AuthUser, classId: string, query: PaginationQueryDto): Promise<TeacherHistoryResponseDto> {
    await this.teacherService.validateTeacherClass(user, classId);

    const skip = (query.page - 1) * query.limit;

    return this.prisma.$transaction(async (tx) => {
      const [records, total] = await Promise.all([
        skip > 2_147_483_647
          ? Promise.resolve([])
          : tx.classAnalysisReport.findMany({
              where: { classId },
              select: { id: true, classId: true, createdAt: true, analysisResult: true },
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              skip,
              take: query.limit,
            }),
        tx.classAnalysisReport.count({ where: { classId } }),
      ]);

      const items = records.map((record) => {
        const result = record.analysisResult as Record<string, unknown> | null;
        const summary = typeof result?.summary === 'string' ? result.summary : null;
        return {
          id: record.id,
          classId: record.classId,
          createdAt: record.createdAt,
          summary,
        };
      });

      return { items, meta: paginationMeta(query, total) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async getReport(user: AuthUser, classId: string, reportId: string): Promise<TeacherHistoryDetailDto> {
    await this.teacherService.validateTeacherClass(user, classId);
    assertStoredResourceId(reportId);

    const record = await this.prisma.classAnalysisReport.findFirst({
      where: { id: reportId, classId },
      select: {
        id: true,
        classId: true,
        inputSnapshot: true,
        analysisResult: true,
        createdAt: true,
      },
    });

    if (!record) throw resourceNotFound();

    return {
      id: record.id,
      classId: record.classId,
      inputSnapshot: record.inputSnapshot as Record<string, unknown>,
      analysisResult: record.analysisResult as Record<string, unknown>,
      createdAt: record.createdAt,
    };
  }
}
