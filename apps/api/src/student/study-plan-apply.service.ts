import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { ContextStatus, ContextType, Prisma, StudyPlanStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { AuthUser } from '../auth/auth.service';
import { MVP_COURSE_ID } from '../common/mvp-course';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyStudyPlanRequestDto, StudyPlanTaskEditDto } from './study-plan-apply.dto';

type PreviewTask = {
  previewTaskId: string; topic: { id: string; name: string }; title: string; goal: string;
  expectedMinutes: number; dueDate: string; priority: 'LOW' | 'MEDIUM' | 'HIGH'; reason: string | null;
};
type StoredPreview = { preview: { planTitle: string; goal: string; availableMinutesPerWeek: number; targetDeadline: string; tasks: PreviewTask[] } };

function contextInvalid() {
  return new ConflictException({ code: 'CONTEXT_INVALID_OR_EXPIRED', message: 'Preview không còn hợp lệ hoặc đã hết hạn.', details: null });
}
function contextConsumed() {
  return new ConflictException({ code: 'CONTEXT_ALREADY_CONSUMED', message: 'Preview đã được sử dụng với nội dung khác.', details: null });
}
function stalePreview() {
  return new ConflictException({ code: 'STALE_PREVIEW', message: 'Preview không còn phù hợp với dữ liệu hiện tại.', details: null });
}

