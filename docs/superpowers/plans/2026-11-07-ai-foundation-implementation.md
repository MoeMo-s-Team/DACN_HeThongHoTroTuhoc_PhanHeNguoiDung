# Phase 2B — AI Foundation Implementation Plan

**Status:** Task 1 PASS for contract and authority reconciliation after the approved R3 alignment. The R3 freeze, official 12-entry manifest, unchanged authorities and AI Contract v1.0 are present and source-hash verified. Fresh read-only Plan Review Gate approved this revision on 2026-11-07. Runtime portability, Task 5 log-write failure behavior, and dispatch-enabled capacity profiles remain separately blocked; plan approval does not authorize implementation.
**Design:** [AI Foundation Design](../specs/2026-11-07-ai-foundation-design.md)
**Scope:** Shared AI foundation, then Student StudyPlan generation preview and confirmed apply. No other role workflow in this plan.

## Gate before code

Do not start code until the user authorizes implementation. The approved R3 freeze governs this checkout; root/backend instructions, active R3 baselines, the official 12-entry manifest and AI Contract v1.0 are aligned. Public errors follow API v1.5, including `AI_RUNTIME_FAILURE` and `AI_INPUT_TOO_LARGE`. CR-005 and ADR-AI-001 remain unreleased; Task 5 also awaits terminal-log persistence failure policy. Never use Drafts as authority or fabricate a capacity profile.

## Work order and dependencies

Each task is one reviewable implementation slice. Use TDD for behavior: add the focused failing test, implement the smallest change, then rerun it. Do not add tests from this plan or modify code during Phase 2B itself; those belong to approved execution of these tasks.

### Task 1 — Close the contract and runtime authority gate (**current result: PASS; runtime sub-gates remain open**)

**Depends on:** none. This gate must pass before Tasks 2–11. CR-005/ADR approval is an additional gate for Tasks 7–11 and any runtime deployment change.

- **1.1 Inventory:** compare recovery copies with official release paths in Git history; record frozen baseline and source release commits. Keep recovery files non-authoritative.
- **1.2 Verify versions and provenance:** compare Contract hash to the schema release validation record; verify Schema Pack, Erratum 1, CR-003, Erratum 2 and CR-004 against official `SHA256SUMS`/sidecars. Record governance-index and Phase 1D.3 supplement checksum limitations.
- **1.3 Reconcile all six keys:** bind each exact key to its Release 1 input/output schema pair and orchestration count.
- **1.4 Reconcile envelopes:** record request/success/error fields, the request's lack of `promptVersion`, correlation tuple, token header, 60-second timeout and no-retry rule.
- **1.5 Reconcile Errata E5/E6:** record runtime-vs-Nest behavior, HTTP/envelope, public/internal mapping, terminal log requirement and separate malformed-HTTP/empty-body cases.
- **1.6 Reconcile governance:** record CR-003/004 and Phase 1D.3 approval sources; record CR-005 as Draft/formal release pending, ADR-AI-001 pending CR-005, frozen Colab authority and CPU profile absence.
- **1.7 Resolve authority set:** use the approved R3 freeze adopted for this checkout. Confirm root/backend instructions, the official 12-entry manifest, active R3 baselines and AI Contract v1.0 agree; do not infer authority from recovery copies.
- **1.8 Publish report:** record verified sources, applied R3 alignment hashes, mappings, limitations, allowed task boundary and remaining blockers.

**Acceptance:** PASS only when (a) primary Contract/Schema Pack/Errata/CR-003/004 sources and release checksums reconcile; (b) all six key/schema pairs and E5/E6 outcomes resolve to those sources; and (c) the approved R3 authority set is aligned across release files, manifest and instructions. The recovery governance-index copy's unsigned hash does not replace primary release records. CR-005/ADR approval remains an additional prerequisite for local runtime work.

### Task 2 — Add NestJS AI configuration and module shell

**Depends on:** Task 1 PASS, current plan review approval and human implementation authorization. **Files:** `apps/api/src/ai/ai.module.ts`, `apps/api/src/ai/ai.config.ts`, `apps/api/src/app.module.ts`, `.env.example`, `apps/api/src/ai/ai.config.spec.ts`.

