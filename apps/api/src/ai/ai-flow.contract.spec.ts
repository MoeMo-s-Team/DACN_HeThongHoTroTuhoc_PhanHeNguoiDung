import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AuthUser } from '../auth/auth.service';
import { FakeAiRuntime } from '../../test/fixtures/ai/fake-ai-runtime';
import { AiInferenceService, AiInvocationPolicy } from './ai-inference.service';
import { AiPreflightError } from './capacity-preflight.service';
import { AiFlowService } from './ai-flow.service';
import { AiRequestLogRepository } from './ai-request-log.repository';
import { AiSemanticValidator } from './ai-semantic-validator';
import { SchemaRegistryService, AiTask } from './schema-registry.service';

const fixturePath = join(process.cwd(), '../../docs/releases/ai-contract-v1.0-schema-pack-release1/fixtures/valid');
const fixture = (name: string) => JSON.parse(readFileSync(join(fixturePath, name), 'utf8'));
const principal: AuthUser = { id: '00000000-0000-4000-8000-000000000001', fullName: 'A', email: 'a@example.test', role: 'ADMINISTRATOR', status: 'ACTIVE' };
const tasks: AiTask[] = [
  'STUDENT_LEARNING_ANALYSIS', 'STUDENT_STUDY_PLAN_GENERATION', 'STUDENT_STUDY_PLAN_ADJUSTMENT',
  'TEACHER_CLASS_ANALYSIS', 'ADMIN_FEEDBACK_GROUPING_STAGE1', 'ADMIN_FEEDBACK_SUMMARY_STAGE2',
];

function setup(outputs: Array<unknown | Error> = [], preflightCheck?: (request: any) => unknown) {
  const runtime = new FakeAiRuntime().queue(...outputs);
  const schemas = new SchemaRegistryService();
  const logs: any[] = [];
  const policy: AiInvocationPolicy = { authorize: jest.fn(), checkEligibility: jest.fn() };
  const prompts = Object.fromEntries(tasks.map((task) => [task, `prompt-${task}`]));
  const preflight = jest.fn(preflightCheck ?? (() => ({ serializedPayload: '{}', estimatedInputTokens: 1, inputBudgetTokens: 100 })));
  const inference = new AiInferenceService(
    { preflight } as never,
    schemas,
    new AiSemanticValidator(schemas),
    { assertReady: jest.fn(), infer: runtime.infer.bind(runtime) } as never,
    { createTerminal: jest.fn(async (entry) => { logs.push(entry); }) } as unknown as AiRequestLogRepository,
    policy,
    { registryPromptVersions: prompts, profilePromptVersions: prompts },
  );
  return { flow: new AiFlowService(inference), runtime, logs, inference, preflight };
}

