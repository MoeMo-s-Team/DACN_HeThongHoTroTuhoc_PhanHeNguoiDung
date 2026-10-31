# FR-STU-001 Student Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Student dashboard end to end at `GET /api/v1/student/dashboard` and `/sinh-vien/tong-quan` using the frozen contract.

**Architecture:** Add a focused NestJS Student module using the existing AuthGuard, CurrentUser, PrismaService, and backend service boundary. Generate shared frontend transport types from NestJS OpenAPI per ADR-CONTRACT-001, then render the dashboard client-side with the shared API client and TanStack Query.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Swagger/OpenAPI, TypeScript, Next.js, Tailwind, TanStack Query, Jest, Vitest, Testing Library.

**Spec:** `docs/baseline/SRS_v1.5_baseline_final.md` FR-STU-001; `docs/baseline/Use_Case_Specification_v1.1_baseline_rev1.md` UC-STU-001; `docs/baseline/Business_Rules_v1.3_baseline_rev1.md` BR-001/009/017/025/027/034/036 and OD-35; `docs/baseline/API_Specification_v1.4_baseline_final.md` API-STU-DASH-001; `docs/baseline/Database_Design_v1.0_baseline_final.md`; `docs/baseline/Wireframe_Screen_Specification_v1.0_baseline_final.md` SCR-STU-001; `docs/baseline/UI_Sitemap_v1.1_baseline.md`; `docs/baseline/System_Architecture_and_Technology_Stack_v1.0_baseline.md`; `docs/baseline/Global UI Design System — Editorial Tech.md`; `docs/decisions/ADR-CONTRACT-001 — OpenAPI-Generated Shared API Contracts.md`.

## Global Constraints

- `GET /api/v1/student/dashboard` derives the Student ID from the authenticated user; do not accept a client-supplied `studentId`.
- Only ACTIVE authenticated STUDENT users can read their own dashboard; existing AuthGuard rejects disabled accounts and the Student endpoint uses `FORBIDDEN_RESOURCE` for role denial.
- Latest AssessmentResult is selected per Student–Topic by `evaluatedAt`; current plan status is `ACTIVE` or `COMPLETED`.
- Backend computes exact metrics. Near due is `TODO` and `now < dueDate <= now + 48h`; overdue is `TODO` and `dueDate < now`; expected progress includes tasks with `dueDate <= now`.
- Evaluate slow progress on unrounded values using `actualProgress < expectedProgress - 20`; when a current plan has zero tasks, both progress values are 0; with no current plan, `currentPlan` and `progress` are null.
- Keep the API shape and UI actions/states within API-STU-DASH-001 and SCR-STU-001. Do not call AI or edit frozen baseline files.
- Keep Editorial Tech tokens, angular geometry, thin borders, readable typography, keyboard-accessible links/buttons, and the direct browser-to-NestJS API topology.

## Review Focus

- A request without a token, with a disabled account, or from a non-Student role is rejected; cover all three at `/student/dashboard` in the PostgreSQL endpoint integration test.
- Student data stays scoped to the authenticated ID; integration fixture includes another Student's records and asserts they are absent.
- A task exactly at `now` is neither near due nor overdue but counts toward expected progress; unit-test the exact boundary and the 48-hour endpoint.
- A plan with zero tasks yields zero percentages and no slow-progress warning; unit-test it.
- Missing current plan and missing assessments render valid null/empty response sections without inventing zero scores; unit-test service output and frontend empty state.
- ACTIVE and COMPLETED plans are current; ARCHIVED plans are excluded. Test the query filter and the endpoint behavior when a plan is archived.
- Classification boundaries and the duplicated progress contract stay exact: scores 80/79/60/59 map to the API classifications, and `completionPercentage === actualProgress`; assert the full StudyTaskView fields.
- Rendering dashboard children through `AuthenticatedHome` retains the Student's existing logout action; cover it in the frontend test.

---

### Task 1: Backend dashboard calculations and query service