- Consume official `AI_RUNTIME_BASE_URL` and `AI_RUNTIME_TOKEN` settings. Record missing/malformed AI settings as unavailable without failing Nest startup; keep secrets server-only and the attempt timeout fixed at 60 seconds.
- Add an inert `AiModule` importing existing config/Prisma modules. Do not add a controller, outbound transport, Ollama setting or callable dispatch path in this task. The frozen Colab requirement remains until CR-005 release.

**TDD steps:** (a) add config unit test proving valid settings load; (b) add missing/malformed URL/secret cases and assert they mark AI unavailable without throwing out of Nest app initialization; (c) assert failure messages omit secret values; (d) test the 60-second attempt constant cannot silently drift. Implement only after Task 1 PASS.

**Tests:** `pnpm --filter @dacn/api test -- ai.config.spec.ts`.

**Acceptance:** module/config tests pass; missing/malformed config marks AI unavailable without printing secret values; no network call can be issued by this shell; NestJS and non-AI routes still work.

### Task 3 — Import Release 1 schemas and validate outputs in NestJS

**Depends on:** Task 1 PASS and Task 2. **Files:** `apps/api/package.json`, `pnpm-lock.yaml`, `apps/api/src/ai/ai-task.registry.ts`, `apps/api/src/ai/ai-output.validator.ts`, `apps/api/src/ai/schemas/release1/*.schema.json` (15 files), `apps/api/src/ai/__fixtures__/release1/` (released valid/invalid fixtures used by tests), `apps/api/src/ai/ai-task.registry.spec.ts`, `apps/api/src/ai/ai-output.validator.spec.ts`, `apps/api/scripts/copy-ai-schemas.mjs`.

- Retrieve the release source from historical commit `e9a44818c077faf7b7809ac9e4efa3280ba88ed4`, never from Candidate 1. Verify `AI_Contract_v1.0_schema_pack_release1.zip` against its official sidecar and `SHA256SUMS`, run ZIP integrity/inventory checks, then extract its exact 15 schema bytes to `apps/api/src/ai/schemas/release1/`. Copy only the official release fixtures needed by tests from that same commit to `apps/api/src/ai/__fixtures__/release1/`; verify copied bytes against the release `SHA256SUMS` before use.
- Add direct API dependencies `ajv@^8.20.0` and `ajv-formats@^3.0.1` with `pnpm --filter @dacn/api add ajv@^8.20.0 ajv-formats@^3.0.1`; update the importer and lockfile. Do not commit as part of this task. Use `Ajv2020` from `ajv/dist/2020` and `ajv-formats` per AI-DD-004.
- Load schema assets by path from `__dirname`; add a Node standard-library copy script that copies `src/ai/schemas/release1/*.json` to `dist/src/ai/schemas/release1/` after `tsc` in the API build script. Keep test-time lookup and compiled lookup on the same relative asset path; do not depend on `resolveJsonModule` embedding or a source-only working-directory path.
- Register exactly the six released task keys and no aliases. Bind each to its official input/output schema, semantic validator and version metadata.
- Validate parsed structure, required fields, types/enums, numeric/string/array bounds, IDs/references and task-specific business invariants in NestJS. Runtime validation is defense in depth.
- Reuse installed validation packages when sufficient; add no dependency without a demonstrated gap and review.

**TDD steps:** (a) verify official release hashes/inventory before adding schema files; (b) add failing tests for all six exact registry bindings, Ajv2020 configuration, E6 Nest rejection, and compiled schema asset presence; (c) run focused tests and confirm they fail on missing registry/assets/dependency; (d) add Ajv/format dependencies and lockfile entries, then implement registry/validator/loader and the schema-copy build script; (e) test official fixtures for required/type/enum/bounds constraints plus semantic IDs/metrics and one valid result; (f) run API build and assert the 15 exact schema assets exist at `dist/src/ai/schemas/release1/`; (g) confirm no replacement schema or invented capacity bound was added. E5 belongs to FastAPI/Gateway tests in Tasks 6/7, not this validator.

**Tests:** `pnpm --filter @dacn/api test -- ai-task.registry.spec.ts ai-output.validator.spec.ts`; `pnpm --filter @dacn/api build` plus a schema asset presence/hash assertion.

**Acceptance:** every official task resolves to its released schema and validator; invalid output cannot reach any save/apply path.

### Task 4A — Keep invocation fail-closed when no profile is released

