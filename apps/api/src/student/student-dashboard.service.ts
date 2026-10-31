import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressViewDto, StudentDashboardResponseDto, StudyTaskViewDto } from './student-dashboard.dto';

type DashboardTask = StudyTaskViewDto;

function toTaskView(task: DashboardTask): StudyTaskViewDto {
  const { id, topic, title, goal, expectedMinutes, dueDate, priority, status, completedAt } = task;
  return { id, topic, title, goal, expectedMinutes, dueDate, priority, status, completedAt };
}

export function classifyAssessmentScore(score: Prisma.Decimal | number): 'GOOD' | 'NEEDS_REINFORCEMENT' | 'NEEDS_PRIORITY' {
  const exactScore = new Prisma.Decimal(score);
  if (exactScore.greaterThanOrEqualTo(80)) return 'GOOD';
  if (exactScore.greaterThanOrEqualTo(60)) return 'NEEDS_REINFORCEMENT';
  return 'NEEDS_PRIORITY';
}

export function calculateProgress(tasks: readonly DashboardTask[], now: Date) {
  const completedTasks = tasks.filter((task) => task.status === 'COMPLETED').length;
  const totalTasks = tasks.length;
  const tasksDueByNow = tasks.filter((task) => task.dueDate <= now).length;
  const actualProgress = totalTasks ? completedTasks / totalTasks * 100 : 0;
  const expectedProgress = totalTasks ? tasksDueByNow / totalTasks * 100 : 0;
  const overdueTaskItems = tasks.filter((task) => task.status === 'TODO' && task.dueDate < now);
  const nearDueTasks = tasks.filter((task) => task.status === 'TODO'
    && task.dueDate > now
    && task.dueDate <= new Date(now.getTime() + 48 * 60 * 60 * 1000));

  return {
    completedTasks,
    totalTasks,
    completionPercentage: actualProgress,
    actualProgress,
    expectedProgress,
    overdueTasks: overdueTaskItems.length,
    slowProgress: actualProgress < expectedProgress - 20,
    nearDueTasks,
    overdueTaskItems,
  };
}

@Injectable()
export class StudentDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(user: AuthUser): Promise<StudentDashboardResponseDto> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException({
        code: 'FORBIDDEN_RESOURCE',
        message: 'Không có quyền truy cập tài nguyên này.',
        details: null,
      });
    }

    const [assessmentResults, plan] = await Promise.all([
      this.prisma.assessmentResult.findMany({
        where: { studentId: user.id },
        orderBy: { evaluatedAt: 'desc' },
        include: { topic: { select: { id: true, name: true } } },
      }),
      this.prisma.studyPlan.findFirst({
        where: { studentId: user.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
        include: {
          tasks: {
            orderBy: { dueDate: 'asc' },
            include: { topic: { select: { id: true, name: true } } },
          },
        },
      }),
    ]);

    const seenTopics = new Set<string>();
    const latestResults = assessmentResults.flatMap((result) => {
      if (seenTopics.has(result.topicId)) return [];
      seenTopics.add(result.topicId);
      return [{
        topic: result.topic,
        score: Number(result.score),
        classification: classifyAssessmentScore(result.score),
        evaluatedAt: result.evaluatedAt,
      }];
    });

    if (!plan) {
      return {
        assessmentResults: latestResults,
        currentPlan: null,
        progress: null,
        nearDueTasks: [],
        overdueTaskItems: [],
      };
    }
    if (plan.status !== 'ACTIVE' && plan.status !== 'COMPLETED') {
      throw new Error('Current StudyPlan query returned a non-current plan.');
    }

    const metrics = calculateProgress(plan.tasks, new Date());
    const progress: ProgressViewDto = {
      completedTasks: metrics.completedTasks,
      totalTasks: metrics.totalTasks,
      completionPercentage: metrics.completionPercentage,
      actualProgress: metrics.actualProgress,
      expectedProgress: metrics.expectedProgress,
      overdueTasks: metrics.overdueTasks,
      slowProgress: metrics.slowProgress,
    };

    return {
      assessmentResults: latestResults,
      currentPlan: {
        id: plan.id,
        title: plan.title,
        goal: plan.goal,
        status: plan.status,
        startDate: plan.startDate,
        endDate: plan.endDate,
      },
      progress,
      nearDueTasks: metrics.nearDueTasks.map(toTaskView),
      overdueTaskItems: metrics.overdueTaskItems.map(toTaskView),
    };
  }
}
