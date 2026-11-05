import { ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MVP_COURSE_ID } from '../common/mvp-course';
import { AssessmentResultViewDto, ProgressViewDto, StudentAssessmentResultsResponseDto, StudentDashboardResponseDto, StudentProgressResponseDto, StudyTaskViewDto } from './student-dashboard.dto';

type DashboardTask = StudyTaskViewDto;

function toTaskView(task: DashboardTask): StudyTaskViewDto {
  const { id, topic, title, goal, expectedMinutes, dueDate, priority, status, completedAt } = task;
  return { id, topic, title, goal, expectedMinutes, dueDate, priority, status, completedAt };
}

export function classifyAssessmentScore(score: Prisma.Decimal | number): 'GOOD' | 'NEEDS_REINFORCEMENT' | 'PRIORITY' {
  const exactScore = new Prisma.Decimal(score);
  if (exactScore.lessThan(0) || exactScore.greaterThan(100)) {
    throw new InternalServerErrorException('AssessmentResult score is outside 0–100.');
  }
  if (exactScore.greaterThanOrEqualTo(80)) return 'GOOD';
  if (exactScore.greaterThanOrEqualTo(60)) return 'NEEDS_REINFORCEMENT';
  return 'PRIORITY';
}

type AssessmentResultRecord = {
  topicId: string;
  topic: AssessmentResultViewDto['topic'];
  score: Prisma.Decimal | number;
  evaluatedAt: Date;
};

function latestResults(results: readonly AssessmentResultRecord[]): AssessmentResultViewDto[] {
  const seenTopics = new Set<string>();
  return results.flatMap((result) => {
    if (seenTopics.has(result.topicId)) return [];
    seenTopics.add(result.topicId);
    const classification = classifyAssessmentScore(result.score);
    const score = Number(result.score);
    const lowerThreshold = classification === 'PRIORITY' ? 60 : classification === 'NEEDS_REINFORCEMENT' ? 80 : null;
    // JSON numbers cannot preserve Decimal precision when a value is just below a classification boundary.
    const apiScore = lowerThreshold !== null && score >= lowerThreshold
      ? lowerThreshold - Number.EPSILON * lowerThreshold / 2
      : score;
    return [{
      topic: result.topic,
      score: apiScore,
      classification,
      evaluatedAt: result.evaluatedAt,
    }];
  });
}

export function calculateProgress<T extends Pick<DashboardTask, 'status' | 'dueDate'>>(tasks: readonly T[], now: Date) {
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

  async getProgress(user: AuthUser): Promise<StudentProgressResponseDto> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException({
        code: 'FORBIDDEN_RESOURCE',
        message: 'Không có quyền truy cập tài nguyên này.',
        details: null,
      });
    }

    const plan = await this.prisma.studyPlan.findFirst({
      where: { studentId: user.id, status: { in: ['ACTIVE', 'COMPLETED'] } },
      select: { id: true, tasks: { select: { status: true, dueDate: true } } },
    });
    if (!plan) return { hasCurrentPlan: false, planId: null, metrics: null };

    const progress = calculateProgress(plan.tasks, new Date());
    return {
      hasCurrentPlan: true,
      planId: plan.id,
      metrics: {
        completedTasks: progress.completedTasks,
        totalTasks: progress.totalTasks,
        completionPercentage: progress.completionPercentage,
        actualProgress: progress.actualProgress,
        expectedProgress: progress.expectedProgress,
        overdueTasks: progress.overdueTasks,
        slowProgress: progress.slowProgress,
      },
    };
  }

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
        where: { studentId: user.id, topic: { courseId: MVP_COURSE_ID } },
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

    const latest = latestResults(assessmentResults);

    if (!plan) {
      return {
        assessmentResults: latest,
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
      assessmentResults: latest,
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

  async getAssessmentResults(user: AuthUser): Promise<StudentAssessmentResultsResponseDto> {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException({
        code: 'FORBIDDEN_RESOURCE',
        message: 'Không có quyền truy cập tài nguyên này.',
        details: null,
      });
    }

    const results = await this.prisma.assessmentResult.findMany({
      where: { studentId: user.id, topic: { courseId: MVP_COURSE_ID } },
      orderBy: { evaluatedAt: 'desc' },
      include: { topic: { select: { id: true, name: true } } },
    });
    return { items: latestResults(results) };
  }
}
