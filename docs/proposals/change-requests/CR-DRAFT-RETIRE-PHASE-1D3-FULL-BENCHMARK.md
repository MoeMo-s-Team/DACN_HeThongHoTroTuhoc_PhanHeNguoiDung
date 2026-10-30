# Draft Controlled Change Request — Retire Phase 1D.3 Full Benchmark for DACN Demo

**Status:** Approved — Project Owner, 2026-10-30
**Change ID:** CR-DRAFT-RETIRE-PHASE-1D3-FULL-BENCHMARK
**Scope:** DACN demo acceptance and downstream AI documentation; no implementation authorized before approval.

## 1. Requested decision

Retire the Phase 1D.3 Full Benchmark as required work for the DACN demo. Adopt the already approved and completed Phase 1D.3-Lite acceptance as the official AI verification gate for this demo. This is a scoped demo decision, not production model certification and not a retrospective change to frozen baseline history.

## 2. Context and evidence

The approved Lite run used source commit `9a5494edb5788eed5455742361caeafdb414c2bf`, `Qwen/Qwen2.5-1.5B-Instruct` revision `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`, Colab Tesla T4 with FP16, six real task inferences passing schema/semantic/reference validation, and a NestJS → FastAPI live smoke passing. The report is `docs/proposals/technical/phase-1d3-lite-report.md`; the preserved archive is `ai/phase-1d3-lite-PASS-20261030-042947-70b2a79d.zip`.

The current frozen AI Contract v1.0 §15.4 requires a benchmark/release-bound capacity profile for deployment; §17 requires at least 120 cases, per-task schema/semantic thresholds, manual quality scoring, and benchmark evidence for model selection. The approved full plan records that workflow. Lite evidence meets its approved demo acceptance only and does not establish those full-benchmark or production-capacity claims. Repository audit found the Lite PASS archive but no separate full-benchmark run-evidence archive.

## 3. Change and impact

| Authority / trace | Current | Proposed for the demo | Impact |
|---|---|---|---|
| AI Contract v1.0 §17; approved Phase 1D.3 plan | The full benchmark is the model-selection gate. | Replace the full benchmark as the DACN demo's model-verification gate with Phase 1D.3-Lite through a separately versioned approved downstream supplement. The full benchmark remains historical and is not a production-selection result. Keep the original baseline and plan unchanged. | Scope is demo candidate verification only. No public API, schema, task, prompt, business rule, role, or screen change. |
| `OPEN-ARCH-003` | Exact model remains open pending benchmark. | Record Qwen as a verified demo candidate only. Keep `OPEN-ARCH-003` open for production selection and certification. | No production-readiness claim or production model decision. |
| Capacity and input safety (AI Contract §15.4; R3/CR-002/XAI-001) | Actual application deployment requires a released benchmark-bound capacity profile and fail-closed whole-input preflight. | Retain unchanged for application deployments. Lite fixture/model verification may be accepted as a demo candidate smoke without claiming it satisfies capacity certification or enables unrestricted application inference. The downstream supplement must explicitly state this boundary. | No capacity-profile exception or bypass is proposed. No synthetic/fabricated capacity measurements. A real authenticated application flow remains separately gated until its profile and invocation policy are valid. |
| AI Contract §§6–7, 15.3, 16; Errata 1/2; schema pack; CR-002/003/004 | Existing task contracts, validators, security and attempt/error semantics apply. | Retain unchanged, including schema, semantic and reference validation, authentication, 60-second attempt timeout, no retry, no AI mutation, and existing error mapping/logging. | No task or public API behavior changes. |
| Traceability | Governance Index v1.4 lists Phase 1D.3 benchmark as a remaining gated activity and OPEN-ARCH-003. | Publish an approved downstream governance index revision and erratum; label the full plan/notebook/reports historical/superseded for demo completion while retaining them. | Do not edit frozen baseline files, approved decisions, old plans, or old evidence. |

## 4. Demo acceptance after approval

Phase 1D.3-Lite is the sole **model-candidate smoke** gate for the DACN demo when evidence shows all of the following:

1. The pinned Qwen2.5-1.5B-Instruct candidate loads on a Colab Tesla T4 in FP16.
2. All six existing AI tasks perform real inference and at least one output per task passes the current schema, semantic, and reference validators.
3. The recorded NestJS → FastAPI wire smoke succeeds against real inference.
4. Compact run evidence records source commit, immutable model revision, dependencies, GPU/load result, per-task status, and NestJS smoke status.

