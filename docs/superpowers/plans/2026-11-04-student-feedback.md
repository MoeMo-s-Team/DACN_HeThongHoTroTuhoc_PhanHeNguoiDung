# Student Feedback Implementation Plan

> **For agentic workers:** Implement this plan task-by-task with TDD. The task request explicitly asks for direct implementation, so use native execution in this session.

**Goal:** Implement the Student feedback form at `/phan-hoi/gui` and authenticated `POST /api/v1/feedback` persistence using the existing Feedback database model.

**Architecture:** Add a Feedback Nest module/controller/service and DTO validation, reusing `AuthGuard`, `CurrentUser`, `PrismaService`, and the existing global exception filter. Add a Student-only Next.js page using `AuthenticatedHome`, `StudentNavigation`, `apiRequest`, and React Hook Form; publish the endpoint through the existing Swagger/OpenAPI contract generation flow.

**Tech Stack:** NestJS, Prisma, class-validator, PostgreSQL, Next.js, React Hook Form, TanStack Query, Vitest, Jest.

**Spec:** `docs/baseline/SRS_v1.5_baseline_final.md` (FR-FB-001), `docs/baseline/Use_Case_Specification_v1.1_baseline_rev1.md` (UC-FB-001), `docs/baseline/Business_Rules_v1.3_baseline_rev1.md` (BR-013/014/031), `docs/baseline/API_Specification_v1.4_baseline_final.md` (API-FB-001), `docs/baseline/Database_Design_v1.0_baseline_final.md`, `docs/baseline/Wireframe_Screen_Specification_v1.0_baseline_final.md` (SCR-FB-001), and `docs/baseline/Global UI Design System — Editorial Tech.md`.

## Global Constraints

- API route is `POST /api/v1/feedback`, accepts tag/rating/content, gets userId from authenticated session, permits ACTIVE Student and Teacher, and returns HTTP 201 with id/tag/rating/content/createdAt.
- FeedbackTag is `AI_PERFORMANCE`, `STUDY_PLAN`, `UI_UX`, `LEARNING_ANALYTICS`, or `OTHER`; rating is integer 1–5; content must be non-empty after trim.
- The endpoint permits ACTIVE Student and Teacher users; this task intentionally implements only the Student route/sidebar, as explicitly scoped by the request. No Teacher UI is added.
- Feedback timestamps use UTC and Admin queryability is preserved; existing Prisma model/migration already implements the required storage.
- Student route is `/phan-hoi/gui`; submit success resets the form and stays on route. No Teacher/Admin UI, edit/delete, AI analysis, or notifications.
- Preserve existing API error shape, auth architecture, Editorial Tech style, and generated contracts workflow; do not edit frozen baseline files.

## Review Focus

- Missing/invalid Bearer token, inactive user, Administrator role, and Teacher role: reject or allow per API contract; cover API integration. Teacher permission remains on the API although Teacher UI is outside this request.
- Client-supplied `userId`: reject as an unknown DTO property and persist no row; cover API integration.
- Unknown tag, rating below/above bounds or non-integer, and blank/whitespace content: reject without a row; cover validation/service and persistence tests.
- Database write failure: surface the standard API error and do not claim success; cover service/API behavior.
- Repeated submit while request is pending: disable submission; cover Student component test.
- Success: clear all fields, show confirmation, remain on the page; cover Student component test.

---

### Task 1: Feedback API and persistence

**Files:**
- Create `apps/api/src/feedback/feedback.module.ts`
- Create `apps/api/src/feedback/feedback.controller.ts`
- Create `apps/api/src/feedback/feedback.service.ts`
- Create `apps/api/src/feedback/feedback.dto.ts`
- Create `apps/api/src/feedback/feedback.service.spec.ts`
- Modify `apps/api/src/app.module.ts`
- Modify `apps/api/test/` with a focused PostgreSQL endpoint integration test
- Regenerate `packages/contracts/openapi.json` and generated TypeScript API contracts using repository scripts

- [x] Add service tests for Student/Teacher authorization, authenticated userId, trimmed non-empty content, timestamp, returned shape, and database failure.
- [x] Run focused Jest tests and verify expected failures.
- [x] Implement DTO validation, AuthGuard-protected controller, and Prisma create in the service; preserve original validated content in storage and response.
- [x] Run focused Jest tests.
- [x] Add PostgreSQL integration coverage for POST 201 persistence, invalid data, missing/invalid auth, Student/Teacher/Admin/disabled role checks, client `userId` rejection, and persisted row visibility through `prisma.feedback`.
- [x] Generate OpenAPI and shared contracts, then run `pnpm contracts:check`.

### Task 2: Student feedback screen

**Files:**
- Create `apps/web/app/phan-hoi/gui/page.tsx`
- Create `apps/web/app/phan-hoi/gui/student-feedback.tsx`
- Create `apps/web/app/phan-hoi/gui/student-feedback.test.tsx`
- Create `apps/web/e2e/student-feedback.spec.ts`
- Modify `apps/web/app/sinh-vien/student-navigation.tsx`

- [x] Add tests for required tag/rating/content messages, loading/double-submit prevention, API failure, and success reset without navigation.
- [x] Run the focused Vitest file and verify expected failures.
- [x] Implement the screen with existing auth, navigation, API client, TanStack mutation, React Hook Form, and Editorial Tech classes.
- [x] Run focused Vitest tests.
- [x] Add a Playwright flow that authenticates as Student, navigates from the sidebar, submits via a stubbed successful API response, and verifies the success message, reset form, and unchanged route.

### Task 3: Verification

- [x] Run `pnpm verify:baseline`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:integration`, and `pnpm test:e2e` for this submit flow. `pnpm test:e2e` passed on a temporary isolated schema because the shared test schema contains conflicting stale seed rows.
- [x] Review the final diff for frozen-baseline changes, generated contract consistency, and scope.