**Depends on:** Tasks 1–3. **Files:** `apps/api/src/ai/ai-capacity-preflight.ts`, `apps/api/src/ai/ai-capacity-preflight.spec.ts`. No profile/config artifact is created in this task.

- Implement only the absent-profile branch: when no approved profile exists, fail closed before transport and log creation with existing `AI_RUNTIME_FAILURE` semantics.
- Do not add profile values, tokenizer estimates, at-limit/over-limit cases, or an enabled dispatch path in this task.

**TDD steps:** (a) add a failing test with no released profile configured; (b) assert request returns the approved `AI_RUNTIME_FAILURE`; (c) assert zero HTTP dispatches and zero `AIRequestLog` writes; (d) assert app startup and non-AI routes remain unaffected. No profile fixture is created.

**Tests:** `pnpm --filter @dacn/api test -- ai-capacity-preflight.spec.ts`.

**Acceptance:** absence of an approved profile always rejects before dispatch/logging; no profile or estimator value is guessed. This task does not enable inference.

### Task 4B — Add profile-bound estimator only after capacity release (**blocked**)

**Depends on:** Task 4A and an approved benchmarked capacity profile for the target deployment. **Files:** `apps/api/src/ai/ai-capacity-profile.ts`, `apps/api/src/ai/ai-capacity-estimator.ts`, matching specs, and the authority-released profile file at its approved deployment path.

- Parse and bind the released profile to contract/model/tokenizer/context window/safety margin and per-task prompt/schema overhead/reserved output. Estimate the complete serialized input with the profile's declared tokenizer/template.
- Reject missing/malformed/mismatched profile or estimator failure with `AI_RUNTIME_FAILURE`; reject valid-profile over-budget input with `AI_INPUT_TOO_LARGE`. Preserve complete input; never trim/sample/chunk/split/fallback.

**TDD steps after the real profile is released:** (a) verify profile artifact checksum and binding; (b) fail on each wrong binding/tokenizer failure; (c) test complete payload at the released budget boundary; (d) test over-budget rejection and exact public mapping; (e) assert both reject before dispatch/log and accepted payload is unchanged. Do not substitute synthetic token/budget values.

**Tests:** `pnpm --filter @dacn/api test -- ai-capacity`.

**Acceptance:** per-task estimator and preflight pass using only the approved profile and full authoritative inputs. Until then Task 4B remains blocked and no application dispatch is enabled.

### Task 5 — Implement terminal AIRequestLog lifecycle and public error mapping (**implementation blocked on persistence-failure disposition**)

**Depends on:** Tasks 1–3. **Files:** `apps/api/src/ai/ai-request-log.service.ts`, `apps/api/src/ai/ai-errors.ts`, matching unit specs, and `apps/api/src/ai/ai.module.ts`.

- Reuse the current Prisma model; no migration unless Task 1 authority proves it necessary.
- Map timeout, connection/unavailable, empty, invalid JSON/schema, incomplete StudyPlan task content (`502 AI_INCOMPLETE_DATA`) and other technical errors to the exact released public status/code/message catalog. `AI_INCOMPLETE_DATA` is distinct from empty transport output and invalid schema. Preserve internal categories only for safe operational diagnostics.
- Use only the six exact task keys as `AIRequestLog.feature`. Capture `attemptStartedAt` immediately before dispatch; dispatch begins the attempt. Store `createdAt=attemptStartedAt` and elapsed monotonic `durationMs` when available.
- Persist only terminal `SUCCESS` or `FAILED` rows after the attempt outcome is classified; the Prisma enum has no `PENDING`. Create zero rows for validation, eligibility or preflight rejection. Keep DB writes in short operations; never hold a transaction across inference. Do not create a provisional row or invent a write-ahead state.
- The baseline requires a log for each actual external attempt but does not specify recovery if the terminal insert fails after dispatch. Do not claim a preflight DB check guarantees later persistence. Resolve the failure response/operational disposition under approved governance before implementing Task 5.

