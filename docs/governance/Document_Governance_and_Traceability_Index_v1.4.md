# DOCUMENT GOVERNANCE & TRACEABILITY INDEX
## Hệ thống hỗ trợ tự học ứng dụng AI

**Version:** 1.4  
**Date:** 2026-10-29  
**Status:** Approved downstream governance update  
**Owner approval:** Project Owner, formal approval recorded in this project session on 2026-10-29.

This version supplements the frozen R3 governance index v1.2; it does not rewrite or replace any frozen baseline file. For requirements and Use Case freeze scope, continue to use `docs/baseline/Requirements_UseCase_Baseline_Freeze_Record_v1.2.md`.

## 1. Current authority

R3 `DACN-REQ-UC-BL-2026-10-26-R3` and CR-002 remain the frozen requirements/use-case baseline. The following approved downstream artifacts govern the AI runtime schema and the listed error policies:

| Artifact | Status / scope |
|---|---|
| AI Contract v1.0 baseline final | Frozen source; unchanged. |
| AI Contract v1.0 Erratum 1 | Approved; clarifies prompt binding, Stage 2 internal projection, and approved post-dispatch error classifications. |
| CR-003 — AI Runtime Output Error Policy | Approved supplement to CR-002 XAI-002 for two post-dispatch cases; no API shape change. |
| CR-004 — Runtime Generated Output Failure Policy | Approved downstream supplement; model-generated malformed/empty/non-object text uses existing `INFERENCE_FAILED` → `AI_RUNTIME_FAILURE`; parsed objects pass unchanged for NestJS authoritative validation. No new code/API shape/log lifecycle change. |
| AI Contract v1.0 Erratum 2 Release v1.0 | Approved downstream clarification E5/E6; effective 2026-10-29. Does not modify frozen contract bytes or Release 1 schemas. |
| `AI_Contract_v1.0_schema_pack_release1.zip` | Normative 15-schema companion, independent release identity; not recovered Rev.4. |
| CR-002 v1.0 | Still governs XAI-001/XAI-002 capacity, no-truncation, preflight and attempt/log fundamentals. |

## 2. Approved prompt and envelope binding

The request envelope has no `promptVersion`. `request.task` binds through the registry; registry, active capacity profile and deployed task configuration must agree before dispatch. Correlation remains `contractVersion`, `requestId`, and `task`. Runtime `promptVersion` mismatch after dispatch maps under CR-003 and Erratum 1.

## 3. Admin Stage 2 mapping

Stage 1 returns groups without `count`. Backend validates/deduplicates, removes empty groups and computes `count = feedbackIds.length`. Stage 2 receives the backend projection with `count`. The API-facing response/business count remains backend-authoritative.

## 4. Change control and boundaries

CR-003 and Erratum 1 do not alter frozen R3/CR-002 source files, public API routes/payload schemas, roles, screens, or `AIRequestLog` fields/lifecycle. Their approved error classifications apply to post-dispatch attempts only. CR-004 / Erratum 2 clarify generated-output handling and do not authorize Phase 1D.3 implementation; its plan review remains required. This release does not authorize Phase 1D.2; implementation and deployment gates require their own authorization and verification.

The original AI Contract v1.0 Rev.4 archive was not supplied/recovered. Release 1 was produced as a separately identified, reviewed artifact from the checksum-verified contract and approved decision records. Never label Release 1 as Rev.4 or claim provenance as the original archive.

## 5. CR-004 / Erratum 2 Runtime output boundary

For all six AI task keys, model-generated malformed/empty/non-object text is returned as correlated HTTP 500 `INFERENCE_FAILED`; NestJS maps it to existing `502 AI_RUNTIME_FAILURE`, one FAILED `AIRequestLog`, no retry. Parsed JSON objects pass unchanged in success envelopes, including task-schema-invalid objects; only NestJS schema/semantic validation can accept business success. Required whitespace-only text remains `AI_INCOMPLETE_DATA` under Erratum 1 E4/CR-003. Malformed HTTP JSON received by NestJS remains `AI_INVALID_STRUCTURE`; empty HTTP body remains `AI_EMPTY_RESPONSE`. CR-004 / Erratum 2 do not change frozen R3/CR-002, API envelope/code catalog, Release 1 schema bytes, attempt count, retry policy, or AIRequestLog lifecycle. Phase 1D.3 runtime implementation remains gated by independent plan approval.
