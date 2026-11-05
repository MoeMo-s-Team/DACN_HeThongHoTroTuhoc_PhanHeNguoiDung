# Student Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the Student progress API and `/sinh-vien/tien-do` view from current StudyPlan tasks, with backend-calculated metrics and task-update synchronization.

**Architecture:** Add the frozen progress route to the existing Student dashboard controller/service and reuse `calculateProgress`; query only current-plan task status and due date. Generate the downstream OpenAPI/TypeScript contract, then build a TanStack Query page using that response and invalidate its query after FR-STU-007 task mutations.

**Tech Stack:** NestJS, Prisma, OpenAPI TypeScript contracts, Next.js, TanStack Query, Tailwind, Jest, Vitest.

**Spec:** `docs/baseline/SRS_v1.5_baseline_final.md` (FR-STU-008); `docs/baseline/Use_Case_Specification_v1.1_baseline_rev1.md` (UC-STU-008); `docs/baseline/API_Specification_v1.4_baseline_final.md` (API-STU-PROGRESS-001); `docs/baseline/Wireframe_Screen_Specification_v1.0_baseline_final.md` (SCR-STU-007); `docs/baseline/Business_Rules_v1.3_baseline_rev1.md` (BR-001/009/017/025/027/036); `docs/baseline/Database_Design_v1.0_baseline_final.md` §15.4.

## Global Constraints

- Current StudyPlan status is `ACTIVE` or `COMPLETED`; do not count archived plans.
- Use token-derived Student identity and the existing active-user AuthGuard.
- Reuse `calculateProgress`; keep calculations backend-owned and do not persist progress snapshots.
- `dueDate <= now` counts toward expected progress; `dueDate < now` counts overdue only for `TODO` tasks.
- A zero-task current plan has zero metrics; no current plan returns false/null/null.
- Evaluate the strict 20-point slow-progress threshold before display rounding.
- Do not change database schema, invoke AI, or implement FR-STU-009.
- SCR-STU-007 specifies the `Điều chỉnh bằng AI` CTA. CP-001 records the user's approval to show it disabled with an explanation while SCR-STU-008 is absent; it must not navigate or implement FR-STU-009.
- Preserve the existing E2E database and its rows; run E2E against a newly provisioned test-only database instead of changing conflicting fixtures.
- Respect pre-existing local servers on Playwright's default ports; use explicitly selected alternate ports and do not reuse or stop those servers.

## Review Focus

- `ACTIVE` and `COMPLETED` plans count as current; `ARCHIVED` does not.
- No plan differs from an empty current plan (`null` metrics versus zero metrics).
- Exact `dueDate = now` is due for expected progress and not overdue.
- Exactly 20 percentage points behind is not slow; more than 20 is slow.
- A task mutation invalidates progress data.
- No-plan empty state links to the existing StudyPlan entry path; the slow-progress warning shows a disabled AI adjustment CTA and explanatory text.
- Existing `dacn_test` rows are never reset or rewritten; the isolated E2E database receives only insert-only fixtures.
- E2E API/web servers bind only to configured test ports; Playwright keeps `reuseExistingServer: false`.

---

### Task 1: Test and add the progress API using shared metrics

**Files:**
- Modify: `apps/api/src/student/student-dashboard.dto.ts`
- Modify: `apps/api/src/student/student-dashboard.controller.ts`
- Modify: `apps/api/src/student/student-dashboard.service.ts`
- Test: `apps/api/src/student/student-dashboard.service.spec.ts`
- Test: `apps/api/test/student-dashboard.integration-spec.ts`
- Generate: `packages/contracts/openapi.json`
- Generate: `packages/contracts/src/generated/openapi.ts`

**Interfaces:**
- Add `StudentProgressResponseDto` with `hasCurrentPlan`, nullable `planId`, and nullable `ProgressViewDto metrics`.
- Add `StudentDashboardService.getProgress(user: AuthUser)` and `GET /student/progress`.

