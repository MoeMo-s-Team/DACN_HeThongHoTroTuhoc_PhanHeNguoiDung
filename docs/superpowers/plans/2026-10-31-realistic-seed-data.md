# Realistic Seed Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand local seed data to model ten active Students, two Teachers, and three Classes while preserving every existing row and progress value.

**Architecture:** Keep all fixture creation in the current Prisma seed script. Use stable IDs and insert-if-absent writes; seed only source AssessmentResult, StudyPlan, StudyTask, User, Class, and ClassMember records, allowing existing backend rules to derive analytics. No schema, API, UI, or AI-output changes.

**Tech Stack:** TypeScript, Prisma, PostgreSQL, pnpm, Jest.

**Spec:** `docs/superpowers/specs/2026-10-31-realistic-seed-data-design.md`

## Global Constraints

- Never reset, truncate, delete, or update existing PostgreSQL rows.
- Reuse the MVP Course and its existing Topics.
- Use stable IDs; preserve all existing demo accounts and Class assignments.
- Capture one seed-time UTC reference for new assessment and task timestamps.
- Store only source records; do not seed hardcoded aggregate metrics or AI outputs.
- Preserve BR-016, BR-017, BR-018, BR-024–BR-027, BR-031, BR-033 and DB-DD-006.

## Review Focus

- A conflict on an existing ID/email must be detected before any writes; verify row-value snapshots before and after the first run.
- The second run must not change counts or values; verify a full snapshot after two runs.
- No Student may gain a second current StudyPlan; verify one-current-plan constraints and student/status counts.
- Missing results/plans must stay missing rather than being converted to zero or fabricated; verify Class C is `INSUFFICIENT_DATA` under OD-33.
- Relative due dates age after the initial seed; verify the initial near-due window and report that rerunning will not refresh it.

---

### Task 1: Capture existing data and define the fixture matrix

**Files:**
- No repository files modified.

**Interfaces:**
- Read the existing `apps/api/prisma/seed.ts`, Prisma schema, and current PostgreSQL state.

- [x] **Step 1: Check target database identity and row counts**

Run read-only Prisma queries against configured `DATABASE_URL`. Record counts and a private content digest keyed by primary/composite key for all existing User, AssessmentResult, StudyPlan, StudyTask, Course, Topic, Class, ClassMember, and Feedback rows. Do not print password hashes or full user records. These are the preexisting-row snapshot, not an expected whole-table digest after inserts.

- [x] **Step 2: Fix the per-Class scenario matrix before editing**

| Class | Teacher | Members | Data objective and expected rule evidence |
|---|---|---|---|
| Existing Class A | Existing Teacher | Existing Students 1–2 plus new Students 3–6 | Strong latest scores across all MVP Topics; after existing result rows are included, no Topic average below 60. Existing Student progress is preserved and may still independently show Needs Attention/Progress Warning. |
| Existing Class B | Existing Teacher | Existing Student 1 plus new Students 7–8 | On shared Topics, Students 7–8 latest scores at or below 45 keep averages below 60 even with Student 1's existing scores; Student 7 has average below 60, at least two overdue TODO tasks, and a task-progress gap over 20 points. |
| New Class C | New Teacher | New Students 9–10 | No AssessmentResult and no current StudyPlan with StudyTask, so OD-33 yields `INSUFFICIENT_DATA`. |

Expected totals: 10 ACTIVE Students plus the existing DISABLED Student, two Teachers, three Classes. Existing Student 1 and Student 2 retain their plans and membership rows; the new Students alone receive the additional plans/tasks/results.

Use `student.03@example.test` through `student.10@example.test` for the eight new Student accounts and `teacher.two@example.test` for the new Teacher. Assign fixed IDs after the existing seed's User IDs without reusing them.

Latest scores for new Students 3–6 must be at least 70 on all nine MVP Topics, ensuring Class A has no Weak Topic after existing results are included. Their histories should still show upward and downward changes across two to four attempts. Students 7–8 should share low latest scores on the five Topics that already have Student 1 results so each corresponding Class B average is below 60.

- [x] **Step 3: Verify the existing DB and the fixed matrix are compatible**

Confirm the current `Class A` and `Class B` names, existing memberships, Teacher assignments, MVP Course/Topic IDs, fixed ID ranges, and current-plan statuses. Do not continue if current rows differ in a way that would require modifying them; keep them and revise only the new fixture assignments/IDs.

