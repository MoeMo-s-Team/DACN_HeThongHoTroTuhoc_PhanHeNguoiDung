import { ConflictException, ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ContextStatus, ContextType, Prisma, StudyPlanStatus, StudyTaskStatus } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { AuthUser } from '../auth/auth.service';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { calculateProgress, StudentDashboardService } from './student-dashboard.service';
import { ApplyStudyPlanAdjustmentRequestDto } from './study-plan-adjustment.dto';

const contextLifetimeMs = 60 * 60 * 1000;
type AdjustmentChange = { taskId: string; expectedMinutes?: number; dueDate?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH'; reason?: string };
type StoredAdjustment = { planId: string; changes: AdjustmentChange[] };

function forbidden() {
  return new ForbiddenException({ code: 'FORBIDDEN_RESOURCE', message: 'Không có quyền truy cập tài nguyên này.', details: null });
}
function ineligible(code: 'NO_CURRENT_PLAN' | 'PLAN_PAST_DEADLINE' | 'NO_TODO_TASKS') {
  const messages = {
    NO_CURRENT_PLAN: 'Chưa có kế hoạch học tập hiện tại để điều chỉnh.',
    PLAN_PAST_DEADLINE: 'Kế hoạch đã quá hạn và không thể điều chỉnh.',
    NO_TODO_TASKS: 'Kế hoạch không còn nhiệm vụ cần điều chỉnh.',
  };
  return new UnprocessableEntityException({ code, message: messages[code], details: null });
}
function invalidContext() {
  return new ConflictException({ code: 'CONTEXT_INVALID_OR_EXPIRED', message: 'Đề xuất không còn hợp lệ hoặc đã hết hạn.', details: null });
}
function stalePlan() {
  return new ConflictException({ code: 'STALE_PREVIEW', message: 'Kế hoạch hoặc nhiệm vụ đã thay đổi. Tạo đề xuất mới.', details: null });
}

@Injectable()
export class StudyPlanAdjustmentService {
  constructor(private readonly prisma: PrismaService, private readonly dashboard: StudentDashboardService, private readonly ai: AiService) {}

  async generate(user: AuthUser) {
    if (user.role !== 'STUDENT') throw forbidden();
    const now = new Date();
    const plan = await this.prisma.studyPlan.findFirst({
      where: { studentId: user.id, status: { in: [StudyPlanStatus.ACTIVE, StudyPlanStatus.COMPLETED] } },
      include: { tasks: { where: { status: StudyTaskStatus.TODO }, orderBy: { dueDate: 'asc' } } },
    });
    if (!plan) throw ineligible('NO_CURRENT_PLAN');
    if (now > plan.endDate) throw ineligible('PLAN_PAST_DEADLINE');
    if (!plan.tasks.length) throw ineligible('NO_TODO_TASKS');

    const progressResponse = await this.dashboard.getProgress(user);
    const metrics = progressResponse.metrics!;
    const input = {
      plan: { startDate: plan.startDate.toISOString(), endDate: plan.endDate.toISOString() },
      todoTasks: plan.tasks.map((task) => ({ taskId: task.id, title: task.title, expectedMinutes: task.expectedMinutes,
        dueDate: task.dueDate.toISOString(), priority: task.priority })),
      actualProgress: metrics.actualProgress,
      expectedProgress: metrics.expectedProgress,
      overdueTasks: metrics.overdueTasks,
      goal: plan.goal,
      // shortcut: remainingMinutes is the sum of TODO task estimates until a calendar-time metric is defined.
      remainingMinutes: plan.tasks.reduce((total, task) => total + task.expectedMinutes, 0),
    };
    const output = await this.ai.infer(user, 'STUDENT_STUDY_PLAN_ADJUSTMENT', input);
    const taskById = new Map(plan.tasks.map((task) => [task.id, task]));
    const changes = (output.changes as AdjustmentChange[]).map((change) => {
      const task = taskById.get(change.taskId)!;
      return {
        taskId: task.id,
        title: task.title,
        expectedMinutes: change.expectedMinutes ?? task.expectedMinutes,
        dueDate: change.dueDate ?? task.dueDate.toISOString(),
        priority: change.priority ?? task.priority,
        ...(change.reason ? { reason: change.reason } : {}),
      };
    });
    const storedChanges = (output.changes as AdjustmentChange[]).map((change) => ({ ...change }));
    const expiresAt = new Date(now.getTime() + contextLifetimeMs);
    const adjustmentRef = randomUUID();
    await this.prisma.temporaryContext.create({ data: {
      opaqueRef: adjustmentRef,
      contextType: ContextType.STUDY_PLAN_ADJUSTMENT,
      ownerUserId: user.id,
      resourceKey: plan.id,
      payload: { planId: plan.id, changes: storedChanges },
      expiresAt,
      retentionUntil: expiresAt,
    } });
    return { adjustmentRef, expiresAt: expiresAt.toISOString(), preview: { planId: plan.id, changes } };
  }

  async apply(user: AuthUser, request: ApplyStudyPlanAdjustmentRequestDto) {
    if (user.role !== 'STUDENT') throw forbidden();
    if (!request.adjustmentRef.trim()) throw invalidContext();
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "temporary_contexts" WHERE "opaque_ref" = ${request.adjustmentRef} FOR UPDATE`;
      const context = await tx.temporaryContext.findUnique({ where: { opaqueRef: request.adjustmentRef } });
      if (!context || context.ownerUserId !== user.id || context.contextType !== ContextType.STUDY_PLAN_ADJUSTMENT) throw invalidContext();
      await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "users" WHERE "id" = ${user.id} FOR UPDATE`;
      const payload = context.payload as unknown as StoredAdjustment;
      if (context.status === ContextStatus.CONSUMED) {
        if (!context.replayResult) throw invalidContext();
        return { ...(context.replayResult as Prisma.JsonObject), replayed: true };
      }
      const now = new Date();
      if (context.expiresAt <= now) throw invalidContext();
      const plan = await tx.studyPlan.findFirst({
        where: { id: payload.planId, studentId: user.id, status: { in: [StudyPlanStatus.ACTIVE, StudyPlanStatus.COMPLETED] } },
        include: { tasks: true },
      });
      if (!plan || plan.id !== context.resourceKey || now > plan.endDate) throw stalePlan();
      const taskById = new Map(plan.tasks.map((task) => [task.id, task]));
      const currentTasks = payload.changes.map((change) => {
        const task = taskById.get(change.taskId);
        if (!task || task.status !== StudyTaskStatus.TODO) throw stalePlan();
        const dueDate = change.dueDate ? new Date(change.dueDate) : task.dueDate;
        const expectedMinutes = change.expectedMinutes ?? task.expectedMinutes;
        const priority = change.priority ?? task.priority;
        if (!Number.isInteger(expectedMinutes) || expectedMinutes <= 0 || dueDate < plan.startDate || dueDate > plan.endDate) throw stalePlan();
        return { taskId: task.id, expectedMinutes, dueDate, priority };
      });
      for (const change of currentTasks) {
        const updated = await tx.studyTask.updateMany({
          where: { id: change.taskId, studyPlanId: plan.id, status: StudyTaskStatus.TODO },
          data: { expectedMinutes: change.expectedMinutes, dueDate: change.dueDate, priority: change.priority },
        });
        if (updated.count !== 1) throw stalePlan();
      }
      const tasks = await tx.studyTask.findMany({ where: { studyPlanId: plan.id }, orderBy: { dueDate: 'asc' } });
      const progress = calculateProgress(tasks, now);
      const result = {
        replayed: false,
        updatedTasks: currentTasks.map((change) => ({ id: change.taskId, expectedMinutes: change.expectedMinutes,
          dueDate: change.dueDate.toISOString(), priority: change.priority, status: StudyTaskStatus.TODO, completedAt: null })),
        progress: {
          completedTasks: progress.completedTasks, totalTasks: progress.totalTasks, completionPercentage: progress.completionPercentage,
          actualProgress: progress.actualProgress, expectedProgress: progress.expectedProgress, overdueTasks: progress.overdueTasks,
          slowProgress: progress.slowProgress,
        },
      };
      const consumedAt = new Date();
      const update = await tx.temporaryContext.updateMany({
        where: { id: context.id, ownerUserId: user.id, contextType: ContextType.STUDY_PLAN_ADJUSTMENT, status: ContextStatus.OPEN },
        data: {
          status: ContextStatus.CONSUMED,
          requestFingerprint: createHash('sha256').update(`${request.adjustmentRef}:${user.id}:${plan.id}`).digest('hex'),
          replayResult: result,
          consumedAt,
          retentionUntil: new Date(Math.max(context.expiresAt.getTime(), consumedAt.getTime() + 10 * 60 * 1000)),
        },
      });
      if (update.count !== 1) throw invalidContext();
      return result;
    });
  }
}
