import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { calculateProgress, classifyAssessmentScore } from '../student/student-dashboard.service';
import {
  ClassDashboardResponseDto,
  ClassStudentsResponseDto,
  StudentDetailResponseDto,
  TeacherClassesResponseDto,
} from './teacher.dto';

export function assertTeacher(user: AuthUser): void {
  if (user.role !== 'TEACHER') {
    throw new ForbiddenException({
      code: 'FORBIDDEN_RESOURCE',
      message: 'Không có quyền truy cập tài nguyên này.',
      details: null,
    });
  }
}

export function resourceNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'RESOURCE_NOT_FOUND',
    message: 'Không tìm thấy tài nguyên.',
    details: null,
  });
}

export function forbiddenResource(): ForbiddenException {
  return new ForbiddenException({
    code: 'FORBIDDEN_RESOURCE',
    message: 'Không có quyền truy cập tài nguyên này.',
    details: null,
  });
}

export function assertStoredResourceId(id: string): void {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) {
    throw resourceNotFound();
  }
}

function roundTo1Decimal(value: number): number {
  return Math.round(value * 10) / 10;
}

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

  async validateTeacherClass(user: AuthUser, classId: string) {
    assertTeacher(user);
    assertStoredResourceId(classId);

    const classEntity = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true, teacherId: true },
    });

    if (!classEntity) throw resourceNotFound();
    if (classEntity.teacherId !== user.id) throw forbiddenResource();

    return classEntity;
  }

  async getClasses(user: AuthUser): Promise<TeacherClassesResponseDto> {
    assertTeacher(user);

    const classes = await this.prisma.class.findMany({
      where: { teacherId: user.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return {
      items: classes.map((c) => ({ id: c.id, name: c.name })),
    };
  }

  async getDashboard(user: AuthUser, classId: string, now: Date = new Date()): Promise<ClassDashboardResponseDto> {
    const classEntity = await this.validateTeacherClass(user, classId);

    const members = await this.prisma.classMember.findMany({
      where: { classId },
      include: {
        student: { select: { id: true, fullName: true } },
      },
      orderBy: { student: { fullName: 'asc' } },
    });

    const studentCount = members.length;
    const studentIds = members.map((m) => m.studentId);

    if (studentCount === 0) {
      return {
        class: { id: classEntity.id, name: classEntity.name },
        studentCount: 0,
        classAverageScore: null,
        topicAverageScores: [],
        classCompletionRate: null,
        overdueTaskCount: 0,
        needsAttentionStudents: [],
        progressWarnings: [],
      };
    }

    // 1. Lấy kết quả đánh giá mới nhất theo Topic của từng học sinh
    const assessments = await this.prisma.assessmentResult.findMany({
      where: { studentId: { in: studentIds } },
      include: { topic: { select: { id: true, name: true } } },
      orderBy: { evaluatedAt: 'desc' },
    });

    // Map studentId -> topicId -> latest AssessmentResult
    const studentTopicLatest = new Map<string, Map<string, { score: number; topic: { id: string; name: string } }>>();
    const allLatestScores: number[] = [];
    const topicScores = new Map<string, { topic: { id: string; name: string }; scores: number[] }>();

    for (const a of assessments) {
      let topicMap = studentTopicLatest.get(a.studentId);
      if (!topicMap) {
        topicMap = new Map();
        studentTopicLatest.set(a.studentId, topicMap);
      }
      if (!topicMap.has(a.topicId)) {
        const score = Number(a.score);
        topicMap.set(a.topicId, { score, topic: a.topic });
        allLatestScores.push(score);

        let topicEntry = topicScores.get(a.topicId);
        if (!topicEntry) {
          topicEntry = { topic: a.topic, scores: [] };
          topicScores.set(a.topicId, topicEntry);
        }
        topicEntry.scores.push(score);
      }
    }

    // Điểm trung bình lớp
    const classAverageScore = allLatestScores.length > 0
      ? roundTo1Decimal(allLatestScores.reduce((sum, s) => sum + s, 0) / allLatestScores.length)
      : null;

    // Điểm trung bình từng Topic
    const topicAverageScores = Array.from(topicScores.values()).map(({ topic, scores }) => {
      const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      return {
        topic,
        averageScore: roundTo1Decimal(avg),
        weakTopic: avg < 60,
      };
    }).sort((a, b) => a.topic.name.localeCompare(b.topic.name));

    // 2. Lấy StudyPlan hiện tại (ACTIVE hoặc COMPLETED) của học sinh
    const plans = await this.prisma.studyPlan.findMany({
      where: {
        studentId: { in: studentIds },
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      include: {
        tasks: { select: { status: true, dueDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Mỗi student chỉ có 1 current plan theo quy ước DB
    const studentPlanMap = new Map<string, (typeof plans)[0]>();
    for (const plan of plans) {
      if (!studentPlanMap.has(plan.studentId)) {
        studentPlanMap.set(plan.studentId, plan);
      }
    }

    let totalClassTasks = 0;
    let completedClassTasks = 0;
    let totalClassOverdueTasks = 0;
    let hasAnyPlanWithTasks = false;

    const needsAttentionStudents: ClassDashboardResponseDto['needsAttentionStudents'] = [];
    const progressWarnings: ClassDashboardResponseDto['progressWarnings'] = [];

    for (const member of members) {
      const sId = member.studentId;
      const sTopics = studentTopicLatest.get(sId);
      const sPlan = studentPlanMap.get(sId);

      // Điểm trung bình của sinh viên này
      let studentAvgScore: number | null = null;
      if (sTopics && sTopics.size > 0) {
        const scores = Array.from(sTopics.values()).map((v) => v.score);
        studentAvgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      }

      // Progress và tasks của sinh viên này
      let completionRate: number | null = null;
      let overdueTaskCount = 0;
      let actualProgress: number | null = null;
      let expectedProgress: number | null = null;

      if (sPlan) {
        const progress = calculateProgress(sPlan.tasks, now);
        totalClassTasks += progress.totalTasks;
        completedClassTasks += progress.completedTasks;
        overdueTaskCount = progress.overdueTasks;
        totalClassOverdueTasks += overdueTaskCount;

        if (progress.totalTasks > 0) {
          hasAnyPlanWithTasks = true;
          completionRate = progress.actualProgress;
        } else {
          completionRate = 0;
        }

        actualProgress = progress.actualProgress;
        expectedProgress = progress.expectedProgress;

        // Progress Warning: actualProgress < expectedProgress - 20 (điểm phần trăm)
        if (actualProgress < expectedProgress - 20) {
          progressWarnings.push({
            studentId: sId,
            fullName: member.student.fullName,
            actualProgress: roundTo1Decimal(actualProgress),
            expectedProgress: roundTo1Decimal(expectedProgress),
          });
        }
      }

      // Rule Needs Attention (FR-TEA-004)
      const reasons: string[] = [];
      if (studentAvgScore !== null && studentAvgScore < 60) {
        reasons.push('AVERAGE_SCORE_BELOW_60');
      }
      if (completionRate !== null && completionRate < 50) {
        reasons.push('COMPLETION_RATE_BELOW_50');
      }
      if (overdueTaskCount >= 2) {
        reasons.push('OVERDUE_TASKS_AT_LEAST_2');
      }

      if (reasons.length > 0) {
        needsAttentionStudents.push({
          studentId: sId,
          fullName: member.student.fullName,
          reasons,
        });
      }
    }

    const classCompletionRate = totalClassTasks > 0
      ? roundTo1Decimal((completedClassTasks / totalClassTasks) * 100)
      : hasAnyPlanWithTasks
        ? 0
        : null;

    return {
      class: { id: classEntity.id, name: classEntity.name },
      studentCount,
      classAverageScore,
      topicAverageScores,
      classCompletionRate,
      overdueTaskCount: totalClassOverdueTasks,
      needsAttentionStudents,
      progressWarnings,
    };
  }

  async getStudents(user: AuthUser, classId: string, now: Date = new Date()): Promise<ClassStudentsResponseDto> {
    const classEntity = await this.validateTeacherClass(user, classId);

    const members = await this.prisma.classMember.findMany({
      where: { classId },
      include: {
        student: { select: { id: true, fullName: true } },
      },
      orderBy: { student: { fullName: 'asc' } },
    });

    const studentIds = members.map((m) => m.studentId);

    const assessments = await this.prisma.assessmentResult.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { evaluatedAt: 'desc' },
    });

    const studentTopicScores = new Map<string, Map<string, number>>();
    for (const a of assessments) {
      let topicMap = studentTopicScores.get(a.studentId);
      if (!topicMap) {
        topicMap = new Map();
        studentTopicScores.set(a.studentId, topicMap);
      }
      if (!topicMap.has(a.topicId)) {
        topicMap.set(a.topicId, Number(a.score));
      }
    }

    const plans = await this.prisma.studyPlan.findMany({
      where: {
        studentId: { in: studentIds },
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      include: {
        tasks: { select: { status: true, dueDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const studentPlanMap = new Map<string, (typeof plans)[0]>();
    for (const plan of plans) {
      if (!studentPlanMap.has(plan.studentId)) {
        studentPlanMap.set(plan.studentId, plan);
      }
    }

    const items = members.map((member) => {
      const sId = member.studentId;
      const sTopics = studentTopicScores.get(sId);
      const sPlan = studentPlanMap.get(sId);

      let averageScore: number | null = null;
      if (sTopics && sTopics.size > 0) {
        const scores = Array.from(sTopics.values());
        averageScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      }

      let completionRate: number | null = null;
      let overdueTaskCount = 0;

      if (sPlan) {
        const progress = calculateProgress(sPlan.tasks, now);
        overdueTaskCount = progress.overdueTasks;
        completionRate = progress.totalTasks > 0 ? progress.actualProgress : 0;
      }

      const needsAttention = (averageScore !== null && averageScore < 60)
        || (completionRate !== null && completionRate < 50)
        || (overdueTaskCount >= 2);

      return {
        student: { id: member.student.id, fullName: member.student.fullName },
        averageScore: averageScore !== null ? roundTo1Decimal(averageScore) : null,
        completionRate: completionRate !== null ? roundTo1Decimal(completionRate) : null,
        overdueTaskCount,
        needsAttention,
      };
    });

    return {
      class: { id: classEntity.id, name: classEntity.name },
      items,
    };
  }

  async getStudentDetail(user: AuthUser, classId: string, studentId: string, now: Date = new Date()): Promise<StudentDetailResponseDto> {
    await this.validateTeacherClass(user, classId);
    assertStoredResourceId(studentId);

    const membership = await this.prisma.classMember.findUnique({
      where: { classId_studentId: { classId, studentId } },
      include: { student: { select: { id: true, fullName: true } } },
    });

    if (!membership) throw resourceNotFound();

    // Kết quả đánh giá theo Topic (lấy score mới nhất cho từng Topic)
    const assessments = await this.prisma.assessmentResult.findMany({
      where: { studentId },
      include: { topic: { select: { id: true, name: true } } },
      orderBy: { evaluatedAt: 'desc' },
    });

    const seenTopics = new Set<string>();
    const assessmentResults: StudentDetailResponseDto['assessmentResults'] = [];
    const latestScores: number[] = [];

    for (const a of assessments) {
      if (!seenTopics.has(a.topicId)) {
        seenTopics.add(a.topicId);
        const score = Number(a.score);
        latestScores.push(score);
        assessmentResults.push({
          topic: a.topic,
          score: roundTo1Decimal(score),
          classification: classifyAssessmentScore(a.score),
          evaluatedAt: a.evaluatedAt,
        });
      }
    }

    const averageScore = latestScores.length > 0
      ? roundTo1Decimal(latestScores.reduce((sum, s) => sum + s, 0) / latestScores.length)
      : null;

    // StudyPlan hiện tại
    const plan = await this.prisma.studyPlan.findFirst({
      where: { studentId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      include: { tasks: { select: { status: true, dueDate: true } } },
      orderBy: { createdAt: 'desc' },
    });

    let completionRate: number | null = null;
    let overdueTaskCount = 0;
    let actualProgress: number | null = null;
    let expectedProgress: number | null = null;

    if (plan) {
      const progress = calculateProgress(plan.tasks, now);
      overdueTaskCount = progress.overdueTasks;
      completionRate = plan.tasks.length > 0 ? progress.actualProgress : 0;
      actualProgress = progress.actualProgress;
      expectedProgress = progress.expectedProgress;
    }

    return {
      student: { id: membership.student.id, fullName: membership.student.fullName },
      assessmentResults,
      metrics: {
        averageScore,
        completionRate: completionRate !== null ? roundTo1Decimal(completionRate) : null,
        overdueTaskCount,
        actualProgress: actualProgress !== null ? roundTo1Decimal(actualProgress) : null,
        expectedProgress: expectedProgress !== null ? roundTo1Decimal(expectedProgress) : null,
      },
    };
  }
}
