# Phase 1D.2 — AI Contract Implementation & Testing

**Status:** Approved for implementation
**Owner authorization:** Explicitly granted in conversation, 2026-10-28  
**Execution gate:** No production implementation until independent reviewer returns `Approved`.

## Spec

Implement the approved internal AI Contract boundary in `apps/api`: Ajv registry, semantic validation, preflight, runtime gateway, attempt logging and deterministic flow tests for all six tasks. Preserve R3 public API/business behavior and approved Erratum 1/CR-003 classifications. Do not add endpoints or fields. Test Admin Stage1→backend→Stage2 and precise attempt/log outcomes. Implement Contract §18.2 and §18.3 tests using fakes; §17 real-model benchmark is deferred.

## Authority and constraints

- Owner authorization: supplied in conversation 2026-10-28; separate from Release 1 approval.
- Governing sources: R3/CR-002, AI Contract v1.0, approved Erratum 1 and CR-003, Schema Pack Release 1, Architecture, API v1.5 and accepted ADRs.
- Preserve public API/business behavior, frozen baseline and manifest. Do not benchmark/select a real model. Use deterministic fake runtime and test-only capacity configuration.
- Root and scoped AGENTS rules apply. `apps/api` is NestJS/Prisma. Existing Prisma schema has AIRequestLog; no AI gateway/module currently exists. Release 1 supplies 15 authoritative schemas. Freeze Record R3 §§2–3 names the unchanged Use Case Diagram and Database Design downstream artifact. Their exact bytes were restored at the referenced `docs/baseline/` paths after SHA-256 matched the R2 manifest and Git blobs immediately before and after the R3 freeze commit `c8807f2` (100% rename into `docs/archive/R2/`); the R3 record independently states the Use Case Diagram was unchanged and the Database Design schema unchanged. Do not edit either artifact or the R3 manifest. Use Database Design only within the unchanged-schema scope frozen by R3; AI Contract §14.2 and current Prisma model govern AIRequestLog fields/lifecycle.
- Scope is internal AI application services and their unit/contract tests only. Do not add public AI controllers/routes in this phase because none are present in the current implementation and this plan does not authorize route behavior; existing services can consume these seams in a later traced slice.
- Until a benchmarked production capacity profile exists, non-test startup/dispatch must fail closed. Test-only fake profile and estimator are injectable only in test modules; no default/profile fallback may dispatch.

## Specification and global constraints

- `apps/api/AGENTS.md` layering and AI orchestration rules; `ai/AGENTS.md` forbids runtime DB access and fake-as-real behavior.
- AI Contract §§18.2–18.3 are required capacity/preflight, gateway and integration test acceptance; implement them with deterministic fake runtime. §17.1–17.3 real-model benchmark is deferred; do not mark it passed or deployment-ready.
- No public route, DTO, response, error envelope, business rule, schema or Prisma fields are added/changed. Use the existing API error envelope only through an internal mapper seam; do not wire it into new endpoints.
- `ApiExceptionFilter` currently maps uncaught 500 to `DATABASE_FAILURE`; therefore AI services must throw typed existing-envelope `HttpException` only at the existing API boundary, while unit tests verify the mapper payload directly. Do not globally alter filter behavior.
- Freeze Record R3 §3 lists Database Design v1.0 and freezes its schema unchanged. The byte-identical approved artifact is restored at its referenced `docs/baseline/` path with provenance recorded above; use it only within the unchanged-schema scope frozen by R3. The operative DB requirements for this slice are AI Contract §14.2 and the existing Prisma model. Preserve the model unless a concrete approved source requires change; no DB migration is planned.
- Required pre-dispatch pipeline, in this exact order: Authentication → Authorization → Eligibility/minimum-data checks → Build canonical request → Request Envelope Schema → Task Input Schema → Input Semantic Validation → Capacity Preflight → capture `attemptStartedAt` immediately before dispatch → external dispatch. Every rejection before dispatch produces zero external calls and zero `AIRequestLog` rows.
- Required post-dispatch pipeline: classify transport/HTTP failure → empty-body check → JSON parse → success-envelope schema → correlation (`contractVersion`,`requestId`,`task`) → task output schema → task semantic/reference/nonblank validation → compare `runtime.promptVersion` with task registry and active capacity profile (CR-003/Erratum 1) → backend enrichment → success-side effects/return. Prompt mismatch returns existing `502 AI_RUNTIME_FAILURE`, persists exactly one FAILED log with `AI_RUNTIME_PROMPT_VERSION_MISMATCH`, creates no success context, and never retries.
- Terminal log write is part of attempt completion: if persistence fails, do not return business success, do not retry inference, and do not start another attempt. The system cannot guarantee a persisted terminal row while the database is unavailable; surface the existing persistence failure path and record this as an operational limitation, without inventing a new public error code or fallback log store.

