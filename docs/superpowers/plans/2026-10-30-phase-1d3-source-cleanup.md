# Phase 1D.3 Full Benchmark Source Cleanup — Implementation Plan

> **For agentic workers:** Do not modify or delete source before Project Owner approves the CR and this plan. Preserve every Lite and business-protection regression.

**Goal:** Remove 20 retired Full Benchmark files and benchmark-only runtime hooks after preserving exact source snapshots in a checksummed archive.

**Architecture:** Keep Lite, runtime, shared evaluators/validators, NestJS integration and application safeguards. Migrate the two test consumers from the 120-case corpus to the six Lite fixtures, retaining explicit boundary cases. Archive before edits; update active references before source deletion.

**Tech Stack:** Python 3.12 tests, Jest/TypeScript, pnpm, ZIP/SHA-256, Markdown governance.

**Spec:** `docs/proposals/change-requests/CR-DRAFT-PHASE-1D3-SOURCE-CLEANUP.md` (execution requires Project Owner approval).

## Global constraints

- Frozen baseline, approved Lite report/evidence, approved CRs/plans and schema pack are immutable.
- Remove only Full Benchmark allowlist and raw-observation hooks; preserve Lite diagnostics, runtime token authentication, GPU UUID binding, FP16/NF4 loader, six tasks, prompts, schemas, request/error/log behavior, capacity preflight and NestJS protections.
- Archive all 20 delete-list files and pre-cleanup snapshots of the six modified files before any test/source edits.
- The ZIP is a source snapshot for traceability, not runnable benchmark evidence or a substitute for Colab configuration/source proof.

## Tasks

### Task 1: Create the exact source archive before edits

**Files:** Create `docs/archive/phase-1d3-full-benchmark-source-v1.zip`; create `docs/archive/phase-1d3-full-benchmark-source-v1.md`; create archive SHA-256 sidecar.

- [ ] Include the exact 20 delete-list files from the CR under their original repository-relative paths.
- [ ] Include pre-cleanup snapshots under `before-cleanup/` for `ai/runtime/app.py`, `ai/runtime/worker.py`, `ai/tests/test_contract.py`, `ai/tests/test_worker.py`, `ai/tests/test_inference.py`, and `apps/api/src/ai/ai-benchmark-evaluator.spec.ts`.
- [ ] Add internal SHA-256 manifest for every source entry and external SHA-256 for the ZIP.
- [ ] Verify ZIP integrity and every member byte against the pre-edit source. State explicitly this archive is not a runnable/reproducible benchmark package; preserve no evidence claim beyond Lite PASS.

### Task 2: Update retained regression tests

**Files:** Modify `apps/api/src/ai/ai-benchmark-evaluator.spec.ts`, `ai/tests/test_inference.py`, `ai/tests/test_contract.py`, and `ai/tests/test_worker.py`.

- [ ] Point the API evaluator's valid-input loop to `ai/benchmark/fixtures/lite-smoke.jsonl`; assert six unique task keys and retain all existing schema, semantic, and explicit invalid/unknown/invented reference assertions.
- [ ] Add one explicit Teacher case with `needsAttentionStudents=[]` and assert schema/input-semantic validation accepts it.
- [ ] Point the runtime envelope/load-timing test to a Lite fixture; keep envelope assertions unchanged.
- [ ] Replace old allowlist-acceptance checks in `test_contract.py` with a regression that sets `AI_RUNTIME_BENCHMARK_MODE=1`, supplies an allowlist containing the request's correct canonical hash, and proves the request is rejected before worker admission (`worker.calls == []`) in both development and production. A non-allowlisted request is insufficient because the old code already rejects it.
- [ ] Remove raw benchmark-observation assertions from the combined worker test while preserving a direct GPU UUID binding assertion.
- [ ] Retire the corpus distribution test in `test_fixtures.py` in Task 4; do not recreate 120 cases. Existing prompt-injection test covers all six tasks; the shared-generation no-truncation test currently exercises Student Learning Analysis; schema pack negatives and API reference-boundary assertions remain.
- [ ] **RED:** Run the new allowlisted legacy-mode guard regression before changing runtime; verify it fails because current code can admit the request. Run the independent API fixture migration test and unaffected Python tests with the prepared venv in PATH:
  - `rtk proxy env PATH=/tmp/dacn-phase1d3-lite-test/bin:$PATH pnpm --filter @dacn/api exec jest --runInBand src/ai/ai-benchmark-evaluator.spec.ts`
  - `rtk proxy /tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests/test_inference.py ai/tests/test_contract.py ai/tests/test_worker.py -q`

