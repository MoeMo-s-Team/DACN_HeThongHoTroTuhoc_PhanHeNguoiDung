# Phase 0 Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap local development for the approved web/API/PostgreSQL stack without adding business or AI features.

**Architecture:** pnpm workspace with Turborepo; PostgreSQL runs in Compose with a persistent volume; Next.js and NestJS run on the host. NestJS owns Prisma access; the Prisma schema and SQL migration reproduce the frozen database design.

**Tech Stack:** pnpm, Turborepo, Next.js, Tailwind, TanStack Query, React Hook Form, NestJS, Prisma, PostgreSQL, Jest, Vitest/Testing Library, Playwright.

**Spec:** `AGENTS.md`; `.agents/skills/dacn-development-workflow/SKILL.md`; `docs/baseline/Database_Design_v1.0_baseline_final.md`; `docs/decisions/ADR_AUTH_001_Authentication_Architecture_Decision_v1.0_accepted.md`.

## Global Constraints

- Keep `docs/baseline/` and `BASELINE_MANIFEST.sha256` unchanged.
- Use `/api/v1`; web calls NestJS, and neither web nor AI runtime accesses PostgreSQL directly.
- Keep business/API/database semantics as frozen; no business or AI feature in Phase 0.
- PostgreSQL runs in Docker Compose with persistent storage and healthcheck; apps run on the host.
- Assessment scores must persist as unbounded PostgreSQL `numeric`.

## Review Focus

- Bootstrap config must not publish secrets into frontend bundles: only the API base URL is public.
- Fresh migration must include all 13 baseline tables, 9 enums, CHECK constraints, and partial unique current-plan index.
- Seed must hash passwords and be rerunnable without logging credentials or hashes.
- Compose startup and root scripts must work from a clean checkout using documented env defaults.

## Files and Tasks

### Task 1: Workspace and local PostgreSQL

**Files:** root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.env.example`, `docker-compose.yml`, package manager lockfile.

- [x] Configure root scripts for dev/build/lint/typecheck/test and db up/down/migrate/seed; workspace packages are `apps/*`.
- [x] Define PostgreSQL service with named volume, env file, port, and `pg_isready` healthcheck.
- [x] Install and lock root tooling.

### Task 2: API and database

**Files:** `apps/api/**`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/**`, seed, Jest config.

- [x] Add Nest bootstrap, validated config, `/api/v1/health`, global DTO validation, Swagger, and Prisma lifecycle service.
- [x] Add the complete baseline Prisma schema; create migration and preserve all documented SQL-only constraints/indexes.
- [x] Seed baseline-shaped demo data with Argon2id hashes and upserts.
- [x] Add a minimal Jest health/controller test.

### Task 3: Web and test scaffolding

**Files:** `apps/web/**`, Playwright config and smoke spec.

- [x] Add minimal Next app with Tailwind, TanStack Query provider, React Hook Form dependency, and public API URL config.
- [x] Add Vitest/Testing Library smoke test and Playwright smoke configuration/spec.

### Task 4: Verification

- [x] Run requested Docker/database commands and root lint/typecheck/test/build gates.
- [x] Confirm PostgreSQL reports healthy and migration/seed succeed.
