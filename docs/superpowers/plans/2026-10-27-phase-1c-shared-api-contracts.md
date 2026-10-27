# Phase 1C — Shared API Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate deterministic TypeScript transport types from the NestJS OpenAPI representation and make them consumable by `apps/web` without changing API behavior.

**Architecture:** NestJS Swagger metadata produces a committed OpenAPI snapshot. `openapi-typescript` generates only TypeScript types into `packages/contracts`; the API bootstrap used for generation sets a deterministic placeholder JWT secret before dynamically importing `AppModule`, then overrides Prisma before compiling/initializing the test module. `apps/web` declares the workspace dependency and imports generated auth request/response types while retaining its existing HTTP client and runtime behavior.

**Tech Stack:** pnpm workspace, NestJS Swagger, `@nestjs/testing`, `openapi-typescript@7.13.0`, TypeScript.

**Spec:** `docs/decisions/ADR-CONTRACT-001 — OpenAPI-Generated Shared API Contracts.md`; `docs/baseline/API_Specification_v1.4_baseline_final.md`; `docs/baseline/System_Architecture_and_Technology_Stack_v1.0_baseline.md`; `docs/decisions/ADR_AUTH_001_Authentication_Architecture_Decision_v1.0_accepted.md`.

## Global Constraints

- API Specification v1.4 remains the contract authority; do not edit frozen baseline files.
- Preserve `/api/v1`, auth routes, request/response semantics, HTTP statuses, and auth behavior.
- Contract package contains transport types only; no Prisma, business logic, secrets, HTTP client, or frontend hooks.
- Generation must be deterministic and independent of live DB, AI Runtime, and external business services.
- Generated TypeScript is committed and never hand-edited; `contracts:check` must detect stale output.

## Review Focus

- Register the named `bearerAuth` HTTP Bearer scheme in `DocumentBuilder`; public login must have no operation security, while `/me` and logout reference `bearerAuth`.
- Logout remains HTTP 204 with no response body.
- Generation must not invoke Prisma `$connect` or require a running database.
- OpenAPI must document login's common `400 VALIDATION_ERROR`, `/me` response, and auth error schemas; `details` must allow the validation filter's array of strings as well as baseline null/object/array forms.
- OpenAPI must preserve required login fields plus role/status enum values.
- Generated types must be consumed in web auth without hand-written request/response/enum duplicates.
- The existing `/health` infrastructure route is not in the API endpoint inventory and must not be emitted as a business contract.

---

### Task 1: Describe the implemented baseline auth API in OpenAPI

**Files:** `apps/api/src/auth/auth.controller.ts`, auth DTO/response DTO files, `apps/api/src/health.controller.ts`, `apps/api/src/main.ts`, `apps/api/src/openapi.ts`, API contract test.

- [x] Add Swagger request/response/error schema metadata matching API-COM-AUTH-001/002 and API-COM-PROFILE-001; document login's inherited `400 VALIDATION_ERROR` and allow validation `string[]` details alongside baseline null/object/array forms.
- [x] Exclude the technical health controller from generated API documentation without changing its runtime route.
- [x] Register `bearerAuth` as HTTP Bearer in `DocumentBuilder`, and use the same security name on protected operations.
- [x] Keep OpenAPI document construction in `apps/api/src/openapi.ts` so dev Swagger, generation, and the contract assertion share one scheme/configuration.
- [x] Add a contract assertion for security scheme and operation security, login required fields/role and status enums, `/me` response, common auth error response bodies/statuses, logout 204 with no body, and absence of `/api/v1/health`; configure the real global `ValidationPipe` and `ApiExceptionFilter`, POST invalid login input, and assert `400 VALIDATION_ERROR` with string-array details.

### Task 2: Add deterministic OpenAPI generation and transport types

**Files:** `apps/api/scripts/generate-openapi.ts`, `apps/api/package.json`, `apps/web/package.json`, `packages/contracts/package.json`, `packages/contracts/tsconfig.json`, `packages/contracts/src/index.ts`, `packages/contracts/src/generated/openapi.ts`, `packages/contracts/openapi.json`, root workspace/package scripts, root `scripts/contracts.mjs`, `README.md`, lockfile.

- [x] Set a fixed placeholder JWT secret before dynamically importing `AppModule`; compile the Nest testing module with `PrismaService` overridden before app initialization so `$connect` cannot run.
- [x] Add `packages/*` to pnpm workspace and pin `openapi-typescript@7.13.0`.
- [x] Implement root `contracts:generate` and non-mutating `contracts:check`; compare fresh OpenAPI and generated types byte-for-byte against committed artifacts.
- [x] Generate and commit OpenAPI JSON and TypeScript output; keep the public index as type-only re-exports.
- [x] Document both commands, when to regenerate after DTO/Swagger changes, and that `contracts:check` detects generation drift but not baseline conformance.

### Task 3: Consume generated auth types in the frontend

**Files:** `apps/web/app/auth/api.ts`, `apps/web/app/auth/auth-context.tsx`, and relevant auth tests.

- [x] Replace handwritten user, login request, and login response transport shapes with aliases/indexed types from `@dacn/contracts`.
- [x] Keep HTTP client, token handling, and API behavior in `apps/web`; verify type errors catch generated contract incompatibilities.

### Task 4: Verify workspace integration

- [x] Run `pnpm contracts:generate` twice and confirm no diff after the first generation.
- [x] Run `pnpm contracts:check`, root lint/typecheck/test/build, `pnpm test:integration`, and `pnpm verify:baseline` after all contract fixes.
- [x] Temporarily make a committed generated artifact stale, confirm `pnpm contracts:check` exits nonzero, restore it, and confirm the worktree has no test-only artifact diff.
- [x] Confirm generation runs without a live database and no baseline files changed.
