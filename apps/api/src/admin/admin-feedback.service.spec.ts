import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/auth.service';
import { AdminFeedbackService } from './admin-feedback.service';
import { AdminFeedbackQueryDto } from './admin-feedback.dto';

const admin: AuthUser = { id: '94000000-0000-4000-8000-000000000001', fullName: 'Admin', email: 'admin@example.test', role: 'ADMINISTRATOR', status: 'ACTIVE' };

describe('AdminFeedbackService', () => {
  const feedback = { findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn() };
  const prisma = { feedback, $transaction: jest.fn() };
  let service: AdminFeedbackService;
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((operation: (tx: unknown) => unknown) => operation(prisma));
    service = new AdminFeedbackService(prisma as unknown as PrismaService);
    feedback.findMany.mockResolvedValue([]);
    feedback.count.mockResolvedValue(0);
    feedback.groupBy.mockResolvedValue([]);
  });

  it('returns all five zero tag statistics for an empty list', async () => {
    await expect(service.listFeedback(admin, { page: 1, limit: 20 })).resolves.toEqual({
      items: [], tagStatistics: { AI_PERFORMANCE: 0, STUDY_PLAN: 0, UI_UX: 0, LEARNING_ANALYTICS: 0, OTHER: 0 }, meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
  });

  it('uses inclusive combined filters for page, total and all-page tag counts', async () => {
    feedback.count.mockResolvedValue(21);
    feedback.groupBy.mockResolvedValue([{ tag: 'UI_UX', _count: { _all: 21 } }]);
    const query: AdminFeedbackQueryDto = { page: 2, limit: 20, tag: 'UI_UX', rating: 2, fromDate: '2026-10-01T00:00:00.000Z', toDate: '2026-10-02T00:00:00.000Z' };
    const result = await service.listFeedback(admin, query);
    const where = { tag: 'UI_UX', rating: 2, createdAt: { gte: new Date(query.fromDate!), lte: new Date(query.toDate!) } };
    expect(feedback.findMany).toHaveBeenCalledWith(expect.objectContaining({ where, skip: 20, take: 20, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }));
    expect(feedback.count).toHaveBeenCalledWith({ where });
    expect(feedback.groupBy).toHaveBeenCalledWith({ by: ['tag'], where, _count: { _all: true } });
    expect(result.tagStatistics.UI_UX).toBe(21);
    expect(result.meta).toEqual({ page: 2, limit: 20, total: 21, totalPages: 2 });
  });

  it('rejects a reversed date range before database access', async () => {
    await expect(service.listFeedback(admin, { page: 1, limit: 20, fromDate: '2026-10-02T00:00:00Z', toDate: '2026-10-01T00:00:00Z' })).rejects.toMatchObject({ response: { code: 'VALIDATION_ERROR' } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects non-Administrator roles before database access', async () => {
    await expect(service.listFeedback({ ...admin, role: 'TEACHER' }, { page: 1, limit: 20 })).rejects.toMatchObject({ response: { code: 'FORBIDDEN_RESOURCE' } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('validates ISO dates, rating, tag and pagination at the HTTP boundary', async () => {
    for (const input of [{ fromDate: 'yesterday' }, { toDate: '2026-02-30T00:00:00Z' }, { rating: '0' }, { rating: '1.2' }, { tag: 'INVALID' }, { page: '0' }, { limit: '101' }]) {
      expect((await validate(plainToInstance(AdminFeedbackQueryDto, input))).length).toBeGreaterThan(0);
    }
    expect(await validate(plainToInstance(AdminFeedbackQueryDto, { rating: '5', tag: 'OTHER', page: '2' }))).toEqual([]);
  });
});