## Traceability


| Work                         | Contract / baseline anchors                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry and semantic checks | AI Contract §§5–13, 18.2; Release1; `UC-STU-004/005/009`, `UC-TEA-005/006`, `UC-ADM-004/005`; `FR-STU-004/005/009`, `FR-TEA-004/005/006`, `FR-ADM-004/005`; `BR-007/008/013/014/015/018/021/026/028/034/035/036/037/041/042/043`                                                                                                                                                      |
| API/public mapping boundary  | API v1.5 §§4.6, 4.8 and Admin analysis; CR-002 §2 XAI-001/XAI-002; CR-003. Internal service tests assert public error envelope payloads without adding endpoints.                                                                                                                                                                                                                     |
| Preflight and transport      | AI Contract §§6, 15.4, 16, 18.2–18.3, 20; CR-002 §2. Estimate actual serialized request payload with profile-bound tokenizer; budget = context window − task reserved output − task prompt/schema overhead − safety margin; require estimated input ≤ validated budget. No truncation; reject before dispatch/log; exact registry/profile/deployment binding; timeout ≤60s; no retry. |
| Persistence and flows        | AI Contract §§14.1–14.3, 18.2–18.3, 20; existing Prisma `AIRequestLog`; Student/Teacher one attempt, Admin two sequential attempts; no screen/API shape change.                                                                                                                                                                                                                       |
| Deferred benchmark           | AI Contract §§17.1–17.3: real-model quality/context benchmark and deployment capacity evidence are out of scope and remain pending.                                                                                                                                                                                                                                                   |


## TDD task sequence

All production and test files are under `apps/api/`. Each task is a `### Task N:` heading so `task-start` can extract it. For every behavior: add the test first, run it and confirm the expected failure, implement the smallest change, rerun for PASS. No frozen baseline or manifest edits.

### Task 1: Registry and packaged schemas

**Files:** `apps/api/src/ai/ai.module.ts`, `schema-registry.service.ts`, adjacent spec, `src/ai/schemas/*.schema.json`, API `package.json`/lockfile, `tsconfig.build.json`, schema-copy build script, and `apps/api/scripts/smoke-ai-schema-dist.cjs`.

**Interfaces:** `get(task: AiTask): TaskSchemas`; `validateEnvelope(kind: EnvelopeKind, value: unknown): asserts value is RuntimeEnvelope`.

Copy the exact 15 Release 1 schemas and configure `Ajv2020({ strict: true, allErrors: true, coerceTypes: false, removeAdditional: false, useDefaults: false })` with `ajv-formats`. Ajv and `ajv-formats` must be pinned API runtime dependencies. Set `tsconfig.build.json` `rootDir` to `src`, `include` to `src/**/*.ts`, `exclude` to `node_modules`, `dist`, `test`, `prisma`, and `src/**/*.spec.ts`, and `incremental: false` (preserve normal `tsconfig.json` test inclusion for typecheck/Jest). `build` runs `tsc` then copies `src/ai/schemas/*.schema.json` to `dist/ai/schemas/`. Runtime resolves schema assets relative to the compiled registry module with `__dirname`, never source cwd. Add `smoke:ai-schemas` that runs `pnpm build` then `node scripts/smoke-ai-schema-dist.cjs`; the plain CommonJS smoke script imports `dist/ai/schema-registry.service.js`, reads/compiles all 15 schemas exclusively from `dist`, and compares them to a pinned map of 15 expected SHA-256 digests sourced from Release 1. Do not resolve runtime schema inputs from the source tree or archive during this smoke test. Run after deleting `dist` to prove no stale assets or source-tree dependency.

