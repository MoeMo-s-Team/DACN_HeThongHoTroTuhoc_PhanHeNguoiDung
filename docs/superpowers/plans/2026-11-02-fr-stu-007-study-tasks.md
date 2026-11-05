# FR-STU-007 Study Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement current-plan task listing and status updates end to end for SCR-STU-006.

**Architecture:** Add a Student task service/controller using AuthGuard, Prisma current-plan scoping, and a single Prisma transaction for task and plan state. Add the Next.js task page using the existing API client, contracts, navigation, and TanStack Query; mutations update server state only after success.

**Tech Stack:** NestJS, Prisma, Jest, Next.js, TypeScript, TanStack Query, Testing Library, OpenAPI-generated contracts.

**Spec:** FR-STU-007 / UC-STU-007 / BR-001, BR-024, BR-025, BR-036; API-STU-TASK-001/002; SCR-STU-006; `docs/baseline/Wireframe_Screen_Specification_v1.0_baseline_final.md` and `docs/baseline/Global UI Design System — Editorial Tech.md`.

## Global Constraints

- Only authenticated ACTIVE Students access student task resources; derive Student ID from the token.
- Current plans have status ACTIVE or COMPLETED; ARCHIVED plans are read-only.
- Task status is only TODO or COMPLETED; completedAt must match status.
- Update task and derived plan status in a serializable Prisma transaction with bounded retry for serialization conflicts; overdue TODO tasks do not archive or complete a plan.
- Do not create schema, draft persistence, task content, AI calls, or StudyPlan records.
- Reuse the existing API client, authentication, Prisma entities, navigation, and UI conventions.

## Review Focus

- No plan and archived plan must return empty current-plan data or reject mutation without writes.
- A task owned by another Student must not be exposed or changed.
- Completing the last TODO task and undoing a completed task must update plan status atomically.
- A failed plan update must not leave a changed task.
- Concurrent completion of multiple tasks must not leave the plan ACTIVE after its last TODO task is completed.
- Expired TODO tasks remain actionable and do not change plan lifecycle based on dueDate.

---

### Task 1: Student task API

**Files:**
- Create: `apps/api/src/student/student-tasks.controller.ts`
- Create: `apps/api/src/student/student-tasks.service.ts`
- Create: `apps/api/src/student/student-tasks.dto.ts`
- Modify: `apps/api/src/student/student.module.ts`
- Test: `apps/api/src/student/student-tasks.service.spec.ts`
- Test: `apps/api/src/openapi.spec.ts`
- Test: `apps/api/test/student-tasks.integration-spec.ts`
- Generate: `packages/contracts/openapi.json`, `packages/contracts/src/generated/openapi.ts`.

- [x] Write service/controller tests for empty/current plan listing, invalid status, forbidden role, 404 for a nonexistent task, 403 for another Student's task, 409 for an own archived/non-current task, both status transitions, progress, serializable transaction, rollback, and serialization-conflict retry.
- [x] Include progress fixtures for overdue and near-due TODO tasks (including dueDate equal to now) and assert they remain TODO without changing plan lifecycle.
- [x] Run focused API tests to verify missing behavior.
- [x] Implement GET and PATCH with DTO validation; derive resource access from the token, and serialize/retry task and plan updates so concurrent task completions preserve plan status. Reuse `calculateProgress` where it matches the API response.
- [x] Run focused unit and integration tests.
- [x] Regenerate API contracts from NestJS OpenAPI before frontend tests consume the new response types.
- [x] Assert the runtime and generated OpenAPI include the PATCH `taskId` path parameter and required `status` request body.

### Task 2: Task screen and API contract

**Files:**
- Create: `apps/web/app/sinh-vien/nhiem-vu/page.tsx`
- Create: `apps/web/app/sinh-vien/nhiem-vu/student-tasks.tsx`
- Test: `apps/web/app/sinh-vien/nhiem-vu/student-tasks.test.tsx`
- Test: `apps/web/e2e/student-tasks.spec.ts`

- [x] Write UI tests for loading, empty plan, task details, visible updating-row and success states, API error, no optimistic state on failure, and dashboard-query refresh after successful mutation.
- [x] Run focused UI tests to verify missing behavior.
- [x] Implement the SCR-STU-006 task list using the existing API client and query cache; refresh both task and dashboard data after success.
- [x] Add a browser flow using the existing seeded Student and tasks; complete then undo a TODO task and verify the server-backed status both times.
- [x] Run contract checks.

### Task 3: Verification

- [x] Run unit, integration, lint, typecheck, baseline, contracts, and build gates.
- [x] Run `pnpm test:e2e` for the critical student task flow, or record the concrete environment blocker if the required services are unavailable. The existing `TEST_DATABASE_URL` contains an older conflicting assessment fixture, so the browser suite passed on a temporary database created from the same PostgreSQL service, prepared with the existing migration/seed command, then dropped.
- [x] Review the final diff for scope, transaction safety, and baseline compliance.
- [x] Give manual test steps using the existing seed accounts/tasks in the completion report.
