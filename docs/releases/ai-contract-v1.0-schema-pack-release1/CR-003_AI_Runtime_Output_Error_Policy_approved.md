# CR-003 — AI Runtime Output Error Policy

**Status:** APPROVED BY PROJECT OWNER  
**Approval date:** 2026-10-28  
**Authority record:** User's explicit approval in this project session. Approver name was not supplied.  
**Supersedes:** None. This is a downstream R3 change record supplementing CR-002 `XAI-002`.

## Scope and traceability

AI flows: `FR-STU-004..009`, `FR-TEA-005`, `FR-ADM-004/005`; `UC-STU-004/005/009`, `UC-TEA-005/006`, `UC-ADM-004/005`; requirements `AI-REQ-015..018`, `AI-REQ-020..024`; applicable `BR-007/008/013/014/015/018/021/026/028/034/035/036/037/041/042/043`.

API IDs: `API-STU-ANALYSIS-001`, `API-STU-PLAN-001`, `API-STU-ADJUST-001`, `API-TEA-ANALYSIS-001`, `API-ADM-ANALYSIS-001`. Existing error envelope only; no route, method, request/response shape or Screen change (Screen IDs: N/A).

## Approved behavior

| Case | Public result | Attempt/log behavior |
|---|---|---|
| Post-dispatch, otherwise valid correlated response has `runtime.promptVersion` differing from registry or active profile | Existing `502 AI_RUNTIME_FAILURE` | Exactly one FAILED `AIRequestLog` for the started attempt, internal diagnostic `AI_RUNTIME_PROMPT_VERSION_MISMATCH`; no success context; no retry. |
| Required AI output string is blank after trim | Existing-envelope `502 AI_INCOMPLETE_DATA` | Exactly one FAILED `AIRequestLog` because dispatch occurred; no retry. |

Pre-dispatch missing/invalid caller input and capacity-profile failures retain existing behavior and create no attempt/log. Existing `AIRequestLog` fields and one-terminal-record-per-started-attempt semantics remain unchanged. Existing `AI_INVALID_STRUCTURE` classification remains for structural/correlation/semantic-structure errors.

## Baseline and implementation impact

This CR makes explicit two observable error outcomes permitted by the existing API error catalog and supplements CR-002's post-dispatch technical failure rule. It changes neither public API shape nor endpoint behavior beyond the approved error cases. The paired AI Contract v1.0 Erratum 1 is in this release directory. R3 and CR-002 frozen source files remain byte-identical; this approved versioned CR is the downstream decision record.

Implementation impact, when separately authorized: NestJS post-dispatch response validation/error mapping and existing terminal log writer. This release does not implement those changes or authorize Phase 1D.2.

## Approval record

**Decision:** APPROVED  
**Approver:** Project Owner (explicit user approval in this project session; name not supplied)  
**Date:** 2026-10-28  
**Decision:** Approve all recommendations in the Phase 1D.1 decision matrix and accept official release of Schema Pack Release 1. No Phase 1D.2 implementation authorization is included.