### Task 3: Update active references and traceability

**Files:** Modify `ai/README.md` and root `AGENTS.md`; create `docs/governance/Document_Governance_and_Traceability_Index_v1.6.md`; complete the archive map from Task 1.

- [ ] Make Lite notebook/run instructions current and replace active links to the Full Benchmark notebook and `requirements.lock.pending.md` with the archive map. Clarify `requirements.in` remains the general runtime dependency input (including PyTorch/NF4) and is not a CPU test install file.
- [ ] Explain that archived paths are historical source only, not pending work, a PASS result, or proof the old run can be recreated.
- [ ] Preserve the distinction between Lite smoke and an authenticated/capacity-validated application flow.
- [ ] Create v1.6 from v1.5, carrying forward its active authority and traceability content, then make v1.6 the active downstream index and identify v1.2–v1.5 as preserved records. Do not edit prior approved plans, CRs, reports, or the v1.5 supplement.
- [ ] Preserve the pre-existing uncommitted changes from the prior approved documentation-only cleanup in `AGENTS.md`, `ai/README.md`, governance v1.5, its release supplement, prior CR and plan; update only the necessary active pointers and do not overwrite or drop those changes.
- [ ] Confirm active docs point to archive members instead of deleted paths before Task 4; the expected RED guard test is the only planned failing check at this point.

### Task 4: Remove approved Full Benchmark code

**Files:** Modify `ai/runtime/app.py` to remove allowlist hashing/acceptance while retaining fail-closed rejection for `AI_RUNTIME_BENCHMARK_MODE=1`; modify `ai/runtime/worker.py` to remove only `_write_raw_observation` and its call; delete exactly the 20 files listed in CR §3.

- [ ] Remove benchmark-only imports if they become unused. Keep `app.py` token auth, fail-closed legacy-mode guard, and `_write_lite_diagnostic`; keep worker GPU UUID and Lite diagnostic/error paths.
- [ ] After the archive and documentation checks pass and the expected RED guard is recorded, remove the benchmark allowlist-hash admission path and delete the 20 archived files. Keep the unconditional fail-closed guard for `AI_RUNTIME_BENCHMARK_MODE=1` before worker admission.
- [ ] Rerun the focused API and Python tests from Task 2 and require GREEN before full verification.
- [ ] Search active source, notebooks, tests, manifests and README for imports/references to deleted paths. Historical documents may retain old paths only when their exact archive mapping is present.
- [ ] Do not remove `ai/requirements.in`, `ai/requirements-lite.txt`, shared evaluator/validators, Python runtime tests, API capacity/auth tests, or any dependency still used by runtime/Lite.

### Task 5: Full verification and independent review

**Python test environment:** Use the prepared Python 3.12 CPU environment at `/tmp/dacn-phase1d3-lite-test` if present. Put `/tmp/dacn-phase1d3-lite-test/bin` at the front of `PATH` for Jest and `pnpm test`, because the API wire suite spawns `python`. The repository does not publish a CPU lock; do not install CUDA `requirements.in` to manufacture this environment. If the prepared venv is missing, report that blocker instead of changing dependencies.

- [ ] Run `rtk proxy /tmp/dacn-phase1d3-lite-test/bin/python -m pytest ai/tests -q`.
- [ ] Run `rtk proxy env PATH=/tmp/dacn-phase1d3-lite-test/bin:$PATH pnpm --filter @dacn/api exec jest --runInBand src/ai`.
- [ ] Run `rtk proxy env PATH=/tmp/dacn-phase1d3-lite-test/bin:$PATH pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm verify:baseline`, and `git diff --check`.
- [ ] Verify active imports/references have no broken targets; verify every archive member and sidecar digest.
- [ ] Confirm Lite evidence SHA-256 remains `e0fdb36dee70b307b8e999b19234a6de44e1c3440cee4bbbf02ed9c05ad2764f`.
- [ ] Request independent code review after implementation; resolve findings and rerun affected checks.

## Stop conditions

Do not modify/delete if archive verification fails, an active Lite/runtime caller is discovered, required auth/capacity/schema/semantic/reference/error/log tests fail or are weakened, or the Lite evidence checksum changes. Do not rerun Colab or the Full Benchmark.