- [x] Write table-driven tests for all 15 schemas: a valid fixture passes; each applicable schema rejects missing required fields, wrong type, unknown property, invalid enum, and invalid date-time. Use Release 1 fixtures plus targeted mutations and assert expected keyword/classification. Also test six task schema pairs/envelopes, refs, unknown task, duplicate IDs, no `promptVersion` in request schema, SHA-256 equality to Release 1, and no coercion/removal/default insertion.
- [x] Run `pnpm --filter @dacn/api test -- --runInBand src/ai/schema-registry.service.spec.ts`; expect new registry behavior assertions to fail.
- [x] Implement registry and reproducible schema packaging/runtime resolution.
- [x] Rerun focused Jest command; expect PASS.
- [x] Run `pnpm --filter @dacn/api smoke:ai-schemas` after removing `apps/api/dist`; expect all 15 schemas and refs to load/compile from `dist`, hashes equal Release 1, with no source-tree runtime dependency.

### Task 2: Semantic and correlation validation

**Files:** `apps/api/src/ai/ai-semantic-validator.ts` and adjacent spec.

**Interfaces:** `validateInput(task,input,authoritativeContext): void`; `validateOutput(task,input,output,authoritativeContext): void`; `validateCorrelation(request,response,bindingContext): void`. Binding context supplies expected registry/profile/deployed prompt version.

Preserve post-dispatch order: transport classification → empty body → JSON parse → success envelope schema → correlation (`contractVersion`,`requestId`,`task`) → task output schema → semantic/reference/nonblank checks → runtime prompt binding → backend enrichment → success side effects/return. No enrichment or success context before prompt binding passes. For Ajv `allErrors: true`, classify deterministically: if any validation error has `keyword === "required"`, map the response failure to `AI_INCOMPLETE_DATA`, even when other validation errors also exist. Otherwise any envelope/task schema failure—including `type`, `enum`, and `additionalProperties`—maps to `AI_INVALID_STRUCTURE`. Task-specific required-content/whitespace failures map to `AI_INCOMPLETE_DATA`; correlation and semantic/reference structure failures map to `AI_INVALID_STRUCTURE`; approved prompt mismatch maps to `AI_RUNTIME_FAILURE`. This rule applies to post-dispatch response validation; pre-dispatch input validation keeps its contract-specific mapping and creates no attempt/log.

- [x] Add pure-validation tests for missing required fields alone and combined with type/enum/additionalProperties errors; assert required priority independent of Ajv error ordering. Include every §18.2 task case: Student missing goal with assessment allowed and returned score rejected; StudyPlan empty tasks → `AI_INCOMPLETE_DATA`, deadline `<= planningStartAt` rejected by the pre-call validator; Adjustment out-of-TODO/duplicate IDs, reason-only change, prohibited title/topic/status, and output `changes=[]` → `AI_INCOMPLETE_DATA`; Teacher empty attention IDs and AI-supplied average/count; Admin Stage 2 missing `priorityAreas`/`recommendations` → incomplete and attempted tag/count mutation → invalid structure. Keep no-dispatch/no-log and stage-routing assertions in Tasks 6–7, after those coordinators exist.
- [x] Add tests for type, enum, additionalProperties, blank required text, IDs/reference membership, unique IDs, due-date window, count reconciliation, Teacher weakTopic/attention IDs, correlation triplet, and prompt binding.
- [x] Run `pnpm --filter @dacn/api test -- --runInBand src/ai/ai-semantic-validator.spec.ts`; expect new behavior assertions to fail.
- [x] Implement validation and mapping.
- [x] Rerun focused Jest command; expect PASS.