- [x] **Step 4: Preflight all fixture identity conflicts before the first write**

Check all fixed User IDs and emails, the MVP Course/Topic IDs, the new Class ID, and all fixed AssessmentResult/StudyPlan/StudyTask/Feedback IDs against existing rows. Existing demo Users must match their expected ID, email, and role. Existing Course/Topics must match the MVP Course relationship and topic identity; existing Class A/B assignments remain untouched. If an ID or email is attached to a different User, the new Class ID belongs to another Teacher, an AssessmentResult/StudyPlan/StudyTask ID belongs to a different Student/Topic/Plan relationship, a Topic ID belongs to another Course, or a Feedback ID belongs to another User, abort before any mutation. Preserve same-owner rows even if their mutable name, score, status, due date, completion time, or feedback tag/rating differs.

- [x] **Step 5: Check the requested scenarios against the populated DB before any insert**

Overlay planned rows in memory on the actual existing memberships, latest-per-Student/Topic scores, user roles/statuses, and current plans/tasks. On initial population or partial recovery, abort before the first write unless all post-seed assertions are achievable: ten ACTIVE Students; no Weak Topic in Class A; a Weak Topic and a Needs Attention/Progress Warning Student in Class B; Class C `INSUFFICIENT_DATA`; expected assessment-history attempts; no second current plan; valid task date/status/completion fields; and overdue/near-due TODO cases at `seedNow`. Check every fixed-ID row that already exists: same-owner altered rows remain unchanged and must still allow the scenario/assertions to hold. Treat missing current-plan/result metrics as absent, not zero. A full fixture rerun means every planned row and key exists, including each ClassMember composite key. Only then validate identity/ownership and preserve live progress without rechecking time-sensitive scenario freshness. If any planned row/key is missing, treat it as partial recovery and rerun the full pre-write scenario overlay before adding anything. Never refresh scores, plan/task states, timestamps, or expired near-due windows.

### Task 2: Add insert-only realistic fixtures

**Files:**
- Modify: `apps/api/prisma/seed.ts`
- Test: `apps/api/test/seed.integration-spec.ts`

**Interfaces:**
- Reuse `MVP_COURSE_ID`, existing Topic IDs, Prisma enums, `SEED_PASSWORD`, and existing seed entry point.

- [x] **Step 1: Add an isolated PostgreSQL integration regression check first**

In `apps/api/test/seed.integration-spec.ts`, use the guarded `TEST_DATABASE_URL` to create a unique temporary schema, deploy migrations to that schema, and spawn the real `tsx prisma/seed.ts` CLI with `DATABASE_URL` scoped to it. Pre-create sentinel demo rows with the correct fixture IDs/foreign-key ownership but custom names, hashes, scores, plan/task states, and due dates. Before the first seed, snapshot all relevant rows. Assert the first run preserves sentinel rows and creates the fixture scenarios; after the second run, assert full snapshots and counts are unchanged. Also test that a mismatched fixed User ID/email causes the seed to abort before any dependent fixture inserts. Drop only this test-created schema in `finally`; never touch the populated development schema.

- [x] **Step 2: Run the new regression check before changing the seed**

Run only the new integration test. Confirm preservation fails because the current seed updates sentinel demo rows (or collision handling fails), not because of database setup or a test error. Confirm the temporary schema is removed after the expected failure.

- [x] **Step 3: Make existing seed writes create-only**

For User, Course, Topic, Class, ClassMember, AssessmentResult, StudyPlan, StudyTask, and Feedback writes, use insert-if-absent semantics (`createMany` with `skipDuplicates` or an upsert with an empty `update`). Remove every seed update that can change existing identity, assignment, score, status, due date, completion time, or feedback. Run the preflight from Task 1 before any insert.

- [x] **Step 4: Add eight stable Student IDs and one stable Teacher ID**

Use `.example.test` emails and the existing `SEED_PASSWORD` hash. Preserve the existing demo Student/Teacher/Admin accounts and the disabled Student unchanged. Add four Students to Class A, two to Class B, and two to Class C; assign Class C to the new Teacher. Keep existing Class teacher assignments and memberships unchanged.

- [x] **Step 5: Add assessment histories on existing MVP Topics**

