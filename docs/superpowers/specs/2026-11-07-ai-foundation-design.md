# Phase 2B — AI Foundation Design

**Status:** Proposed design for review; no implementation authorized by this document.
**Date:** 2026-11-07
**Scope:** Shared NestJS AI boundary and local FastAPI/Ollama runtime, followed by one Student StudyPlan generation/apply vertical slice.

## 1. Outcome

Prepare an implementation path for `NestJS AiGateway → FastAPI /v1/infer → Ollama`, with CPU-local as the intended installation profile and GPU as an optional runtime profile. Preserve the existing `/api/v1` business API, six AI capabilities, authoritative NestJS validation, per-attempt 60-second timeout, no automatic retry, `AIRequestLog`, and capacity preflight.

This design is **not an approval** of runtime portability. The approved R3 source set is now applied to this checkout from official Git release commit `c8807f24ec66a2465521533878d54541762018a9`; the official 12-entry manifest and each file hash were verified. The unchanged AI Contract v1.0 was restored from its official release with matching SHA-256. The owner decision records CPU-local/GPU-optional direction but does not approve CR-005/ADR release or certify CPU capacity. Task 1 verified the primary Contract/schema/error-policy release hashes in Git history; the recovery directory remains staging material, not the release location. The governance-index copy has no verified publisher checksum and the recovered Phase 1D.3 supplement has no standalone SHA manifest; see the gate report. No Draft/Candidate has been promoted.

Task 1 result after R3 alignment (2026-11-07): **PASS for contract and authority reconciliation.** Root/backend guidance, active baseline, official 12-entry R3 manifest and AI Contract v1.0 now agree on API v1.5/R3. Fresh read-only Plan Review Gate approved the revised implementation plan on 2026-11-07; that approval does not authorize implementation. CR-005 remains Draft/formal release pending; ADR-AI-001 remains pending CR-005. FastAPI/Ollama application deployment and Student inference also require the portability release and a matching benchmarked capacity profile.

## 2. Evidence from current repository

- The app has no `AiModule` or gateway. `AppModule` imports Auth, Student, Admin, Feedback and Prisma only (`apps/api/src/app.module.ts:1-40`); `StudentModule` exposes dashboard, study-context validation and tasks only (`apps/api/src/student/student.module.ts:1-15`).
- Study context validation is reusable, but only returns a validated draft; the StudyPlan page explicitly says generation is not implemented (`apps/api/src/student/study-context.controller.ts:17-32`, `apps/web/app/sinh-vien/ke-hoach-hoc-tap/study-plan-handoff.tsx:18-23`). Frozen API already defines `POST /student/study-plans/generate` and `/apply` (`docs/baseline/API_Specification_v1.5_baseline_final.md:514-518,824-960`).
- Prisma already has `StudyPlan`, `StudyTask`, `TemporaryContext`, `AIRequestLog`, report and feedback-analysis models (`apps/api/prisma/schema.prisma:141-233`). `AIRequestLog` stores `feature`, terminal `SUCCESS|FAILED`, `errorCode`, `durationMs`, and user; it has no contract/model/prompt fields. Keep this schema unless a released authority requires otherwise.
- Phase 2A verified local PostgreSQL/Prisma, migration, seed and integration data. Integration uses guarded `TEST_DATABASE_URL`; E2E passed on clean `dacn_phase2a_e2e`. Default `dacn_test` has stale fixtures and its seed preflight fails, so future E2E must explicitly target a separate clean test DB and must not reset the shared dev or stale test DB (`docs/proposals/technical/local-database-verification-2026-11-07.md:5-20,43-68`).
- Generated API contracts exist at `packages/contracts/src/generated/`; no AI routes are currently present. Any Student route addition must follow the baseline OpenAPI contract and regenerate/check the shared contracts.

## 3. Goals and boundaries

### Goals

1. One NestJS dispatch boundary owns authentication context, task selection, input preparation, eligibility, capacity preflight, timeout, output validation, error translation, and attempt logging.
2. FastAPI implements only the AI runtime adapter: validate the released runtime envelope, route a registered task to configured Ollama, return correlated structured output/runtime metadata, and expose health/readiness. It does not connect to PostgreSQL or make business decisions.
3. CPU and optional GPU profiles use the same released `/v1/infer` contract and task/schema pack. Profile identity is explicit and cannot silently switch model/tokenizer/context assumptions.
4. Complete the existing Student goal → generate preview → explicit confirmation → apply/persist flow, reusing the approved API semantics and TemporaryContext invariants.

### Non-goals

No chatbot/RAG, queue, Redis, automatic retry, truncation/sampling/chunking, prompt-owned metrics, runtime DB access, frontend-to-runtime calls, baseline edits, new user-visible API semantics, or parallel implementation of the other role workflows in this phase.

