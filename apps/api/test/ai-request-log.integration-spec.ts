import { PrismaClient } from '@prisma/client';
import { requireTestDatabaseUrl } from '../prisma/test-database-url';
import { AiRequestLogRepository } from '../src/ai/ai-request-log.repository';
import { aiTasks } from './fixtures/ai/integration-harness';

const prisma = new PrismaClient({ datasourceUrl: requireTestDatabaseUrl() });
const userId = '92000000-0000-4000-8000-000000000001';

describe('AIRequestLog persistence (PostgreSQL)', () => {
  const repository = new AiRequestLogRepository(prisma as never);

  beforeAll(async () => {
    await prisma.aIRequestLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.user.create({ data: {
      id: userId, fullName: 'AI Log Integration', email: 'ai.log.integration@example.test', passwordHash: 'integration-only', role: 'ADMINISTRATOR',
    } });
  });

  afterAll(async () => {
    await prisma.aIRequestLog.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it('persists all six feature keys with terminal status and every contract field', async () => {
    const dispatchAt = new Date('2026-10-28T04:00:00.000Z');
    for (const [index, feature] of aiTasks.entries()) {
      await repository.createTerminal({
        userId,
        feature,
        status: index % 2 === 0 ? 'SUCCESS' : 'FAILED',
        errorCode: index % 2 === 0 ? null : 'AI_TIMEOUT',
        durationMs: index % 2 === 0 ? index + 1 : null,
        createdAt: new Date(dispatchAt.getTime() + index),
      });
    }
    const rows = await prisma.aIRequestLog.findMany({ where: { userId }, orderBy: { feature: 'asc' } });
    expect(rows).toHaveLength(6);
    expect(rows.map(({ feature }) => feature).sort()).toEqual([...aiTasks].sort());
    for (const row of rows) {
      expect(['SUCCESS', 'FAILED']).toContain(row.status);
      expect(row.userId).toBe(userId);
      expect(row.createdAt).toEqual(expect.any(Date));
      expect(row.durationMs === null || row.durationMs >= 0).toBe(true);
      expect(row).not.toHaveProperty('prompt');
      expect(row).not.toHaveProperty('response');
    }
    expect(rows.find(({ status }) => status === 'SUCCESS')).toMatchObject({ errorCode: null, durationMs: expect.any(Number) });
    expect(rows.find(({ status }) => status === 'FAILED')).toMatchObject({ errorCode: 'AI_TIMEOUT', durationMs: null });
    expect(rows.every(({ createdAt }) => createdAt >= dispatchAt && createdAt < new Date(dispatchAt.getTime() + 6))).toBe(true);
  });
});
