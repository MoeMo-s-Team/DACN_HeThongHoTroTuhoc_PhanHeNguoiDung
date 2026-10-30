# Draft Controlled Change Request — Phase 1D.3 Full Benchmark Source Cleanup

**Status:** Approved — Project Owner, 2026-10-30  
**Approval record:** Project Owner approved this CR and its independent-review-approved implementation plan on 2026-10-30.  
**Change ID:** CR-DRAFT-PHASE-1D3-SOURCE-CLEANUP  
**Supersedes:** Only the full-notebook/source-retention clauses of approved `CR-DRAFT-PHASE-1D3-LITE.md` §6 and approved `CR-DRAFT-RETIRE-PHASE-1D3-FULL-BENCHMARK.md` §6. All Lite/evidence protections and prior decisions remain in force.  
**Scope:** Remove obsolete full-benchmark source after packaging an explicit source archive. Source deletion is permitted only after approval of this CR and its plan; both were approved before implementation.

## 1. Request

Remove the retired Phase 1D.3 Full Benchmark implementation from active source paths while preserving Lite, FastAPI Runtime, six task behavior, NestJS integration, all current business/security protections, and a verifiable historical copy of every deleted file. No public API, AI Contract or business-rule behavior changes. The legacy `AI_RUNTIME_BENCHMARK_MODE=1` execution mode is explicitly retired: keep a fail-closed guard that rejects it before worker admission, whether or not a fixture hash is allowlisted or runtime is marked production.

## 2. Audit basis

CodeGraph and repository reference searches found:

- The full notebook directly calls the full runner, reporter, capacity measurement, preflight and provenance modules, and reads the 120-case corpus and full-only lock inputs.
- `ai/benchmark/lite_smoke.py` calls `ai/benchmark/evaluate.ts`; that evaluator uses `reference.ts` and NestJS's production schema/semantic validators. Lite notebook also calls `validate-inputs.ts`. These shared files must remain.
- `ai/tests/test_inference.py` and `apps/api/src/ai/ai-benchmark-evaluator.spec.ts` read the 120-case corpus. Their shared runtime/evaluator assertions can use the six retained Lite fixtures. Keep explicit invalid/unknown/invented ID checks; change only the corpus loop to six valid-per-task inputs.
- Full-only `ai/colab/preflight.py` is called by the full notebook, `torch_provenance.py`, `test_colab_preflight.py`, and `test_capacity.py`; the latter three implementation/test files are also on the deletion list. The full capacity/provenance helpers and full runner/report are isolated to the retired workflow and their tests.
- `ai/runtime/app.py` has a benchmark-only request allowlist branch guarded by `AI_RUNTIME_BENCHMARK_MODE`; only the full runner/notebook and three benchmark-mode contract tests use it. Remove allowlist hashing and execution, but retain a guard rejecting `AI_RUNTIME_BENCHMARK_MODE=1` before worker admission. `ai/runtime/worker.py` has a raw benchmark-observation sink guarded by the same flag; only the full notebook and one worker test use it. Remove that sink while retaining token authentication, Lite-only diagnostics, GPU UUID binding, worker error handling, and normal request/log behavior.
- `test_fixtures.py` enforces the retired corpus count/category balance and validates all 120 inputs; this is the full benchmark's corpus-wide gate. It will not be replaced one-for-one. Retain six Lite per-task input checks, the six-task prompt-injection test, schema-pack negative cases, explicit reference-boundary cases, the Student shared-generation no-truncation test, and add a valid Teacher input with `needsAttentionStudents=[]`.
- `ai/requirements.in` is retained because it records the shared runtime's PyTorch/NF4 dependencies and test packages. `ai/requirements-lite.txt` is used by the Lite notebook. The Colab resolver constraint and pending full-lock procedure are full-workflow-only.
- No standalone full-benchmark Colab run-evidence archive was found. Preserve the Lite PASS ZIP unchanged; do not represent the synthetic full fixture corpus as evidence.

## 3. File-level inventory

### KEEP — active Lite/runtime/application behavior

