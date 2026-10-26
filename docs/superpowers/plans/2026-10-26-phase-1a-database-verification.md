# Phase 1A Database Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the existing Database Foundation enforces the frozen temporary-context invariant and can be built from an empty database.

**Architecture:** Audit the existing Prisma schema, migration, and seed against all 13 tables and DB-DD decisions. Repair only demonstrated gaps; add a PostgreSQL integration assertion for the raw SQL context constraints, then rerun repository gates.

**Tech Stack:** Prisma 6, PostgreSQL 16, Jest, pnpm.

**Spec:** `docs/baseline/Database_Design_v1.0_baseline_final.md` (DB-DD-004, 006, 007, 009 and §7.13).

## Global Constraints

- Do not modify `docs/baseline/`.
- `temporary_contexts` consumed rows require `consumed_at`, `replay_result`, and retention of at least ten minutes.
- Keep migration and seed idempotent on their existing contract.
- The named `System_Architecture_and_Technology_Stack_v1.0_baseline.md` is absent; apply available higher-authority baseline sources and report that missing input.

## Review Focus

- An OPEN context with replay data must be rejected by PostgreSQL.
- A CONSUMED context with retention shorter than ten minutes must be rejected.

---

### Task 1: Audit the existing database foundation

**Files:**
- Read: `docs/baseline/Database_Design_v1.0_baseline_final.md`
- Read: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261026000000_init/migration.sql`, `apps/api/prisma/seed.ts`

**Interfaces:**
- Consumes: the 13 tables and DB-DD-001 through DB-DD-009 in Database Design.
- Produces: a table-by-table comparison of columns, relations, indexes, constraints, and seed data; any demonstrated gap gets a focused plan revision before code changes.

- [x] Compare all 13 table definitions and DB-DD decisions against the schema and migration.
- [x] Compare seed coverage against Database Design §17 and SRS seed requirements.
- [ ] If any mismatch exists, revise this plan and rerun Plan Review Gate before implementation.

### Task 2: Exercise temporary-context constraints

**Files:**
- Modify: `apps/api/test/database.integration-spec.ts`

**Interfaces:**
- Consumes: `PrismaClient.temporaryContext` and existing migration constraints.
- Produces: Jest assertions against invalid writes, with test records cleaned up.

- [x] Add a Jest integration test using owner `90000000-0000-4000-8000-000000000008`, unique context IDs, `STUDY_PLAN_PREVIEW`, `student:<ownerId>`, `{}` payload, and fixed UTC timestamps. Assert an OPEN row with non-null `replayResult` rejects on `ck_temporary_contexts_status_replay`. Assert a CONSUMED row with `consumedAt`, `{}` replay result, and `retentionUntil` nine minutes after consume rejects on `ck_temporary_contexts_retention`. Clean up contexts and owner in `finally`.
- [x] Run `pnpm test:integration` and confirm the test passes.
- [x] Run `pnpm verify:baseline`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

### Task 3: Fresh database proof

**Files:** None.

**Interfaces:**
- Consumes: `pnpm db:migrate`, `pnpm db:seed`.
- Produces: migration and seed verification on a disposable database.

- [x] Create a disposable empty PostgreSQL database, migrate and seed it, check representative row counts, and remove it.