**TDD steps:** (a) test no row for validation, eligibility and capacity rejection; (b) test every persisted row has terminal status and no path writes `PENDING`; (c) test the six exact `feature` keys and reject unknown task keys; (d) test `createdAt` uses `attemptStartedAt` and `durationMs` uses elapsed monotonic time; (e) test success writes one terminal `SUCCESS` after validation; (f) test connection, timeout, E5, E6/schema and other post-dispatch failures write one terminal `FAILED` with the approved internal code; (g) simulate terminal insert failure and assert no success context/business success and no inference retry, then apply only the separately approved response behavior; (h) assert prompt/output/secret redaction. No network call occurs in this unit task; Task 6 owns the no-transaction-across-inference integration assertion. Step (g) and Task 5 acceptance remain blocked until the failure disposition is approved.

**Tests:** `pnpm --filter @dacn/api test -- ai-request-log.service.spec.ts ai-errors.spec.ts`.

**Acceptance:** every successfully persisted attempt has exactly one terminal row; no pre-dispatch row, no `PENDING`, and no transaction spans inference. Task 5 cannot close until approved behavior for terminal-write failure satisfies AI-REQ-018 without adding an unauthorized status or long transaction.

### Task 6 — Implement the NestJS AiGateway transport

**Depends on:** Tasks 2–5, Task 4B, and approved terminal-log persistence-failure disposition. **Files:** `apps/api/src/ai/ai.gateway.ts`, `apps/api/src/ai/ai.service.ts`, their specs and module wiring.

- Send only the released v1.0 envelope to configured FastAPI `/v1/infer`; propagate correlation per contract; no business logic in gateway.
- Enforce a hard 60-second deadline per actual external attempt, no automatic retry, and exact error translation. Capture attempt timestamp immediately before dispatch. Validate the runtime envelope before task-schema/semantic validation.
- Run capacity preflight before any dispatch/log creation; call the logging lifecycle for dispatched attempts only.

**TDD steps:** (a) assert official request envelope/correlation and no extra fields; (b) test one outbound request only, attempt timestamp capture and 60-second deadline; (c) assert missing/mismatched/overbudget profile makes zero requests and zero logs; (d) test connection, timeout, runtime status, malformed HTTP JSON, empty body and correlation mismatch independently; (e) test official E5/E6 response cases separately from malformed HTTP protocol; (f) assert Nest schema/semantic failure after dispatch produces the released mapping and failed log; (g) hold a fake inference open and assert no DB transaction spans the network call. Use public statuses/codes from active API v1.5 and internal mappings from the verified AI Contract/Errata.

**Tests:** `pnpm --filter @dacn/api test -- ai.gateway.spec.ts ai.service.spec.ts`.

**Acceptance:** every dispatch has at most one outbound request, at most 60 seconds, and valid output still must pass Nest validator.

### Task 7 — Build FastAPI `/v1/infer` adapter and Ollama profiles

**Depends on:** Tasks 1 and 3 plus formal CR-005/ADR-AI-001 release. Cannot proceed as the application runtime while frozen SRS v1.6 still requires Colab. **Files:** `ai/app/main.py`, `ai/app/config.py`, `ai/app/tasks/registry.py`, `ai/app/engine/ollama.py`, `ai/app/schemas/release1/*.schema.json` (15 files), `ai/tests/`, `ai/pyproject.toml` (or existing approved Python dependency manifest), `ai/Dockerfile`, `ai/compose.yaml` or existing deployment file, `.env.example`, `ai/AGENTS.md`.

- Implement the released envelope and correlation behavior; allowlist exactly six registered tasks and official schemas. Return contract-defined errors without prompt repair or hidden retries. For E5/E6, preserve separate model-generation failure, parsed-object pass-through, malformed HTTP request and empty HTTP response behavior exactly as official sources specify.
- Retrieve the same official archive from commit `e9a44818c077faf7b7809ac9e4efa3280ba88ed4`; verify official sidecar/`SHA256SUMS`, extract the exact 15 schema files to `ai/app/schemas/release1/`, and configure the Docker image to copy that path. Add a test comparing every runtime schema byte-for-byte with `apps/api/src/ai/schemas/release1/` so the two copies cannot drift.
- Update `ai/AGENTS.md` §5 for the approved Erratum 2 E6 exception: Runtime may transport a parsed object unchanged; NestJS remains authoritative for task-schema and semantic acceptance.
- Configure Ollama with CPU-local default and explicit optional GPU profile. Pin model digest/revision and relevant context/quantization/runtime settings in deployment configuration. Do not silently fallback across profiles/models. A profile without released capacity evidence can be installed/tested but must not enable application dispatch; do not add a fabricated capacity JSON.
- Expose liveness/readiness; readiness requires the configured model/profile to be available. Keep FastAPI/Ollama off the browser network path and give runtime no DB credentials or database dependency.