- Runtime files: `ai/runtime/__init__.py`, `ai/runtime/app.py`, `ai/runtime/diagnostics.py`, `ai/runtime/model.py`, `ai/runtime/prompts.py`, `ai/runtime/schemas.py`, `ai/runtime/worker.py`.
- Lite demo files: `ai/colab/phase-1d3-lite.ipynb`, `ai/benchmark/lite_smoke.py`, `ai/benchmark/fixtures/lite-smoke.jsonl`, `ai/benchmark/evaluate.ts`, `ai/benchmark/reference.ts`, `ai/benchmark/validate-inputs.ts`, `ai/tests/runtime_http_server.py`, `ai/tests/test_lite_smoke.py`.
- Dependency declarations: `ai/requirements-lite.txt`, `ai/requirements.in` (general PyTorch/Transformers/FP16/NF4 runtime and test dependencies). Keep both; do not remove the NF4-capable shared runtime dependencies.
- Runtime regression tests: `ai/tests/test_contract.py`, `ai/tests/test_inference.py`, `ai/tests/test_worker.py` (the fixture path and benchmark-only assertions are updated, but runtime, authentication, error, validation and GPU binding coverage remains).
- NestJS AI flow: `apps/api/src/ai/ai-flow.service.ts`, `apps/api/src/ai/ai-gateway.service.ts`, `apps/api/src/ai/ai-inference.service.ts`, `apps/api/src/ai/ai-request-log.repository.ts`, `apps/api/src/ai/ai.config.ts`, `apps/api/src/ai/ai.module.ts`, `apps/api/src/ai/capacity-preflight.service.ts`, `apps/api/src/ai/runtime-http.client.ts`, `apps/api/src/ai/schema-registry.service.ts`, `apps/api/src/ai/ai-semantic-validator.ts`, and `apps/api/src/ai/test-support/scripted-runtime-http.ts`.
- NestJS safeguards/tests: `apps/api/src/ai/ai-flow.contract.spec.ts`, `apps/api/src/ai/ai-gateway.service.spec.ts`, `apps/api/src/ai/ai-inference.service.spec.ts`, `apps/api/src/ai/ai-capacity-benchmark.spec.ts`, `apps/api/src/ai/ai-runtime-wire.spec.ts`, `apps/api/src/ai/ai-semantic-validator.spec.ts`, `apps/api/src/ai/capacity-preflight.service.spec.ts`, `apps/api/src/ai/runtime-http.client.spec.ts`, `apps/api/src/ai/schema-registry.service.spec.ts`; `apps/api/test/ai-inference.integration-spec.ts`, `apps/api/test/ai-request-log.integration-spec.ts`, `apps/api/test/auth.integration-spec.ts`, `apps/api/test/fixtures/ai/fake-ai-runtime.ts`, and `apps/api/test/fixtures/ai/integration-harness.ts`.
- Keep all 15 checked-in AI request/output/error envelope schemas under `apps/api/src/ai/schemas/` and the approved AI Contract schema pack Release 1. No prompt, schema, public API or contract change is proposed.
- Keep shared AI authentication/authorization, eligibility, capacity preflight, no-truncation, schema/semantic/reference checks, request correlation, timeout, no-retry, error mapping and AIRequestLog code/tests. In particular, `ai-capacity-benchmark.spec.ts` tests the retained capacity preflight seam; its name does not make it part of the retired 120-fixture benchmark.

### MODIFY — keep files, remove only full-benchmark dependencies

- `ai/runtime/app.py`: remove allowlist hashing/acceptance; retain an unconditional fail-closed rejection when `AI_RUNTIME_BENCHMARK_MODE=1`, plus Lite diagnostics and runtime auth.
- `ai/runtime/worker.py`: remove `_write_raw_observation` and its call; retain GPU UUID binding, Lite diagnostics and worker error handling.
- `ai/tests/test_contract.py`: replace old benchmark allowlist acceptance tests with a dev/production regression that enables the legacy mode and provides the correct canonical hash in the allowlist, then proves rejection before worker admission (`worker.calls == []`); preserve other contract/auth tests.
- `ai/tests/test_worker.py`: remove raw-observation assertions and keep the GPU UUID assertion.
- `ai/tests/test_inference.py`: change the load-timing fixture from the full corpus to Lite fixture.
- `apps/api/src/ai/ai-benchmark-evaluator.spec.ts`: iterate the six Lite fixtures, retain explicit schema/semantic/reference violation assertions, and add the Teacher empty-attention case.

### DELETE from active paths — 20 files, after archiving

1. `ai/colab/phase-1d3.ipynb`
2. `ai/benchmark/run.py`
3. `ai/benchmark/report.py`
4. `ai/benchmark/rubric.md`
5. `ai/benchmark/allowlist.py`
6. `ai/benchmark/evaluator-smoke.jsonl`
7. `ai/benchmark/fixtures/fixtures.jsonl`
8. `ai/benchmark/validate_fixtures.py`
9. `ai/benchmark/capacity-profile.candidate.json`
10. `ai/colab/capacity.py`
11. `ai/colab/measure_capacity.py`
12. `ai/colab/preflight.py`
13. `ai/colab/torch_provenance.py`
14. `ai/constraints-colab.txt`
15. `ai/requirements.lock.pending.md`
16. `ai/tests/test_benchmark.py`
17. `ai/tests/test_capacity.py`
18. `ai/tests/test_colab_preflight.py`
19. `ai/tests/test_fixtures.py`
20. `ai/tests/test_report.py`