### Task 3: Config and capacity preflight

**Files:** `apps/api/src/ai/ai.config.ts`, `capacity-preflight.service.ts`, adjacent spec.

**Interfaces:** `buildRequest(task,input,requestId): InferenceRequest`; `preflight(request: InferenceRequest): PreflightResult`.

Estimate the exact canonical serialized payload that will be dispatched using estimator identified by `tokenizerId` and bound to `capacityProfileVersion`. A conservative estimator is allowed only with a benchmarked release record for that exact pairing. Profile stores per-task `reservedOutputTokens` and `promptAndSchemaOverheadTokens`, plus `contextWindowTokens` and `inputSafetyMarginTokens`; enforce `estimate(serializedPayload) <= contextWindow - reservedOutput(task) - taskOverhead(task) - safetyMargin`. Missing/malformed/mismatched profile or estimator is configuration mismatch, not overflow. Production absence fails closed at preflight (not module startup, preserving Auth/Health). Deterministic fake profile/estimator is test-only.

- [x] Write tests for each profile binding field, budget boundary and arithmetic, exact serialized payload, no mutation/truncation, overflow `422 AI_INPUT_TOO_LARGE`, mismatch `502 AI_RUNTIME_FAILURE`, zero transport/log.
- [x] Run `pnpm --filter @dacn/api test -- --runInBand src/ai/capacity-preflight.service.spec.ts`; expect new assertions to fail.
- [x] Implement config and preflight.
- [x] Rerun focused Jest command; expect PASS.

### Task 4: Runtime transport

**Files:** `apps/api/src/ai/runtime-http.client.ts`, `ai-gateway.service.ts`, adjacent specs.

**Interface:** `infer(request: InferenceRequest): Promise<RuntimeHttpResult>` posts `/v1/infer` with configured URL/auth and timeout no greater than 60 seconds.

- [x] Write fake-adapter tests for success, network unavailable, timeout, empty body, malformed envelope, HTTP 400/422, 401/403, `INFERENCE_FAILED`, unknown 5xx, `RUNTIME_UNAVAILABLE`, 408 and 504. Expected mappings: empty→`AI_EMPTY_RESPONSE`; connection/DNS/TLS failure and `RUNTIME_UNAVAILABLE`→`AI_CONNECTION_FAILURE`; elapsed timeout and HTTP 408/504→`AI_TIMEOUT` (timeout classification takes precedence over generic 5xx); 400/422, 401/403, inference failure and other technical 5xx→`AI_RUNTIME_FAILURE`.
- [x] Run `pnpm --filter @dacn/api test -- --runInBand src/ai/ai-gateway.service.spec.ts`; expect new assertions to fail.
- [x] Implement transport without DB access or retry.
- [x] Rerun focused Jest command; expect PASS and assert exact existing error envelope and redaction.

### Task 5: Trusted invocation boundary and attempt/log coordinator

**Files:** `apps/api/src/ai/ai-inference.service.ts`, `ai-request-log.repository.ts`, adjacent spec, AI module provider registration.

Authentication remains at the existing HTTP boundary: `AuthGuard`/`AuthService` authenticate the request and validate user existence, ACTIVE status, and role; no endpoint or auth mechanism is added. The authenticated application caller passes the `AuthUser` created by existing `CurrentUser`/guard flow. The AI service never accepts user ID/role from request body. Authorization/resource ownership and task eligibility remain caller application/domain-service responsibilities, supplied as authoritative context and checked through `AiInvocationPolicy` methods injected by the AI module (not passed by callers). Because this repository has no AI feature callers or eligibility services, register an explicit deny-all `AiInvocationPolicy` provider for this phase: it permits Nest startup and Auth/Health operation but rejects every production AI invocation before request construction/dispatch. Contract tests may override it only with explicit test-module policies to exercise deterministic success flows; no test policy is registered in the production module. No permissive fallback exists. Tests cover the trusted principal boundary, policy order, denial, and successful Auth/Health startup; they do not claim feature-specific authorization/eligibility integration or invent those rules.

