# FR-STU-007 Manual Test Gap Fixes Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an insert-only seed fixture for an ACTIVE empty plan and make task status updates fail visibly/retryably when the PATCH request hangs or fails.

**Architecture:** Keep the existing Prisma seed and StudentTasks/TanStack Query path. Add a bounded timeout only to the task status PATCH, keep server response as the only source of task status, render a retry action on failure, and stop tying mutation pending state to background query invalidation.

**Tech Stack:** Prisma, PostgreSQL, NestJS seed integration tests, Next.js, TanStack Query, Vitest, Playwright.

**Spec:** FR-STU-007 / UC-STU-007 / BR-001, BR-024, BR-025, BR-036; API-STU-TASK-002; SCR-STU-006; Editorial Tech Design System.

## Global Constraints

- Preserve frozen FR-STU-007 behavior; do not add business transitions or edit task content.
- Seed with fixed IDs and `createMany({ skipDuplicates: true })`; do not update/delete existing rows.
- The new fixture is one existing active demo Student with a new ACTIVE StudyPlan and zero StudyTasks.
- A task remains unchanged until a successful PATCH response; network failure/timeout exposes an error and retry action.
- Preserve the existing shared API client, TanStack Query state, and Editorial Tech visual tokens.

## Review Focus

- An ACTIVE plan with no tasks renders the plan-specific empty message.
- A hanging PATCH reaches timeout, exits pending state, and leaves task status unchanged.
- A rejected PATCH shows an actionable retry control; only a successful response changes status.
- Seed reruns preserve every pre-existing row and remain idempotent.
- PATCH success does not remain pending while unrelated invalidation/refetch requests finish.

---

### Task 1: Seed ACTIVE empty-plan fixture

**Files:**
- Modify: `apps/api/prisma/seed.ts`
- Test: `apps/api/test/seed.integration-spec.ts`
- Test: `apps/web/app/sinh-vien/nhiem-vu/student-tasks.test.tsx`
- Test: `apps/web/e2e/student-tasks.spec.ts`

- [x] Add a seed integration assertion that plan ID `40000000-0000-4000-8000-000000000009` is ACTIVE for `student.09@example.test` and has zero tasks; add a UI unit regression for the existing plan-specific empty copy and a browser assertion for the seeded account.
- [x] Verify the seed integration assertion fails before the fixture exists; the UI unit regression passes because the component already handles this response. Run the browser assertion after seeding the fixture.
- [x] Add only the fixed-ID ACTIVE plan for existing `student.09@example.test`; assign no StudyTasks and preserve insert-only seed semantics.
- [x] Verify seed integration and UI empty state; run the browser assertions against a fresh temporary PostgreSQL database migrated and seeded with the current fixture, because the configured test database has a known stale seed conflict.

### Task 2: Bound and recover failed task updates

**Files:**
- Modify: `apps/web/app/sinh-vien/nhiem-vu/student-tasks.tsx`
- Test: `apps/web/app/sinh-vien/nhiem-vu/student-tasks.test.tsx`
- Test: `apps/web/e2e/student-tasks.spec.ts`

- [x] Add failing tests for timeout-to-error, unchanged task state on failure, explicit retry, and immediate success after PATCH while invalidation/refetch remains pending.
- [x] Verify the tests fail against unbounded fetch and missing retry behavior.
- [x] Apply a 15-second AbortController timeout to the task-status PATCH; render error and retry after rejection; do not await invalidation/refetch in mutation success.
- [x] Verify focused UI tests and browser update/undo plus empty-plan flow against a fresh temporary PostgreSQL database migrated and seeded with the current fixture.

### Task 3: Verification

- [x] Run `pnpm test`, `pnpm test:integration`, `pnpm lint`, and `pnpm typecheck`.
- [x] Run the relevant Playwright task and empty-plan flows; document any environment blocker.
- [x] Review the final diff and provide manual steps using seeded accounts.
