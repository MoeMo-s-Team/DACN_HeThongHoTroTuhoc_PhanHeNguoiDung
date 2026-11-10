# Document Governance & Traceability Index v1.3 — Downstream Addendum

**Date:** 09/11/2026  
**Status:** APPROVED — DOWNSTREAM AUTHORITY  
**Baseline freeze:** `DACN-REQ-UC-BL-2026-10-26-R3` (unchanged; see `docs/baseline/Document_Governance_and_Traceability_Index_v1.2.md` and the R3 freeze record).

## Purpose and authority

This addendum registers approved downstream CR-006 authority without editing the R3 Governance Index, freeze record, or baseline manifest. Read the v1.2 R3 index together with this addendum. CR-006 applies only to terminal `AIRequestLog` persistence failure, post-NestJS validation status semantics, and persisted-row dashboard aggregates.

## Change Request registry

| ID | Version/status | Scope | Release artifact |
|---|---|---|---|
| CR-002 | v1.0 Approved; R3 incorporated | Capacity/no-truncation and runtime failure semantics | `docs/baseline/Change_Request_CR-002_AI_Input_Capacity_and_Runtime_Failure_Semantics_v1.0_approved.md` |
| CR-006 | v1.0 Approved; downstream authority | Best-effort terminal logging, persistence failure mapping, dashboard persisted-row counts | `Change_Request_CR-006_v1.0_approved.md` in this release package |

CR-006 was unique in repository governance records at registration; the earlier R3 index contained CR-002 and repository search found no other CR-006. CR-005 remains a Draft and is not promoted by this addendum.

## Active downstream authority map

| Area | Frozen source retained | Current supplemental authority |
|---|---|---|
| Requirements / Business Rules | SRS v1.6 and Business Rules v1.4 in R3 | CR-006 v1.0 and `CR-006_Downstream_Addendum_v1.0.md` for listed IDs only |
| Public API | API Specification v1.5 in R3 | CR-006 addendum for the narrow `AI_RUNTIME_FAILURE` persistence exception and aggregate meaning |
| AI orchestration | AI Contract v1.0 in R3 | CR-006 addendum for §14 lifecycle/persistence semantics; CR-003/004 and Errata remain in force |
| Database | Database Design v1.0 in R3 | CR-006 addendum clarifies semantics; no schema change |
| Use Case / Activity / UI | R3 UCS v1.2, Activity v1.3, Wireframe v1.1, Sitemap v1.1 | CR-006 addendum only; no UC, route, screen, or response shape added |
| Implementation | Phase 2B plan and Design Spec | CR-006 authority plus updated plan; Task 5 requires fresh Plan Review and separate authorization |

## Frozen boundary

All files under `docs/baseline/`, including `BASELINE_MANIFEST.sha256`, remain unchanged. This index addendum is not a re-freeze and does not claim the original R3 manifest covers downstream release files. The release package checksum covers this addendum, CR-006, cross-document audit, and the approved implementation-plan/design revisions separately.
