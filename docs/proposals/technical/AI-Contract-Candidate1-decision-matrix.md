# Approved Decision Record — AI Contract Candidate 1

**Status:** APPROVED BY PROJECT OWNER — 2026-10-28  
**Scope:** Phase 1D.1 approval and Release 1. The separately identified Release 1 is normative; Candidate 1 remains non-normative. No Phase 1D.2 implementation is authorized.

This matrix records the project owner's explicit approval of the recommendations below. The approval was given in this project session on 2026-10-28; approver name was not supplied. Operative versioned artifacts: `docs/releases/ai-contract-v1.0-schema-pack-release1/`. The frozen R3/CR-002 source files remain unchanged.

## Approved decisions

| # | Issue and evidence | Recommendation | Approval route / impact |
|---|---|---|---|
| 1 | Admin Stage 1 emits `{title,summary,feedbackIds}`; AI Contract §12.3 puts validation, deduplication, empty-group removal and `count` calculation in backend before Stage 2. §13.1 says validated groups but omits field list. API R3 orchestration/success response exposes backend-computed `count`. | Approve Candidate 1's Stage 2 internal projection `{title,summary,feedbackIds,count}` with `count=feedbackIds.length`; Stage 1 schema continues rejecting AI-supplied count. | Internal mapping clarification: TP-001 + AI Contract erratum §13.1. No public API change proposed. Review for AI output changes before implementation; CR is needed if behavior becomes observable. |
| 2 | AI-DD-011 refers to `request.promptVersion`; §6.3 request example and Candidate envelope omit it. Registry/profile each bind task prompt; runtime response metadata contains promptVersion. | Do not add a wire field. Bind `task` to the registry's active prompt version and require the capacity profile/deployed configuration to match before dispatch. Keep response correlation to `contractVersion`, `requestId`, `task`. | TP-001 + AI Contract erratum clarifying AI-DD-011 and §6.3. No public API change. If the released Rev.4 schema includes the field, stop and resolve authority conflict before approval. |
| 3 | §6.4 says runtime prompt metadata is trace/debug/benchmark metadata; CR-002 requires preflight profile mismatch to fail before dispatch, but does not explicitly cover post-dispatch response metadata mismatch. | Prefer fail-closed: when correlated/schema-valid success metadata has a promptVersion differing from registry/profile, discard business success, map to `502 AI_RUNTIME_FAILURE`, write exactly one FAILED `AIRequestLog` for the started attempt with internal diagnostic, and do not retry. | Observable success-to-error change. Requires upstream CR and AI Contract erratum §6.4 before implementation. This does not change endpoint, wire fields, attempt count, or one-terminal-log-per-attempt semantics. |
| 4 | Contract §§4.9/7.1 requires rejection of required output text blank after trim but does not assign an API code. Candidate structural schema accepts whitespace-only text (`minLength:1`). | Recommend post-dispatch whitespace-only required AI output → `502 AI_INCOMPLETE_DATA` using the existing API error envelope, exactly one FAILED log. Pre-dispatch missing/blank caller input remains existing validation with no AI attempt/log. | Observable classification. Requires upstream CR and AI Contract erratum §7.1 before implementation. |
| 5 | Candidate TRACEABILITY documents nested task input mappings inferred where the contract does not fully enumerate object members. | Approved: adopt each row in Release 1 `TRACEABILITY.md` as the selected internal mapping; retain JSON-shape validation only where supported, and leave authorization, references, cross-field and business checks to NestJS. | TP-001 + Erratum 1 record the internal-contract interpretation. No added business constraint. If a future change alters AI behavior or externally visible results, use upstream CR. |

## Source and impact trace

- Baseline: R3 freeze `DACN-REQ-UC-BL-2026-10-26-R3`; CR-002 `XAI-001`/`XAI-002`; AI Contract v1.0 §§6.3–6.6, 7.1, 8–13, 18, 20.
- Relevant requirements/flows: `AI-REQ-015..018`, `AI-REQ-020..024`; `FR-STU-004..009`, `FR-TEA-005`, `FR-ADM-004/005`; `UC-STU-004/005/009`, `UC-TEA-005/006`, `UC-ADM-004/005`; `BR-007/008/013/014/015/018/021/026/028/034/035/036/037/041/042/043`.
- API IDs: `API-STU-ANALYSIS-001`, `API-STU-PLAN-001`, `API-STU-ADJUST-001`, `API-TEA-ANALYSIS-001`, `API-ADM-ANALYSIS-001` (API Specification v1.5 endpoint inventory); existing error envelope/catalog in §§11.4–11.5. No route, method, request/response shape changes proposed. Screen IDs: N/A. Observable error mapping changes in rows 3–4 still require CR.
- Implementation impact: NestJS registry/profile preflight and response validator/log mapper; schema candidate only for structural constraints. No frontend, database, or runtime changes in this dossier.

## Owner decision record

**Decision:** Approve all five recommendations as written.  
**Authority:** Project Owner (explicit approval in this project session; name not supplied).  
**Date:** 2026-10-28.  
**Implementation boundary:** This approves release artifacts only; Phase 1D.2 remains separately gated. Candidate 1 itself remains marked `CANDIDATE — NOT APPROVED`; Release 1 is its approved successor artifact.
