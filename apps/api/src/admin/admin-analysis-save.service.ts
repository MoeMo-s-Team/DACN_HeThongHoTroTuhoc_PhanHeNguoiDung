import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ContextStatus, ContextType, Prisma, TemporaryContext } from '@prisma/client';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertAdministrator } from './admin.service';
import { isAnalysisTimestamp, readAnalysisContext } from './admin-analysis-context';
import { SaveAnalysisResponseDto } from './admin-analysis.dto';

function invalidContext(): ConflictException {
  return new ConflictException({ code: 'CONTEXT_INVALID_OR_EXPIRED', message: 'Tham chiếu phân tích không hợp lệ hoặc đã hết hạn.', details: null });
}

@Injectable()
export class AdminAnalysisSaveService {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: AuthUser, analysisRef: string): Promise<SaveAnalysisResponseDto> {
    assertAdministrator(user);
    return this.prisma.$transaction(async (tx) => {
      await this.assertActiveAdministrator(tx, user);
      const lookup = { opaqueRef: analysisRef, ownerUserId: user.id, contextType: ContextType.ADMIN_FEEDBACK_ANALYSIS };
      const context = await tx.temporaryContext.findFirst({ where: lookup });
      if (!context) throw invalidContext();
      const payload = this.readBoundPayload(context);
      if (context.status === ContextStatus.CONSUMED) return this.replay(context);
      if (context.expiresAt.getTime() <= Date.now()) throw invalidContext();

      const claimed = await tx.temporaryContext.updateMany({
        where: {
          id: context.id, ...lookup, resourceKey: context.resourceKey, status: ContextStatus.OPEN,
          version: context.version, expiresAt: { gt: new Date() },
        },
        data: { version: { increment: 1 } },
      });

      await this.assertActiveAdministrator(tx, user);
      if (claimed.count === 0) {
        // READ COMMITTED observes the winner's committed result after waiting on its row lock.
        const latest = await tx.temporaryContext.findFirst({ where: lookup });
        this.readBoundPayload(latest);
        if (latest?.status !== ContextStatus.CONSUMED) throw invalidContext();
        return this.replay(latest);
      }
      if (context.expiresAt.getTime() <= Date.now()) throw invalidContext();

      const saved = await tx.feedbackAnalysis.create({ data: {
        inputSnapshot: payload.inputSnapshot as Prisma.InputJsonObject,
        analysisResult: payload.analysisResult as Prisma.InputJsonObject,
      } });
      const replayResult = { id: saved.id, createdAt: saved.createdAt.toISOString() };
      const consumedAt = new Date();
      await tx.temporaryContext.update({ where: { id: context.id }, data: {
        status: ContextStatus.CONSUMED, consumedAt, replayResult, requestFingerprint: null,
        retentionUntil: new Date(Math.max(context.expiresAt.getTime(), consumedAt.getTime() + 600_000)),
      } });
      return { ...replayResult, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  private readBoundPayload(context: TemporaryContext | null) {
    if (!context) throw invalidContext();
    const payload = readAnalysisContext(context.payload);
    if (!payload || payload.resourceKey !== context.resourceKey) throw invalidContext();
    return payload;
  }

  private replay(context: TemporaryContext): SaveAnalysisResponseDto {
    const saved = context.replayResult;
    if (context.retentionUntil.getTime() <= Date.now() || !saved || typeof saved !== 'object' || Array.isArray(saved)
      || typeof saved.id !== 'string' || !saved.id || !isAnalysisTimestamp(saved.createdAt)) throw invalidContext();
    return { id: saved.id, createdAt: saved.createdAt, replayed: true };
  }

  private async assertActiveAdministrator(tx: Prisma.TransactionClient, actor: AuthUser): Promise<void> {
    const current = await tx.user.findUnique({ where: { id: actor.id }, select: { role: true, status: true } });
    if (!current) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Yêu cầu đăng nhập hợp lệ.', details: null });
    if (current.status !== 'ACTIVE') throw new ForbiddenException({ code: 'ACCOUNT_DISABLED', message: 'Tài khoản đã bị vô hiệu hóa.', details: null });
    assertAdministrator({ ...actor, role: current.role });
  }
}