Any failure remains FAIL with its concrete blocker. This acceptance does not include the 120-fixture benchmark, manual scoring, capacity profiling, or full Torch provenance. **The current wire smoke constructs an `AiInferenceService` with mocked authorization and capacity preflight; it proves the NestJS client-to-FastAPI model-output path, not the production `AiModule` path, an authenticated business request, or a validated capacity profile.** The production module currently binds `DenyAllAiInvocationPolicy`, and no estimator is configured there, so an actual application AI flow is not demonstrated by this Lite evidence. Do not describe it as end-user integration success. The existing Lite PASS report/archive remain immutable evidence for the recorded run; this CR does not silently generalize that run to future source/model revisions.

## 5. Security and contract invariants retained

- Preserve all six task keys, AI Contract request/response envelopes, public API schemas, prompts/prompt versions, business rules, schema pack, and required backend authorization.
- Preserve NestJS schema, semantic, and reference validation as the business-success boundary.
- Preserve pre-dispatch capacity guard and whole authoritative input; never truncate, sample, page-limit, chunk, or pre-summarize to pass a limit.
- Preserve runtime authentication, secret handling, no raw prompt/response logging by default, 60-second timeout, no automatic retries, and one terminal request log per started attempt.
- No mock output, output repair, invented capacity evidence, or production-readiness claim.

## 6. Repository cleanup proposal

This audit found no safe code-deletion set while preserving the historical notebook and regression references. The proposed cleanup is documentation-only: de-scope the full workflow as active demo work, preserve its files in place, and label them historical rather than rewriting approved contents.

| Disposition | Files / scope |
|---|---|
| KEEP | `ai/runtime/**`; `ai/colab/phase-1d3-lite.ipynb`; `ai/benchmark/lite_smoke.py`; `ai/benchmark/fixtures/lite-smoke.jsonl`; `ai/benchmark/evaluate.ts`; `ai/benchmark/reference.ts`; `ai/benchmark/validate-inputs.ts`; runtime/contract/Lite validators, auth, logging, capacity preflight, and all tests that protect them; NestJS AI integration. |
| REMOVE | None confirmed by this audit. Every reviewed full-benchmark component is referenced by the historical full notebook, tests, or retained evaluation/capacity code. Do not delete until a future implementation audit proves no retained caller and the owner explicitly approves any loss of historical reproducibility. |
| ARCHIVE / retain in place | All full-only tools and tests under `ai/benchmark/`, `ai/colab/`, and `ai/tests/` (including runner/report/rubric, capacity/provenance tooling and full fixture corpus); `ai/colab/phase-1d3.ipynb`; approved Phase 1D.3 plan `docs/superpowers/plans/2026-10-29-phase-1d3-real-model-benchmark.md`; approved Lite CR/plan; pending full benchmark report and model-selection proposal; Lite PASS report and ZIP evidence; approved decisions and frozen baseline. Keep paths/content/history intact; label the workflow historical in current docs. |

Do not delete or rename the shared `ai/benchmark/` directory or break the historical notebook's references. Do not remove API capacity preflight, candidate capacity integration tests that exercise that guard, or validators merely because their names mention benchmark. Update `ai/README.md`, root `AGENTS.md` governance-index pointer, and governance traceability so the Lite procedure is the current model-candidate smoke and the full workflow is no longer listed as required demo work. Keep application deployment capacity and authorization gates explicit.

## 7. Affected requirements and authority

No `UC-*`, `FR-*`, `BR-*`, Screen ID, API route/schema, or AI task behavior is proposed to change. Affected technical authority: AI Contract v1.0 §17; Architecture v1.1 §14.7 and OPEN-ARCH-003; R3/CR-002 capacity-profile/preflight rules; governance index v1.4; approved Phase 1D.3 full and Lite plans. No exception to R3/CR-002 or AI Contract §15.4 is proposed. Any future change to application capacity certification or invocation policy requires a separate cross-document controlled change.

## 8. Decision record

**Owner decision:** Approved on 2026-10-30. Implementation authorized according to the independently reviewed plan.

The Project Owner approved: retiring the Full Benchmark as demo-required model-selection work; using Lite PASS only as model-candidate smoke acceptance; recording Qwen as a demo candidate, not production-certified; retaining application capacity/authentication gates and the limited wire-smoke claim; publishing a versioned downstream supplement and governance-index update; and limiting cleanup to documentation while retaining referenced benchmark tooling.
