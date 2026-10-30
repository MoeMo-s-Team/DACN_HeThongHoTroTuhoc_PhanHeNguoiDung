# Retire Phase 1D.3 Full Benchmark — Implementation Plan

> **For agentic workers:** Project Owner approved this plan on 2026-10-30. Preserve all frozen and historical artifacts.

**Goal:** Make Phase 1D.3-Lite the official model-candidate smoke gate for the DACN demo and stop treating the Full Benchmark as required demo work.

**Architecture:** Preserve all runtime, NestJS, capacity, security, validator, historical notebook, and benchmark dependencies. Version only the scoped demo model-smoke acceptance downstream of frozen baselines; retain the full application capacity/profile and invocation requirements for real business requests.

**Tech Stack:** Markdown governance docs, Python runtime/smoke, TypeScript NestJS validators/tests, Jupyter notebook.

**Spec:** Approved `docs/proposals/change-requests/CR-DRAFT-RETIRE-PHASE-1D3-FULL-BENCHMARK.md`.

**Plan status:** Approved by independent review and Project Owner; implementation authorized.

## Global constraints

- Do not edit `docs/baseline/`, the AI Contract/schema pack, public API contract, prompts, six tasks, business rules, or existing PASS evidence.
- Preserve authentication, no-truncation, capacity preflight, error/log semantics, schema/semantic/reference checks, 60-second timeout, and no-retry behavior.
- Qwen revision `989aa7980e4cf806f80c7fef2b1adb7bc71aa306` remains a demo candidate, not a production certification.
- Keep `OPEN-ARCH-003` open. Do not claim full benchmark or production capacity completion.
- Verify the archived Lite ZIP checksum before and after; never overwrite it.

## Review focus

- Historical frozen authority may continue to imply full benchmark gates: only an approved downstream erratum/index update can change current demo acceptance.
- Full benchmark helpers remain referenced by the retained historical notebook/tests; preserve those references and source files.
- The Lite NestJS wire smoke mocks authorization and capacity preflight; do not claim it proves application-module authorization, capacity certification, or end-user flow.
- Historical reports/plans may be misread as current work: add status/index pointers without altering their approved contents.
- Documentation cleanup must not misstate the current NestJS → FastAPI wire smoke or application deployment gates.

## Tasks

### Task 1: Publish approved downstream demo criteria

**Files:** Create an approved, separately identified downstream demo supplement (proposed path: `docs/releases/phase-1d3-demo-acceptance-release1/Phase_1D3_Demo_Acceptance_Supplement.md`; it supersedes only demo model-selection acceptance, not AI Contract §15.4 or CR-002); create `docs/governance/Document_Governance_and_Traceability_Index_v1.5.md` without overwriting v1.4; update the active index pointer in root `AGENTS.md`. Do not modify the Lite report.

- [x] Record owner approval and the exact scope in the released supplement: Lite demo acceptance, Qwen demo-candidate status, full benchmark excluded from demo, production/capacity certification remains open.
- [x] Retain AI Contract §15.4 and CR-002 capacity-profile requirements for application deployment unchanged; explicitly say Lite does not establish a validated capacity profile or application invocation readiness.
- [x] Describe the NestJS → FastAPI result accurately as a live wire smoke: its test constructs `AiInferenceService` with mocked auth/preflight; it validates real runtime output but does not exercise `AiModule`'s `DenyAllAiInvocationPolicy` or a configured estimator/profile.
- [x] Preserve all schema, semantic/reference, authentication, timeout, retry, error, and log invariants from the CR.
- [x] Add v1.5 authority links and current demo runbook pointer; continue to mark v1.4 and baseline as historical authority unchanged.
- [x] Update root `AGENTS.md` to name the approved supplement and v1.5 governance index, stating that the supplement supersedes only §17 demo model-selection acceptance; AI Contract §15.4 and R3/CR-002 capacity rules retain authority, and production `OPEN-ARCH-003` remains open.
- [x] Confirm no change is needed to AI Contract schemas, public API OpenAPI artifacts, R3/CR-002, or AI Contract §15.4.

### Task 2: Simplify current AI documentation

**Files:** Modify `ai/README.md`; modify root `README.md` only if it points users to full Phase 1D.3 as a demo prerequisite; retain `docs/superpowers/plans/2026-10-29-phase-1d3-real-model-benchmark.md`, Lite CR/plan, `ai/colab/phase-1d3.ipynb`, Lite report/archive, and historical reports/evidence unchanged.

- [x] Make the Lite notebook and successful evidence the current demo AI run path; say full benchmark is retired for demo and production model/capacity remains uncertified.
- [x] Remove only obsolete instructions that require 120 fixtures, manual scoring, capacity profiling, or full provenance before demo.
- [x] Add links to the approved supplement, Lite report, immutable evidence, and retain historical full-workflow links under an explicit historical label.

### Task 3: Preserve and de-scope historical benchmark tooling

**Files:** No source or test deletions proposed. Preserve the full notebook and the files it calls/references: `ai/benchmark/run.py`, `report.py`, `rubric.md`, `allowlist.py`, `fixtures/fixtures.jsonl`, `ai/colab/measure_capacity.py`, `capacity.py`, `torch_provenance.py`, `ai/benchmark/capacity-profile.candidate.json`, their tests, and shared evaluators. These references include `ai/colab/phase-1d3.ipynb`, `ai/tests/test_colab_preflight.py`, `ai/tests/test_inference.py`, and `apps/api/src/ai/ai-benchmark-evaluator.spec.ts`.

- [x] Record the repository audit finding that no reviewed benchmark helper is currently safe to delete while preserving the historical notebook/tests.
- [x] Mark full tooling as historical in current AI documentation; do not move/rename `ai/benchmark/` or break notebook references.
- [x] Preserve shared Lite/runtime evaluator imports and capacity/auth guard tests.
- [x] Make no dependency or source changes; any later deletion requires separate exact reference audit and approval.

### Task 4: Final traceability and evidence integrity

**Files:** Current governance index/supplement; root `AGENTS.md`; `ai/README.md`; Lite report/evidence read-only.

- [x] Record Full Benchmark as retired for demo, not passed; keep `OPEN-ARCH-003` open for production selection.
- [x] Verify PASS evidence SHA-256 remains `e0fdb36dee70b307b8e999b19234a6de44e1c3440cee4bbbf02ed9c05ad2764f` and report still identifies source commit/model revision and the three acceptance results.
- [x] Run `pnpm verify:baseline`, `python -m pytest ai/tests -q`, and applicable API AI tests; run `git diff --check`. These are regression checks; they do not convert the wire smoke into a real authorization/capacity-preflight test.
- [x] Request independent code review after implementation; resolve findings and rerun affected checks.

## Execution gate

This plan passed independent review and received Project Owner approval on 2026-10-30. Documentation/governance implementation is authorized. Do not edit/delete runtime, tests, notebooks, evidence, baseline, or approved historical decision artifacts.