## 4. Six-task contract mapping

The six literal task keys and their input/output schema pairs below are normative under AI Contract v1.0 and Schema Pack Release 1. The recovery copy is not the authority; its hashes were compared to the official release hashes recorded in the governance report.

| Contract capability to reconcile to released task key/schema | NestJS owner and business boundary | Runtime responsibility |
|---|---|---|
| `STUDENT_LEARNING_ANALYSIS` (`UC-STU-004`) | `student-learning-analysis.input.schema.json` / `.output.schema.json`; prepare authorized Student snapshot; validate structured result; backend metrics remain authoritative | Execute registered inference |
| `STUDENT_STUDY_PLAN_GENERATION` (`UC-STU-005/006`) | `student-study-plan-generation.input.schema.json` / `.output.schema.json`; generate validated preview and opaque ref; apply only after Student confirmation | Generate candidate plan/tasks |
| `STUDENT_STUDY_PLAN_ADJUSTMENT` (`UC-STU-009`) | `student-study-plan-adjustment.input.schema.json` / `.output.schema.json`; enforce eligibility/current-plan ownership and confirmation/replay rules | Generate adjustment candidate |
| `TEACHER_CLASS_ANALYSIS` (`UC-TEA-005/006`) | `teacher-class-analysis.input.schema.json` / `.output.schema.json`; authorized class input, minimum-data, validation, save/history | Generate class analysis candidate |
| `ADMIN_FEEDBACK_GROUPING_STAGE1` (`UC-ADM-004`) | `admin-feedback-grouping-stage1.input.schema.json` / `.output.schema.json`; validate IDs, deduplicate, compute counts after Stage 1 | Propose issue groups |
| `ADMIN_FEEDBACK_SUMMARY_STAGE2` (`UC-ADM-005/006`) | `admin-feedback-summary-stage2.input.schema.json` / `.output.schema.json`; consume backend-validated Stage 1 projection and preserve two-stage attempt semantics | Produce summary, priority areas and recommendations |

Trace references from SRS v1.6: `:1555-1565,1631-1637`; Admin two-stage/backend validation: `:1338-1397,1631-1637`. The current The active R3 authority set (API v1.5/BR v1.4/UCS v1.2) now matches AI Contract v1.0; public errors follow the frozen API v1.5 catalog. Internal runtime request envelope is `{contractVersion, requestId, task, locale, input}`; no request `promptVersion`. Success is `{contractVersion, requestId, task, output, runtime:{modelId,promptVersion}}`; runtime error is `{contractVersion, requestId, error:{code,message}}`. Response correlation uses contractVersion/requestId/task. See AI Contract §§6.3–6.6 and Erratum 1 E1.

## 5. Proposed component design

### NestJS (`apps/api/src/ai/`)

- `ai.module.ts`: imports `ConfigModule` and `PrismaModule`; exports only the dispatch service/gateway interfaces needed by feature modules. Wire into `AppModule` after the governance gate.
- `ai.config.ts`: read runtime base URL, secret/config requirements and fixed 60-second per-attempt limit. Missing/malformed AI configuration marks AI unavailable/fail-closed for AI requests; it must not prevent NestJS startup or interrupt non-AI APIs (AI-REQ-022, NFR-AVL-001). Never expose runtime credentials to web clients or logs. Keep environment names/secret requirements aligned with released AI Contract / approved portability change.
- `ai-task.registry.ts`: closed, typed registration of exactly the six released task keys, official input/output validators, per-task prompt/schema version and capacity parameters, and one-attempt invocation policy. Unknown/unregistered task must fail before network dispatch.
- `ai-output.validator.ts`: use contract-required Ajv 8/Ajv2020 plus `ajv-formats`, with strict mode, all errors, no type coercion, no removal of additional fields, and no defaults. Load byte-verified Release 1 schemas as packaged runtime assets in both Nest and FastAPI; test parity between copies. E5: malformed/empty/non-object model-generated text becomes correlated Runtime HTTP 500 `INFERENCE_FAILED`; Contract maps it to `502 AI_RUNTIME_FAILURE` / internal `AI_RUNTIME_INFERENCE_FAILURE`, with one FAILED attempt log and no retry or success context. E6: parsed objects pass unchanged; Nest remains authoritative (`AI_INCOMPLETE_DATA` for missing required content, `AI_INVALID_STRUCTURE` for other violations). Erratum 1 E4 / CR-003 map whitespace-only required text to `AI_INCOMPLETE_DATA`. These public mappings now reconcile to active API v1.5.
- `ai-capacity-profile.ts` / `ai-capacity-preflight.ts`: load one immutable deployment profile, bind its version to the exact contract/model/tokenizer/context window/safety margin/prompt/schema/output reservation, estimate the exact fully rendered request, and reject before dispatch when profile is absent/malformed/mismatched or the complete request exceeds budget. No trimming, sampling, chunking or fallback profile.
- `ai.gateway.ts`: serialize the official v1.0 envelope and call only configured FastAPI `/v1/infer`; hard deadline 60 seconds per external attempt; no retry; correlate request ID; parse runtime response; translate technical errors to the frozen public error catalog. It must not implement business/task logic.
- `ai.service.ts`: orchestrate registry → eligibility already performed by feature domain service → preflight → dispatch/logging → Nest validation. Feature services remain owners of their own authorization, input snapshot and durable workflow.
- `ai-request-log.service.ts`: use the six task keys as exact `feature` values; capture `attemptStartedAt` before dispatch; persist only terminal `SUCCESS`/`FAILED` with `createdAt=attemptStartedAt` and elapsed monotonic `durationMs` where available. No row for validation/ineligibility/preflight. Use a short DB write after final classification; no `PENDING`, pre-dispatch placeholder, or transaction across inference. Do not create success context before log success. The baseline does not define recovery if the terminal insert fails after dispatch; resolve this before Task 5 can close.