function fingerprint(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function applyEdits(preview: StoredPreview['preview'], request: ApplyStudyPlanRequestDto, now: Date) {
  const edits = request.taskEdits ?? [];
  const editsById = new Map(edits.map((edit) => [edit.previewTaskId, edit]));
  if (editsById.size !== edits.length || edits.some((edit) => !edit.title && edit.expectedMinutes === undefined && !edit.dueDate && !edit.priority)) throw stalePreview();
  const taskIds = new Set(preview.tasks.map((task) => task.previewTaskId));
  if (edits.some((edit) => !taskIds.has(edit.previewTaskId))) throw stalePreview();

  const title = request.planTitle === undefined ? preview.planTitle : request.planTitle.trim();
  if (!title) throw stalePreview();
  const targetDeadline = new Date(preview.targetDeadline);
  if (targetDeadline <= now) throw stalePreview();
  const tasks = preview.tasks.map((task) => {
    const edit: StudyPlanTaskEditDto = editsById.get(task.previewTaskId) ?? { previewTaskId: task.previewTaskId };
    const result = {
      previewTaskId: task.previewTaskId,
      topicId: task.topic.id,
      title: edit.title === undefined ? task.title : edit.title.trim(),
      goal: task.goal,
      expectedMinutes: edit.expectedMinutes ?? task.expectedMinutes,
      dueDate: edit.dueDate ?? task.dueDate,
      priority: edit.priority ?? task.priority,
    };
    const dueDate = new Date(result.dueDate);
    if (!result.title || !Number.isInteger(result.expectedMinutes) || result.expectedMinutes <= 0
      || Number.isNaN(dueDate.getTime()) || dueDate < now || dueDate > targetDeadline) throw stalePreview();
    return result;
  });
  return { title, targetDeadline, tasks };
}

@Injectable()
export class StudyPlanApplyService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(user: AuthUser) {
    if (user.role !== 'STUDENT') throw new ForbiddenException({ code: 'FORBIDDEN_RESOURCE', message: 'Không có quyền truy cập tài nguyên này.', details: null });
    const plan = await this.prisma.studyPlan.findFirst({
      where: { studentId: user.id, status: { in: [StudyPlanStatus.ACTIVE, StudyPlanStatus.COMPLETED] } },
      include: { tasks: { include: { topic: { select: { id: true, name: true } } }, orderBy: { dueDate: 'asc' } } },
    });
    if (!plan) return { plan: null, tasks: [] };
    return {
      plan: { id: plan.id, title: plan.title, goal: plan.goal, availableMinutesPerWeek: plan.availableMinutesPerWeek,
        startDate: plan.startDate.toISOString(), endDate: plan.endDate.toISOString(), status: plan.status },
      tasks: plan.tasks.map((task) => ({ id: task.id, topic: task.topic, title: task.title, goal: task.goal,
        expectedMinutes: task.expectedMinutes, dueDate: task.dueDate.toISOString(), priority: task.priority,
        status: task.status, completedAt: task.completedAt?.toISOString() ?? null })),
    };
  }

  async apply(user: AuthUser, request: ApplyStudyPlanRequestDto) {
    if (user.role !== 'STUDENT') throw new ForbiddenException({ code: 'FORBIDDEN_RESOURCE', message: 'Không có quyền truy cập tài nguyên này.', details: null });
    if (!request.planPreviewRef.trim()) throw contextInvalid();
    return this.prisma.$transaction(async (tx) => {
      // These locks serialize reference replay and current-plan replacement per student.
      await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "temporary_contexts" WHERE "opaque_ref" = ${request.planPreviewRef} FOR UPDATE`;
      const context = await tx.temporaryContext.findUnique({ where: { opaqueRef: request.planPreviewRef } });
      if (!context || context.ownerUserId !== user.id || context.resourceKey !== user.id || context.contextType !== ContextType.STUDY_PLAN_PREVIEW) throw contextInvalid();
      await tx.$queryRaw<Array<{ id: string }>>`SELECT "id" FROM "users" WHERE "id" = ${user.id}::uuid FOR UPDATE`;
      const payload = context.payload as unknown as StoredPreview;
      const normalized = applyEdits(payload.preview, request, context.status === ContextStatus.CONSUMED ? new Date(0) : new Date());
      const requestFingerprint = fingerprint(normalized);

      if (context.status === ContextStatus.CONSUMED) {
        if (context.requestFingerprint !== requestFingerprint || !context.replayResult) throw contextConsumed();
        return { ...(context.replayResult as Prisma.JsonObject), replayed: true };
      }
      const applyTime = new Date();
      if (context.expiresAt <= applyTime) throw contextInvalid();
      const validated = applyEdits(payload.preview, request, applyTime);
      const topicIds = [...new Set(validated.tasks.map((task) => task.topicId))];
      const topics = await tx.topic.findMany({ where: { id: { in: topicIds }, courseId: MVP_COURSE_ID }, select: { id: true } });
      if (topics.length !== topicIds.length) throw stalePreview();

      const current = await tx.studyPlan.findFirst({
        where: { studentId: user.id, status: { in: [StudyPlanStatus.ACTIVE, StudyPlanStatus.COMPLETED] } },
        select: { id: true },
      });
      if (current) await tx.studyPlan.update({ where: { id: current.id }, data: { status: StudyPlanStatus.ARCHIVED } });

      const now = new Date();
      // shortcut: Prisma stores minutes as Int; remove after approved TP-001 decimal migration.
      const plan = await tx.studyPlan.create({
        data: {
          studentId: user.id,
          title: validated.title,
          goal: payload.preview.goal,
          availableMinutesPerWeek: payload.preview.availableMinutesPerWeek,
          startDate: now,
          endDate: validated.targetDeadline,
          status: StudyPlanStatus.ACTIVE,
          tasks: { create: validated.tasks.map(({ topicId, title, goal, expectedMinutes, dueDate, priority }) => ({
            topicId, title, goal, expectedMinutes, dueDate: new Date(dueDate), priority,
          })) },
        },
        include: { tasks: { include: { topic: { select: { id: true, name: true } } }, orderBy: { dueDate: 'asc' } } },
      });
      const result = {
        replayed: false,
        plan: { id: plan.id, title: plan.title, goal: plan.goal, availableMinutesPerWeek: plan.availableMinutesPerWeek,
          startDate: plan.startDate.toISOString(), endDate: plan.endDate.toISOString(), status: plan.status, createdAt: plan.createdAt.toISOString() },
        tasks: plan.tasks.map((task) => ({ id: task.id, topic: task.topic, title: task.title, goal: task.goal,
          expectedMinutes: task.expectedMinutes, dueDate: task.dueDate.toISOString(), priority: task.priority,
          status: task.status, completedAt: task.completedAt?.toISOString() ?? null })),
      };
      const consumedAt = new Date();
      const updated = await tx.temporaryContext.updateMany({
        where: { id: context.id, ownerUserId: user.id, contextType: ContextType.STUDY_PLAN_PREVIEW, status: ContextStatus.OPEN },
        data: {
          status: ContextStatus.CONSUMED,
          requestFingerprint,
          replayResult: result,
          consumedAt,
          retentionUntil: new Date(Math.max(context.expiresAt.getTime(), consumedAt.getTime() + 10 * 60 * 1000)),
        },
      });
      if (updated.count !== 1) throw contextInvalid();
      return result;
    });
  }
}
