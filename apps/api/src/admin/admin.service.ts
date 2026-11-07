import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminDashboardResponseDto, AdminUsersQueryDto, AdminUsersResponseDto, AdminUserStatusResponseDto, paginationMeta, UpdateUserStatusDto } from './admin.dto';

export function assertAdministrator(user: AuthUser): void {
  if (user.role !== 'ADMINISTRATOR') {
    throw new ForbiddenException({ code: 'FORBIDDEN_RESOURCE', message: 'Không có quyền truy cập tài nguyên này.', details: null });
  }
}

export function resourceNotFound(): NotFoundException {
  return new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Không tìm thấy tài nguyên.', details: null });
}

export function assertStoredResourceId(id: string): void {
  // UUID is a storage detail: unresolvable opaque IDs are still resource-not-found.
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) throw resourceNotFound();
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(user: AuthUser): Promise<AdminDashboardResponseDto> {
    assertAdministrator(user);
    return this.prisma.$transaction(async (tx) => {
      const [totalUsers, groups, totalFeedback, totalAIRequests, failedAIRequests] = await Promise.all([
        tx.user.count(), tx.user.groupBy({ by: ['role'], _count: { _all: true } }),
        tx.feedback.count(), tx.aIRequestLog.count(), tx.aIRequestLog.count({ where: { status: 'FAILED' } }),
      ]);
      const usersByRole = { STUDENT: 0, TEACHER: 0, ADMINISTRATOR: 0 };
      for (const group of groups) usersByRole[group.role] = group._count._all;
      return { totalUsers, usersByRole, totalFeedback, totalAIRequests, failedAIRequests };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async listUsers(user: AuthUser, query: AdminUsersQueryDto): Promise<AdminUsersResponseDto> {
    assertAdministrator(user);
    const q = query.q?.trim();
    const where: Prisma.UserWhereInput = q ? { OR: [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q.toLowerCase(), mode: 'insensitive' } },
    ] } : {};
    const skip = (query.page - 1) * query.limit;
    return this.prisma.$transaction(async (tx) => {
      const [items, total] = await Promise.all([
        skip > 2_147_483_647 ? Promise.resolve([]) : tx.user.findMany({
          where, select: { id: true, fullName: true, email: true, role: true, status: true },
          orderBy: [{ fullName: 'asc' }, { id: 'asc' }], skip, take: query.limit,
        }),
        tx.user.count({ where }),
      ]);
      return { items, meta: paginationMeta(query, total) };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async updateUserStatus(user: AuthUser, userId: string, input: UpdateUserStatusDto): Promise<AdminUserStatusResponseDto> {
    assertAdministrator(user);
    if (user.id.toLowerCase() === userId.toLowerCase() && input.status === 'DISABLED') {
      throw new ConflictException({ code: 'SELF_DISABLE_NOT_ALLOWED', message: 'Bạn không thể vô hiệu hóa tài khoản đang đăng nhập.', details: null });
    }
    assertStoredResourceId(userId);
    try {
      return await this.prisma.user.update({ where: { id: userId }, data: { status: input.status }, select: { id: true, status: true } });
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') throw resourceNotFound();
      throw error;
    }
  }
}
