# ADR-AI-001 — Local-first Application & Portable Self-managed AI Runtime

**Date:** 09/11/2026  
**Version:** 0.2 Accepted  
**Status:** ACCEPTED — downstream architecture decision under CR-005 v1.0  
**Supersedes:** ADR-AI-001 v0.1 Proposed; v0.2 is the accepted decision  
**Scope:** Runtime placement and reproducible installation. No model or capacity profile is approved here.

## Context

R3 SRS v1.6 and Architecture v1.1 require Google Colab for the AI Runtime. Project Owner approved CR-005 v1.0 on 09/11/2026, providing scoped downstream authority to replace that placement constraint with a portable runtime while preserving the rest of R3.

CPU Ollama exploratory evidence includes repeated SP-02 (10 Topic) failures under the fixed 60-second attempt limit. The Phase 1D.3 Colab T4 FP16 Lite result is an approved demo-candidate smoke only. The model artifacts, runtime and hardware differ; neither evidence item certifies a new deployment profile or capacity.

## Accepted decision

Under approved CR-005 v1.0, use this deployment boundary:

```text
Next.js → NestJS → FastAPI POST /v1/infer → Ollama
```

- Prefer CPU-local installation for reproducibility; allow a separately operated GPU profile as an option.
- Keep FastAPI as the AI Contract v1.0 adapter. Ollama's native API remains internal to the adapter.
- Keep the browser away from the runtime. FastAPI/Ollama receive no database credentials or direct business-mutation capability.
- Require runtime configuration, model provenance and profile-specific evidence to be pinned and documented.

This decision is not a claim that a CPU laptop can run every AI task successfully. It separates two gates:

1. **Installability:** another person can install and start the source package using the runbook on a clean CPU-only environment.
2. **AI Conformance/Capacity:** an exact model/runtime/hardware profile passes each task's NestJS schema, semantic/reference and required-content validation, approved quality criteria, 60-second per-attempt limit and capacity-profile checks.

Passing Installability does not pass Conformance/Capacity. A profile without an approved capacity profile remains fail-closed and cannot dispatch application inference.

## Alternatives considered

| Option | Trade-off | Disposition |
|---|---|---|
| Colab only | Preserves original placement but depends on an external account/session and does not provide the requested local installation path. | Replaced within CR-005 v1.0 scope. |
| Ollama CPU only as the sole conformant runtime | Easiest local setup, but current SP-02 evidence fails and there is no six-task CPU capacity certification. | Reject as a claim of full AI conformance. CPU remains the preferred installation target. |
| Portable FastAPI adapter, CPU install preferred, optional GPU profiles | Keeps the application/runtime contract stable while separating installability from per-profile performance evidence. | Accepted under CR-005 v1.0. |

## Invariants and authority

The following remain unchanged:

- Next.js → NestJS → FastAPI `/v1/infer` → Ollama; no frontend-to-runtime or runtime-to-database access.
- AI Contract v1.0, exactly six task keys, exactly 15 Schema Pack Release 1 schemas, Errata 1/2 and CR-003/004.
- NestJS decides output validity. Runtime may pass a parsed JSON object through unchanged as required by Erratum 2 E6.
- 60-second timeout per external attempt, no automatic inference retry, complete-input capacity preflight and fail-closed behavior; no truncation, sampling or chunking.
- CR-006 v1.0 and its downstream addendum: one best-effort terminal insert attempt when persistence is reached; no `PENDING`, no persistence retry or inference retry; preserve the original inference error if logging also fails; dashboard aggregates count persisted rows and may undercount attempts.
- No database schema, public API, business eligibility, task, output schema or user-confirmation change.

The AI Contract portability supplement remains subordinate to Contract v1.0, Errata and CR-006. In particular, it must not claim one row is guaranteed for every external attempt.

## Handoff package

The release package must contain or point to:

- versioned application and FastAPI adapter source;
- database migrations and reproducible, non-sensitive seed data;
- `.env.example`/environment template with placeholders only;
- setup scripts, CPU-local configuration, optional GPU configuration, and a runbook verified from a clean environment;
- model manifest with immutable digest/revision, quantization, license/retrieval instructions and runtime settings;
- health/readiness checks, six-task contract tests and troubleshooting steps;
- checksums and a report that distinguishes mocked contract tests from real inference and distinguishes Installability from each profile's Conformance/Capacity.

Do not include secrets or claim that package completeness means model conformance. Model weights are included only when their license permits; otherwise the immutable identity and reproducible retrieval steps are required.

## Consequences and open gates

- CR-005 v1.0 and the scoped downstream documents are released. R3 remains immutable historical baseline; CR-005 v1.0 supplements its Colab placement constraint only for runtime portability.
- Installability must be demonstrated on a clean CPU-only machine; current runbook is a target draft and the required scripts/services are not yet verified as a complete handoff.
- Each enabled model/runtime/hardware profile needs its own approved evidence and capacity profile under AI Contract §§15.4/17 and CR-002. CPU exploratory evidence and Colab T4 Lite smoke are not substitutes.
- A capacity profile is not created by this ADR. Any profile still pending release means NestJS must reject before dispatch.
- Task 7 implementation still requires a fresh read-only Plan Review PASS on the updated Implementation Plan and separate task-specific authorization. This ADR grants neither.

## Approval

**CR-005 v1.0 decision:** APPROVED; **ADR-AI-001 v0.2:** ACCEPTED on 09/11/2026  
**Final state:** ACCEPTED — downstream architecture authority under CR-005 v1.0.