describe('AI task flow contract', () => {
  it.each(tasks)('routes %s through exactly one validated attempt', async (task) => {
    const inputs: Record<AiTask, unknown> = {
      STUDENT_LEARNING_ANALYSIS: fixture('student-learning-analysis.input.json'),
      STUDENT_STUDY_PLAN_GENERATION: fixture('student-study-plan-generation.input.json'),
      STUDENT_STUDY_PLAN_ADJUSTMENT: fixture('student-study-plan-adjustment.input.json'),
      TEACHER_CLASS_ANALYSIS: fixture('teacher-class-analysis.input.json'),
      ADMIN_FEEDBACK_GROUPING_STAGE1: fixture('admin-feedback-grouping-stage1.input.json'),
      ADMIN_FEEDBACK_SUMMARY_STAGE2: fixture('admin-feedback-summary-stage2.input.json'),
    };
    const outputs: Record<AiTask, unknown> = {
      STUDENT_LEARNING_ANALYSIS: fixture('student-learning-analysis.output.json'),
      STUDENT_STUDY_PLAN_GENERATION: fixture('student-study-plan-generation.output.json'),
      STUDENT_STUDY_PLAN_ADJUSTMENT: fixture('student-study-plan-adjustment.output.json'),
      TEACHER_CLASS_ANALYSIS: fixture('teacher-class-analysis.output.json'),
      ADMIN_FEEDBACK_GROUPING_STAGE1: fixture('admin-feedback-grouping-stage1.output.json'),
      ADMIN_FEEDBACK_SUMMARY_STAGE2: fixture('admin-feedback-summary-stage2.output.json'),
    };
    const ctx = setup([outputs[task]]);
    await ctx.flow.runTask(task, inputs[task], 'r1', principal, {});
    expect(ctx.runtime.requests).toHaveLength(1);
    expect(ctx.logs).toHaveLength(1);
    expect(ctx.logs[0]).toMatchObject({ feature: task, status: 'SUCCESS' });
  });

  it('deduplicates Stage 1 IDs in order, removes empty groups, recomputes count, then runs Stage 2 once', async () => {
    const stage1 = { issueGroups: [
      { title: 'First', summary: 'One', feedbackIds: ['feedback_1', 'feedback_1'] },
      { title: 'Empty', summary: 'Drop', feedbackIds: [] },
      { title: 'Second', summary: 'Two', feedbackIds: ['feedback_1', 'feedback_2'] },
    ] };
    const ctx = setup([stage1, fixture('admin-feedback-summary-stage2.output.json')]);
    const result = await ctx.flow.runAdminFeedbackAnalysis({
      feedback: [
        ...fixture('admin-feedback-grouping-stage1.input.json').feedback,
        { feedbackId: 'feedback_2', tag: 'STUDY_PLAN', rating: 4, content: 'Study plan issue' },
      ],
      totalFeedback: 2,
      tagStatistics: { AI_PERFORMANCE: 1, STUDY_PLAN: 1, UI_UX: 0, LEARNING_ANALYTICS: 0, OTHER: 0 },
    }, 'admin-r', principal, {});
    expect(ctx.runtime.requests.map(({ task }) => task)).toEqual(['ADMIN_FEEDBACK_GROUPING_STAGE1', 'ADMIN_FEEDBACK_SUMMARY_STAGE2']);
    expect(ctx.runtime.requests[1].input).toMatchObject({ issueGroups: [
      { title: 'First', feedbackIds: ['feedback_1'], count: 1 },
      { title: 'Second', feedbackIds: ['feedback_2'], count: 1 },
    ] });
    expect(result).toEqual(fixture('admin-feedback-summary-stage2.output.json'));
    expect(ctx.logs.map(({ status }) => status)).toEqual(['SUCCESS', 'SUCCESS']);
  });

  it('does not run Stage 2 after invalid IDs or AI-supplied count', async () => {
    for (const stage1 of [
      { issueGroups: [{ title: 'X', summary: 'Y', feedbackIds: ['outside'] }] },
      { issueGroups: [{ title: 'X', summary: 'Y', feedbackIds: ['feedback_1'], count: 1 }] },
    ]) {
      const ctx = setup([stage1]);
      await expect(ctx.flow.runAdminFeedbackAnalysis({
        feedback: fixture('admin-feedback-grouping-stage1.input.json').feedback,
        totalFeedback: 1,
        tagStatistics: { AI_PERFORMANCE: 1, STUDY_PLAN: 0, UI_UX: 0, LEARNING_ANALYTICS: 0, OTHER: 0 },
      }, 'admin-r', principal, {})).rejects.toBeDefined();
      expect(ctx.runtime.requests).toHaveLength(1);
      expect(ctx.logs).toHaveLength(1);
      expect(ctx.logs[0].status).toBe('FAILED');
    }
  });

  it('allows empty valid Stage 1 groups and still dispatches Stage 2', async () => {
    const ctx = setup([{ issueGroups: [] }, fixture('admin-feedback-summary-stage2.output.json')]);
    await ctx.flow.runAdminFeedbackAnalysis({
      feedback: fixture('admin-feedback-grouping-stage1.input.json').feedback,
      totalFeedback: 1,
      tagStatistics: { AI_PERFORMANCE: 1, STUDY_PLAN: 0, UI_UX: 0, LEARNING_ANALYTICS: 0, OTHER: 0 },
    }, 'admin-r', principal, {});
    expect(ctx.runtime.requests).toHaveLength(2);
    expect(ctx.runtime.requests[1].input).toMatchObject({ issueGroups: [] });
    expect(ctx.logs.map(({ status }) => status)).toEqual(['SUCCESS', 'SUCCESS']);
  });

  it('keeps Stage 1 SUCCESS only when Stage 2 independently fails preflight', async () => {
    const stage1 = { issueGroups: [] };
    const ctx = setup([stage1], (request) => {
      if (request.task === 'ADMIN_FEEDBACK_SUMMARY_STAGE2') throw new AiPreflightError('AI_INPUT_TOO_LARGE', 422);
      return { serializedPayload: '{}', estimatedInputTokens: 1, inputBudgetTokens: 100 };
    });
    await expect(ctx.flow.runAdminFeedbackAnalysis({
      feedback: fixture('admin-feedback-grouping-stage1.input.json').feedback,
      totalFeedback: 1,
      tagStatistics: { AI_PERFORMANCE: 1, STUDY_PLAN: 0, UI_UX: 0, LEARNING_ANALYTICS: 0, OTHER: 0 },
    }, 'admin-r', principal, {})).rejects.toMatchObject({ code: 'AI_INPUT_TOO_LARGE' });
    expect(ctx.runtime.requests).toHaveLength(1);
    expect(ctx.logs.map(({ feature, status }) => [feature, status])).toEqual([['ADMIN_FEEDBACK_GROUPING_STAGE1', 'SUCCESS']]);
  });

  it('rejects an invalid planning deadline before any inference or log', async () => {
    const ctx = setup();
    const input = fixture('student-study-plan-generation.input.json');
    input.targetDeadline = input.planningStartAt;
    await expect(ctx.flow.runTask('STUDENT_STUDY_PLAN_GENERATION', input, 'r1', principal, {})).rejects.toBeDefined();
    expect(ctx.runtime.requests).toHaveLength(0);
    expect(ctx.logs).toHaveLength(0);
  });
});