### FastAPI runtime (`ai/`)

- `app/main.py`: `/v1/infer`, health/readiness endpoints; validate authentication/correlation/envelope per released contract and return correlated success/error envelopes. E5 requires model-generated malformed/empty/non-object text to return HTTP 500 `INFERENCE_FAILED` without repair; E6 requires a parsed object to pass through unchanged for authoritative NestJS task validation. Keep those distinct from malformed inbound HTTP JSON and empty HTTP responses.
- `app/tasks/registry.py` plus released schema files: task allowlist and runtime schema check; no task-specific business authority, metric calculation or data persistence.
- `app/engine/ollama.py`: minimal Ollama adapter with CPU as default profile and GPU as an explicit optional profile. Model identifier/digest, quantization, context and runtime parameters are config, not hard-coded assumptions. Never silently fallback CPU↔GPU or to another model.
- Container/deployment files and `.env.example`: reproducible FastAPI + Ollama profile and health dependencies; no secrets in source. Exact CPU profile remains uncertified until its capacity and conformance evidence passes. Keep Ollama inaccessible from web clients.
- No database credentials, Prisma, or PostgreSQL dependency in the runtime.

### End-to-end call flow

1. Existing Nest auth/authorization and feature eligibility are checked. Business service prepares the canonical, minimized input from DB-owned data.
2. AI service resolves only a released task key/schema. Capacity preflight validates binding and estimates all input content plus exact prompt/schema overhead and reserved output using the profile's tokenizer/config.
3. Rejections map before dispatch: malformed/missing/mismatched profile → `502 AI_RUNTIME_FAILURE`; valid profile but over budget → `422 AI_INPUT_TOO_LARGE`; neither creates `AIRequestLog`.
4. A dispatch gets one attempt and one 60-second deadline, no retry. No transaction spans this call.
5. FastAPI invokes the configured runtime once. Apply official E5/E6 behavior. Nest separately checks HTTP body/envelope/correlation and then official task schema, bounds/enums/references and semantic invariants; only Nest-validated output can become business success.
6. Persist one terminal `SUCCESS`/`FAILED` record in a short DB operation after the attempt outcome is known, including runtime-generated output failure and Nest validation failure. Never write raw prompt/response or secrets. No preflight log, no `PENDING`, no transaction across inference. If final log persistence fails, stop the business success/context path and do not retry inference; exact external failure response/recovery is an open governance item because the baseline promises one log per started attempt.
7. For StudyPlan, require at least one valid task in AI output. Missing/empty/all-invalid tasks map to frozen `502 AI_INCOMPLETE_DATA`; create no preview and make no business mutation. Otherwise create backend-owned preview `TemporaryContext`; show it to Student; only explicit confirmation calls `/apply`. In one transaction, archive/create plan/tasks and consume the context; its final update writes `requestFingerprint`, `replayResult`, `status`, `consumedAt` and `retentionUntil` in one SQL/ORM update statement (`Database_Design_v1.0_baseline_final.md:1190-1217`). Never keep DB transaction open across steps 2–5.

After apply, use frozen `GET /api/v1/student/study-plans/current` to show the saved result after reload (`API_Specification_v1.5_baseline_final.md:1030-1077`). Frontend/proxy request deadlines must exceed the full backend orchestration time: 60 seconds applies to each external attempt, not end-to-end HTTP (`API_Specification_v1.5_baseline_final.md:208-224`).