- [x] Add service and integration tests for no plan, zero tasks, current-plan-only query, forbidden/disabled access, metric response, and expired/archived plans.
- [x] Run the focused unit/integration suites and confirm the new route/service assertions fail before API implementation.
- [x] Implement the DTO, guarded controller route, and service method using `calculateProgress` with selected `{ status, dueDate }` tasks.
- [x] Make `calculateProgress` accept the minimal status/deadline shape generically while preserving dashboard/task callers and its existing boundary/threshold tests.
- [x] Run focused API unit and integration tests.
- [x] Generate contracts with `pnpm contracts:generate` and verify `/student/progress` and its response schema.
- [x] Run `pnpm contracts:check`.

### Task 2: Record the approved CTA change request

**Files:**
- Modify: `docs/proposals/change-requests/CP-001-progress-adjustment-cta.md`

- [x] Document the conflict between SCR-STU-007's SCR-STU-008 navigation and the user's requirement to avoid navigation to an unimplemented route, including current/proposed behavior and implementation impact.
- [x] Record the requesting user's approval (2026-11-03); keep the disabled CTA scoped to CP-001 and FR-STU-009 unimplemented.

### Task 3: Build the progress screen and synchronize task updates

**Files:**
- Create: `apps/web/app/sinh-vien/tien-do/page.tsx`
- Create: `apps/web/app/sinh-vien/tien-do/student-progress.tsx`
- Test: `apps/web/app/sinh-vien/tien-do/student-progress.test.tsx`
- Modify: `apps/web/app/sinh-vien/nhiem-vu/student-tasks.tsx`
- Test: `apps/web/app/sinh-vien/nhiem-vu/student-tasks.test.tsx`
- Test: `apps/web/e2e/student-tasks.spec.ts`
- Modify: `apps/web/playwright.config.ts`

**Interfaces:**
- Read `StudentProgressResponseDto` from `@dacn/contracts` using query key `['student', 'progress']` and path `/student/progress`.

- [x] Add tests for loading, no-plan empty state with StudyPlan entry CTA, zero-task plan, metric bars/counts, backend warning, error/retry, and progress-query invalidation after task mutation.
- [x] Add a test asserting the slow-progress warning renders a disabled `Điều chỉnh bằng AI` button and explanatory text, with no link/navigation target.
- [x] Run focused web tests and confirm the CTA assertion fails before implementation.
- [x] Implement the page with accessible labeled progress bars and Editorial Tech styling; implement the no-plan CTA to `/sinh-vien/ke-hoach-hoc-tap`.
- [x] Render the approved AI adjustment CTA disabled inside the slow-progress warning with visible text that the feature is not yet implemented; add no route or AI behavior.
- [x] Invalidate `['student', 'progress']` after successful task status updates.
- [x] Add/extend E2E coverage for completing a task then seeing refreshed progress.
- [x] Choose an unused E2E database (`dacn_e2e_d0cdaeef8921`) and confirm its connection URL differs from both `dacn_test` and the development database before creating it.
- [x] Create the new database using the test PostgreSQL connection; migrations and insert-only E2E seed completed against only that URL.
- [x] Allow validated `E2E_API_PORT` / `E2E_WEB_PORT` overrides in `apps/web/playwright.config.ts`, retaining defaults; wire `E2E_API_PORT` to backend `API_PORT`, and `E2E_WEB_PORT` into the `next dev --port` command, API CORS origin, Playwright health URL/baseURL, and `NEXT_PUBLIC_API_BASE_URL`. Set `reuseExistingServer: false` for both web servers.
- [x] Run `pnpm test:e2e` with `TEST_DATABASE_URL`, `E2E_API_PORT`, and `E2E_WEB_PORT` overridden only for that process; verified the resolved database URL differs from `dacn_test` and the development DB. Did not edit `.env`, reset, or write to either existing database.
- [x] Run E2E on alternate ports while the existing default-port processes remain untouched.
- [x] Run focused web tests and repository baseline, lint, typecheck, unit, integration, contracts, and build gates.
