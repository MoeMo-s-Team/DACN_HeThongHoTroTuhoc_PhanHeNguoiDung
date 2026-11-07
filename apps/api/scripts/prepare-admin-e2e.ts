import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { requireTestDatabaseUrl } from '../prisma/test-database-url';

const targetId = '97000000-0000-4000-8000-000000000001';
const feedbackId = '97000000-0000-4000-8000-000000000002';
const analysisId = '98000000-0000-4000-8000-000000000001';

async function main() {
  const mode = process.argv[2];
  if (!['setup', 'history', 'cleanup'].includes(mode)) throw new Error('Expected setup, history or cleanup');
  const prisma = new PrismaClient({ datasourceUrl: requireTestDatabaseUrl() });
  try {
    if (mode === 'cleanup' || mode === 'setup') {
      await prisma.feedbackAnalysis.deleteMany({ where: { id: analysisId } });
      await prisma.feedback.deleteMany({ where: { id: feedbackId } });
    }
    if (mode === 'cleanup') {
      await prisma.user.deleteMany({ where: { id: targetId } });
    } else if (mode === 'setup') {
      const password = process.env.SEED_PASSWORD;
      if (!password) throw new Error('SEED_PASSWORD is required for E2E fixtures');
      const passwordHash = await argon2.hash(password);
      const account = { fullName: 'E2E Admin Target', email: 'administrator.phase1.target@example.test', role: 'STUDENT' as const, status: 'ACTIVE' as const, passwordHash };
      await prisma.user.upsert({ where: { id: targetId }, create: { id: targetId, ...account }, update: account });
    } else {
      await prisma.feedback.upsert({ where: { id: feedbackId }, create: { id: feedbackId, userId: targetId, tag: 'UI_UX', rating: 2, content: 'Phản hồi phục vụ kiểm thử snapshot Administrator.', createdAt: new Date('2026-10-01T01:00:00.000Z') }, update: {} });
      const inputSnapshot = {
        filter: { fromDate: '2026-10-01T00:00:00.000Z', toDate: '2026-10-02T00:00:00.000Z', rating: 2, tag: 'UI_UX' },
        feedbackIds: [feedbackId], totalFeedback: 1,
        tagStatistics: { AI_PERFORMANCE: 0, STUDY_PLAN: 0, UI_UX: 1, LEARNING_ANALYTICS: 0, OTHER: 0 },
      };
      const analysisResult = {
        issueGroups: [{ title: 'Nhóm vấn đề kiểm thử', summary: 'Nội dung snapshot kiểm thử.', feedbackIds: [feedbackId], count: 1 }],
        summary: 'Bản tóm tắt snapshot E2E đã lưu.', priorityAreas: ['Điều hướng'],
        recommendations: [{ title: 'Đề xuất kiểm thử', description: 'Nội dung đề xuất chỉ dùng trong database test.' }],
      };
      await prisma.feedbackAnalysis.upsert({ where: { id: analysisId }, create: { id: analysisId, inputSnapshot, analysisResult }, update: { inputSnapshot, analysisResult } });
    }
    console.log(`Administrator E2E fixture ${mode} completed in the separate test database.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'E2E fixture failed'); process.exitCode = 1; });