Baseline semantics: `AI-REQ-004/009/010/015/018/019/020/024`, SRS §5.8 (`docs/baseline/SRS_v1.6_baseline_final.md:1536-1647`), public errors/capacity at `:2400-2445`; API timeout and pre-dispatch logging rules at `docs/baseline/API_Specification_v1.5_baseline_final.md:192-224`. Runtime portability is conditional on approved CR-005/ADR and released SRS/Architecture updates, not on the owner-direction record alone.

## 6. Capacity profiles

Represent profiles as reviewed, versioned deployment configuration rather than an unversioned runtime guess. Each profile includes the fields required by frozen SRS §5.8: `capacityProfileVersion`, `contractVersion`, `modelId`, `tokenizerId`, `contextWindowTokens`, safety margin, and per-task prompt/schema overhead and reserved output budget. Bind model revision/quantization and runtime settings where the approved portability artifact requires them.

Estimator must count the actual complete model input, including every user-data field, rendered prompt and schema/instruction overhead. It must use the exact tokenizer/template configured by the profile. A model change, tokenizer/template change, contract/schema/prompt change or runtime profile change invalidates the binding until a new capacity profile is reviewed and benchmarked. Profile load, binding, tokenizer or estimation failure is fail-closed as `AI_RUNTIME_FAILURE`; valid profile over-budget is `AI_INPUT_TOO_LARGE`. Both stop before network and produce no AI log. Never skip content or evade the limit by splitting the task.

Capacity profiles are per deployment/profile and task; CPU and GPU cannot share a profile unless benchmark evidence proves the same bound. Existing exploratory CPU evidence reports a StudyPlan 10-topic failure under 60 seconds; it cannot certify CPU for all six tasks (`docs/proposals/technical/ai-runtime-portability/CPU_StudyPlan_Exploratory_Evidence_2026-11-07.md:12-20,52-72`).

## 7. Database/test environment

Preserve `DATABASE_URL` for development (`dacn`) and require `TEST_DATABASE_URL` for integration/E2E. Existing integration helper rejects a URL whose DB identity matches development (`apps/api/prisma/test-database-url.ts:11-20`), and integration/E2E preparation runs migrations/seeds against the test URL (`apps/api/scripts/run-integration-tests.ts:1-20`, `apps/api/scripts/prepare-e2e.ts:1-22`). For AI integration and E2E, provision a clean disposable local DB (the verified `dacn_phase2a_e2e` or a newly named isolated DB), explicitly set `TEST_DATABASE_URL`, inspect the target identity before any setup, and leave `dacn_test` untouched until its stale fixture conflict is separately resolved. Do not use `migrate reset`, drop the dev DB, or target production. Add a Student AI DB test for preview/log/apply ownership and replay invariants; E2E must use a deterministic fake runtime for stable workflow coverage, plus separate real Ollama conformance/capacity runs that do not turn a fake response into runtime evidence.

## 8. Open decisions and release blockers

### BLOCKER before implementation

1. Resolve CR-005/ADR-AI-001 before introducing FastAPI/Ollama as the application runtime. R3 SRS v1.6 requires Colab; CPU-local/GPU-optional remains owner-endorsed direction only.
2. Approve a matching benchmarked capacity profile before enabling any deployment's invocation. CPU StudyPlan evidence includes repeated failure; do not create profile values from it.
3. Resolve terminal AIRequestLog persistence failure under DB outage before closing Task 5. The schema permits terminal records only and no transaction across inference; no PENDING/write-ahead mechanism is authorized.

### Open design details to settle from released artifacts (not guessed here)

- Operational handling if terminal AIRequestLog insert fails after an external attempt.
- Ollama model digest/quantization/context settings and GPU hardware profile; current DB model contains no profile identity field, so don't add a migration without authority.

### What can proceed while CPU is uncertified

- **After fresh plan review and explicit implementation authorization:** Task 2's inert NestJS module/config shell, Task 3's checksum-verified Release 1 schema import/validator, and Task 4A's absent-profile rejection may begin. They must not make an application inference call. Task 4B's estimator/boundary tests require a released profile; no profile fixture/value may be fabricated. Task 5 remains blocked on terminal-log persistence failure semantics.
- **FastAPI/Ollama as application runtime and Student AI end-to-end:** blocked until CR-005/ADR release resolves frozen AI-REQ-020's Colab requirement. CPU invocation additionally requires its own benchmarked profile; GPU or Colab evidence cannot be reused as CPU evidence. Phase 1D.3 T4 remains a demo-candidate smoke only and does not certify the application module or capacity.

## 9. Acceptance of this design

Review must confirm (a) the conditional governance boundary is accurate, (b) no Draft has been promoted to contract, (c) released contract/error mappings are correctly traced, (d) the architecture preserves baseline behavior and (e) the plan below reaches a real Student preview/confirmed-apply path after outstanding gates. Approval of this design or plan does not itself approve CR-005, AI Contract changes, or begin implementation.