**TDD steps:** (a) test official envelope/auth/correlation; (b) register and test each official task/schema; (c) test runtime generation text cases E5/E6 as separate parametrized cases; (d) test valid object pass-through unchanged even when Nest later rejects task schema; (e) test malformed HTTP request/response handling separately; (f) test model unavailable, no hidden retry/repair, and CPU/GPU profile selection without claiming capacity. `cd ai && python -m pytest`.

**Acceptance:** only after the CR-005/ADR gate passes: FastAPI and Ollama start from a clean documented setup, contract tests pass, and runtime has no DB access. This proves installability, not capacity; application dispatch remains denied without a matching profile.

### Task 8 — Implement Student StudyPlan generation preview API

**Depends on:** Tasks 3–6, Task 7 and its CR-005/ADR-AI-001 gate, plus Task 5 persistence-failure disposition. **Files:** `apps/api/src/student/study-plan-generation.controller.ts`, `study-plan-generation.service.ts`, DTO files, `apps/api/src/student/student.module.ts`, unit/controller specs, OpenAPI source/contract outputs.

- Implement frozen `POST /api/v1/student/study-plans/generate` and `GET /api/v1/student/study-plans/current` semantics from API Spec and approved schemas. Reuse existing `StudyContextService` validation and dashboard/assessment data access where applicable; current-plan read supports saved result after apply/reload.
- Check active Student identity, owned data, generation eligibility and required source data before calling AI. Prepare minimized canonical input and exact capacity estimate. Validate returned candidate in NestJS; if tasks are missing/empty or all rejected, return frozen `502 AI_INCOMPLETE_DATA` and create no preview. Create owner-bound, expiring `TemporaryContext` preview only after validation.
- Keep backend authoritative for scores, counts, topic IDs, dates, weekly minutes, plan/task bounds and existing eligibility rules. Return candidate preview, not persisted `StudyPlan`/`StudyTask`.

**TDD steps:** (a) fail-first route/DTO/auth contract tests against API v1.5; (b) fail-first insufficient-data and business-ineligible cases assert zero runtime calls and zero logs; (c) valid eligible input asserts one preflight-approved dispatch and one terminal log; (d) separate empty transport, official E5/E6 generated-text failure, invalid task schema and incomplete-task output; (e) success creates only owner-bound preview context, not business plan/tasks; (f) current-plan GET returns active plan/tasks or exact frozen empty response. Assert envelope/error behavior from API v1.5, AI Contract v1.0 and approved Errata.

**Tests:** `pnpm --filter @dacn/api test -- study-plan-generation`.

**Acceptance:** endpoint and DTO match frozen API exactly; successful call yields preview reference; no StudyPlan/StudyTask row is written before explicit apply.

### Task 9 — Implement explicit StudyPlan apply with atomic context consumption

**Depends on:** Task 8. **Files:** `apps/api/src/student/study-plan-apply.controller.ts`, `study-plan-apply.service.ts`, DTOs/specs; reuse current TemporaryContext schema and database invariants.

- Implement frozen `POST /api/v1/student/study-plans/apply`. Bind reference to user, resource, type and expiry; claim/consume/replay plus plan/task creation must be atomic. In the same transaction as archive/create, update `requestFingerprint`, `replayResult`, `status=CONSUMED`, `consumedAt`, and `retentionUntil` in one SQL/ORM statement. Keep the transaction short and local; no AI call in it.
- Preserve behavior for expired, consumed, mismatched, duplicate/replayed references as specified by API/Business Rules. Recalculate any authoritative facts in Nest, rather than trusting client/model values.

**TDD steps:** (a) fail-first wrong owner/type/resource and expired-reference rejection; (b) first successful apply asserts plan plus all valid tasks and consumed context; (c) assert one final context update statement writes all five replay fields and satisfies the DB check; (d) induce any create failure and assert complete rollback; (e) race two consumes and assert one business mutation; (f) replay identical fingerprint returns the same logical result, while a changed fingerprint returns frozen conflict with no duplicate mutation.