**Files:**
- Create: `apps/api/src/student/student-dashboard.service.ts`
- Test: `apps/api/src/student/student-dashboard.service.spec.ts`
- Create: `apps/api/src/student/student-dashboard.dto.ts`

**Interfaces:**
- `StudentDashboardService.getDashboard(user: AuthUser)` returns the API-STU-DASH-001 response shape.
- Service queries use `user.id` only, include Topic for results/tasks, select latest result by Topic, and return null plan/progress when no current plan exists.

- [x] Add failing unit tests for computed progress, latest result-per-topic, no plan, no assessments, zero tasks, role denial, ACTIVE/COMPLETED inclusion and ARCHIVED exclusion, near-due/overdue boundaries, slow-progress threshold, BR-016 classifications, completionPercentage parity, and task response fields.
- [x] Run `pnpm --filter @dacn/api test -- student/student-dashboard.service.spec.ts` and confirm failure because the service is absent.
- [x] Implement the smallest service and response DTOs using Prisma queries scoped to the authenticated `user.id`.
- [x] Rerun the focused API unit test and confirm it passes.

### Task 2: Authenticated endpoint and OpenAPI contract

**Files:**
- Create: `apps/api/test/student-dashboard.integration-spec.ts`
- Create: `apps/api/src/student/student-dashboard.controller.ts`
- Create: `apps/api/src/student/student.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/openapi.spec.ts`
- Generated: `packages/contracts/openapi.json`
- Generated: `packages/contracts/src/generated/openapi.ts`

- [x] Add failing PostgreSQL integration assertions for missing token, disabled account, non-Student role denial, a Student response containing only the authenticated Student's records, and current-plan behavior for ACTIVE/COMPLETED versus ARCHIVED. Add OpenAPI assertions for route, bearer security, response DTO, and 401/403/500 errors.
- [x] Run `pnpm test:integration` and `pnpm --filter @dacn/api test -- src/openapi.spec.ts`; confirm the dashboard assertions fail because the endpoint is missing (the integration script runs the full integration suite and does not forward test-file filters).
- [x] Implement and register the guarded controller/module after the failing integration test.
- [x] Generate contracts with `pnpm contracts:generate` only after OpenAPI includes the endpoint.
- [x] Run `pnpm test:integration`, `pnpm --filter @dacn/api test -- src/openapi.spec.ts`, and `pnpm contracts:check`; confirm API and generated response types match API-STU-DASH-001.

### Task 3: SCR-STU-001 frontend dashboard

**Files:**
- Modify: `apps/web/app/auth/authenticated-home.tsx`
- Modify: `apps/web/app/sinh-vien/tong-quan/page.tsx`
- Create: `apps/web/app/sinh-vien/tong-quan/student-dashboard.tsx`
- Test: `apps/web/app/sinh-vien/tong-quan/student-dashboard.test.tsx`

**Interfaces:**
- `StudentDashboard` fetches `GET /student/dashboard` with `apiRequest` and uses generated `components['schemas']` response types.
- `AuthenticatedHome` accepts optional children and preserves its current fallback for Teacher/Admin routes.

- [x] Add failing UI tests for loading, retryable error, overall empty state, missing plan with assessment results, populated metric/task/result sections, sitemap links, and logout when authenticated children render.
- [x] Run `pnpm --filter @dacn/web test -- app/sinh-vien/tong-quan/student-dashboard.test.tsx` and confirm failure because the dashboard UI is absent.
- [x] Implement SCR-STU-001 with responsive Editorial Tech layout, semantic loading/error/empty states, local date display, backend-provided metrics/statuses, and navigation links to the specified Student routes. Extend `AuthenticatedHome` with optional children while retaining its existing role-specific fallback and logout control.
- [x] Rerun the focused web test and confirm it passes.

### Task 4: Repository verification

**Files:** No additional files expected.

- [x] Run `pnpm verify:baseline`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm test:integration`.
- [x] Run `pnpm test:e2e` if the existing browser setup and DB test URL support it; otherwise report why it could not run.
- [x] Review the final diff for baseline edits, unrelated changes, ungenerated contract drift, and failed checks.
