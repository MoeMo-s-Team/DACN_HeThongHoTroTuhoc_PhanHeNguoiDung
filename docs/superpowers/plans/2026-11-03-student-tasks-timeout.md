# Student Tasks Request Timeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure loading the current StudyTask list has the same bounded timeout, visible error, and retry behavior already provided for status updates.

**Architecture:** Keep the existing Student Tasks page, shared `apiRequest`, TanStack Query, and UI test setup. Reuse one local timeout helper for GET and PATCH; leave API, seed, and already-covered backend lifecycle behavior unchanged.

**Tech Stack:** Next.js, TypeScript, TanStack Query, Vitest, Testing Library.

**Spec:** FR-STU-007 / UC-STU-007; API-STU-TASK-001/002; SCR-STU-006 in the frozen baseline.

## Global Constraints

- A Student sees only their current StudyPlan; no current plan returns `{ planId: null, planStatus: null, items: [] }`.
- Preserve `TODO ↔ COMPLETED`, backend ownership, plan lifecycle, progress, and `/api/v1` contract.
- Keep timeout handling at the UI request boundary; do not change API behavior or add dependencies.
- Reuse the existing 15-second task-update timeout for list loading.
- Keep the seeded ACTIVE empty plan and its insert-only behavior unchanged.

## Review Focus

- A stalled task-list GET must stop loading after 15 seconds, show an error, and permit retry.
- A rejected task-list GET must stop loading, show an error, and permit retry.
- PATCH timeout and status rollback must remain intact when timeout logic is shared.
- TanStack Query's production default retries queries; the task-list query must disable automatic retries so the timeout reaches its error state on schedule.
- Canceling the TanStack query (including cache clearing on logout) must abort the in-flight GET, settle the helper even if the transport ignores abort, and clear the timeout.

---

### Task 1: Bound StudyTask list requests and cover failure states

**Files:**
- Modify: `apps/web/app/sinh-vien/nhiem-vu/student-tasks.tsx`
- Test: `apps/web/app/sinh-vien/nhiem-vu/student-tasks.test.tsx`

**Interfaces:**
- Keep the existing `apiRequest<T>(path, options)` interface and route contract.
- Keep the page's existing query error and retry UI.

- [x] Add tests for GET network rejection and a never-resolving GET using a normal `QueryClient`; assert the error is shown, loading ends, and manual retry issues another GET.
- [x] Add a direct helper test that aborts while `apiRequest` ignores abort; assert the helper rejects before advancing 15 seconds and clears its timeout.
- [x] Add a page test that cancels the task-list query and asserts the transport AbortSignal is aborted.
- [x] Run the focused test and confirm the timeout case fails before implementation.
- [x] Set `retry: false` on the task-list query; factor the existing 15-second AbortController/Promise.race behavior into one local helper and use it for both GET and PATCH.
- [x] Forward the query cancellation signal through the timeout helper; race cancellation so it settles even if transport ignores abort, then clear the timer/listener in `finally`.
- [x] Confirm the existing PATCH timeout test still verifies task status is unchanged and a retry action is available.
- [x] Run focused Student Tasks tests, then repository `pnpm verify:baseline`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- [x] Run `pnpm test:integration` (5 suites/30 tests passed). `pnpm test:e2e` was attempted; its seed preflight stopped on a pre-existing fixture ID conflict before writing.
