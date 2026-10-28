# Proposal archive — AI Runtime Output Error Classification

**Status:** DRAFT RETAINED AS REVIEW HISTORY — APPROVED RELEASE COPY ISSUED AS CR-003  
**Approved copy:** `docs/releases/ai-contract-v1.0-schema-pack-release1/CR-003_AI_Runtime_Output_Error_Policy_approved.md`  
**Official CR ID:** CR-003  
**Related:** R3 / CR-002 `XAI-002`; TP-001; AI Contract v1.0 erratum draft E3/E4.

## Change request

Approve two precise classifications for post-dispatch AI output cases. No endpoint, HTTP response shape, request field, role, state transition, or UI change is proposed.

## Affected scope

- AI task flows: `FR-STU-004..009`, `FR-TEA-005`, `FR-ADM-004/005`; `UC-STU-004/005/009`, `UC-TEA-005/006`, `UC-ADM-004/005`.
- Requirements/rules: `AI-REQ-015..018`, `AI-REQ-020..024`; `BR-007/008/013/014/015/018/021/026/028/034/035/036/037/041/042/043`.
- API IDs: `API-STU-ANALYSIS-001`, `API-STU-PLAN-001`, `API-STU-ADJUST-001`, `API-TEA-ANALYSIS-001`, `API-ADM-ANALYSIS-001` (API Specification v1.5 endpoint inventory); existing `/api/v1` error envelope/catalog in §§11.4–11.5 only, no endpoint/request/response shape changes. Screen IDs: N/A.
- CR-002 impact: proposed cases occur after dispatch and preserve one terminal `AIRequestLog` per started attempt. Existing pre-dispatch capacity mismatch remains `502 AI_RUNTIME_FAILURE` with no attempt/log. This request does not change CR-002's capacity preflight or retry policy.

## Current behavior and proposed behavior

| Case | Current authority | Proposed behavior | Logging / retries |
|---|---|---|---|
| Correlated, structurally valid success response has `runtime.promptVersion` differing from task registry or active capacity profile | AI Contract §6.4 calls runtime prompt metadata trace/debug/benchmark metadata; no explicit mismatch error. | Fail closed with existing public `502 AI_RUNTIME_FAILURE`. | Exactly one FAILED `AIRequestLog` with internal diagnostic `AI_RUNTIME_PROMPT_VERSION_MISMATCH`; no success context; no retry. |
| Required output string contains only whitespace | AI Contract §§4.9/7.1 requires rejection but does not specify API error code. | Existing envelope with HTTP `502 AI_INCOMPLETE_DATA`. | Exactly one FAILED `AIRequestLog` because dispatch occurred; no retry. |

For caller input missing required/minimum content before dispatch: existing preflight behavior and no log remain unchanged. `AI_INVALID_STRUCTURE` remains for wrong type, enum, correlation, and semantic structure. `AI_RUNTIME_FAILURE` remains for runtime/provider/technical failures. `AIRequestLog` retains current fields and one-terminal-record semantics.

## Rationale and implementation impact

Fail-closed metadata validation prevents a response generated under an unbound prompt from being returned as success. `AI_INCOMPLETE_DATA` describes required content that is absent in substance despite a nonempty string. Implementation would be limited to NestJS post-dispatch validation/error mapping and the existing log writer; no prompt protocol field is added. These choices are recommendations, not current behavior.

## Baseline impact

This request supplements CR-002's general post-dispatch technical failure mapping with exact error cases. It changes observable outcomes/error classification, so it must be approved through the project's Change Request process and paired with approved AI Contract v1.0 erratum E3/E4 before implementation. No update to frozen R3/CR-002 is made by this draft. If approval requires changing the public error catalog or error envelope, submit a separately scoped API baseline change before implementation.

## Approval record

Project approval authority/name: **TBD by project owner**. Decision, date, rationale, assigned CR ID, and links to approved baseline/contract revisions must be recorded by the authorized owner. Until then: DRAFT, not implementation authority.
