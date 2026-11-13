# GPU Benchmark Preparation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare an evidence-bound GPU benchmark workflow that can first run the official 24-topic Student Generation fixture and then the complete three-task Student suite, without changing production behavior.

**Architecture:** Add optional task/fixture selectors to the existing benchmark runner while preserving its default full-suite behavior and validation path. Document the exact GPU-host setup, immutable runtime checks, staged benchmark gates, and fail-closed activation steps. Keep E2E data in a unique schema under the separately guarded test PostgreSQL endpoint; do not alter existing databases.

**Tech Stack:** TypeScript, Jest, pnpm, Docker Compose, Ollama, FastAPI, PostgreSQL.

**Spec:** `docs/baseline/AI_Contract_v1.0_baseline_final.md` §§15.4, 17; `docs/implementation/releases/CR-005/AI_Contract_Runtime_Portability_Supplement_v1.0_approved.md` §§4-5; `docs/implementation/releases/CR-005/Change_Request_CR-005_v1.0_approved.md`.

## Global Constraints

- Keep each external attempt at 60 seconds; do not add inference retries.
- Preserve production API, model manifest, prompt versions, schemas, full inputs, fixtures, validator, and preflight.
- GPU evidence is specific to the exact model digest, Ollama/runtime versions, source, options, tokenizer/estimator, prompts, fixtures, and hardware.
- Run `Generation boundary-02` alone first; only if its one-off smoke passes proceed to all 20 fixtures per each of the three Student tasks.
- A one-off smoke and the three-task run are triage/partial-scope evidence, not capacity certification. Dispatch activation requires all six task keys, the complete §17 and §15.4 evidence, passing preflight tests, and owner approval.
- Never change production inference behavior, reset a database, or delete existing database data.

## Review Focus

- Unknown task/fixture, duplicate arguments, or `--fixture` without `--task` must fail before dispatch; cover with unit tests.
- Existing no-argument benchmark invocation must still select all 60 fixtures; cover with a unit test.
- E2E must use a PostgreSQL host/port/database identity distinct from development (ignore schema when comparing); then use a fresh unique schema inside that dedicated test database.
- Decimal persistence must not be described as mathematically exact by `DOUBLE PRECISION`; clarify value semantics in TP-001.
- Missing GPU hardware/runtime access must remain an explicit blocker; no profile or certification is inferred.
- Ollama timing/token diagnostics and human rubric scores must be clearly separated from actual FastAPI benchmark outcomes and capacity certification.

### Task 1: Select a staged benchmark subset

**Files:** Modify `apps/api/scripts/benchmark-student-ai.ts`; test `apps/api/src/ai/student-ai-benchmark.fixtures.spec.ts` (or a narrow runner-selection spec if module boundaries require it).

- [x] Add a pure selector that accepts optional `--task <StudentTaskKey>` and `--fixture <fixtureId>` arguments, defaults to all three Student tasks and all 20 official fixtures, and rejects duplicate/unknown arguments, unknown values, and `--fixture` without `--task` before any network request.
- [x] Mark single-fixture output `TRIAGE_ONLY`; it must not be represented as a capacity profile or PASS for the task.
- [x] Test default selection, Generation `boundary-02` selection (24 topics), all invalid selector forms, and the triage-only status.
- [x] Run the focused Jest test and confirm the full-suite default remains unchanged.

### Task 2: Prepare GPU runbook and TP-001 precision decision

**Files:** Create `apps/api/benchmarks/student-ai/GPU-PROFILE-RUNBOOK.md`; update the DRAFT `docs/proposals/technical/TP-001-study-plan-available-minutes-precision.md` only.

- [x] Document same-source/model-digest startup, GPU verification, single Generation boundary smoke, then full 20-per-task benchmark for the three Student tasks. Include the separate six-task §17 release gate, verified tokenizer/conservative estimator, near-budget capacity fixtures, Nest preflight tests, and explicit owner approval before enabling a profile.
- [x] Explain how to capture Ollama `load_duration`, `prompt_eval_count`/duration, and `eval_count`/duration as direct-runtime diagnostics without treating them as FastAPI acceptance results; identify a local human rubric sheet for five-dimension Vietnamese scores and hard-boundary review. Do not change production responses/logging.
- [x] Explain `DOUBLE PRECISION` versus unconstrained `NUMERIC` under the current JavaScript `number` API semantics; keep TP-001 pending owner review and do not edit Prisma schema or migrations.
- [x] Check both docs for frozen-baseline edits and unsupported certification claims.

### Task 3: Verify E2E in an isolated test schema

**Files:** No product code changes; diagnostics and an isolated test database only.

- [x] Confirm `TEST_DATABASE_URL` host/port/database identity differs from development when schema is ignored; print only sanitized identities, never credentials.
- [x] Run E2E using a new unique schema on the configured test PostgreSQL database, preserving all pre-existing schemas and rows.
- [x] If setup or E2E fails, diagnose and report the exact failure without changing production code or repairing seed conflicts by overwriting/deleting existing data.

### Task 4: Verify and report

- [x] Run benchmark selector tests, relevant API unit tests, E2E in the unique schema, and `pnpm verify:baseline`.
- [x] Record whether a discrete GPU was available; if unavailable, mark GPU smoke/full benchmark NOT RUN and list exact activation gates.
- [x] Do not change production configuration, set capacity certification, open preflight, or commit. Do not claim activation readiness from the partial Student benchmark.