**Tests:** PostgreSQL integration cases using explicit isolated `TEST_DATABASE_URL`; `pnpm test:integration`.

**Acceptance:** only a validated preview with explicit Student confirmation can persist; all claim/mutation/consume/replay cases are atomic and stable.

### Task 10 — Connect the existing Student UI to preview and apply

**Depends on:** Tasks 8–9. **Files:** `apps/web/app/sinh-vien/ke-hoach-hoc-tap/study-plan-handoff.tsx`, new focused preview component if needed, UI tests, `apps/web/e2e/student-study-plan.spec.ts`, generated `packages/contracts/src/generated/` only through the existing contract generator.

- Replace the existing placeholder with API-backed generate, preview and explicit-confirm/apply states. Reuse existing goal draft; use shared API client and generated contract types. The frontend must never call FastAPI/Ollama directly.
- Implement loading, validation/eligibility, capacity, runtime failure, incomplete AI data, expired preview, successful application and retry-by-user states; do not auto-retry. Frontend/proxy deadlines must exceed full backend orchestration time; 60 seconds applies per runtime attempt, not the whole request (API-DD-003).

**TDD steps:** (a) test no-draft and goal-draft states; (b) test loading and no automatic repeat; (c) test preview rendering only after valid API result; (d) test explicit confirm calls apply and reject never calls apply; (e) test all frozen error states including incomplete AI data and capacity/runtime unavailability; (f) test current-plan fetch after reload; (g) E2E asserts no plan before confirm and one plan/task set after confirm; (h) assert client/proxy timeout exceeds backend orchestration deadline.

**Tests:** `pnpm --filter @dacn/web test -- study-plan`.

**Acceptance:** end-to-end UI honors baseline wireframe/API behavior, confirmation is mandatory, and runtime details/secrets remain server-side.

### Task 11 — Verify integration, clean E2E and runtime capacity/conformance

**Depends on:** Tasks 1–10. **Files:** targeted API integration/E2E/runtime tests and deployment documentation only if needed for reproducibility; do not alter baseline.

- Run API integration against a new or verified clean disposable DB by setting `TEST_DATABASE_URL` to a DB identity different from development `DATABASE_URL`; verify target identity before migration/seed. Use the existing guard and migration/seed scripts. Do not run against `dacn`, production, or stale `dacn_test`; do not reset/drop shared databases.
- Run Student E2E against the same isolated clean DB, with the runtime deterministically stubbed for product-flow checks. Separately run real Ollama CPU/GPU contract and per-task capacity tests using pinned artifacts; these must be labeled real-runtime evidence and report pass/fail per task/profile.
- Run gates: `pnpm test:integration`, `TEST_DATABASE_URL=<isolated-clean-db> pnpm test:e2e` (or equivalent existing environment setup), `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm contracts:check`, `pnpm verify:baseline`, `pnpm build`, and Python runtime tests/build checks. Commands that require real model hardware/config must report `UNVERIFIED` rather than being replaced by mocks.

**Acceptance:** Student generate→preview→explicit apply passes with the real Nest business/API path and isolated PostgreSQL; mock-runtime E2E and real-runtime conformance are reported separately; every enabled profile has valid fail-closed capacity evidence. No results imply CPU supports all six tasks unless each task passes its required profile/latency criteria.

## Review gate and stop conditions

1. Have a fresh read-only reviewer compare this plan against the Design Spec, frozen baseline, approved authority and current repo; revise until the plan is approved.
2. Human reviews/approves the final plan. No code starts before both review gates.
3. Only after Task 1 passes, the plan review is approved and the user authorizes implementation, Tasks 2–3 and Task 4A may proceed because they consume released contract/schema artifacts and have no dispatch path. Task 4B is blocked until a real benchmarked profile is released. Task 5/6/8–11 wait on terminal-log write-failure disposition; Task 7 and live Student AI wait on CR-005/ADR release. Do not guess, bypass preflight or claim readiness.
4. CPU exploratory runs remain non-conformance. CPU application inference requires released portability authority plus a matching benchmarked profile. GPU/Colab evidence is not CPU evidence.

## Verification for this planning phase

No application tests, migrations, runtime commands, or AI inference are run by this plan-writing phase. Review only validates the design/plan and source references. Implementation tests are listed under each task.
