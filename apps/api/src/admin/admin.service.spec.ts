import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/auth.service';
import { AdminService } from './admin.service';

const admin: AuthUser = { id: '94000000-0000-4000-8000-000000000001', fullName: 'Admin', email: 'admin@example.test', role: 'ADMINISTRATOR', status: 'ACTIVE' };
const target = '94000000-0000-4000-8000-000000000002';

describe('AdminService', () => {
  const user = { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn(), update: jest.fn() };
  const feedback = { count: jest.fn() };
  const aIRequestLog = { count: jest.fn() };
  const prisma = { user, feedback, aIRequestLog, $transaction: jest.fn() };
  let service: AdminService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((operation: (tx: unknown) => unknown) => operation(prisma));
    service = new AdminService(prisma as unknown as PrismaService);
  });

  it('rejects Student and Teacher roles before querying data', async () => {
    for (const role of ['STUDENT', 'TEACHER'] as const) {
      const other = { ...admin, role };
      await expect(service.getDashboard(other)).rejects.toMatchObject({ response: { code: 'FORBIDDEN_RESOURCE' } });
      await expect(service.listUsers(other, { page: 1, limit: 20 })).rejects.toMatchObject({ response: { code: 'FORBIDDEN_RESOURCE' } });
      await expect(service.updateUserStatus(other, target, { status: 'DISABLED' })).rejects.toMatchObject({ response: { code: 'FORBIDDEN_RESOURCE' } });
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(user.update).not.toHaveBeenCalled();
  });

  it('returns all-time counts with all roles including disabled accounts', async () => {
    user.count.mockResolvedValue(8);
    user.groupBy.mockResolvedValue([{ role: 'STUDENT', _count: { _all: 6 } }, { role: 'ADMINISTRATOR', _count: { _all: 2 } }]);
    feedback.count.mockResolvedValue(12);
    aIRequestLog.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2);
    await expect(service.getDashboard(admin)).resolves.toEqual({
      totalUsers: 8, usersByRole: { STUDENT: 6, TEACHER: 0, ADMINISTRATOR: 2 }, totalFeedback: 12, totalAIRequests: 5, failedAIRequests: 2,
    });
    expect(user.count).toHaveBeenCalledWith();
    expect(aIRequestLog.count).toHaveBeenNthCalledWith(1);
    expect(aIRequestLog.count).toHaveBeenNthCalledWith(2, { where: { status: 'FAILED' } });
  });

  it('returns valid zero metrics', async () => {
    user.count.mockResolvedValue(0);
    user.groupBy.mockResolvedValue([]);
    feedback.count.mockResolvedValue(0);
    aIRequestLog.count.mockResolvedValue(0);
    await expect(service.getDashboard(admin)).resolves.toEqual({ totalUsers: 0, usersByRole: { STUDENT: 0, TEACHER: 0, ADMINISTRATOR: 0 }, totalFeedback: 0, totalAIRequests: 0, failedAIRequests: 0 });
  });

  it('searches names and normalized email without exposing credentials', async () => {
    const row = { id: target, fullName: 'Nguyen', email: 'nguyen@example.test', role: 'STUDENT', status: 'DISABLED' };
    user.findMany.mockResolvedValue([row]);
    user.count.mockResolvedValue(21);
    const result = await service.listUsers(admin, { q: ' NGUYEN ', page: 2, limit: 20 });
    expect(result).toEqual({ items: [row], meta: { page: 2, limit: 20, total: 21, totalPages: 2 } });
    expect(user.findMany).toHaveBeenCalledWith({
      where: { OR: [{ fullName: { contains: 'NGUYEN', mode: 'insensitive' } }, { email: { contains: 'nguyen', mode: 'insensitive' } }] },
      select: { id: true, fullName: true, email: true, role: true, status: true },
      orderBy: [{ fullName: 'asc' }, { id: 'asc' }], skip: 20, take: 20,
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
  });

  it('returns totalPages zero for an empty search', async () => {
    user.findMany.mockResolvedValue([]);
    user.count.mockResolvedValue(0);
    await expect(service.listUsers(admin, { page: 1, limit: 20 })).resolves.toMatchObject({ items: [], meta: { total: 0, totalPages: 0 } });
  });

  it('blocks self-disable before writing', async () => {
    await expect(service.updateUserStatus(admin, admin.id, { status: 'DISABLED' })).rejects.toMatchObject({ status: 409, response: { code: 'SELF_DISABLE_NOT_ALLOWED' } });
    expect(user.update).not.toHaveBeenCalled();
  });

  it('updates only the target status and returns only id/status', async () => {
    user.update.mockResolvedValue({ id: target, status: 'DISABLED' });
    await expect(service.updateUserStatus(admin, target, { status: 'DISABLED' })).resolves.toEqual({ id: target, status: 'DISABLED' });
    expect(user.update).toHaveBeenCalledWith({ where: { id: target }, data: { status: 'DISABLED' }, select: { id: true, status: true } });
  });

  it('maps absent or invalid storage IDs to not found', async () => {
    user.update.mockRejectedValue({ code: 'P2025' });
    for (const id of [target, 'unknown-id']) {
      await expect(service.updateUserStatus(admin, id, { status: 'ACTIVE' })).rejects.toMatchObject({ status: 404, response: { code: 'RESOURCE_NOT_FOUND' } });
    }
    expect(user.update).toHaveBeenCalledTimes(1);
  });
});
