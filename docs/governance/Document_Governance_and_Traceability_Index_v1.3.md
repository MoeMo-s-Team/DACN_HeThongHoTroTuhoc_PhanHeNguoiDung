# DOCUMENT GOVERNANCE & TRACEABILITY INDEX
## Hệ thống hỗ trợ tự học ứng dụng AI

**Version:** 1.3  
**Date:** 2026-10-28  
**Status:** Approved downstream governance update  
**Owner approval:** Project Owner, explicit approval recorded in this project session on 2026-10-28 (approver name not supplied).

This version supplements the frozen R3 governance index v1.2; it does not rewrite or replace any frozen baseline file. For requirements and Use Case freeze scope, continue to use `docs/baseline/Requirements_UseCase_Baseline_Freeze_Record_v1.2.md`.

## 1. Current authority

R3 `DACN-REQ-UC-BL-2026-10-26-R3` and CR-002 remain the frozen requirements/use-case baseline. The following approved downstream artifacts govern the AI runtime schema and the listed error policies:

| Artifact | Status / scope |
|---|---|
| AI Contract v1.0 baseline final | Frozen source; unchanged. |
| AI Contract v1.0 Erratum 1 | Approved; clarifies prompt binding, Stage 2 internal projection, and approved post-dispatch error classifications. |
| CR-003 — AI Runtime Output Error Policy | Approved supplement to CR-002 XAI-002 for two post-dispatch cases; no API shape change. |
| `AI_Contract_v1.0_schema_pack_release1.zip` | Normative 15-schema companion, independent release identity; not recovered Rev.4. |
| CR-002 v1.0 | Still governs XAI-001/XAI-002 capacity, no-truncation, preflight and attempt/log fundamentals. |

## 2. Approved prompt and envelope binding

The request envelope has no `promptVersion`. `request.task` binds through the registry; registry, active capacity profile and deployed task configuration must agree before dispatch. Correlation remains `contractVersion`, `requestId`, and `task`. Runtime `promptVersion` mismatch after dispatch maps under CR-003 and Erratum 1.

## 3. Admin Stage 2 mapping

Stage 1 returns groups without `count`. Backend validates/deduplicates, removes empty groups and computes `count = feedbackIds.length`. Stage 2 receives the backend projection with `count`. The API-facing response/business count remains backend-authoritative.

## 4. Change control and boundaries

CR-003 and Erratum 1 do not alter frozen R3/CR-002 source files, public API routes/payload schemas, roles, screens, or `AIRequestLog` fields/lifecycle. Their approved error classifications apply to post-dispatch attempts only. This release does not authorize Phase 1D.2; implementation and deployment gates require their own authorization and verification.

The original AI Contract v1.0 Rev.4 archive was not supplied/recovered. Release 1 was produced as a separately identified, reviewed artifact from the checksum-verified contract and approved decision records. Never label Release 1 as Rev.4 or claim provenance as the original archive.
