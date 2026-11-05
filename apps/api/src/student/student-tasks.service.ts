import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StudyTaskStatus } from '@prisma/client';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { calculateProgress } from './student-dashboard.service';
import {
  StudentStudyTasksResponseDto,
  UpdateStudyTaskStatusResponseDto,
} from './student-tasks.dto';

const maxSerializationAttempts = 3;

function hasPrismaCode(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    ? error.code === code
    : typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

function forbidden() {
  return new ForbiddenException({
    code: 'FORBIDDEN_RESOURCE',
    message: 'Không có quyền truy cập tài nguyên này.',
    details: null,
  });
}

@Injectable()
export class StudentTasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser): Promise<StudentStudyTasksResponseDto> {
    if (user.role !== 'STUDENT') throw forbidden();

    const plan = await this.prisma.studyPlan.findFirst({
      where: { studentId: user.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
      select: {
        id: true,
        status: true,
        tasks: {
          orderBy: { dueDate: 'asc' },
          select: {
            id: true,
            topic: { select: { id: true, name: true } },
            title: true,
            goal: true,
            expectedMinutes: true,
            dueDate: true,
            priority: true,
            status: true,
            completedAt: true,
          },
        },
      },
    });

    if (!plan) return { planId: null, planStatus: null, items: [] };
    if (plan.status !== 'ACTIVE' && plan.status !== 'COMPLETED') {
      throw new Error('Current StudyPlan query returned a non-current plan.');
    }
    return { planId: plan.id, planStatus: plan.status, items: plan.tasks };
  }

  async updateStatus(user: AuthUser, taskId: string, status: StudyTaskStatus): Promise<UpdateStudyTaskStatusResponseDto> {
    if (user.role !== 'STUDENT') throw forbidden();

    for (let attempt = 1; attempt <= maxSerializationAttempts; attempt += 1) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const task = await tx.studyTask.findUnique({
            where: { id: taskId },
            include: { studyPlan: true },
          });
          if (!task) {
            throw new NotFoundException({
              code: 'RESOURCE_NOT_FOUND',
              message: 'Không tìm thấy tài nguyên.',
              details: null,
            });
          }
          if (task.studyPlan.studentId !== user.id) throw forbidden();
          if (task.studyPlan.status === 'ARCHIVED') {
            throw new ConflictException({
              code: 'TASK_NOT_IN_CURRENT_PLAN',
              message: 'Nhiệm vụ không thuộc kế hoạch hiện tại.',
              details: null,
            });
          }

          const completedAt = status === 'TODO'
            ? null
            : task.status === 'COMPLETED' ? task.completedAt ?? new Date() : new Date();
          const updated = await tx.studyTask.update({ where: { id: taskId }, data: { status, completedAt } });
          const tasks = await tx.studyTask.findMany({
            where: { studyPlanId: task.studyPlanId },
            orderBy: { dueDate: 'asc' },
            include: { topic: { select: { id: true, name: true } } },
          });
          const allCompleted = tasks.length > 0 && tasks.every((item) => item.status === 'COMPLETED');
          const planStatus = status === 'COMPLETED' && allCompleted ? 'COMPLETED' : 'ACTIVE';
          if (task.studyPlan.status !== planStatus) {
            await tx.studyPlan.update({ where: { id: task.studyPlanId }, data: { status: planStatus } });
          }

          const metrics = calculateProgress(tasks, new Date());
          return {
            task: { id: updated.id, status: updated.status, completedAt: updated.completedAt },
            planStatus,
            progress: {
              completedTasks: metrics.completedTasks,
              totalTasks: metrics.totalTasks,
              completionPercentage: metrics.completionPercentage,
              actualProgress: metrics.actualProgress,
              expectedProgress: metrics.expectedProgress,
              overdueTasks: metrics.overdueTasks,
              slowProgress: metrics.slowProgress,
            },
          };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (!hasPrismaCode(error, 'P2034') || attempt === maxSerializationAttempts) throw error;
      }
    }

    throw new Error('StudyTask update exhausted serialization retries.');
  }
}
