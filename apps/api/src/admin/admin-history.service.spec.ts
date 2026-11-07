import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminHistoryService } from './admin-history.service';

const admin: AuthUser = { id: '94000000-0000-4000-8000-000000000001', fullName: 'Admin', email: 'admin@example.test', role: 'ADMINISTRATOR', status: 'ACTIVE' };
const analysisId = '96000000-0000-4000-8000-000000000001';
const snapshot = { filter: { rating: null, tag: null }, feedbackIds: ['saved-feedback-id'], totalFeedback: 1, tagStatistics: { AI_PERFORMANCE: 0, STUDY_PLAN: 0, UI_UX: 1, LEARNING_ANALYTICS: 0, OTHER: 0 } };
const result = { issueGroups: [], summary: 'Stored summary', priorityAreas: ['Any stored string'], recommendations: [{ title: 'Stored recommendation', description: 'Original description' }] };
const row = { id: analysisId, inputSnapshot: snapshot, analysisResult: result, createdAt: new Date('2026-10-21T00:00:00Z') };

describe('AdminHistoryService', () => {
  const feedbackAnalysis = { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() };
  const prisma = { feedbackAnalysis, $transaction: jest.fn() };
  let service: AdminHistoryService;
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((operation: (tx: unknown) => unknown) => operation(prisma));
    service = new AdminHistoryService(prisma as unknown as PrismaService);
  });

  it('lists stored count/filter values and requests descending stable order', async () => {
    feedbackAnalysis.findMany.mockResolvedValue([row]);
    feedbackAnalysis.count.mockResolvedValue(21);
    await expect(service.listAnalyses(admin, { page: 2, limit: 20 })).resolves.toEqual({ items: [{ id: analysisId, createdAt: row.createdAt, totalFeedback: 1, filter: snapshot.filter }], meta: { page: 2, limit: 20, total: 21, totalPages: 2 } });
    expect(feedbackAnalysis.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: 20, take: 20 }));
  });

  it('returns the exact nested saved snapshot and result without live-data access', async () => {
    feedbackAnalysis.findUnique.mockResolvedValue(row);
    await expect(service.getAnalysis(admin, analysisId)).resolves.toEqual(row);
    expect(feedbackAnalysis.findUnique).toHaveBeenCalledWith({ where: { id: analysisId }, select: { id: true, inputSnapshot: true, analysisResult: true, createdAt: true } });
  });

  it('preserves empty filters and empty history', async () => {
    feedbackAnalysis.findMany.mockResolvedValue([{ ...row, inputSnapshot: { ...snapshot, filter: {} } }]);
    feedbackAnalysis.count.mockResolvedValue(1);
    expect((await service.listAnalyses(admin, { page: 1, limit: 20 })).items[0].filter).toEqual({});
    feedbackAnalysis.findMany.mockResolvedValue([]);
    feedbackAnalysis.count.mockResolvedValue(0);
    await expect(service.listAnalyses(admin, { page: 1, limit: 20 })).resolves.toMatchObject({ items: [], meta: { total: 0, totalPages: 0 } });
  });

  it('denies both history methods to non-Administrator roles before querying', async () => {
    await expect(service.listAnalyses({ ...admin, role: 'STUDENT' }, { page: 1, limit: 20 })).rejects.toMatchObject({ response: { code: 'FORBIDDEN_RESOURCE' } });
    await expect(service.getAnalysis({ ...admin, role: 'TEACHER' }, analysisId)).rejects.toMatchObject({ response: { code: 'FORBIDDEN_RESOURCE' } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(feedbackAnalysis.findUnique).not.toHaveBeenCalled();
  });

  it('returns not found for missing and invalid opaque IDs', async () => {
    feedbackAnalysis.findUnique.mockResolvedValue(null);
    for (const id of [analysisId, 'opaque-unknown-id']) await expect(service.getAnalysis(admin, id)).rejects.toMatchObject({ response: { code: 'RESOURCE_NOT_FOUND' } });
    expect(feedbackAnalysis.findUnique).toHaveBeenCalledTimes(1);
  });
});
