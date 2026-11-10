# Document Governance & Traceability Index v1.6 — CR-005 Downstream Addendum

**Date:** 09/11/2026  
**Status:** APPROVED — downstream authority  
**Baseline freeze:** `DACN-REQ-UC-BL-2026-10-26-R3` remains preserved and immutable. Read with the R3 index v1.2, CR-006 index v1.3 addendum, and AI downstream index v1.5.

## Purpose and scope

This addendum registers CR-005 v1.0 and ADR-AI-001 v0.2 Accepted and points to the released SRS v1.7, Architecture v1.2 and AI Contract Runtime Portability Supplement v1.0. It changes only the runtime-placement/reproducible-installation scope approved by CR-005. It does not rewrite the R3 index, freeze record, baseline files, or `BASELINE_MANIFEST.sha256`.

## Change and decision registry

| ID | Version/status | Scope | Release artifact |
|---|---|---|---|
| CR-002 | v1.0 Approved; incorporated into R3 | Capacity, no-truncation, runtime failure | R3 baseline release |
| CR-005 | v1.0 Approved; downstream authority | Portable runtime placement, reproducible installation, separate acceptance gates | `Change_Request_CR-005_v1.0_approved.md` |
| CR-006 | v1.0 Approved; downstream authority | Best-effort terminal AIRequestLog persistence and persisted-row aggregates | `docs/implementation/releases/CR-006/` |
| ADR-AI-001 | v0.2 Accepted under CR-005 | Next.js → NestJS → FastAPI `/v1/infer` → Ollama; CPU install preferred, GPU optional | `ADR_AI_001_Local_First_Runtime_Portability_v0.2_accepted.md` |

CR-005 was checked against the repository's R3 and downstream registries before registration. No competing CR-005 or CP-005 entry was found. The registry entry here assigns CR-005 to this approved runtime portability change; it must not be confused with CP-005 or other runtime proposals.

## Active downstream authority map

| Area | Frozen source retained | Current supplemental/revision authority |
|---|---|---|
| Requirements | SRS v1.6 in R3 | SRS v1.7 downstream revision for CR-005 runtime placement/installability scope; CR-006 remains active for its listed IDs |
| Architecture | Architecture v1.1 in R3 | Architecture v1.2 downstream revision for CR-005 runtime placement; ADR-AI-001 v0.2 accepted |
| AI orchestration/contract | AI Contract v1.0, Errata 1/2, CR-003/004 | Portability Supplement v1.0 applies §17's existing criteria per exact profile; CR-006 controls §14 terminal persistence semantics |
| Schemas | Schema Pack Release 1 (15 schemas) | Unchanged; no schema revision in CR-005 |
| Public API/business rules | API v1.5, Business Rules v1.4, use cases and UI in R3 | Unchanged by CR-005; API v1.5 plus CR-006 remains current for the approved logging exception |
| Database | Database Design v1.0 and R3 schema | Unchanged; CR-005 adds no persistence or schema behavior |
| Implementation | Phase 2B design and plan | Updated design/plan; Task 7 requires fresh read-only Plan Review PASS and separate authorization; dispatch also requires an approved matching capacity profile |

## Portable runtime and acceptance gates

- Runtime boundary: Next.js → NestJS → FastAPI `POST /v1/infer` → Ollama. Browser does not access FastAPI/Ollama; runtime has no database access.
- CPU-local is the preferred installation profile. GPU/Colab is optional and profile-specific.
- **Installability** is a clean source-based setup/start acceptance check. **AI Conformance/Capacity** is a separate per-model/runtime/hardware gate.
- The profile-specific gate uses the existing AI Contract v1.0 §§15.4/17 criteria via the approved supplement. Contract v1.0 bytes and thresholds are unchanged.
- CPU exploratory evidence and Colab T4 Lite smoke do not certify capacity. A missing/unapproved capacity profile keeps dispatch fail-closed.
- Six task keys, 15 Release 1 schemas, 60-second timeout, no-retry, complete-input preflight and CR-006 logging policy remain unchanged.

## Frozen boundary

The R3 baseline manifest continues to verify only the original 12 frozen files. This addendum is not a re-freeze and does not claim the R3 manifest covers downstream releases. CR-005 release files and updated plan/design are covered by `SHA256SUMS.txt` in this release package. CR-006 remains independently active; `SUCCESS`/`FAILED` semantics and persisted-row dashboard undercount remain governed by CR-006.
