# Seed Empty-Plan Rerun Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow an insert-only seed rerun to add the new empty-plan fixture when existing demo task state has changed.

**Architecture:** Keep the current seed conflict and ownership checks. If every fixture except the new empty-plan row already exists, check that its Student has no other current plan and continue the existing `createMany(skipDuplicates)` transaction without rerunning unrelated mutable scenario assertions.

**Tech Stack:** Prisma, PostgreSQL, TypeScript, Jest.

**Spec:** Root `AGENTS.md` seed safety rules; FR-STU-007 seed fixture `student.09@example.test` / plan ID `40000000-0000-4000-8000-000000000009`.

## Global Constraints

- Seed remains insert-only; existing fixture rows must not be changed or deleted by the seed.
- Do not relax fixed-ID ownership, ACTIVE Student, duplicate-current-plan, or schema/domain validations.
- Only skip scenario revalidation when every fixture row other than the new empty-plan row already exists.

## Review Focus

- Changed Student 07 task states do not block insertion of the missing empty plan.
- The seed leaves those existing task rows unchanged.
- A different ACTIVE/COMPLETED plan for Student 09 still blocks the new plan.
- A disabled/non-Student target account does not receive an ACTIVE plan.
- A fully seeded database still returns idempotently.

---

### Task 1: Make the additive seed rerun safe

**Files:**
- Modify: `apps/api/prisma/seed.ts`
- Test: `apps/api/test/seed.integration-spec.ts`

- [x] Add a failing isolated PostgreSQL integration test: seed once, remove only the empty-plan fixture, alter Student 07 task status so its mutable progress scenario no longer matches, then assert rerun inserts the plan and preserves every task row. Any Student 7 mutable-scenario preflight failure is the expected RED.
- [x] Extend the integration test to assert a different current plan and a DISABLED Student 09 each prevent insertion.
- [x] Verify the regression test fails against the current mutable-scenario preflight.
- [x] Add an all-fixtures-except-plan check, ACTIVE Student guard, and current-plan guard; preserve the normal `createMany(skipDuplicates)` insertion path.
- [x] Run the focused integration test and full integration suite.
- [x] Run tests, lint, typecheck, baseline verification, and `pnpm exec prisma db seed` on the configured development DB.