**Interface:** `execute(request: AiTaskRequest, principal: AuthUser, authoritativeContext: AiAuthoritativeContext): Promise<ValidatedTaskOutput>`; `AiInvocationPolicy` is a mandatory AI-module provider, explicitly registered as deny-all until a traced feature caller supplies real domain policy. Check authenticated principal presence, then authorization/ownership policy, then eligibility/minimum-data policy, then remaining pre-dispatch pipeline in frozen order. Contract tests override the policy only in their test module with an explicit allow policy for scripted-flow assertions. Keep business checks out of gateway. External attempt starts only immediately before dispatch; persist exactly one terminal SUCCESS/FAILED AIRequestLog per started attempt; never create PENDING or pre-dispatch rows. Persist only contract fields and no raw prompt/response/secrets. Terminal persistence failure rejects the operation, returns no output/context, and never retries inference; DB unavailability may prevent any terminal row and no fallback store is added.

- [x] Test policy invocation order and fail-closed behavior for absent principal, deny-all default, denied role/ownership, and ineligible task; each rejection has zero dispatch and zero log. Verify AI module starts and existing Auth/Health checks still work with deny-all policy registered. Exercise existing AuthService invalid/disabled-user cases without adding routes.
- [x] Test all six feature mappings and every AIRequestLog field/default/null rule; timestamp is dispatch time and duration is nonnegative when measurable, otherwise null.
- [x] Test runtime prompt mismatch → `502 AI_RUNTIME_FAILURE`, one FAILED log with `AI_RUNTIME_PROMPT_VERSION_MISMATCH`, no success context and no retry.
- [x] Force terminal repository write failure after runtime success; assert rejected operation, no business output/context, one inference only, and no fallback logging.
- [x] Run `pnpm --filter @dacn/api test -- --runInBand src/ai/ai-inference.service.spec.ts`; expect new assertions to fail.
- [x] Implement coordinator/repository using existing Prisma model only; no transaction around HTTP.
- [x] Rerun focused Jest command; expect PASS.

### Task 6: Six task flows and fake runtime

**Files:** `apps/api/test/fixtures/ai/fake-ai-runtime.ts`, `apps/api/src/ai/ai-flow.contract.spec.ts`.

Fake runtime implements `infer(request): Promise<RuntimeHttpResult>` with deterministic scripted responses.

- [x] Write contract tests for all six task flows; Student/Teacher exactly one attempt; Admin Stage 1 validates IDs, rejects AI-supplied `count`, deduplicates in order, drops empty groups, recomputes count, and independently preflights Stage 2. Assert Stage 1 failure or invalid output yields no Stage 2 attempt/log; empty `issueGroups` from valid Stage 1 proceeds to Stage 2. Stage 2 preflight rejection yields only Stage 1 SUCCESS log and no `analysisRef`; successful Admin flow yields exactly two attempts/logs. Assert deadline `<= planningStartAt` is rejected before dispatch with zero calls/logs. No retries.
- [x] Run `pnpm --filter @dacn/api test -- --runInBand src/ai/ai-flow.contract.spec.ts`; expect new flow assertions to fail.
- [x] Implement task routing/orchestration against prior task interfaces.
- [x] Rerun focused Jest command; expect PASS.

### Task 7: Cross-service and database integration

**Files:** create `apps/api/test/ai-inference.integration-spec.ts` and `apps/api/test/ai-request-log.integration-spec.ts`; wire Nest testing module and existing integration runner config. Use real AuthService for invalid/disabled principals, explicit port-backed authorization/eligibility denials (not fake-as-real claims), PostgreSQL/Prisma for persistence, registry/schema/semantic/preflight/orchestration/repository, and fake HTTP adapter. Never hold a DB transaction across runtime HTTP.

