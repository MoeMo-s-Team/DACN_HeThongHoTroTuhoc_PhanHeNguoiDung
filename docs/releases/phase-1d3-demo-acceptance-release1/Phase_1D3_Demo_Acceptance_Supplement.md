# Phase 1D.3 Demo Acceptance Supplement — Release 1

**Status:** Approved downstream supplement

**Owner approval:** Project Owner, 2026-10-30

**Related CR:** [CR-DRAFT-RETIRE-PHASE-1D3-FULL-BENCHMARK.md](../../proposals/change-requests/CR-DRAFT-RETIRE-PHASE-1D3-FULL-BENCHMARK.md)
**Scope:** DACN demo model-candidate verification only.

## 1. Decision

Phase 1D.3 Full Benchmark is retired as required work for the DACN demo. The approved Phase 1D.3-Lite PASS evidence is accepted as the demo **model-candidate smoke** result. The benchmark plan and artifacts remain in the repository as historical material; this supplement does not claim that the Full Benchmark passed.

This is a scoped downstream acceptance decision. It does not revise frozen baseline files, AI Contract v1.0, CR-002, the schema pack, public API behavior, or business rules. It does not waive deployment requirements in AI Contract §15.4 or CR-002.

## 2. Verified candidate and evidence

The reported Lite run used:

- Source commit: `9a5494edb5788eed5455742361caeafdb414c2bf`
- Model candidate: `Qwen/Qwen2.5-1.5B-Instruct`
- Immutable model revision: `989aa7980e4cf806f80c7fef2b1adb7bc71aa306`
- Environment: Google Colab Tesla T4, FP16
- Smoke result: all six AI tasks passed real inference with schema, semantic and reference validation; NestJS-to-FastAPI live wire smoke passed.

The detailed [Lite report](../../proposals/technical/phase-1d3-lite-report.md) and preserved [evidence archive](../../../ai/phase-1d3-lite-PASS-20261030-042947-70b2a79d.zip) remain the evidence source. Archive SHA-256: `e0fdb36dee70b307b8e999b19234a6de44e1c3440cee4bbbf02ed9c05ad2764f`.

Qwen is a demo candidate only. This evidence does not certify production suitability, model quality thresholds, general deployment capacity, or later source/model revisions.

## 3. Demo acceptance boundary

The Lite result is accepted as the model-candidate smoke when the recorded evidence shows all of the following:

1. The pinned candidate loads on Tesla T4 in FP16.
2. Each of the six existing task keys performs real inference, with an output passing the current schema, semantic, and reference validators.
3. The recorded NestJS-to-FastAPI wire smoke succeeds against real model inference.
4. Run evidence identifies the source commit, model revision, dependencies, GPU/load result, per-task result, and wire-smoke result.

Failures remain failures and require a concrete blocker; no result may be repaired, mocked, or inferred from a different run. Reuse the acceptance for another change only when that run has its own evidence.

The current wire-smoke test injects mocked authorization and capacity preflight. It verifies the NestJS client-to-FastAPI inference path, but it does **not** verify the production `AiModule` invocation policy, an authenticated business request, or a validated capacity profile. The production module currently binds `DenyAllAiInvocationPolicy` and has no configured estimator. Therefore the recorded Lite result is not an end-user application integration acceptance.

## 4. Requirements that remain

- AI Contract v1.0 §15.4 and R3/CR-002 capacity-profile binding, fail-closed preflight, full authoritative input, overflow handling, and attempt/log rules remain unchanged for application deployments.
- Keep authentication, eligibility, schema validation, semantic/reference validation, error mapping, timeout and no-retry behavior unchanged.
- Do not truncate, sample, page-limit, chunk, or pre-summarize input; do not fabricate capacity evidence or expose secrets/raw prompts.
- Keep `OPEN-ARCH-003` open for production model selection/certification.
- A real application AI flow still requires its separately valid authorization policy, capacity profile/estimator, and deployment configuration. This supplement does not authorize bypassing those gates.

The 120-fixture benchmark, per-task quality scoring, and capacity cases required by AI Contract §17 are not DACN demo acceptance requirements; they remain outstanding for production model selection under the current contract. The full Torch provenance procedure belongs to the historical full plan and is not established by this supplement as a production certification requirement. This run did not complete those activities, and no result is reported as PASS for them.