Capture one `seedNow` instant. For selected new Students, create two to four fixed-ID assessment rows per Topic with evaluatedAt instants several weeks apart. Make Students 3–6 trend mostly upward and strong; Students 7–8 have low latest scores on shared Topics (including Cấu trúc dữ liệu, JavaScript, Database, Testing, and API) so latest-per-Student/Topic class averages fall below 60. Keep at least one new Student without results. Never add AssessmentResult for Students 9–10.

- [x] **Step 6: Add plans and tasks only for new Students**

Create at most one current plan per new Student: ACTIVE plans for Students 3, 4, and 7; COMPLETED plans for Students 5 and 8; an ARCHIVED plan for Student 6; and no plan for Students 9–10. All tasks of a COMPLETED plan must also be COMPLETED. Add fixed-ID tasks with valid plan date bounds, non-null `completedAt` only for COMPLETED tasks, and null `completedAt` for TODO tasks. Student 7 must have at least two overdue TODO tasks, one TODO due within 48 hours, future TODO work, and enough due tasks that `actualProgress < expectedProgress - 20`. Use completed and TODO tasks across other plans to demonstrate progress variation.

- [x] **Step 7: Keep fixture timestamps UTC and document their aging behavior**

Derive new timestamps from the single UTC `seedNow` value (assessment attempts several weeks in the past; overdue tasks in the past; one near-due TODO within 48 hours; other TODO tasks in the future). Because writes are insert-only, subsequent runs preserve the first run's timestamps: near-due items will leave the 48-hour window and future tasks can later become overdue. Do not refresh or rewrite existing fixture timestamps on rerun.

- [x] **Step 8: Run static checks on the seed change**

Run `pnpm --filter @dacn/api exec eslint prisma/seed.ts` and `pnpm --filter @dacn/api typecheck`. Fix only seed-related errors.

### Task 3: Verify preservation, rule scenarios, and idempotency in PostgreSQL

**Files:**
- Test: `apps/api/test/seed.integration-spec.ts`

**Interfaces:**
- Use the seed entry point and read-only Prisma verification queries; do not call reset/truncate/delete operations.

- [x] **Step 1: Run API unit tests before touching the populated development database**

Run `pnpm --filter @dacn/api test`. Confirm existing authentication and student calculation tests remain green.

- [x] **Step 2: Run the seed once**

Run `pnpm --filter @dacn/api db:seed` against the configured development database. The only expected changes are new rows with the planned fixed IDs; every pre-seed content digest must match afterward.

- [x] **Step 3: Verify record counts, constraints, and class scenarios on the initial expansion run**

Query and assert:
- fixture delta of ten ACTIVE Students total including existing Students 1–2, one new Teacher, one new Class, plus all fixed fixture IDs present; do not assert global totals because existing PostgreSQL data is preserved;
- each new AssessmentResult refers to an MVP Course Topic, and each new Student's latest-per-Topic query has the expected history shape; do not require unrelated preexisting rows to satisfy fixture assumptions;
- Class A has no Weak Topic; Class B has at least one Weak Topic, Student 7 is Needs Attention, and Student 7 has Progress Warning by BR-017; Class C has no result or current plan/task and is `INSUFFICIENT_DATA` by OD-33;
- StudyPlan current statuses are unique per Student; task plan/date/status/completedAt constraints hold; overdue and near-due TODO cases exist at `seedNow`;
- every preexisting User, AssessmentResult, StudyPlan, StudyTask, Course, Topic, Class, ClassMember, and Feedback row matches its pre-seed snapshot by key and content.

- [x] **Step 4: Run the seed a second time and verify idempotency**

Run `pnpm --filter @dacn/api db:seed` again. Re-query all row counts and seeded IDs; assert counts and full content digests exactly match the post-first-run snapshot and that no new duplicate email, membership, assessment, plan, task, or feedback row appeared.

- [x] **Step 5: Run baseline and whitespace checks**

Run the applicable root gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:integration`, and `pnpm verify:baseline`, followed by `git diff --check`. The integration runner must use its guarded `TEST_DATABASE_URL`, distinct from the populated development DB. Confirm no baseline file, schema, generated API contract, or unrelated user change was edited.

**Acceptance:** Seed runs twice without deleting or changing existing data; all three class scenarios satisfy the named Business Rules at the seed reference time; account and record counts match the matrix; verification reports the aging limit of relative task timestamps.
