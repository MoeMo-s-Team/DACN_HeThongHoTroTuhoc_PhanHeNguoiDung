# DOCUMENT GOVERNANCE & TRACEABILITY INDEX
## Hệ thống hỗ trợ tự học ứng dụng AI

**Version:** 1.7

**Date:** 2026-10-30

**Status:** Approved downstream governance update under the source cleanup CR and CP-005
**Owner approval:** Project Owner approved CR-DRAFT-PHASE-1D3-SOURCE-CLEANUP and its plan, and approved CP-005, 2026-10-30.

This version succeeds governance index v1.6 and supplements frozen R3 governance index v1.2; it does not rewrite or replace frozen baseline files or prior approved index versions. For requirements and Use Case freeze scope, continue to use `docs/baseline/Requirements_UseCase_Baseline_Freeze_Record_v1.2.md`.

## 1. Current authority

R3 `DACN-REQ-UC-BL-2026-10-26-R3` and CR-002 remain the frozen requirements/use-case baseline. The following downstream artifacts govern AI runtime schemas, listed error policies, and the scoped demo acceptance:

| Artifact | Status / scope |
|---|---|
| AI Contract v1.0 baseline final | Frozen source; unchanged. |
| AI Contract v1.0 Erratum 1 | Approved; clarifies prompt binding, Stage 2 internal projection, and approved post-dispatch error classifications. |
| CR-003 — AI Runtime Output Error Policy | Approved supplement to CR-002 XAI-002 for two post-dispatch cases; no API shape change. |
| CR-004 — Runtime Generated Output Failure Policy | Approved downstream supplement; malformed/empty/non-object output handling follows the existing runtime and NestJS error boundary. |
| AI Contract v1.0 Erratum 2 Release v1.0 | Approved downstream clarification E5/E6; effective 2026-10-29. Does not modify frozen contract bytes or Release 1 schemas. |
| AI Contract schema pack Release 1 | Normative 15-schema companion, independent release identity; not recovered Rev.4. |
| CR-002 v1.0 | Still governs capacity profile, no-truncation, preflight and attempt/log fundamentals. |
| [Phase 1D.3 Demo Acceptance Supplement Release 1](../releases/phase-1d3-demo-acceptance-release1/Phase_1D3_Demo_Acceptance_Supplement.md) | Approved; Lite PASS is the model-candidate smoke acceptance for the DACN demo only. Does not waive AI Contract §15.4/CR-002 or certify the application flow or production readiness. |
| [CP-005 Local AI Runtime Release 1](../releases/local-ai-runtime-wsl2-tailscale-release1/TRACEABILITY.md) | Approved development/demo hosting change. SRS v1.7 and Architecture v1.2 describe Linux NestJS → Windows Tailscale Serve → one WSL2 FastAPI/Qwen NF4 runtime and teammate Windows NestJS → loopback. Does not certify Local GPU/Tailscale acceptance. |

### 1.1 Phase 1D.3 status

- Full Benchmark is retired as required work for the DACN demo. Its 20 source files were removed from active paths; exact source bytes and six pre-cleanup snapshots are preserved in the [source archive map](../archive/phase-1d3-full-benchmark-source-v1.md) with SHA-256 manifests. The archive is not a runnable benchmark, run evidence or PASS result.
- Phase 1D.3-Lite is accepted as the demo model-candidate smoke result, based on the evidence linked in the supplement and Lite report.
- Qwen2.5-1.5B-Instruct at the recorded immutable revision is a verified demo candidate only.
- The current demo runbook is [`ai/README.md`](../../ai/README.md); it links to the Lite notebook, report and immutable evidence.
- `OPEN-ARCH-003` remains open for production model selection/certification. No production model, quality threshold, or capacity certification is approved here.
- The Lite NestJS-to-FastAPI wire smoke used mocked authorization and capacity preflight. It is not evidence of an authenticated business flow or production-module readiness.
- Approved `CR-DRAFT-PHASE-1D3-SOURCE-CLEANUP` retires only Full Benchmark source and benchmark-only runtime hooks; Lite, all six tasks, FastAPI, NestJS safeguards, authentication, capacity preflight, validators and AIRequestLog behavior remain active.
- Approved CP-005 changes only the development/demo runtime host in downstream SRS/Architecture; it does not alter the frozen SRS v1.6 or Architecture v1.1 bytes, R3 freeze, AI Contract, six task behavior, authorization, capacity preflight, or Lite evidence. Local GPU PASS is pending actual Windows 11/WSL2 RTX 3050 and Tailscale verification. Colab serving/source cleanup remains prohibited until that PASS and a separate Phase B approval.

## 2. Approved prompt and envelope binding

The request envelope has no `promptVersion`. `request.task` binds through the registry; registry, active capacity profile and deployed task configuration must agree before dispatch. Correlation remains `contractVersion`, `requestId`, and `task`. Runtime `promptVersion` mismatch after dispatch maps under CR-003 and Erratum 1.

## 3. Admin Stage 2 mapping

Stage 1 returns groups without `count`. Backend validates/deduplicates, removes empty groups and computes `count = feedbackIds.length`. Stage 2 receives the backend projection with `count`. The API-facing response/business count remains backend-authoritative.

## 4. Change control and boundaries

CR-003, CR-004, Errata 1/2, and the Phase 1D.3 Demo Acceptance Supplement do not alter frozen R3/CR-002 files, public API routes/payload schemas, roles, screens, schema pack, task behavior, or `AIRequestLog` lifecycle. The Demo Acceptance Supplement supersedes AI Contract §17 only as the model-candidate smoke gate for the DACN demo; AI Contract §17 remains uncompleted for production certification. It does not amend AI Contract §15.4, CR-002 capacity requirements, or application invocation policy.

The original AI Contract v1.0 Rev.4 archive was not supplied/recovered. Release 1 schema pack and later supplements are separately identified reviewed artifacts; never label them as the original Rev.4 archive.

Governance indexes v1.6 and earlier versions remain preserved historical governance. This v1.7 update is the current downstream AI governance pointer and records the approved source cleanup and CP-005 without changing frozen baseline bytes.

## 5. Runtime output boundary

For all six AI task keys, preserve the approved malformed/empty/non-object output handling and existing NestJS authoritative schema/semantic validation. See v1.4 §§4–5, the approved CR-003/CR-004 artifacts, and Errata 1/2 for their detailed error semantics; this index does not restate or change those policies.