Also update the full-corpus reads in `ai/tests/test_inference.py` and `apps/api/src/ai/ai-benchmark-evaluator.spec.ts` to the six Lite fixtures. Retain schema/input-semantic validation and explicit invalid/unknown/invented ID cases; add an explicit valid Teacher `needsAttentionStudents=[]` case. Change only the valid corpus count from 120 to six and describe it as per-task validator coverage. In `app.py`, remove allowlist hashing/acceptance but keep unconditional fail-closed rejection when the legacy benchmark mode flag is enabled. In `worker.py`, remove the `_write_raw_observation` call/helper. In `test_contract.py`, replace allowlist acceptance coverage with a regression asserting legacy benchmark mode is rejected before worker admission in development and production. In `test_worker.py`, remove only raw-observation assertions and keep the GPU UUID check. Normal runtime auth, output validation, error handling, logging and AI behavior remain unchanged.

### PRESERVE — immutable authority, decisions, and evidence

- All `docs/baseline/**` bytes and `BASELINE_MANIFEST.sha256`.
- Approved plans, CRs, governance indexes v1.2–v1.5 and the proposed successor v1.6 index, approved releases, frozen decisions, Lite report and `ai/phase-1d3-lite-PASS-20261030-042947-70b2a79d.zip`.
- Existing full-plan/report/model-selection records and prior approved cleanup CR, byte-for-byte; add current traceability mapping instead of editing them.
- Before modifying or deleting active files, package the 20 delete-list files at original repository-relative paths in `docs/archive/phase-1d3-full-benchmark-source-v1.zip`, with an internal per-file SHA-256 manifest. Also include pre-cleanup snapshots under `before-cleanup/` for the six files to modify: `ai/runtime/app.py`, `ai/runtime/worker.py`, `ai/tests/test_contract.py`, `ai/tests/test_worker.py`, `ai/tests/test_inference.py`, and `apps/api/src/ai/ai-benchmark-evaluator.spec.ts`. Add `docs/archive/phase-1d3-full-benchmark-source-v1.md` mapping deleted originals and snapshots to archive entries and the external checksum at `docs/archive/phase-1d3-full-benchmark-source-v1.zip.sha256`. The ZIP is an immutable source snapshot, not a runnable benchmark package, source proof, Colab evidence, or guarantee of future reproducibility.

## 4. Contract and behavior invariants

- The only runtime edits are removal of Full Benchmark allowlist execution and raw-observation sink; legacy benchmark-mode configuration remains fail-closed. Keep Lite diagnostics, runtime token authentication, GPU UUID binding, FP16/NF4 loader, six tasks, prompts, schemas, inference envelopes, request/error handling and normal logging unchanged.
- Preserve all NestJS authentication, authorization, eligibility, capacity preflight, no-truncation, schema/semantic/reference validation, request correlation, timeout, no-retry, error mapping, and AIRequestLog behavior.
- Keep Python's shared `requirements.in` and Lite `requirements-lite.txt`; remove only full resolver-specific `constraints-colab.txt` and the pending full-provenance lock instructions.
- Preserve Lite PASS report and evidence archive without re-running Colab. Keep `OPEN-ARCH-003` open. The 120-fixture category distribution is retired benchmark coverage, not a runtime contract; the six-task prompt-injection, schema-pack negative cases, Teacher empty-attention input and explicit reference-boundary tests remain.

## 5. Traceability updates

After approval, publish governance index v1.6 and update root `AGENTS.md` and `ai/README.md` to:

- Point to Lite as the active demo smoke and state full benchmark source was retired from active paths.
- Link the source archive/manifest for historical paths still named in approved plans and reports.
- State that the archive preserves source bytes but does not make the Full Benchmark a pending task or a PASS result.
- Preserve the current note that Lite's NestJS wire smoke mocks authorization/capacity preflight; this CR does not authorize application-flow or capacity-profile bypass.

## 6. Approval requested

Approve the 20-file deletion list, benchmark allowlist execution retirement with fail-closed legacy-flag guard, raw-observation removal, exact source archive and manifest (including six pre-cleanup file snapshots), two fixture migrations and added Teacher edge case, dependency disposition, and documentation/index updates. Implementation must stop if archive validation fails, a retained runtime/Lite caller is discovered, any required schema/injection/reference/auth/capacity test is weakened, or the Lite evidence checksum changes.
