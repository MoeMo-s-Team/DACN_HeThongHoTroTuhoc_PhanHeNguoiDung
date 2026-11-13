import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AiService } from '../ai/ai.service';
import { MVP_COURSE_ID } from '../common/mvp-course';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/auth.service';
import { StudentDashboardService } from './student-dashboard.service';
import { GenerateStudyPlanRequestDto, GenerateStudyPlanResponseDto, StudyPlanPreviewDto } from './study-plan-generation.dto';
import { StudyContextService } from './study-context.service';

const previewLifetimeMs = 60 * 60 * 1000;

function forbidden() {
  return new ForbiddenException({ code: 'FORBIDDEN_RESOURCE', message: 'Không có quyền truy cập tài nguyên này.', details: null });
}

function insufficientData() {
  return new UnprocessableEntityException({ code: 'INSUFFICIENT_DATA', message: 'Chưa có đủ dữ liệu học tập để tạo kế hoạch.', details: null });
}

@Injectable()
export class StudyPlanGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: StudentDashboardService,
    private readonly studyContext: StudyContextService,
    private readonly ai: AiService,
  ) {}

  async generate(user: AuthUser, request: GenerateStudyPlanRequestDto): Promise<GenerateStudyPlanResponseDto> {
    if (user.role !== 'STUDENT') throw forbidden();
    const canonical = this.studyContext.validate(user, request);
    const planningStartAt = new Date();
    if (new Date(canonical.targetDeadline) <= planningStartAt) throw insufficientData();

    const [assessmentResult, topics] = await Promise.all([
      this.dashboard.getAssessmentResults(user),
      this.prisma.topic.findMany({ where: { courseId: MVP_COURSE_ID }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    ]);
    if (!assessmentResult.items.length || !topics.length) throw insufficientData();

    const input = {
      goal: canonical.goal,
      availableMinutesPerWeek: canonical.availableMinutesPerWeek,
      planningStartAt: planningStartAt.toISOString(),
      targetDeadline: canonical.targetDeadline,
      assessments: assessmentResult.items.map((item) => ({
        topicId: item.topic.id, topicName: item.topic.name, score: item.score, classification: item.classification,
      })),
      topics: topics.map((topic) => ({ topicId: topic.id, topicName: topic.name })),
      learningAnalysisContext: null,
    };
    const output = await this.ai.infer(user, 'STUDENT_STUDY_PLAN_GENERATION', input);
    const topicById = new Map(topics.map((topic) => [topic.id, topic]));
    const preview: StudyPlanPreviewDto = {
      planTitle: String(output.planTitle).trim(),
      goal: canonical.goal,
      availableMinutesPerWeek: canonical.availableMinutesPerWeek,
      targetDeadline: canonical.targetDeadline,
      tasks: (output.tasks as Array<Record<string, unknown>>).map((task) => {
        const topic = topicById.get(String(task.topicId))!;
        return {
          previewTaskId: randomUUID(),
          topic: { id: topic.id, name: topic.name },
          title: String(task.title).trim(),
          goal: String(task.goal).trim(),
          expectedMinutes: Number(task.expectedMinutes),
          dueDate: new Date(String(task.dueDate)).toISOString(),
          priority: task.priority as 'LOW' | 'MEDIUM' | 'HIGH',
          reason: task.reason === null ? null : String(task.reason).trim(),
        };
      }),
    };

    const now = new Date();
    const expiresAt = new Date(now.getTime() + previewLifetimeMs);
    const planPreviewRef = randomUUID();
    await this.prisma.temporaryContext.create({ data: {
      opaqueRef: planPreviewRef,
      contextType: 'STUDY_PLAN_PREVIEW',
      ownerUserId: user.id,
      resourceKey: user.id,
      payload: {
        preview: { ...preview, tasks: preview.tasks.map((task) => ({ ...task, topic: { ...task.topic } })) },
        planningStartAt: planningStartAt.toISOString(),
      },
      expiresAt,
      retentionUntil: expiresAt,
    } });

    return { planPreviewRef, expiresAt: expiresAt.toISOString(), preview };
  }
}