- [x] Write both integration specs first. Cover pipeline order and zero calls/logs at each pre-dispatch rejection, including deadline `<= planningStartAt`; success, empty, malformed, runtime 400/401/500, `RUNTIME_UNAVAILABLE`, 408/504; prompt mismatch after semantic validation but before enrichment/context; no retries. Verify empty Admin Stage 1 `issueGroups` still causes the Stage 2 attempt.
- [x] In `ai-request-log.integration-spec.ts`, verify actual PostgreSQL persistence for all six feature keys, all AI Contract §14.2 fields, SUCCESS/FAILED terminal lifecycle, dispatch timestamp/duration, and zero DB rows for pre-dispatch rejects. Force DB write failure after successful fake inference; assert no business result/context, exactly one inference attempt, no fallback store. Document that DB outage can prevent the terminal row.
- [x] Run `pnpm test:integration`; expect the new integration assertions to fail before implementation/wiring.
- [x] Wire modules/services and integration runner.
- [x] Rerun `pnpm test:integration` and focused Jest specs; expect PASS. No Colab/network dependency.

## Verification and review

- Focused Jest unit/contract tests per task. Final gates: `pnpm verify:baseline`; root `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; `pnpm --filter @dacn/api test`, `pnpm --filter @dacn/api lint`, `pnpm --filter @dacn/api typecheck`, and `pnpm --filter @dacn/api build`; `pnpm test:integration`.
- Independent code review after implementation; resolve findings and rerun relevant checks.
- Do not claim deployment readiness: real capacity profile/model benchmark belongs to a later phase.

## Review focus

- Ensure internal request envelope has no `promptVersion`; bind registry/profile/deployment before dispatch and apply approved post-dispatch mismatch mapping.
- Ensure whitespace-only required AI output maps per CR-003/Erratum 1; schema-validity and semantic completeness remain distinct.
- Confirm Schema Pack Release 1 `$id`s and all `$ref`s compile under pinned Ajv 8.
- Confirm no logging for preflight rejection and exactly one terminal log per external attempt.
- Confirm Stage 2 projection includes backend-computed `count`, without changing public response/API.
- Do not treat archived R2 Database Design as current authority; implementation uses approved R3/Architecture/Prisma source, escalating only if a concrete conflict appears.
- Required §§18.2–18.3 cases: exact pre-dispatch pipeline ordering and no-log/no-dispatch at every rejection; all 15 schema compilation and invalid output; per-task overhead/reserved-output/safety-margin budget; missing required content; whitespace-only content; wrong type/enum/unknown property; correlation mismatch; prompt mismatch after semantic checks and before enrichment/success context; runtime auth/protocol/inference/technical/network/timeout/empty body/`RUNTIME_UNAVAILABLE`/HTTP 408/504; exact error-envelope mapping; complete AIRequestLog fields/lifecycle; terminal log DB failure fail-closed/no retry/no extra attempt; Student/Teacher one attempt; Admin two attempts with Stage2 preflight rejection; no truncation. §17 real-model benchmark is deferred.

## Independent Plan Review Gate

**Status:** Approved for implementation.

**Reviewer:** Independent read-only reviewer role; model `gpt-6.1-terra`; reasoning `medium`.

**Verdict:** `Approved` for the implementation content of this plan at SHA-256 `3373b1fa8fa2cf4727a19c4b24e6083e1e8def22d7ce01ca14a54a060c2bd55a`. No Critical or Important findings remain. This status-only review record was updated after the verdict; task/specification content is unchanged from the reviewed hash.

**Findings resolved:** All five original Important findings; build asset packaging and clean-dist smoke path; TypeScript test/incremental exclusions; per-schema cases for all 15 schemas; §18.2 task edge cases including adjustment `changes=[]`; Stage 1 failure preventing Stage 2; 408/504 timeout mapping; trusted AuthUser and startup-safe deny-all policy; root verification gates; preservation of R2 archive copies.

**Authority checklist reviewed:**

- [x] Root `AGENTS.md`; `apps/api/AGENTS.md`; `ai/AGENTS.md`; DACN workflow; executing-plans `task-start` and subagent `task-brief`.
- [x] Freeze Record R3 §§1–5; active Governance Index v1.3 §§1–4; CR-002 §§2–5.
- [x] SRS v1.6 AI requirements and traced FRs; Use Case Diagram §§1–3; Business Rules traced BR-IDs; Use Case Specification §§3.2–3.5 and seven traced AI use cases.
- [x] API v1.5 §§3.8, 7.4–7.5, 7.11, 8.5, 9.5, 11.1–11.5, 13; Activity Diagram §4.2 and Student/Teacher/Admin AI flows; UI Sitemap AI screens; Wireframe shared states and five AI screens.
- [x] Architecture §§9.5, 14.1–14.8; Database Design §§7.12, 10.6, 20.7 within R3 unchanged-schema scope; both accepted ADR decision summaries and relevant authentication/contract boundaries.
- [x] AI Contract §§5–18 and 20; Erratum 1 E1–E4; CR-003; Release 1 README, TRACEABILITY, validation report, SHA256SUMS, and all 15 JSON Schema files.
- [x] Current API package/build/Jest/integration config; AuthGuard/AuthService/AuthUser; exception filter; Prisma AIRequestLog.
- [x] Restoration provenance and checksums; R3 manifest checksum and Release 1 SHA sums.

**Inventory notes:** The standalone CR-001 file and `docs/architecture/Global UI Design System — Editorial Tech.md` are absent. Reviewer determined CR-001's relevant incorporated R3 history behavior is outside this backend-only slice, and the design system is presentation-only; neither blocks the plan. No archived copy was substituted as current authority.

**Recovery evidence:** Freeze Record R3 §§2–3 lists the Use Case Diagram and UI Sitemap as unchanged, and Database Design schema unchanged. Their bytes match the R2 manifest and exact Git objects moved at commit `c8807f2`: Use Case Diagram SHA-256 `cac878ef85181140fa4eb3b7709d3929e0c35199b031ecc1f62ec0b13d4eb2db`; UI Sitemap SHA-256 `7774775bff0f56e028ca5f5c3358952a8d5492526e0d253efe77e5aa2155fdba`; Database Design SHA-256 `b652cb42a5ea53a83e9e7669b3b423d433a8b9f3278bfe5a6f9771e348a9ef29`. Baseline and archive copies are byte-identical; R2 history is preserved. `BASELINE_MANIFEST.sha256` was not changed; these unchanged artifacts are not entries in the R3 manifest.


## Execution completion record

- Tasks 1–7 completed in the approved TDD sequence.
- Independent implementation reviewer (`gpt-6.1-terra`, medium, read-only) found and the implementation resolved the reported Important findings. Follow-up confirmed the remaining Minor test-isolation finding was resolved; no findings remain.
- Final root gates passed: `pnpm verify:baseline`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm test:integration`. After splitting the last test case for isolation, API Jest passed again: 11 suites / 128 tests; focused capacity-preflight spec: 20 tests.
- Real-model benchmark and live Colab integration remain deferred per scope; production invocation stays fail-closed until a feature caller/policy and benchmarked capacity profile are provided.


## Post-implementation code review

- Reviewer: independent read-only `gpt-6.1-terra`, medium reasoning.
- Initial assessment: `Ready to merge: No`; two Important findings were reported.
- Resolutions: output schema failures now classify from Ajv keywords before whitespace checks; runtime HTTP error codes are trusted only after Release 1 error-envelope validation and request correlation. Added regression cases and updated integration fixtures to full correlated envelopes.
- Follow-up verdict: `Ready to merge: Yes`; both findings resolved, no remaining blocking findings. Reviewer independently reran focused semantic-validator and gateway suites (2 suites / 30 tests).
- Current verification: `pnpm verify:baseline`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (11 API suites / 132 tests plus 13 web tests), `pnpm build`, `pnpm test:integration` (4 suites / 26 tests), and `git diff --check` passed. Full gates/build ran after production changes; integration ran again after integration-fixture updates.
